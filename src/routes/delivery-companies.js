const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/DeliveryCompanyController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', authenticate, authorize('super_admin', 'admin'), controller.index);
router.get('/active', controller.getActive);
router.get('/:id', authenticate, authorize('super_admin', 'admin'), controller.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin'),
  [
    body('name').trim().notEmpty().withMessage('Company name is required'),
    body('code').trim().notEmpty().withMessage('Company code is required'),
  ],
  validate,
  controller.create,
);

router.put('/:id', authenticate, authorize('super_admin'), controller.update);
router.delete('/:id', authenticate, authorize('super_admin'), controller.delete);

module.exports = router;
