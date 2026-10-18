const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/UserController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', authenticate, authorize('super_admin', 'admin'), userController.index);
router.get('/:id', authenticate, authorize('super_admin', 'admin'), userController.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  userController.create,
);

router.put('/:id', authenticate, authorize('super_admin', 'admin'), userController.update);
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), userController.delete);

module.exports = router;
