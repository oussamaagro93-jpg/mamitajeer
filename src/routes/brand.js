const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const brandController = require('../controllers/BrandController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', brandController.index);
router.get('/:id', brandController.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  [body('name').trim().notEmpty().withMessage('Brand name is required')],
  validate,
  brandController.create,
);

router.put('/:id', authenticate, authorize('super_admin', 'admin', 'manager'), brandController.update);
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), brandController.delete);

module.exports = router;
