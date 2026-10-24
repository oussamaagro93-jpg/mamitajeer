const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const { authenticate } = require('../middleware/authenticate');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');
var uploadCategoryImage = require('../middleware/uploadCategoryImage');

const staff = [authenticate, tenantContext];

// Public catalogue. A staff token scopes the list to that admin's tenant.
router.get('/', optionalAuthenticate, categoryController.index);
router.get('/tree', optionalAuthenticate, categoryController.tree);
router.get('/:id', optionalAuthenticate, categoryController.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  uploadCategoryImage.single('image'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  categoryController.create,
);

router.put(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  uploadCategoryImage.single('image'),
  categoryController.update,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  categoryController.delete,
);

module.exports = router;
