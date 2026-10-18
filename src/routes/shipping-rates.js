const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/ShippingRateController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', authenticate, authorize('super_admin', 'admin'), controller.index);
router.get('/:id', authenticate, authorize('super_admin', 'admin'), controller.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin'),
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
  authenticate,
  authorize('super_admin'),
  [
    body('rates').isArray({ min: 1 }).withMessage('Rates array is required'),
    body('rates.*.wilayaCode').notEmpty().withMessage('wilayaCode is required for each rate'),
  ],
  validate,
  controller.bulkImport,
);

router.put('/:id', authenticate, authorize('super_admin'), controller.update);
router.delete('/:id', authenticate, authorize('super_admin'), controller.delete);

module.exports = router;
