const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/DeliveryCompanyController');
const { authenticate } = require('../middleware/authenticate');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.SHIPPING_VIEW), controller.index);

// Public storefront endpoint. A staff token scopes the list to their tenant.
router.get('/active', optionalAuthenticate, controller.getActive);

router.get('/:id', staff, requirePermission(PERMISSIONS.SHIPPING_VIEW), controller.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.SHIPPING_CREATE),
  [
    body('name').trim().notEmpty().withMessage('Company name is required'),
    body('code').trim().notEmpty().withMessage('Company code is required'),
  ],
  validate,
  controller.create,
);

router.put(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.SHIPPING_UPDATE),
  controller.update,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.SHIPPING_DELETE),
  controller.delete,
);

module.exports = router;
