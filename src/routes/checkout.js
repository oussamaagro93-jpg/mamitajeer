const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const guestCheckoutController = require('../controllers/GuestCheckoutController');
const validate = require('../middleware/validate');

router.post(
  '/guest',
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isInt().withMessage('Valid productId is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('guestName').trim().notEmpty().withMessage('Full name is required'),
    body('guestPhone').trim().notEmpty().withMessage('Phone number is required'),
    // Wilaya/city names are resolved from wilayaId/communeId on the server.
    // They stay optional here for backwards compatibility with older clients.
    body('guestWilaya').optional({ checkFalsy: true, nullable: true }).trim(),
    body('guestCity').optional({ checkFalsy: true, nullable: true }).trim(),
    body('guestAddress').trim().notEmpty().withMessage('Address is required'),
    body('wilayaId').isInt().withMessage('Valid wilaya is required'),
    body('communeId').isInt().withMessage('Valid commune is required'),
    body('deliveryCompanyId').isInt().withMessage('Valid delivery company is required'),
    body('deliveryType').isIn(['home_delivery', 'desk_delivery']).withMessage('Valid delivery type is required'),
  ],
  validate,
  guestCheckoutController.checkout,
);

module.exports = router;
