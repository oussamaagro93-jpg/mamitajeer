const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/UserController');
const { authenticate } = require('../middleware/authenticate');
const { tenantContext } = require('../middleware/tenant');
const { requirePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const validate = require('../middleware/validate');

const staff = [authenticate, tenantContext];

router.get('/', staff, requirePermission(PERMISSIONS.USERS_VIEW), userController.index);
router.get('/:id', staff, requirePermission(PERMISSIONS.USERS_VIEW), userController.show);

router.post(
  '/',
  staff,
  requirePermission(PERMISSIONS.USERS_CREATE),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  userController.create,
);

router.put('/:id', staff, requirePermission(PERMISSIONS.USERS_UPDATE), userController.update);
router.delete('/:id', staff, requirePermission(PERMISSIONS.USERS_DELETE), userController.delete);

module.exports = router;
