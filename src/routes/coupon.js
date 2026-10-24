const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const couponController = require('../controllers/CouponController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.COUPONS_VIEW), couponController.index);
router.get('/:id', staff, requirePermission(PERMISSIONS.COUPONS_VIEW), couponController.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.COUPONS_CREATE),
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('type').isIn(['percentage', 'fixed', 'free_shipping']).withMessage('Invalid coupon type'),
    body('value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Value must be a positive number'),
    body('minOrderAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Invalid minimum order amount'),
    body('maxDiscountAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Invalid maximum discount amount'),
    body('usageLimit').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid usage limit'),
    body('perUserLimit').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid per-user limit'),
    body('productIds').optional().isArray().withMessage('productIds must be an array'),
    body('categoryIds').optional().isArray().withMessage('categoryIds must be an array'),
  ],
  validate,
  couponController.create,
);

router.put(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.COUPONS_UPDATE),
  [
    body('code').optional().trim().notEmpty().withMessage('Coupon code cannot be empty'),
    body('type').optional().isIn(['percentage', 'fixed', 'free_shipping']).withMessage('Invalid coupon type'),
    body('value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Value must be a positive number'),
    body('minOrderAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Invalid minimum order amount'),
    body('maxDiscountAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Invalid maximum discount amount'),
    body('usageLimit').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid usage limit'),
    body('perUserLimit').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Invalid per-user limit'),
    body('productIds').optional().isArray().withMessage('productIds must be an array'),
    body('categoryIds').optional().isArray().withMessage('categoryIds must be an array'),
  ],
  validate,
  couponController.update,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.COUPONS_DELETE),
  couponController.delete,
);

module.exports = router;
