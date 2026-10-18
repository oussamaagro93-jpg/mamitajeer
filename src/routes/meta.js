const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const metaController = require('../controllers/MetaController');
const validate = require('../middleware/validate');

router.post(
  '/events',
  [
    body('event_name').isString().notEmpty().withMessage('event_name is required'),
    body('event_time').isInt({ min: 1600000000 }).optional(),
  ],
  validate,
  metaController.sendEvent,
);

module.exports = router;
