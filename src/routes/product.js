const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/ProductController');
const { authenticate } = require('../middleware/authenticate');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');
const uploadProductImage = require('../middleware/uploadProductImage');

const staff = [authenticate, tenantContext];

// Public catalogue. When a staff token is present the list is scoped to their
// admin tenant so the admin UI does not need a separate endpoint.
router.get('/', optionalAuthenticate, productController.index);
router.get('/slug/:slug', productController.showPublicBySlug);

// Admin product details are tenant-scoped.
router.get('/:id', staff, requirePermission(PERMISSIONS.PRODUCTS_VIEW), productController.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  ],
  validate,
  productController.create,
);

router.put(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  productController.update,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  productController.delete,
);

router.post(
  '/:id/images',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  uploadProductImage.array('images', 10),
  productController.uploadImages,
);

router.put(
  '/:id/images/:imageId',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  productController.updateImage,
);

router.delete(
  '/:id/images/:imageId',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  productController.deleteImage,
);

router.get(
  '/:id/related',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  productController.getRelated,
);

router.put(
  '/:id/related',
  staff,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  productController.setRelated,
);

module.exports = router;
