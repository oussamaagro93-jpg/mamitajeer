const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');

class UserService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search, role, isActive } = query;
    const where = {};
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const result = await User.findAndCountAll({ where, limit, offset, order: [['createdAt', 'DESC']] });
    return { users: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const user = await User.findByPk(id);
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  async create(data) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) throw new ApiError(400, 'Email already in use');
    return User.create(data);
  }

  async update(id, data) {
    const user = await User.findByPk(id);
    if (!user) throw new ApiError(404, 'User not found');
    return user.update(data);
  }

  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) throw new ApiError(404, 'User not found');
    await user.destroy();
    return true;
  }
}

module.exports = new UserService();
