const { Order, OrderItem, OrderTimeline, Invoice, User, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');

class OrderService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { status, paymentStatus, search } = query;
    const where = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      const { Op } = require('sequelize');
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

  async findById(id) {
    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        { model: OrderTimeline, as: 'timeline', order: [['createdAt', 'DESC']] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  }

  async create(data, userId) {
    const order = await Order.create({ ...data, userId });
    if (data.items) {
      const orderItems = data.items.map((item) => ({ ...item, orderId: order.id }));
      await OrderItem.bulkCreate(orderItems);
    }
    await OrderTimeline.create({ orderId: order.id, status: 'pending', description: 'Order created', performedBy: userId });
    return this.findById(order.id);
  }

  async updateStatus(id, status, userId, description) {
    const order = await Order.findByPk(id);
    if (!order) throw new ApiError(404, 'Order not found');
    await order.update({ status, ...(status === 'cancelled' ? { cancelledAt: new Date() } : {}) });
    await OrderTimeline.create({
      orderId: id,
      status,
      description: description || `Order status changed to ${status}`,
      performedBy: userId,
    });
    return this.findById(id);
  }

  async delete(id) {
    const order = await Order.findByPk(id);
    if (!order) throw new ApiError(404, 'Order not found');
    await OrderItem.destroy({ where: { orderId: id } });
    await OrderTimeline.destroy({ where: { orderId: id } });
    await order.destroy();
    return true;
  }
}

module.exports = new OrderService();
