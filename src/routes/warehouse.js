const express = require('express');
const router = express.Router();
const { Warehouse } = require('../models');
const { authenticate } = require('../middleware/authenticate');
const { sendSuccess } = require('../utils/response');

router.get('/', authenticate, async function (req, res, next) {
  try {
    const warehouses = await Warehouse.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    sendSuccess(res, { warehouses });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
