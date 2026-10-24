const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const brandController = require('../controllers/BrandController');
const { authenticate } = require('../middleware/authenticate');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

// Public catalogue. A staff token scopes the list to that admin's tenant.
router.get('/', optionalAuthenticate, brandController.index);
router.get('/:id', optionalAuthenticate, brandController.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.BRANDS_CREATE),
  [body('name').trim().notEmpty().withMessage('Brand name is required')],
  validate,
  brandController.create,
);

router.put(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.BRANDS_UPDATE),
  brandController.update,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.BRANDS_DELETE),
  brandController.delete,
);

module.exports = router;
