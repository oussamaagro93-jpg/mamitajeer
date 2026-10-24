const BaseRepository = require('./BaseRepository');
const { Product, ProductImage, ProductVariant, Category, Brand, DeliveryCompany, RelatedProduct } = require('../models');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  async findBySku(sku, adminId) {
    const where = { sku };
    if (adminId) where.adminId = adminId;
    return this.findOne({ where });
  }

  async findBySlug(slug, options = {}) {
    return this.findOne({
      where: { slug },
      include: [
        { model: Category, as: 'category' },
        { model: Brand, as: 'brand' },
        { model: DeliveryCompany, as: 'deliveryCompany', attributes: ['id', 'name', 'code', 'active'] },
        { model: ProductImage, as: 'images' },
        { model: ProductVariant, as: 'variants' },
        {
          model: Product,
          as: 'relatedProducts',
          through: { attributes: ['sortOrder'] },
          attributes: ['id', 'name', 'slug', 'price', 'image'],
          include: [{ model: ProductImage, as: 'images', attributes: ['id', 'url', 'alt'], limit: 1 }],
        },
      ],
      ...options,
    });
  }

  async findAllWithDetails(options = {}) {
    const defaults = {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
        { model: DeliveryCompany, as: 'deliveryCompany', attributes: ['id', 'name', 'code', 'active'] },
        { model: ProductImage, as: 'images', where: { isPrimary: true }, required: false, limit: 1 },
      ],
      distinct: true,
    };
    const merged = { ...defaults, ...options };
    return this.findAll(merged);
  }

  async search(term, options = {}) {
    const { Op } = this.model.sequelize.Sequelize;
    const where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${term}%` } },
        { sku: { [Op.iLike]: `%${term}%` } },
        { barcode: { [Op.iLike]: `%${term}%` } },
      ],
    };
    return this.findAllWithDetails({ ...options, where });
  }
}

module.exports = new ProductRepository();
