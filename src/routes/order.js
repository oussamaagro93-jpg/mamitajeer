const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.ORDERS_VIEW), orderController.index);
router.get('/:id', staff, requirePermission(PERMISSIONS.ORDERS_VIEW), orderController.show);

// Customers can place their own order. Staff order entry stays available too;
// the order is always scoped to the caller's tenant.
router.post(
  '/',
  authenticate,
  tenantContext,
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  orderController.create,
);

router.put(
  '/:id/status',
  staff,
  requirePermission(PERMISSIONS.ORDERS_UPDATE),
  [
    body('status')
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Invalid order status'),
  ],
  validate,
  orderController.updateStatus,
);

// Public coupon check used by the storefront checkout. The backend resolves
// the store from the products and calculates the discount from current prices.
router.post(
  '/validate-coupon',
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('items').isArray({ min: 1 }).withMessage('Cart items are required'),
    body('items.*.productId').isInt({ min: 1 }).withMessage('Valid productId is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  orderController.validateCoupon,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.ORDERS_DELETE),
  orderController.delete,
);

module.exports = router;
