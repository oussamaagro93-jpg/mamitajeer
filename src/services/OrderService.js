const { Op } = require('sequelize');
const {
  sequelize,
  Order,
  OrderItem,
  OrderTimeline,
  User,
  Product,
  DeliveryCompany,
  Commune,
  Coupon,
} = require('../models');
const ApiError = require('../utils/ApiError');
const {
  paginate,
  getPaginationMeta,
  roundMoney,
  generateOrderNumber,
  isOrderNumberConflict,
} = require('../utils/helpers');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');
const couponService = require('./CouponService');
const shippingRateService = require('./ShippingRateService');
const inventoryService = require('./InventoryService');
const paymentService = require('./PaymentService');

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
        { guestName: { [Op.iLike]: `%${search}%` } },
        { guestPhone: { [Op.iLike]: `%${search}%` } },
      ];
    }
    // The list view only needs order columns. Keeping the hasMany includes
    // here inflated the count query and returned data the table never used.
    const result = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false,
        },
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

    // Merge duplicate product lines before checking stock so two lines of the
    // same product cannot each pass the check individually and oversell it.
    const requestedQuantities = new Map();
    for (const item of items) {
      const productId = parseInt(item.productId, 10);
      const quantity = parseInt(item.quantity, 10);
      if (!Number.isInteger(productId) || productId < 1) {
        throw new ApiError(400, 'Invalid product');
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(400, 'Invalid item quantity');
      }
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    }
    const productIds = Array.from(requestedQuantities.keys());
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

    for (const [productId, quantity] of requestedQuantities) {
      const product = productMap[productId];

      if (!product) throw new ApiError(400, 'One or more products are not available');
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

    if (!data.deliveryCompanyId || !data.wilayaId || !data.communeId || !data.deliveryType) {
      throw new ApiError(400, 'Delivery company, wilaya, commune and delivery type are required');
    }
    if (['home_delivery', 'desk_delivery'].indexOf(data.deliveryType) === -1) {
      throw new ApiError(400, 'Invalid delivery type');
    }

    const commune = await Commune.findByPk(data.communeId);
    if (!commune) throw new ApiError(400, 'Commune not found');
    if (parseInt(commune.wilayaId, 10) !== parseInt(data.wilayaId, 10)) {
      throw new ApiError(400, 'Selected commune does not belong to the selected wilaya');
    }

    const deliveryAddress = data.deliveryAddress || data.guestAddress;
    if (!deliveryAddress) throw new ApiError(400, 'Delivery address is required');

    const company = await DeliveryCompany.findOne({
      where: { id: data.deliveryCompanyId, adminId, active: true },
    });
    if (!company) throw new ApiError(400, 'Delivery company is not available for this store');
    const quote = await shippingRateService.calculatePrice(
      data.deliveryCompanyId,
      data.wilayaId,
      data.communeId,
      data.deliveryType,
    );

    const paymentMethod = paymentService.assertSupported(data.paymentMethod || 'cod');

    const customerUser = userId
      ? await User.findByPk(userId, { attributes: ['id', 'email', 'phone'] })
      : null;
    const customer = {
      userId: userId || null,
      email: (customerUser && customerUser.email) || data.email || null,
      phone: (customerUser && customerUser.phone) || data.guestPhone || null,
    };

    let order = null;
    for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
      try {
        order = await sequelize.transaction(async (transaction) => {
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
          for (const [productId, quantity] of requestedQuantities) {
            const product = lockedMap[productId];
            if (!product || Number(product.quantity) < quantity) {
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

          const shippingCost = couponResult.freeShipping ? 0 : roundMoney(quote.price);
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
              shippingMethod: quote.deliveryCompanyName + ' - ' + (data.deliveryType === 'home_delivery' ? 'Home Delivery' : 'Stop Desk'),
              notes: data.notes || null,
              deliveryCompanyId: data.deliveryCompanyId,
              deliveryCompanyName: quote.deliveryCompanyName,
              deliveryType: data.deliveryType,
              wilayaId: data.wilayaId,
              wilayaName: quote.wilayaName,
              communeId: data.communeId,
              communeName: commune.nameFr || data.communeName || null,
              deliveryAddress,
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

          for (const [productId, quantity] of requestedQuantities) {
            await Product.decrement('quantity', {
              by: quantity,
              where: { id: productId, adminId },
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
      } catch (error) {
        if (attempt < 2 && isOrderNumberConflict(error)) continue;
        throw error;
      }
    }

    if (!order) throw new ApiError(500, 'Could not generate a unique order number');
    return this.findById(order.id, tenantId);
  }

  async updateStatus(id, status, userId, description, reason, tenantId) {
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

    await sequelize.transaction(async (transaction) => {
      // Lock the row before reading the status so two concurrent requests
      // cannot both pass the transition check or restore stock twice.
      const order = await Order.findOne({
        where: tenantWhere(tenantId, { id }),
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) throw new ApiError(404, 'Order not found');
      if (order.status === status) return;
      if ((transitions[order.status] || []).indexOf(status) === -1) {
        throw new ApiError(400, `Cannot change order status from ${order.status} to ${status}`);
      }

      const shouldRestore = ['cancelled', 'refunded'].includes(status) && !order.stockRestored;

      if (shouldRestore) {
        const items = await OrderItem.findAll({ where: { orderId: id }, transaction });
        await inventoryService.restoreStock({
          ...order.get({ plain: true }),
          items: items.map((item) => item.get({ plain: true })),
        }, transaction);
        if (order.couponId) {
          await Coupon.decrement('usedCount', {
            by: 1,
            where: { id: order.couponId, usedCount: { [Op.gt]: 0 } },
            transaction,
          });
        }
      }

      const isCod = order.paymentMethod === 'cod';

      await order.update({
        status,
        stockRestored: order.stockRestored || shouldRestore,
        ...(status === 'shipped' ? { shippingStatus: 'shipped' } : {}),
        ...(status === 'delivered'
          ? {
              shippingStatus: 'delivered',
              ...(isCod
                ? {
                    paymentStatus: 'paid',
                    paidAmount: order.total,
                    dueAmount: 0,
                  }
                : {}),
            }
          : {}),
        ...(status === 'cancelled'
          ? {
              cancelledAt: new Date(),
              cancelledReason: reason ? String(reason).trim() : (order.cancelledReason || null),
            }
          : {}),
        ...(status === 'refunded'
          ? {
              refundedAt: new Date(),
              paymentStatus: 'refunded',
              dueAmount: 0,
            }
          : {}),
      }, { transaction });

      await OrderTimeline.create({
        orderId: id,
        status,
        description: description
          || (status === 'cancelled' && reason ? `Order cancelled: ${reason}` : `Order status changed to ${status}`),
        performedBy: userId,
      }, { transaction });
    });

    return this.findById(id, tenantId);
  }

  async updatePayment(id, data, userId, tenantId) {
    const allowedStatuses = ['pending', 'paid', 'partially_paid', 'refunded', 'failed'];
    if (allowedStatuses.indexOf(data.paymentStatus) === -1) {
      throw new ApiError(400, 'Invalid payment status');
    }

    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: tenantWhere(tenantId, { id }),
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) throw new ApiError(404, 'Order not found');

      const total = roundMoney(order.total);
      const currentPaid = roundMoney(order.paidAmount || 0);
      let paidAmount;
      let dueAmount;

      if (data.paymentStatus === 'paid') {
        paidAmount = total;
        dueAmount = 0;
      } else if (data.paymentStatus === 'partially_paid') {
        const requestedPaid = data.paidAmount !== undefined && data.paidAmount !== null && data.paidAmount !== ''
          ? Number(data.paidAmount)
          : currentPaid;
        if (!Number.isFinite(requestedPaid)) {
          throw new ApiError(400, 'Invalid partial payment amount');
        }
        paidAmount = roundMoney(requestedPaid);
        if (paidAmount <= 0 || paidAmount >= total) {
          throw new ApiError(400, 'Partial payment must be greater than 0 and less than the order total');
        }
        dueAmount = roundMoney(total - paidAmount);
      } else if (data.paymentStatus === 'refunded') {
        paidAmount = 0;
        dueAmount = 0;
      } else {
        paidAmount = 0;
        dueAmount = total;
      }

      const paymentReference = data.paymentReference !== undefined
        ? (String(data.paymentReference || '').trim() || null)
        : order.paymentReference;

      await order.update({
        paymentStatus: data.paymentStatus,
        paidAmount,
        dueAmount,
        paymentReference,
      }, { transaction });

      await OrderTimeline.create({
        orderId: id,
        status: data.paymentStatus,
        description: `Payment status changed to ${data.paymentStatus}`,
        performedBy: userId,
      }, { transaction });
    });

    return this.findById(id, tenantId);
  }

  async updateTracking(id, trackingNumber, userId, tenantId) {
    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: tenantWhere(tenantId, { id }),
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) throw new ApiError(404, 'Order not found');

      const value = trackingNumber === undefined || trackingNumber === null
        ? ''
        : String(trackingNumber).trim();

      await order.update({ trackingNumber: value || null }, { transaction });

      await OrderTimeline.create({
        orderId: id,
        status: order.status,
        description: value ? `Tracking number updated to ${value}` : 'Tracking number cleared',
        performedBy: userId,
      }, { transaction });
    });

    return this.findById(id, tenantId);
  }

  async delete(id, tenantId) {
    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: tenantWhere(tenantId, { id }),
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) throw new ApiError(404, 'Order not found');
      if (['pending', 'cancelled'].indexOf(order.status) === -1) {
        throw new ApiError(400, 'Only pending or cancelled orders can be deleted');
      }

      if (!order.stockRestored) {
        const items = await OrderItem.findAll({ where: { orderId: id }, transaction });
        await inventoryService.restoreStock({
          ...order.get({ plain: true }),
          items: items.map((item) => item.get({ plain: true })),
        }, transaction);
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
