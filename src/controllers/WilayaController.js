const wilayaService = require('../services/WilayaService');
const { sendSuccess } = require('../utils/response');

class WilayaController {
  async index(req, res, next) {
    try {
      const data = await wilayaService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const wilaya = await wilayaService.findById(req.params.id);
      sendSuccess(res, { wilaya });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const wilaya = await wilayaService.create(req.body);
      sendSuccess(res, { wilaya }, 'Wilaya created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const wilaya = await wilayaService.update(req.params.id, req.body);
      sendSuccess(res, { wilaya }, 'Wilaya updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await wilayaService.delete(req.params.id);
      sendSuccess(res, null, 'Wilaya deleted');
    } catch (error) {
      next(error);
    }
  }

  async getCommunes(req, res, next) {
    try {
      const communes = await wilayaService.getCommunes(req.params.wilayaId);
      sendSuccess(res, { communes });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WilayaController();
