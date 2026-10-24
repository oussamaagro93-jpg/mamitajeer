const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/ShippingRateController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.SHIPPING_VIEW), controller.index);
router.get('/:id', staff, requirePermission(PERMISSIONS.SHIPPING_VIEW), controller.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.SHIPPING_CREATE),
  [
    body('deliveryCompanyId').isInt().withMessage('Valid delivery company is required'),
    body('wilayaId').isInt().withMessage('Valid wilaya is required'),
    body('homeDeliveryPrice').isFloat({ min: 0 }).withMessage('Valid home delivery price is required'),
    body('deskDeliveryPrice').isFloat({ min: 0 }).withMessage('Valid desk delivery price is required'),
  ],
  validate,
  controller.create,
);

router.post(
  '/bulk-import',
  staff,
  requirePermission(PERMISSIONS.SHIPPING_CREATE),
  [
    body('rates').isArray({ min: 1 }).withMessage('Rates array is required'),
    body('rates.*.wilayaCode').notEmpty().withMessage('wilayaCode is required for each rate'),
  ],
  validate,
  controller.bulkImport,
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
