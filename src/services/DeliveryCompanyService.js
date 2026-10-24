const { DeliveryCompany } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');

class DeliveryCompanyService {
  async findAll(query, tenantId) {
    const { page, limit, offset } = paginate(query);
    const { search, active } = query;
    const where = tenantWhere(tenantId, {});
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

  async findById(id, tenantId) {
    const company = await DeliveryCompany.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!company) throw new ApiError(404, 'Delivery company not found');
    return company;
  }

  async findByCode(code, tenantId) {
    return DeliveryCompany.findOne({ where: tenantWhere(tenantId, { code }) });
  }

  async create(data, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) throw new ApiError(400, 'An admin account is required to create a delivery company');
    const existing = await DeliveryCompany.findOne({ where: { code: data.code, adminId } });
    if (existing) throw new ApiError(400, 'A delivery company with this code already exists');
    return DeliveryCompany.create({ ...data, adminId });
  }

  async update(id, data, tenantId) {
    const company = await DeliveryCompany.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!company) throw new ApiError(404, 'Delivery company not found');
    delete data.adminId;
    if (data.code && data.code !== company.code) {
      const existing = await DeliveryCompany.findOne({ where: { code: data.code, adminId: company.adminId } });
      if (existing) throw new ApiError(400, 'A delivery company with this code already exists');
    }
    return company.update(data);
  }

  async delete(id, tenantId) {
    const company = await DeliveryCompany.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!company) throw new ApiError(404, 'Delivery company not found');
    await company.destroy();
    return true;
  }

  async getActive(tenantId) {
    const where = { active: true };
    if (tenantId) where.adminId = tenantId;
    return DeliveryCompany.findAll({
      where,
      order: [['name', 'ASC']],
    });
  }
}

module.exports = new DeliveryCompanyService();
