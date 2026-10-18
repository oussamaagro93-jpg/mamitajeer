const { Op } = require('sequelize');
const productRepository = require('../repositories/ProductRepository');
const ApiError = require('../utils/ApiError');
const { createSlug, generateSKU, generateBarcode, paginate, getPaginationMeta } = require('../utils/helpers');
const { ProductImage, ProductVariant, Category, Brand, Product, RelatedProduct } = require('../models');
const cloudinaryService = require('./cloudinaryService');

class ProductService {
  async generateUniqueSlug(name, excludeId) {
    const baseSlug = createSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const where = { slug };
      if (excludeId) where.id = { [Op.ne]: excludeId };
      const existing = await Product.findOne({ where });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search, categoryId, brandId, status, minPrice, maxPrice, sortBy, sortOrder, isFeatured } = query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;
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

  async findById(id) {
    const product = await productRepository.findById(id, {
      include: [
        { model: Category, as: 'category' },
        { model: Brand, as: 'brand' },
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
    return product;
  }

  async create(data, uploadInfo) {
    const numericFields = ['price', 'comparePrice', 'costPrice', 'quantity', 'lowStockThreshold', 'weight', 'length', 'width', 'height'];
    const nullableNumeric = ['comparePrice', 'costPrice', 'weight', 'length', 'width', 'height'];
    for (const field of numericFields) {
      if (data[field] === '') {
        data[field] = nullableNumeric.includes(field) ? null : 0;
      }
    }

    const slug = await this.generateUniqueSlug(data.name);
    const sku = data.sku || generateSKU(data.name, data.categoryName);
    const barcode = data.barcode || generateBarcode();

    const existingSku = await productRepository.findBySku(sku);
    if (existingSku) throw new ApiError(400, 'Product SKU already exists');

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

    return this.findById(product.id);
  }

  async update(id, data, uploadInfo) {
    const product = await productRepository.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');

    const numericFields = ['price', 'comparePrice', 'costPrice', 'quantity', 'lowStockThreshold', 'weight', 'length', 'width', 'height'];
    const nullableNumeric = ['comparePrice', 'costPrice', 'weight', 'length', 'width', 'height'];
    for (const field of numericFields) {
      if (data[field] === '') {
        data[field] = nullableNumeric.includes(field) ? null : 0;
      }
    }

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

    return this.findById(id);
  }

  async delete(id) {
    const product = await productRepository.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');

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

  async addImages(productId, files) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

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

  async updateImage(productId, imageId, data) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

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

  async removeImage(productId, imageId) {
    const product = await productRepository.findById(productId);
    if (!product) throw new ApiError(404, 'Product not found');

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
  async getRelatedProducts(productId) {
    const relations = await RelatedProduct.findAll({
      where: { productId },
      include: [{
        model: Product,
        as: 'relatedProduct',
        attributes: ['id', 'name', 'slug', 'price', 'image'],
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

  async setRelatedProducts(productId, relatedIds) {
    if (!Array.isArray(relatedIds)) throw new ApiError(400, 'relatedIds must be an array');

    await RelatedProduct.destroy({ where: { productId } });

    if (relatedIds.length > 0) {
      var validIds = relatedIds.filter(function (id) { return id !== productId; });
      if (validIds.length === 0) return [];

      var existingProducts = await Product.findAll({
        where: { id: { [Op.in]: validIds } },
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

    return this.getRelatedProducts(productId);
  }
}

module.exports = new ProductService();
