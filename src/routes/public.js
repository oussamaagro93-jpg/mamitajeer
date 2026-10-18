const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/DeliveryQuoteController');
const validate = require('../middleware/validate');

router.get('/wilayas', controller.getWilayas);
router.get('/wilayas/:wilayaId/communes', controller.getCommunes);
router.get('/delivery-companies', controller.getDeliveryCompanies);
router.get('/shipping-options', controller.getShippingOptions);

router.post(
  '/shipping-quote',
  [
    body('deliveryCompanyId').isInt().withMessage('Valid delivery company is required'),
    body('wilayaId').isInt().withMessage('Valid wilaya is required'),
    body('deliveryType').isIn(['home_delivery', 'desk_delivery']).withMessage('Valid delivery type is required'),
  ],
  validate,
  controller.calculatePrice,
);

module.exports = router;
