const { Order, OrderItem, OrderTimeline, Product, ProductImage, Wilaya, Commune, DeliveryCompany } = require('../models');
const { sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const shippingRateService = require('./ShippingRateService');
const metaService = require('./MetaService');

class GuestCheckoutService {
  async checkout(data) {
    const { items, guestName, guestPhone, guestWilaya, guestCity, guestAddress, notes, wilayaId, communeId, deliveryCompanyId, deliveryType } = data;

    if (!items || !items.length) {
      throw new ApiError(400, 'At least one item is required');
    }
    if (!guestName || !guestPhone || !guestWilaya || !guestCity || !guestAddress) {
      throw new ApiError(400, 'All guest customer fields are required');
    }

    const productIds = items.map(function (i) { return i.productId; });
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

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        throw new ApiError(400, 'Product ' + item.productId + ' not found');
      }
      if (product.quantity < item.quantity) {
        throw new ApiError(400, 'Insufficient stock for ' + product.name);
      }

      const unitPrice = parseFloat(product.price);
      const quantity = parseInt(item.quantity, 10) || 1;
      const totalPrice = unitPrice * quantity;

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
    }

    // Backend-calculated shipping price (never trust the frontend)
    const quote = await shippingRateService.calculatePrice(
      deliveryCompanyId,
      wilayaId,
      communeId,
      deliveryType,
    );

    const shippingCost = quote.price;

    // Get names for snapshot
    const wilaya = await Wilaya.findByPk(wilayaId);
    const commune = await Commune.findByPk(communeId);
    const company = await DeliveryCompany.findByPk(deliveryCompanyId);

    const total = subtotal + shippingCost;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    const orderNumber = 'GST-' + year + month + day + '-' + rand;

    const order = await sequelize.transaction(async function (t) {
      const createdOrder = await Order.create(
        {
          orderNumber: orderNumber,
          email: '',
          subtotal: subtotal,
          shippingCost: shippingCost,
          shippingMethod: quote.deliveryCompanyName + ' - ' + (deliveryType === 'home_delivery' ? 'Home Delivery' : 'Stop Desk'),
          taxAmount: 0,
          discountAmount: 0,
          total: total,
          paidAmount: 0,
          dueAmount: total,
          currency: 'DZD',
          paymentMethod: 'cod',
          status: 'pending',
          paymentStatus: 'pending',
          shippingStatus: 'not_shipped',
          guestName: guestName,
          guestPhone: guestPhone,
          guestWilaya: guestWilaya,
          guestCity: guestCity,
          guestAddress: guestAddress,
          notes: notes || null,
          // Structured delivery snapshot
          deliveryCompanyId: deliveryCompanyId,
          deliveryCompanyName: quote.deliveryCompanyName,
          deliveryType: deliveryType,
          wilayaId: wilayaId,
          wilayaName: wilaya ? wilaya.nameFr : guestWilaya,
          communeId: communeId,
          communeName: commune ? commune.nameFr : guestCity,
          deliveryAddress: guestAddress,
        },
        { transaction: t },
      );

      const itemsWithOrderId = orderItems.map(function (oi) {
        return { ...oi, orderId: createdOrder.id };
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

      for (const item of items) {
        const product = productMap[item.productId];
        await Product.decrement('quantity', { by: item.quantity, where: { id: item.productId }, transaction: t });
      }

      return createdOrder;
    });

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
        ct: guestCity,
        st: guestWilaya,
        country: 'DZ',
      },
      custom_data: {
        content_ids: items.map(function (i) { return String(i.productId); }),
        content_type: 'product',
        contents: items.map(function (i) {
          return { id: String(i.productId), quantity: i.quantity, item_price: i.unitPrice };
        }),
        currency: 'DZD',
        value: total,
        num_items: items.length,
        order_id: orderResult.orderNumber,
      },
      meta_browser_data: {},
    });

    return orderResult;
  }
}

module.exports = new GuestCheckoutService();
