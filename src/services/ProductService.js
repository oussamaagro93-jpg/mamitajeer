const { Op } = require('sequelize');
const productRepository = require('../repositories/ProductRepository');
const ApiError = require('../utils/ApiError');
const { createSlug, generateSKU, generateBarcode, paginate, getPaginationMeta } = require('../utils/helpers');
const { ProductImage, ProductVariant, Category, Brand, DeliveryCompany, Coupon, Product, RelatedProduct, User } = require('../models');
const cloudinaryService = require('./cloudinaryService');
const storeProfileService = require('./StoreProfileService');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');

class ProductService {
  async generateUniqueSlug(name, excludeId) {
    // Product slugs are globally unique even for soft-deleted rows. Check with
    // paranoid: false so a deleted product's slug is never reused, otherwise
    // the insert fails against the database's unique slug index.
    const baseSlug = createSlug(name) || 'product';
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const where = { slug };
      if (excludeId) where.id = { [Op.ne]: excludeId };
      const existing = await Product.findOne({ where, paranoid: false });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async findAll(query, options = {}) {
    const { page, limit, offset } = paginate(query);
    const { search, categoryId, brandId, status, minPrice, maxPrice, sortBy, sortOrder, isFeatured, ids, available } = query;

    const where = {};
    if (options.tenantId) where.adminId = options.tenantId;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (ids !== undefined && ids !== null && ids !== '') {
      const idList = (Array.isArray(ids) ? ids : String(ids).split(','))
        .map(function (value) { return parseInt(value, 10); })
        .filter(function (value) { return Number.isInteger(value) && value > 0; });
      if (idList.length === 0) {
        return {
          products: [],
          pagination: getPaginationMeta(0, page, limit),
        };
      }
      where.id = { [Op.in]: Array.from(new Set(idList)) };
    }
    if (options.publicOnly) {
      where.status = 'published';
    } else if (status) {
      where.status = status;
    }
    if (available === 'true' || available === true) {
      where.quantity = { [Op.gt]: 0 };
    }
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    const order = [];
    if (sortBy) {
      order.push([sortBy, sortOrder || 'DESC']);
    } else {
      order.push(['createdAt', 'DESC']);
    }

    const result = await productRepository.findAllWithDetails({
      where,
      order,
      limit,
      offset,
    });

    return {
      products: result.rows,
      pagination: getPaginationMeta(result.count, page, limit),
    };
  }

  async findById(id, tenantId) {
    const product = await productRepository.findOne({
      where: tenantWhere(tenantId, { id }),
      include: [
        { model: Category, as: 'category' },
        { model: Brand, as: 'brand' },
        {
          model: Coupon,
          as: 'coupon',
          required: false,
          attributes: [
            'id',
            'code',
            'type',
            'value',
            'minOrderAmount',
            'maxDiscountAmount',
            'description',
            'isActive',
            'startDate',
            'endDate',
          ],
        },
        { model: ProductImage, as: 'images', order: [['sortOrder', 'ASC']] },
        { model: ProductVariant, as: 'variants' },
        {
          model: Product,
          as: 'relatedProducts',
          through: { attributes: ['sortOrder'] },
          attributes: ['id', 'name', 'slug', 'price', 'image'],
          include: [{ model: ProductImage, as: 'images', attributes: ['id', 'url', 'alt'], limit: 1 }],
        },
      ],
    });
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  }

  async getOwnedProduct(id, tenantId) {
    const product = await Product.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  }

  async validateOwnedReferences(data, adminId) {
    if (data.categoryId) {
      const category = await Category.findOne({ where: { id: data.categoryId, adminId } });
      if (!category) throw new ApiError(400, 'Category does not belong to this admin');
    }
    if (data.brandId) {
      const brand = await Brand.findOne({ where: { id: data.brandId, adminId } });
      if (!brand) throw new ApiError(400, 'Brand does not belong to this admin');
    }
    if (data.deliveryCompanyId) {
      const company = await DeliveryCompany.findOne({ where: { id: data.deliveryCompanyId, adminId } });
      if (!company) throw new ApiError(400, 'Delivery company does not belong to this admin');
    }
    if (data.couponId) {
      const coupon = await Coupon.findOne({ where: { id: data.couponId, adminId } });
      if (!coupon) throw new ApiError(400, 'Coupon does not belong to this admin');
    }
  }

  async findBySlug(slug) {
    const product = await productRepository.findBySlug(slug);
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  }

  async findPublicBySlug(slug) {
    const product = await productRepository.findBySlug(slug, {
      attributes: { exclude: ['costPrice', 'lowStockThreshold', 'createdAt', 'updatedAt', 'deletedAt'] },
    });
    if (!product) throw new ApiError(404, 'Product not found');
    if (product.status !== 'published') throw new ApiError(404, 'Product not found');

    const storeProfile = await storeProfileService.findByAdminId(product.adminId);
    const admin = await User.findByPk(product.adminId, {
      attributes: ['id', 'firstName', 'lastName', 'phone', 'email'],
    });

    const data = product.toJSON();
    const store = storeProfileService.toPublic(storeProfile) || {};
    // Contact numbers are assigned by the admin in Store Settings. Only the
    // numbers that were actually assigned are exposed, so the storefront can
    // hide the rest. The store email falls back to the admin account email.
    store.phone = store.phone || null;
    store.phone2 = store.phone2 || null;
    store.whatsapp = store.whatsapp || null;
    store.email = store.email || (admin && admin.email) || null;
    data.store = store;

    // Storefront related products are derived from the product's category so
    // they always reflect the live catalogue. Only published, in-stock items
    // from the same store are returned, and the current product is excluded.
    data.relatedProducts = await this.findCategoryRelatedProducts(product);
    return data;
  }

  async findCategoryRelatedProducts(product, limit = 8) {
    if (!product || !product.categoryId) return [];

    const related = await Product.findAll({
      where: {
        id: { [Op.ne]: product.id },
        categoryId: product.categoryId,
        adminId: product.adminId,
        status: 'published',
        quantity: { [Op.gt]: 0 },
      },
      attributes: [
        'id',
        'name',
        'slug',
        'price',
        'comparePrice',
        'image',
        'quantity',
        'categoryId',
        'adminId',
      ],
      include: [
        {
          model: ProductImage,
          as: 'images',
          where: { isPrimary: true },
          required: false,
          limit: 1,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    return related.map(function (item) {
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        comparePrice: item.comparePrice,
        image: item.image || (item.images && item.images.length > 0 ? item.images[0].url : null),
        images: item.images || [],
        quantity: item.quantity,
        categoryId: item.categoryId,
        adminId: item.adminId,
      };
    });
  }

  async create(data, uploadInfo, tenantId) {
    const numericFields = ['price', 'comparePrice', 'costPrice', 'quantity', 'lowStockThreshold', 'weight', 'length', 'width', 'height'];
    const nullableNumeric = ['comparePrice', 'costPrice', 'weight', 'length', 'width', 'height'];
    for (const field of numericFields) {
      if (data[field] === '') {
        data[field] = nullableNumeric.includes(field) ? null : 0;
      }
    }

    if (data.deliveryCompanyId === '') data.deliveryCompanyId = null;
    if (data.couponId === '') data.couponId = null;

    // Resolve the owning tenant. Admins/managers/employees are scoped by the
    // middleware; superadmins can provide adminId or inherit it from a
    // referenced category/brand/company.
    let adminId = tenantId;
    if (!adminId && data.categoryId) {
      const category = await Category.findOne({ where: { id: data.categoryId } });
      if (category) adminId = category.adminId;
    }
    if (!adminId && data.brandId) {
      const brand = await Brand.findOne({ where: { id: data.brandId } });
      if (brand) adminId = brand.adminId;
    }
    if (!adminId && data.deliveryCompanyId) {
      const company = await DeliveryCompany.findOne({ where: { id: data.deliveryCompanyId } });
      if (company) adminId = company.adminId;
    }
    if (!adminId && data.couponId) {
      const coupon = await Coupon.findOne({ where: { id: data.couponId } });
      if (coupon) adminId = coupon.adminId;
    }
    if (!adminId) adminId = await resolveAdminId(null);
    if (!adminId) throw new ApiError(400, 'An admin account is required to create a product');

    data.adminId = adminId;
    await this.validateOwnedReferences(data, adminId);

    const slug = await this.generateUniqueSlug(data.name);
    const sku = data.sku || generateSKU(data.name, data.categoryName);
    const barcode = data.barcode || generateBarcode();

    const existingSku = await productRepository.findBySku(sku, adminId);
    if (existingSku) throw new ApiError(400, 'Product SKU already exists');

    const existingBarcode = await Product.findOne({ where: { barcode, adminId } });
    if (existingBarcode) throw new ApiError(400, 'Product barcode already exists');

    const createData = {
      ...data,
      slug,
      sku,
      barcode,
      publishedAt: data.status === 'published' ? new Date() : null,
    };

    if (uploadInfo) {
      createData.image = uploadInfo.path || uploadInfo.url;
      createData.imagePublicId = uploadInfo.publicId || uploadInfo.filename;
    }

    const product = await productRepository.create(createData);

    if (data.images && data.images.length > 0) {
      await ProductImage.bulkCreate(
        data.images.map((img, idx) => ({
          productId: product.id,
          ...img,
          isPrimary: idx === 0,
          sortOrder: idx,
        })),
      );
    }

    if (data.variants && data.variants.length > 0) {
      await ProductVariant.bulkCreate(
        data.variants.map((v) => ({ ...v, productId: product.id })),
      );
    }

    return this.findById(product.id, tenantId);
  }

  async update(id, data, uploadInfo, tenantId) {
    const product = await this.getOwnedProduct(id, tenantId);

    const numericFields = ['price', 'comparePrice', 'costPrice', 'quantity', 'lowStockThreshold', 'weight', 'length', 'width', 'height'];
    const nullableNumeric = ['comparePrice', 'costPrice', 'weight', 'length', 'width', 'height'];
    for (const field of numericFields) {
      if (data[field] === '') {
        data[field] = nullableNumeric.includes(field) ? null : 0;
      }
    }

    if (data.deliveryCompanyId === '') data.deliveryCompanyId = null;
    if (data.couponId === '') data.couponId = null;
    delete data.adminId;

    await this.validateOwnedReferences(data, product.adminId);

    delete data.slug;

    if (data.status === 'published' && !product.publishedAt) {
      data.publishedAt = new Date();
    }

    if (uploadInfo) {
      if (product.imagePublicId) {
        await cloudinaryService.deleteImage(product.imagePublicId);
      }
      data.image = uploadInfo.path || uploadInfo.url;
      data.imagePublicId = uploadInfo.publicId || uploadInfo.filename;
    }

    const updated = await product.update(data);

    if (data.images) {
      await ProductImage.destroy({ where: { productId: id } });
      await ProductImage.bulkCreate(
        data.images.map((img, idx) => ({
          productId: id,
          ...img,
          isPrimary: idx === 0,
          sortOrder: idx,
        })),
      );
    }

    if (data.variants) {
      await ProductVariant.destroy({ where: { productId: id } });
      await ProductVariant.bulkCreate(
        data.variants.map((v) => ({ ...v, productId: id })),
      );
    }

    return this.findById(id, tenantId);
  }

  async delete(id, tenantId) {
    const product = await this.getOwnedProduct(id, tenantId);

    var publicIds = [];
    if (product.imagePublicId) publicIds.push(product.imagePublicId);

    var images = await ProductImage.findAll({ where: { productId: id } });
    images.forEach(function (img) {
      if (img.publicId) publicIds.push(img.publicId);
    });

    if (publicIds.length > 0) {
      await cloudinaryService.deleteImages(publicIds);
    }

    await ProductImage.destroy({ where: { productId: id } });
    await ProductVariant.destroy({ where: { productId: id } });
    await product.destroy();
    return true;
  }

  async addImages(productId, files, tenantId) {
    const product = await this.getOwnedProduct(productId, tenantId);

    var imageCount = await ProductImage.count({ where: { productId: productId } });
    var images = [];

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var isPrimary = imageCount === 0 && i === 0 && !product.image;
      var productImage = await ProductImage.create({
        productId: productId,
        url: file.path,
        publicId: file.filename,
        alt: '',
        isPrimary: isPrimary,
        sortOrder: imageCount + i,
      });
      images.push(productImage);
    }

    if (!product.image && images.length > 0) {
      product.image = images[0].url;
      product.imagePublicId = images[0].publicId;
      await product.save();
    }

    return images;
  }

  async updateImage(productId, imageId, data, tenantId) {
    const product = await this.getOwnedProduct(productId, tenantId);

    var image = await ProductImage.findOne({ where: { id: imageId, productId: productId } });
    if (!image) throw new ApiError(404, 'Image not found');

    if (data.isPrimary && !image.isPrimary) {
      await ProductImage.update({ isPrimary: false }, { where: { productId: productId } });
      image.isPrimary = true;
    }

    if (data.alt !== undefined) image.alt = data.alt;
    if (data.sortOrder !== undefined) image.sortOrder = data.sortOrder;

    await image.save();

    if (image.isPrimary) {
      product.image = image.url;
      product.imagePublicId = image.publicId;
      await product.save();
    }

    return image;
  }

  async removeImage(productId, imageId, tenantId) {
    const product = await this.getOwnedProduct(productId, tenantId);

    var image = await ProductImage.findOne({ where: { id: imageId, productId: productId } });
    if (!image) throw new ApiError(404, 'Image not found');

    if (image.publicId) {
      await cloudinaryService.deleteImage(image.publicId);
    }

    if (product.imagePublicId === image.publicId) {
      product.image = null;
      product.imagePublicId = null;
      await product.save();
    }

    await image.destroy();

    var remaining = await ProductImage.findAll({
      where: { productId: productId },
      order: [['sortOrder', 'ASC']],
    });
    if (remaining.length > 0 && !remaining.some(function (i) { return i.isPrimary; })) {
      remaining[0].isPrimary = true;
      await remaining[0].save();
      product.image = remaining[0].url;
      product.imagePublicId = remaining[0].publicId;
      await product.save();
    }

    return true;
  }
  async getRelatedProducts(productId, tenantId) {
    const product = await this.getOwnedProduct(productId, tenantId);

    const relations = await RelatedProduct.findAll({
      where: { productId },
      include: [{
        model: Product,
        as: 'relatedProduct',
        attributes: ['id', 'name', 'slug', 'price', 'image', 'adminId'],
        where: { adminId: product.adminId },
        required: true,
        include: [
          { model: ProductImage, as: 'images', attributes: ['id', 'url', 'alt'], limit: 1 },
        ],
      }],
      order: [['sortOrder', 'ASC']],
    });

    return relations.map(function (r) {
      var rp = r.relatedProduct;
      return {
        id: rp.id,
        name: rp.name,
        slug: rp.slug,
        price: rp.price,
        image: rp.image,
        images: rp.images,
      };
    });
  }

  async setRelatedProducts(productId, relatedIds, tenantId) {
    if (!Array.isArray(relatedIds)) throw new ApiError(400, 'relatedIds must be an array');

    const product = await this.getOwnedProduct(productId, tenantId);

    await RelatedProduct.destroy({ where: { productId } });

    if (relatedIds.length > 0) {
      var validIds = relatedIds.filter(function (id) { return id !== productId; });
      if (validIds.length === 0) return [];

      var existingProducts = await Product.findAll({
        where: { id: { [Op.in]: validIds }, adminId: product.adminId },
        attributes: ['id'],
      });
      var existingIds = existingProducts.map(function (p) { return p.id; });

      await RelatedProduct.bulkCreate(
        existingIds.map(function (id, idx) {
          return {
            productId: productId,
            relatedProductId: id,
            sortOrder: idx,
          };
        }),
      );
    }

    return this.getRelatedProducts(productId, tenantId);
  }
}

module.exports = new ProductService();
