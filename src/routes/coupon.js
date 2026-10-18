const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const couponController = require('../controllers/CouponController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', authenticate, couponController.index);
router.get('/:id', authenticate, couponController.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('type').isIn(['percentage', 'fixed', 'free_shipping']).withMessage('Invalid coupon type'),
    body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
  ],
  validate,
  couponController.create,
);

router.put('/:id', authenticate, authorize('super_admin', 'admin'), couponController.update);
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), couponController.delete);

module.exports = router;
