const { User, Address, Order, Review, WishlistItem } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');

class CustomerService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search } = query;
    const where = { role: 'customer' };
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const result = await User.findAndCountAll({ where, limit, offset, order: [['createdAt', 'DESC']] });
    return { customers: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const customer = await User.findByPk(id, {
      include: [
        { model: Address, as: 'addresses' },
        { model: Order, as: 'orders', limit: 10, order: [['createdAt', 'DESC']] },
        { model: Review, as: 'reviews', limit: 5, order: [['createdAt', 'DESC']] },
      ],
    });
    if (!customer) throw new ApiError(404, 'Customer not found');
    return customer;
  }

  async update(id, data) {
    const customer = await User.findByPk(id);
    if (!customer) throw new ApiError(404, 'Customer not found');
    return customer.update(data);
  }

  async delete(id) {
    const customer = await User.findByPk(id);
    if (!customer) throw new ApiError(404, 'Customer not found');
    await Address.destroy({ where: { userId: id } });
    await Review.destroy({ where: { userId: id } });
    await Order.update({ userId: null }, { where: { userId: id } });
    await customer.destroy();
    return true;
  }
}

module.exports = new CustomerService();
