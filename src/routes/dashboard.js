const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const { authenticate, authorize } = require('../middleware/authenticate');

router.get('/stats', authenticate, authorize('super_admin', 'admin', 'manager'), dashboardController.stats);
router.get('/revenue-chart', authenticate, authorize('super_admin', 'admin', 'manager'), dashboardController.revenueChart);
router.get('/order-status-distribution', authenticate, authorize('super_admin', 'admin', 'manager'), dashboardController.orderStatusDistribution);
router.get('/cloudinary-stats', authenticate, authorize('super_admin'), dashboardController.cloudinaryStats);

module.exports = router;
