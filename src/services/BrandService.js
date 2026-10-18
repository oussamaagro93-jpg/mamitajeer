const { Brand } = require('../models');
const ApiError = require('../utils/ApiError');
const { createSlug, paginate, getPaginationMeta } = require('../utils/helpers');

class BrandService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search } = query;
    const where = {};
    if (search) where.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    const result = await Brand.findAndCountAll({ where, limit, offset, order: [['name', 'ASC']] });
    return { brands: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const brand = await Brand.findByPk(id);
    if (!brand) throw new ApiError(404, 'Brand not found');
    return brand;
  }

  async create(data) {
    const slug = data.slug || createSlug(data.name);
    return Brand.create({ ...data, slug });
  }

  async update(id, data) {
    const brand = await Brand.findByPk(id);
    if (!brand) throw new ApiError(404, 'Brand not found');
    return brand.update(data);
  }

  async delete(id) {
    const brand = await Brand.findByPk(id);
    if (!brand) throw new ApiError(404, 'Brand not found');
    await brand.destroy();
    return true;
  }
}

module.exports = new BrandService();
