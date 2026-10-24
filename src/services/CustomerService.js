const { User, Address, Order, Review, WishlistItem } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const { tenantWhere } = require('../utils/tenant');

class CustomerService {
  async findAll(query, tenantId) {
    const { page, limit, offset } = paginate(query);
    const { search } = query;
    const where = tenantWhere(tenantId, { role: 'customer' });
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

  async findById(id, tenantId) {
    const customer = await User.findOne({
      where: tenantWhere(tenantId, { id, role: 'customer' }),
      include: [
        { model: Address, as: 'addresses' },
        { model: Order, as: 'orders', limit: 10, order: [['createdAt', 'DESC']] },
        { model: Review, as: 'reviews', limit: 5, order: [['createdAt', 'DESC']] },
      ],
    });
    if (!customer) throw new ApiError(404, 'Customer not found');
    return customer;
  }

  async update(id, data, tenantId) {
    const customer = await User.findOne({ where: tenantWhere(tenantId, { id, role: 'customer' }) });
    if (!customer) throw new ApiError(404, 'Customer not found');
    delete data.role;
    delete data.adminId;
    delete data.permissions;
    return customer.update(data);
  }

  async delete(id, tenantId) {
    const customer = await User.findOne({ where: tenantWhere(tenantId, { id, role: 'customer' }) });
    if (!customer) throw new ApiError(404, 'Customer not found');
    await Address.destroy({ where: { userId: id } });
    await Review.destroy({ where: { userId: id } });
    await Order.update({ userId: null }, { where: { userId: id, adminId: customer.adminId } });
    await customer.destroy();
    return true;
  }
}

module.exports = new CustomerService();
