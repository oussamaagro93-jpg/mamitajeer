const categoryService = require('../services/CategoryService');
const { sendSuccess } = require('../utils/response');

class CategoryController {
  async index(req, res, next) {
    try {
      const data = await categoryService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async tree(req, res, next) {
    try {
      const categories = await categoryService.getTree();
      sendSuccess(res, { categories });
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const category = await categoryService.findById(req.params.id);
      sendSuccess(res, { category });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      var data = { ...req.body };
      if (req.file) {
        // Cloudinary storage exposes the secure URL on req.file.path.
        data.image = req.file.path;
      }
      const category = await categoryService.create(data);
      sendSuccess(res, { category }, 'Category created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      var data = { ...req.body };
      if (req.file) {
        // Cloudinary storage exposes the secure URL on req.file.path.
        data.image = req.file.path;
      }
      const category = await categoryService.update(req.params.id, data);
      sendSuccess(res, { category }, 'Category updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await categoryService.delete(req.params.id);
      sendSuccess(res, null, 'Category deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
