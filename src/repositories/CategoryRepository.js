const BaseRepository = require('./BaseRepository');
const { Category } = require('../models');

class CategoryRepository extends BaseRepository {
  constructor() {
    super(Category);
  }

  async findBySlug(slug, adminId) {
    const where = { slug };
    if (adminId) where.adminId = adminId;
    return this.findOne({ where });
  }

  async findAllWithChildren() {
    return this.findAll({
      where: { parentId: null },
      include: [{ model: Category, as: 'children', hierarchy: true }],
      order: [['sortOrder', 'ASC']],
    });
  }

  async getCategoryTree(where = {}) {
    const result = await this.findAll({ where, order: [['sortOrder', 'ASC']] });
    const categories = result.rows || result;
    const map = {};
    const roots = [];
    categories.forEach((cat) => {
      map[cat.id] = { ...cat.toJSON(), children: [] };
    });
    categories.forEach((cat) => {
      if (cat.parentId) {
        if (map[cat.parentId]) {
          map[cat.parentId].children.push(map[cat.id]);
        }
      } else {
        roots.push(map[cat.id]);
      }
    });
    return roots;
  }
}

module.exports = new CategoryRepository();
