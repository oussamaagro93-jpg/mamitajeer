const express = require('express');
const router = express.Router();
const { Warehouse } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const { tenantWhere } = require('../utils/tenant');
const { sendSuccess } = require('../utils/response');

router.get(
  '/',
  authenticate,
  tenantContext,
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  async function (req, res, next) {
    try {
      const warehouses = await Warehouse.findAll({
        where: tenantWhere(req.tenantAdminId, { isActive: true }),
        order: [['name', 'ASC']],
      });
      sendSuccess(res, { warehouses });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
