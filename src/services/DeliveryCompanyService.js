const { DeliveryCompany } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

class DeliveryCompanyService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search, active } = query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { contactPerson: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (active !== undefined) {
      where.active = active === 'true' || active === true;
    }
    const result = await DeliveryCompany.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
    });
    return { companies: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const company = await DeliveryCompany.findByPk(id);
    if (!company) throw new ApiError(404, 'Delivery company not found');
    return company;
  }

  async findByCode(code) {
    return DeliveryCompany.findOne({ where: { code } });
  }

  async create(data) {
    const existing = await DeliveryCompany.findOne({ where: { code: data.code } });
    if (existing) throw new ApiError(400, 'A delivery company with this code already exists');
    return DeliveryCompany.create(data);
  }

  async update(id, data) {
    const company = await DeliveryCompany.findByPk(id);
    if (!company) throw new ApiError(404, 'Delivery company not found');
    if (data.code && data.code !== company.code) {
      const existing = await DeliveryCompany.findOne({ where: { code: data.code } });
      if (existing) throw new ApiError(400, 'A delivery company with this code already exists');
    }
    return company.update(data);
  }

  async delete(id) {
    const company = await DeliveryCompany.findByPk(id);
    if (!company) throw new ApiError(404, 'Delivery company not found');
    await company.destroy();
    return true;
  }

  async getActive() {
    return DeliveryCompany.findAll({
      where: { active: true },
      order: [['name', 'ASC']],
    });
  }
}

module.exports = new DeliveryCompanyService();
