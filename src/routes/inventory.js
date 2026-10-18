const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const inventoryController = require('../controllers/InventoryController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', authenticate, inventoryController.index);
router.get('/low-stock', authenticate, inventoryController.lowStock);

router.post(
  '/adjust',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('warehouseId').notEmpty().withMessage('Warehouse ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('type').isIn(['add', 'remove']).withMessage('Type must be add or remove'),
  ],
  validate,
  inventoryController.adjust,
);

router.post(
  '/transfer',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('fromWarehouseId').notEmpty().withMessage('Source warehouse ID is required'),
    body('toWarehouseId').notEmpty().withMessage('Destination warehouse ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  validate,
  inventoryController.transfer,
);

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), inventoryController.delete);

router.post('/', authenticate, authorize('super_admin', 'admin', 'manager'), inventoryController.create);
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'manager'), inventoryController.update);

module.exports = router;
