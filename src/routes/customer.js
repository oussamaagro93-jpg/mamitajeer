const express = require('express');
const router = express.Router();
const customerController = require('../controllers/CustomerController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.CUSTOMERS_VIEW), customerController.index);
router.get('/:id', staff, requirePermission(PERMISSIONS.CUSTOMERS_VIEW), customerController.show);
router.put('/:id', staff, requirePermission(PERMISSIONS.CUSTOMERS_UPDATE), customerController.update);
router.delete('/:id', staff, requirePermission(PERMISSIONS.CUSTOMERS_DELETE), customerController.delete);

module.exports = router;
