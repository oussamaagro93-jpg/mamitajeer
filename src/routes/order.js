const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS, STAFF_ROLES, hasPermission } = require('../config/permissions');
const validate = require('../middleware/validate');
const ApiError = require('../utils/ApiError');

const staff = [authenticate, tenantContext];

// Customers may place their own order; staff order entry requires orders.create.
function allowOrderCreate(req, _res, next) {
  if (STAFF_ROLES.indexOf(req.user.role) === -1) return next();
  if (hasPermission(req.user, PERMISSIONS.ORDERS_CREATE)) return next();
  return next(new ApiError(403, 'Insufficient permissions'));
}

router.get('/', staff, requirePermission(PERMISSIONS.ORDERS_VIEW), orderController.index);
router.get('/:id', staff, requirePermission(PERMISSIONS.ORDERS_VIEW), orderController.show);

// Customers can place their own order. Staff order entry stays available too;
// the order is always scoped to the caller's tenant.
router.post(
  '/',
  authenticate,
  tenantContext,
  allowOrderCreate,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isInt({ min: 1 }).withMessage('Valid productId is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('deliveryCompanyId').isInt({ min: 1 }).withMessage('Valid delivery company is required'),
    body('wilayaId').isInt({ min: 1 }).withMessage('Valid wilaya is required'),
    body('communeId').isInt({ min: 1 }).withMessage('Valid commune is required'),
    body('deliveryType')
      .isIn(['home_delivery', 'desk_delivery'])
      .withMessage('Valid delivery type is required'),
    body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required'),
    body('paymentMethod').optional().isIn(['cod', 'cash_on_delivery']).withMessage('Unsupported payment method'),
  ],
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
    body('description').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
    body('reason').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  ],
  validate,
  orderController.updateStatus,
);

router.put(
  '/:id/payment',
  staff,
  requirePermission(PERMISSIONS.ORDERS_UPDATE),
  [
    body('paymentStatus')
      .isIn(['pending', 'paid', 'partially_paid', 'refunded', 'failed'])
      .withMessage('Invalid payment status'),
    body('paidAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('paymentReference').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  ],
  validate,
  orderController.updatePayment,
);

router.put(
  '/:id/tracking',
  staff,
  requirePermission(PERMISSIONS.ORDERS_UPDATE),
  [
    body('trackingNumber')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .trim()
      .isLength({ max: 200 }),
  ],
  validate,
  orderController.updateTracking,
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
