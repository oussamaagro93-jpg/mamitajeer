const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/WilayaController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

router.get('/', controller.index);
router.get('/:id', controller.show);
router.get('/:wilayaId/communes', controller.getCommunes);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('code').trim().notEmpty().withMessage('Wilaya code is required'),
    body('nameFr').trim().notEmpty().withMessage('French name is required'),
    body('nameAr').trim().notEmpty().withMessage('Arabic name is required'),
  ],
  validate,
  controller.create,
);

router.put('/:id', authenticate, authorize('super_admin', 'admin'), controller.update);
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), controller.delete);

module.exports = router;
