const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const { authenticate, authorize } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');

const staff = [authenticate, tenantContext];

router.get(
  '/stats',
  staff,
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  dashboardController.stats,
);
router.get(
  '/revenue-chart',
  staff,
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  dashboardController.revenueChart,
);
router.get(
  '/order-status-distribution',
  staff,
  requirePermission(PERMISSIONS.DASHBOARD_VIEW),
  dashboardController.orderStatusDistribution,
);

// Cloudinary usage is account-wide, so it stays superadmin-only.
router.get('/cloudinary-stats', authenticate, authorize('super_admin'), dashboardController.cloudinaryStats);

module.exports = router;
