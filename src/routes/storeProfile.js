const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const storeProfileController = require('../controllers/StoreProfileController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get(
  '/',
  staff,
  requirePermission(PERMISSIONS.SETTINGS_VIEW),
  storeProfileController.show,
);

router.put(
  '/',
  staff,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  [
    body('name').optional({ nullable: true }).isString().trim().isLength({ max: 200 }),
    body('logo').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
    body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
    body('whatsapp').optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email is required'),
    body('address').optional({ nullable: true }).isString().trim(),
    body('facebook').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
    body('instagram').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
    body('x').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  ],
  validate,
  storeProfileController.update,
);

module.exports = router;
