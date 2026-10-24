const productService = require('../services/ProductService');
const { sendSuccess } = require('../utils/response');
const { STAFF_ROLES, getTenantAdminId } = require('../config/permissions');
const { parseAdminId } = require('../utils/tenant');

function requestTenant(req) {
  if (req.tenantAdminId !== undefined) return req.tenantAdminId;
  if (req.user && STAFF_ROLES.indexOf(req.user.role) !== -1) {
    const ownTenant = getTenantAdminId(req.user);
    return ownTenant || parseAdminId(req.query.adminId);
  }
  return null;
}

class ProductController {
  async index(req, res, next) {
    try {
      const isStaff = req.user && STAFF_ROLES.indexOf(req.user.role) !== -1;
      const data = await productService.findAll(req.query, {
        tenantId: isStaff ? requestTenant(req) : null,
        publicOnly: !isStaff,
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const product = await productService.findById(req.params.id, requestTenant(req));
      sendSuccess(res, { product });
    } catch (error) {
      next(error);
    }
  }

  async showBySlug(req, res, next) {
    try {
      const product = await productService.findBySlug(req.params.slug);
      sendSuccess(res, { product });
    } catch (error) { next(error); }
  }

  async showPublicBySlug(req, res, next) {
    try {
      const product = await productService.findPublicBySlug(req.params.slug);
      sendSuccess(res, { product });
    } catch (error) { next(error); }
  }

  async create(req, res, next) {
    try {
      const uploadInfo = req.file ? { path: req.file.path, publicId: req.file.filename } : null;
      const product = await productService.create(req.body, uploadInfo, requestTenant(req));
      sendSuccess(res, { product }, 'Product created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const uploadInfo = req.file ? { path: req.file.path, publicId: req.file.filename } : null;
      const product = await productService.update(req.params.id, req.body, uploadInfo, requestTenant(req));
      sendSuccess(res, { product }, 'Product updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await productService.delete(req.params.id, requestTenant(req));
      sendSuccess(res, null, 'Product deleted');
    } catch (error) {
      next(error);
    }
  }

  async uploadImages(req, res, next) {
    try {
      // Check ownership even when no files were sent so a cross-tenant
      // request never looks successful.
      await productService.getOwnedProduct(req.params.id, requestTenant(req));
      if (!req.files || req.files.length === 0) {
        return sendSuccess(res, null, 'No files uploaded');
      }
      const images = await productService.addImages(req.params.id, req.files, requestTenant(req));
      sendSuccess(res, { images }, 'Images uploaded', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateImage(req, res, next) {
    try {
      const image = await productService.updateImage(req.params.id, req.params.imageId, req.body, requestTenant(req));
      sendSuccess(res, { image }, 'Image updated');
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req, res, next) {
    try {
      await productService.removeImage(req.params.id, req.params.imageId, requestTenant(req));
      sendSuccess(res, null, 'Image deleted');
    } catch (error) {
      next(error);
    }
  }

  async getRelated(req, res, next) {
    try {
      const products = await productService.getRelatedProducts(req.params.id, requestTenant(req));
      sendSuccess(res, { products });
    } catch (error) {
      next(error);
    }
  }

  async setRelated(req, res, next) {
    try {
      const products = await productService.setRelatedProducts(req.params.id, req.body.relatedIds, requestTenant(req));
      sendSuccess(res, { products }, 'Related products updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
