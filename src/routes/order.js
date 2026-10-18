const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', authenticate, orderController.index);
router.get('/:id', authenticate, orderController.show);

router.post(
  '/',
  authenticate,
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  orderController.create,
);

router.put(
  '/:id/status',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  [body('status').notEmpty().withMessage('Status is required')],
  validate,
  orderController.updateStatus,
);

router.post(
  '/validate-coupon',
  [body('code').notEmpty().withMessage('Coupon code is required'), body('orderAmount').isFloat().withMessage('Order amount is required')],
  validate,
  orderController.validateCoupon,
);

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), orderController.delete);

module.exports = router;
