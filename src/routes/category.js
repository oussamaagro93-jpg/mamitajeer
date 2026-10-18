const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const { authenticate, authorize } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
var uploadCategoryImage = require('../middleware/uploadCategoryImage');

router.get('/', categoryController.index);
router.get('/tree', categoryController.tree);
router.get('/:id', categoryController.show);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  uploadCategoryImage.single('image'),
  [body('name').trim().notEmpty().withMessage('Category name is required')],
  validate,
  categoryController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin', 'manager'),
  uploadCategoryImage.single('image'),
  categoryController.update,
);

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), categoryController.delete);

module.exports = router;
