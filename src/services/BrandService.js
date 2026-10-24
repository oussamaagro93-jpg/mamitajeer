const { Brand } = require('../models');
const ApiError = require('../utils/ApiError');
const { createSlug, paginate, getPaginationMeta } = require('../utils/helpers');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');

class BrandService {
  async findAll(query, options = {}) {
    const { page, limit, offset } = paginate(query);
    const { search } = query;
    const where = {};
    if (options.tenantId) where.adminId = options.tenantId;
    if (options.publicOnly) where.isActive = true;
    if (search) where.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    const result = await Brand.findAndCountAll({ where, limit, offset, order: [['name', 'ASC']] });
    return { brands: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id, tenantId) {
    const brand = await Brand.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!brand) throw new ApiError(404, 'Brand not found');
    return brand;
  }

  async create(data, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) throw new ApiError(400, 'An admin account is required to create a brand');
    const slug = data.slug || createSlug(data.name);
    const existingName = await Brand.findOne({ where: { name: data.name, adminId } });
    if (existingName) throw new ApiError(400, 'A brand with this name already exists');
    const existingSlug = await Brand.findOne({ where: { slug, adminId } });
    if (existingSlug) throw new ApiError(400, 'Brand slug already exists');
    return Brand.create({ ...data, slug, adminId });
  }

  async update(id, data, tenantId) {
    const brand = await Brand.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!brand) throw new ApiError(404, 'Brand not found');
    delete data.adminId;
    const { Op } = require('sequelize');
    if (data.name && data.name !== brand.name) {
      const existingName = await Brand.findOne({
        where: { name: data.name, adminId: brand.adminId, id: { [Op.ne]: brand.id } },
      });
      if (existingName) throw new ApiError(400, 'A brand with this name already exists');
      if (!data.slug) data.slug = createSlug(data.name);
    }
    if (data.slug && data.slug !== brand.slug) {
      const existingSlug = await Brand.findOne({
        where: { slug: data.slug, adminId: brand.adminId, id: { [Op.ne]: brand.id } },
      });
      if (existingSlug) throw new ApiError(400, 'Brand slug already exists');
    }
    return brand.update(data);
  }

  async delete(id, tenantId) {
    const brand = await Brand.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!brand) throw new ApiError(404, 'Brand not found');
    await brand.destroy();
    return true;
  }
}

module.exports = new BrandService();
