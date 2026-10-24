const { Op } = require('sequelize');
const {
  sequelize,
  Order,
  OrderItem,
  OrderTimeline,
  User,
  Product,
  DeliveryCompany,
  Coupon,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta, roundMoney } = require('../utils/helpers');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');
const couponService = require('./CouponService');
const shippingRateService = require('./ShippingRateService');
const inventoryService = require('./InventoryService');
const paymentService = require('./PaymentService');

function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return 'ORD-' + year + month + day + '-' + random;
}

class OrderService {
  async findAll(query, tenantId) {
    const { page, limit, offset } = paginate(query);
    const { status, paymentStatus, search } = query;
    const where = tenantWhere(tenantId, {});
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const result = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderTimeline, as: 'timeline', limit: 5 },
      ],
    });
    return { orders: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id, tenantId) {
    const order = await Order.findOne({
      where: tenantWhere(tenantId, { id }),
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: OrderTimeline, as: 'timeline', order: [['createdAt', 'DESC']] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  }

  async create(data, userId, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) throw new ApiError(400, 'An admin account is required to create an order');

    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) throw new ApiError(400, 'At least one item is required');

    const productIds = Array.from(
      new Set(
        items
          .map((item) => parseInt(item.productId, 10))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (productIds.length === 0) throw new ApiError(400, 'At least one item is required');

    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds }, adminId },
    });
    if (products.length !== productIds.length) {
      throw new ApiError(400, 'One or more products do not belong to this admin');
    }

    const productMap = {};
    products.forEach((product) => { productMap[product.id] = product; });

    let subtotal = 0;
    const orderItems = [];
    const couponItems = [];

    for (const item of items) {
      const productId = parseInt(item.productId, 10);
      const quantity = parseInt(item.quantity, 10);
      const product = productMap[productId];

      if (!product) throw new ApiError(400, 'One or more products are not available');
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(400, 'Invalid item quantity');
      }
      if (Number(product.quantity) < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const unitPrice = roundMoney(product.price);
      const totalPrice = roundMoney(unitPrice * quantity);
      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        image: product.image,
        quantity,
        unitPrice,
        totalPrice,
      });
      couponItems.push({
        productId: product.id,
        categoryId: product.categoryId,
        quantity,
        unitPrice,
        totalPrice,
      });
    }
    subtotal = roundMoney(subtotal);

    let quote = null;
    if (data.deliveryCompanyId && data.wilayaId && data.deliveryType) {
      const company = await DeliveryCompany.findOne({
        where: { id: data.deliveryCompanyId, adminId, active: true },
      });
      if (!company) throw new ApiError(400, 'Delivery company is not available for this store');
      quote = await shippingRateService.calculatePrice(
        data.deliveryCompanyId,
        data.wilayaId,
        data.communeId,
        data.deliveryType,
      );
    }

    const paymentMethod = paymentService.assertSupported(data.paymentMethod || 'cod');

    const customerUser = userId
      ? await User.findByPk(userId, { attributes: ['id', 'email', 'phone'] })
      : null;
    const customer = {
      userId: userId || null,
      email: (customerUser && customerUser.email) || data.email || null,
      phone: (customerUser && customerUser.phone) || data.guestPhone || null,
    };

    const order = await sequelize.transaction(async (transaction) => {
      // Lock the products and verify stock again inside the transaction so
      // concurrent orders cannot oversell the same item.
      const lockedProducts = await Product.findAll({
        where: { id: productIds, adminId },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });
      const lockedMap = {};
      lockedProducts.forEach((product) => { lockedMap[product.id] = product; });
      for (const item of items) {
        const product = lockedMap[parseInt(item.productId, 10)];
        if (!product || Number(product.quantity) < parseInt(item.quantity, 10)) {
          throw new ApiError(400, 'Insufficient stock for ' + (product ? product.name : 'one or more products'));
        }
      }

      const stockAllocations = await inventoryService.consumeStock(
        couponItems,
        adminId,
        transaction,
      );

      const couponResult = await couponService.applyToOrder({
        code: data.couponCode,
        adminId,
        items: couponItems,
        subtotal,
        customer,
        transaction,
      });

      const shippingCost = couponResult.freeShipping
        ? 0
        : roundMoney(quote ? quote.price : 0);
      const discountAmount = roundMoney(couponResult.discount);
      const total = roundMoney(Math.max(0, subtotal + shippingCost - discountAmount));

      const created = await Order.create(
        {
          orderNumber: generateOrderNumber(),
          adminId,
          userId: userId || null,
          email: customer.email,
          status: 'pending',
          paymentStatus: 'pending',
          shippingStatus: 'not_shipped',
          subtotal,
          shippingCost,
          taxAmount: 0,
          discountAmount,
          couponId: couponResult.coupon ? couponResult.coupon.id : null,
          couponCode: couponResult.coupon ? couponResult.coupon.code : null,
          total,
          paidAmount: 0,
          dueAmount: total,
          currency: data.currency || 'DZD',
          paymentMethod,
          shippingMethod: quote
            ? quote.deliveryCompanyName + ' - ' + (data.deliveryType === 'home_delivery' ? 'Home Delivery' : 'Stop Desk')
            : (data.shippingMethod || null),
          notes: data.notes || null,
          deliveryCompanyId: data.deliveryCompanyId || null,
          deliveryCompanyName: quote ? quote.deliveryCompanyName : null,
          deliveryType: data.deliveryType || null,
          wilayaId: data.wilayaId || null,
          wilayaName: quote ? quote.wilayaName : (data.wilayaName || null),
          communeId: data.communeId || null,
          communeName: data.communeName || null,
          deliveryAddress: data.deliveryAddress || data.guestAddress || null,
        },
        { transaction },
      );

      await OrderItem.bulkCreate(
        orderItems.map((item, index) => ({
          ...item,
          orderId: created.id,
          inventoryAllocations: stockAllocations[index] || [],
        })),
        { transaction },
      );

      for (const item of items) {
        await Product.decrement('quantity', {
          by: parseInt(item.quantity, 10),
          where: { id: parseInt(item.productId, 10), adminId },
          transaction,
        });
      }

      await couponService.incrementUsage(couponResult.coupon, transaction);

      await OrderTimeline.create(
        {
          orderId: created.id,
          status: 'pending',
          description: 'Order created',
          performedBy: userId,
        },
        { transaction },
      );

      return created;
    });

    return this.findById(order.id, tenantId);
  }

  async updateStatus(id, status, userId, description, tenantId) {
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'refunded'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    };

    if (allowedStatuses.indexOf(status) === -1) {
      throw new ApiError(400, 'Invalid order status');
    }

    const order = await Order.findOne({
      where: tenantWhere(tenantId, { id }),
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status === status) return this.findById(id, tenantId);
    if ((transitions[order.status] || []).indexOf(status) === -1) {
      throw new ApiError(400, `Cannot change order status from ${order.status} to ${status}`);
    }

    await sequelize.transaction(async (transaction) => {
      const shouldRestore = ['cancelled', 'refunded'].includes(status) && !order.stockRestored;

      if (shouldRestore) {
        await inventoryService.restoreStock(order, transaction);
        if (order.couponId) {
          await Coupon.decrement('usedCount', {
            by: 1,
            where: { id: order.couponId, usedCount: { [Op.gt]: 0 } },
            transaction,
          });
        }
      }

      await order.update({
        status,
        stockRestored: order.stockRestored || shouldRestore,
        ...(status === 'cancelled' ? { cancelledAt: new Date() } : {}),
        ...(status === 'refunded' ? { refundedAt: new Date() } : {}),
      }, { transaction });

      await OrderTimeline.create({
        orderId: id,
        status,
        description: description || `Order status changed to ${status}`,
        performedBy: userId,
      }, { transaction });
    });

    return this.findById(id, tenantId);
  }

  async delete(id, tenantId) {
    const order = await Order.findOne({
      where: tenantWhere(tenantId, { id }),
      include: [{ model: OrderItem, as: 'items' }],
    });
    if (!order) throw new ApiError(404, 'Order not found');

    await sequelize.transaction(async (transaction) => {
      if (!order.stockRestored) {
        await inventoryService.restoreStock(order, transaction);
        if (order.couponId) {
          await Coupon.decrement('usedCount', {
            by: 1,
            where: { id: order.couponId, usedCount: { [Op.gt]: 0 } },
            transaction,
          });
        }
      }
      await OrderItem.destroy({ where: { orderId: id }, transaction });
      await OrderTimeline.destroy({ where: { orderId: id }, transaction });
      await order.destroy({ transaction });
    });
    return true;
  }
}

module.exports = new OrderService();
