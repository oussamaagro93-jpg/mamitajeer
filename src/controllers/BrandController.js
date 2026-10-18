const brandService = require('../services/BrandService');
const { sendSuccess } = require('../utils/response');

class BrandController {
  async index(req, res, next) {
    try {
      const data = await brandService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const brand = await brandService.findById(req.params.id);
      sendSuccess(res, { brand });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const brand = await brandService.create(req.body);
      sendSuccess(res, { brand }, 'Brand created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const brand = await brandService.update(req.params.id, req.body);
      sendSuccess(res, { brand }, 'Brand updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await brandService.delete(req.params.id);
      sendSuccess(res, null, 'Brand deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BrandController();
