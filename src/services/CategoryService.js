const categoryRepository = require('../repositories/CategoryRepository');
const ApiError = require('../utils/ApiError');
const { createSlug, paginate, getPaginationMeta } = require('../utils/helpers');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');

class CategoryService {
  async findAll(query, options = {}) {
    const { page, limit, offset } = paginate(query);
    const { search } = query;
    const where = {};
    if (options.tenantId) where.adminId = options.tenantId;
    if (options.publicOnly) where.isActive = true;
    if (search) {
      where.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    }
    const result = await categoryRepository.findAll({
      where,
      limit,
      offset,
      order: [['sortOrder', 'ASC']],
    });
    return { categories: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async getTree(tenantId, publicOnly) {
    const where = tenantWhere(tenantId, {});
    if (publicOnly) where.isActive = true;
    return categoryRepository.getCategoryTree(where);
  }

  async findById(id, tenantId) {
    const category = await categoryRepository.findOne({
      where: tenantWhere(tenantId, { id }),
      include: [{ model: require('../models').Category, as: 'parent' }],
    });
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  }

  async create(data, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) throw new ApiError(400, 'An admin account is required to create a category');

    if (data.parentId) {
      const parent = await categoryRepository.findOne({ where: { id: data.parentId, adminId } });
      if (!parent) throw new ApiError(400, 'Parent category does not belong to this admin');
    }

    const slug = data.slug || createSlug(data.name);
    const existing = await categoryRepository.findBySlug(slug, adminId);
    if (existing) throw new ApiError(400, 'Category slug already exists');
    return categoryRepository.create({ ...data, slug, adminId });
  }

  async update(id, data, tenantId) {
    const category = await categoryRepository.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!category) throw new ApiError(404, 'Category not found');

    delete data.adminId;
    if (data.parentId) {
      const parent = await categoryRepository.findOne({
        where: { id: data.parentId, adminId: category.adminId },
      });
      if (!parent) throw new ApiError(400, 'Parent category does not belong to this admin');
    }

    if (data.name && data.name !== category.name) {
      data.slug = createSlug(data.name);
    }
    return category.update(data);
  }

  async delete(id, tenantId) {
    const category = await categoryRepository.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!category) throw new ApiError(404, 'Category not found');

    const childCount = await require('../models').Category.count({
      where: { parentId: id, adminId: category.adminId },
    });
    if (childCount > 0) throw new ApiError(400, 'Cannot delete category with children');
    await category.destroy();
    return true;
  }
}

module.exports = new CategoryService();
