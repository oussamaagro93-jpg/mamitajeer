const categoryRepository = require('../repositories/CategoryRepository');
const ApiError = require('../utils/ApiError');
const { createSlug, paginate, getPaginationMeta } = require('../utils/helpers');

class CategoryService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search } = query;
    const where = {};
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

  async getTree() {
    return categoryRepository.getCategoryTree();
  }

  async findById(id) {
    const category = await categoryRepository.findById(id, {
      include: [{ model: require('../models').Category, as: 'parent' }],
    });
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  }

  async create(data) {
    const slug = data.slug || createSlug(data.name);
    const existing = await categoryRepository.findBySlug(slug);
    if (existing) throw new ApiError(400, 'Category slug already exists');
    return categoryRepository.create({ ...data, slug });
  }

  async update(id, data) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');
    if (data.name && data.name !== category.name) {
      data.slug = createSlug(data.name);
    }
    return category.update(data);
  }

  async delete(id) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');
    const childCount = await require('../models').Category.count({ where: { parentId: id } });
    if (childCount > 0) throw new ApiError(400, 'Cannot delete category with children');
    await category.destroy();
    return true;
  }
}

module.exports = new CategoryService();
