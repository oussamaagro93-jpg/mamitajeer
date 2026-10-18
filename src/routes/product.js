const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/ProductController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const uploadProductImage = require('../middleware/uploadProductImage');

router.get('/', productController.index);
router.get('/slug/:slug', productController.showPublicBySlug);
router.get('/:id', productController.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  ],
  validate,
  productController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  productController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin'),
  productController.delete,
);

// Multi-image upload endpoint - accepts array of files under 'images' field
router.post(
  '/:id/images',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  uploadProductImage.array('images', 10),
  productController.uploadImages,
);

router.put(
  '/:id/images/:imageId',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  productController.updateImage,
);

router.delete(
  '/:id/images/:imageId',
  authenticate,
  authorize('super_admin', 'admin'),
  productController.deleteImage,
);

router.get(
  '/:id/related',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  productController.getRelated,
);

router.put(
  '/:id/related',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  productController.setRelated,
);

module.exports = router;
