const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const inventoryController = require('../controllers/InventoryController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.INVENTORY_VIEW), inventoryController.index);
router.get('/low-stock', staff, requirePermission(PERMISSIONS.INVENTORY_VIEW), inventoryController.lowStock);

router.post(
  '/adjust',
  staff,
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
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
  staff,
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('fromWarehouseId').notEmpty().withMessage('Source warehouse ID is required'),
    body('toWarehouseId').notEmpty().withMessage('Destination warehouse ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  validate,
  inventoryController.transfer,
);

router.delete(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.INVENTORY_DELETE),
  inventoryController.delete,
);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  inventoryController.create,
);

router.put(
  '/:id',
  staff,
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  inventoryController.update,
);

module.exports = router;
