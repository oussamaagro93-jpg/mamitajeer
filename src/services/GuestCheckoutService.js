const { Order, OrderItem, OrderTimeline, Product, ProductImage, Wilaya, Commune, DeliveryCompany } = require('../models');
const { sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { roundMoney, generateOrderNumber, isOrderNumberConflict } = require('../utils/helpers');
const shippingRateService = require('./ShippingRateService');
const couponService = require('./CouponService');
const inventoryService = require('./InventoryService');
const metaService = require('./MetaService');

class GuestCheckoutService {
  async checkout(data) {
    const { items, guestName, guestPhone, guestWilaya, guestCity, guestAddress, notes, wilayaId, communeId, deliveryCompanyId, deliveryType } = data;

    if (!items || !items.length) {
      throw new ApiError(400, 'At least one item is required');
    }
    if (!guestName || !guestPhone || !guestAddress) {
      throw new ApiError(400, 'Full name, phone and address are required');
    }
    if (!wilayaId || !communeId) {
      throw new ApiError(400, 'Wilaya and commune are required');
    }

    // Resolve location names server-side so the client cannot send mismatched values
    const wilaya = await Wilaya.findByPk(wilayaId);
    if (!wilaya) throw new ApiError(400, 'Wilaya not found');

    const commune = await Commune.findByPk(communeId);
    if (!commune) throw new ApiError(400, 'Commune not found');

    if (parseInt(commune.wilayaId, 10) !== parseInt(wilayaId, 10)) {
      throw new ApiError(400, 'Selected commune does not belong to the selected wilaya');
    }

    const wilayaName = guestWilaya || wilaya.nameFr;
    const cityName = guestCity || commune.nameFr;

    // Aggregate quantities per product so duplicate cart lines cannot bypass
    // the stock check or produce an incorrect products-length comparison.
    var requestedQuantities = new Map();
    items.forEach(function (item) {
      var productId = parseInt(item.productId, 10);
      var quantity = parseInt(item.quantity, 10);
      if (!Number.isInteger(productId) || productId < 1) {
        throw new ApiError(400, 'Invalid product');
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(400, 'Invalid item quantity');
      }
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    });
    const productIds = Array.from(requestedQuantities.keys());

    const products = await Product.findAll({
      where: { id: productIds, status: 'published' },
      include: [
        { model: ProductImage, as: 'images', where: { isPrimary: true }, required: false, limit: 1 },
      ],
    });

    if (products.length !== productIds.length) {
      throw new ApiError(400, 'One or more products not found or not available');
    }

    const productMap = {};
    products.forEach(function (p) { productMap[p.id] = p; });

    // All items in one order must belong to the same admin tenant.
    const orderAdminId = products[0].adminId;
    if (!orderAdminId) {
      throw new ApiError(400, 'Product owner is not configured');
    }
    const crossTenant = products.some(function (p) { return p.adminId !== orderAdminId; });
    if (crossTenant) {
      throw new ApiError(400, 'All items in an order must belong to the same store');
    }

    let subtotal = 0;
    const orderItems = [];
    const couponItems = [];

    for (const [productId, quantity] of requestedQuantities) {
      const product = productMap[productId];
      if (!product) {
        throw new ApiError(400, 'Product ' + productId + ' not found');
      }
      if (Number(product.quantity) < quantity) {
        throw new ApiError(400, 'Insufficient stock for ' + product.name);
      }

      const unitPrice = roundMoney(product.price);
      const totalPrice = roundMoney(unitPrice * quantity);

      subtotal += totalPrice;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        image: product.image || (product.images && product.images.length > 0 ? product.images[0].url : null),
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
      });
      couponItems.push({
        productId: product.id,
        categoryId: product.categoryId,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
      });
    }
    subtotal = roundMoney(subtotal);

    // The delivery company is chosen on the product. Fall back to the
    // client-provided company only for legacy products without one.
    const productDeliveryCompanyId = products
      .map(function (p) { return p.deliveryCompanyId; })
      .find(function (id) { return !!id; }) || null;
    const effectiveDeliveryCompanyId = productDeliveryCompanyId || deliveryCompanyId;
    const effectiveDeliveryType = deliveryType || 'home_delivery';

    if (!effectiveDeliveryCompanyId) {
      throw new ApiError(400, 'Delivery company is required');
    }

    const deliveryCompany = await DeliveryCompany.findOne({
      where: { id: effectiveDeliveryCompanyId, adminId: orderAdminId, active: true },
    });
    if (!deliveryCompany) {
      throw new ApiError(400, 'Delivery company is not available for this store');
    }

    // Backend-calculated shipping price (never trust the frontend)
    const quote = await shippingRateService.calculatePrice(
      effectiveDeliveryCompanyId,
      wilayaId,
      communeId,
      effectiveDeliveryType,
    );

    const normalizedGuestPhone = couponService.normalizePhone(guestPhone) || guestPhone;

    let transactionResult = null;
    for (let attempt = 0; attempt < 3 && !transactionResult; attempt += 1) {
      try {
        transactionResult = await sequelize.transaction(async function (t) {
      // Lock product rows so two concurrent checkouts cannot both pass the
      // earlier stock check and oversell the same item.
      const lockedProducts = await Product.findAll({
        where: { id: productIds, adminId: orderAdminId },
        transaction: t,
        lock: t.LOCK.UPDATE,
        order: [['id', 'ASC']],
      });
      const lockedMap = {};
      lockedProducts.forEach(function (product) { lockedMap[product.id] = product; });
      for (const [productId, quantity] of requestedQuantities) {
        const product = lockedMap[productId];
        if (!product || Number(product.quantity) < quantity) {
          throw new ApiError(400, 'Insufficient stock for ' + (product ? product.name : 'one or more products'));
        }
      }

      const stockAllocations = await inventoryService.consumeStock(
        couponItems,
        orderAdminId,
        t,
      );

      // Re-validate the coupon inside the transaction. The coupon row is
      // locked so concurrent checkouts cannot exceed its global usage limit.
      const couponResult = await couponService.applyToOrder({
        code: data.couponCode,
        adminId: orderAdminId,
        items: couponItems,
        subtotal: subtotal,
        customer: { phone: normalizedGuestPhone },
        transaction: t,
      });

      const shippingCost = couponResult.freeShipping ? 0 : roundMoney(quote.price);
      const discountAmount = roundMoney(couponResult.discount);
      const total = roundMoney(Math.max(0, subtotal + shippingCost - discountAmount));

      const createdOrder = await Order.create(
        {
          orderNumber: generateOrderNumber('GST'),
          adminId: orderAdminId,
          email: '',
          subtotal: subtotal,
          shippingCost: shippingCost,
          shippingMethod: quote.deliveryCompanyName + ' - ' + (effectiveDeliveryType === 'home_delivery' ? 'Home Delivery' : 'Stop Desk'),
          taxAmount: 0,
          discountAmount: discountAmount,
          couponId: couponResult.coupon ? couponResult.coupon.id : null,
          couponCode: couponResult.coupon ? couponResult.coupon.code : null,
          total: total,
          paidAmount: 0,
          dueAmount: total,
          currency: 'DZD',
          paymentMethod: 'cod',
          status: 'pending',
          paymentStatus: 'pending',
          shippingStatus: 'not_shipped',
          guestName: guestName,
          guestPhone: normalizedGuestPhone,
          guestWilaya: wilayaName,
          guestCity: cityName,
          guestAddress: guestAddress,
          notes: notes || null,
          // Structured delivery snapshot
          deliveryCompanyId: effectiveDeliveryCompanyId,
          deliveryCompanyName: quote.deliveryCompanyName,
          deliveryType: effectiveDeliveryType,
          wilayaId: wilayaId,
          wilayaName: wilaya.nameFr,
          communeId: communeId,
          communeName: commune.nameFr,
          deliveryAddress: guestAddress,
        },
        { transaction: t },
      );

      const itemsWithOrderId = orderItems.map(function (oi, index) {
        return {
          ...oi,
          orderId: createdOrder.id,
          inventoryAllocations: stockAllocations[index] || [],
        };
      });
      await OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

      await OrderTimeline.create(
        {
          orderId: createdOrder.id,
          status: 'pending',
          description: 'Guest order placed via COD with ' + quote.deliveryCompanyName,
          performedBy: 'guest',
        },
        { transaction: t },
      );

      for (const [productId, quantity] of requestedQuantities) {
        await Product.decrement('quantity', {
          by: quantity,
          where: { id: productId, adminId: orderAdminId },
          transaction: t,
        });
      }

      await couponService.incrementUsage(couponResult.coupon, t);

      return {
        order: createdOrder,
        couponResult: couponResult,
        shippingCost: shippingCost,
        discountAmount: discountAmount,
        total: total,
      };
        });
      } catch (error) {
        if (attempt < 2 && isOrderNumberConflict(error)) continue;
        throw error;
      }
    }

    if (!transactionResult) {
      throw new ApiError(500, 'Could not generate a unique order number');
    }
    const order = transactionResult.order;
    const result = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderTimeline, as: 'timeline' },
      ],
    });

    var orderResult = {
      orderNumber: result.orderNumber,
      id: result.id,
      status: result.status,
      paymentMethod: result.paymentMethod,
      subtotal: result.subtotal,
      shippingCost: result.shippingCost,
      discountAmount: result.discountAmount,
      couponCode: result.couponCode,
      couponApplied: !!result.couponCode,
      total: result.total,
      currency: result.currency,
      guestName: result.guestName,
      guestPhone: result.guestPhone,
      guestWilaya: result.guestWilaya,
      guestCity: result.guestCity,
      guestAddress: result.guestAddress,
      deliveryCompanyName: result.deliveryCompanyName,
      deliveryType: result.deliveryType,
      wilayaName: result.wilayaName,
      communeName: result.communeName,
      items: result.items,
      createdAt: result.createdAt,
    };

    metaService.sendEvent({
      event_name: 'Purchase',
      event_id: orderResult.orderNumber,
      event_time: Math.floor(result.createdAt.getTime() / 1000),
      user_data: {
        ph: guestPhone,
        fn: guestName.split(' ')[0] || guestName,
        ln: guestName.split(' ').slice(1).join(' ') || '',
        ct: cityName,
        st: wilayaName,
        country: 'DZ',
      },
      custom_data: {
        content_ids: items.map(function (i) { return String(i.productId); }),
        content_type: 'product',
        contents: items.map(function (i) {
          return { id: String(i.productId), quantity: i.quantity, item_price: i.unitPrice };
        }),
        currency: 'DZD',
        value: Number(result.total),
        num_items: items.length,
        order_id: orderResult.orderNumber,
      },
      meta_browser_data: {},
    });

    return orderResult;
  }
}

module.exports = new GuestCheckoutService();
