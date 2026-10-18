const express = require('express');
const router = express.Router();
const customerController = require('../controllers/CustomerController');
const { authenticate, authorize } = require('../middleware/authenticate');

router.get('/', authenticate, authorize('super_admin', 'admin', 'manager'), customerController.index);
router.get('/:id', authenticate, authorize('super_admin', 'admin', 'manager'), customerController.show);
router.put('/:id', authenticate, authorize('super_admin', 'admin'), customerController.update);
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), customerController.delete);

module.exports = router;
