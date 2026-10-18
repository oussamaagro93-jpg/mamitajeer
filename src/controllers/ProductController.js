const productService = require('../services/ProductService');
const { sendSuccess } = require('../utils/response');

class ProductController {
  async index(req, res, next) {
    try {
      var data = await productService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      var product = await productService.findById(req.params.id);
      sendSuccess(res, { product });
    } catch (error) {
      next(error);
    }
  }

  async showBySlug(req, res, next) {
    try {
      var product = await productService.findBySlug(req.params.slug);
      sendSuccess(res, { product });
    } catch (error) { next(error); }
  }

  async showPublicBySlug(req, res, next) {
    try {
      var product = await productService.findPublicBySlug(req.params.slug);
      sendSuccess(res, { product });
    } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try {
      var uploadInfo = req.file ? { path: req.file.path, publicId: req.file.filename } : null;
      var product = await productService.create(req.body, uploadInfo);
      sendSuccess(res, { product }, 'Product created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      var uploadInfo = req.file ? { path: req.file.path, publicId: req.file.filename } : null;
      var product = await productService.update(req.params.id, req.body, uploadInfo);
      sendSuccess(res, { product }, 'Product updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await productService.delete(req.params.id);
      sendSuccess(res, null, 'Product deleted');
    } catch (error) {
      next(error);
    }
  }

  async uploadImages(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return sendSuccess(res, null, 'No files uploaded');
      }
      var images = await productService.addImages(req.params.id, req.files);
      sendSuccess(res, { images }, 'Images uploaded', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateImage(req, res, next) {
    try {
      var image = await productService.updateImage(req.params.id, req.params.imageId, req.body);
      sendSuccess(res, { image }, 'Image updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req, res, next) {
    try {
      await productService.removeImage(req.params.id, req.params.imageId);
      sendSuccess(res, null, 'Image deleted');
    } catch (error) {
      next(error);
    }
  }

  async getRelated(req, res, next) {
    try {
      var products = await productService.getRelatedProducts(req.params.id);
      sendSuccess(res, { products });
    } catch (error) {
      next(error);
    }
  }

  async setRelated(req, res, next) {
    try {
      var products = await productService.setRelatedProducts(req.params.id, req.body.relatedIds);
      sendSuccess(res, { products }, 'Related products updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
