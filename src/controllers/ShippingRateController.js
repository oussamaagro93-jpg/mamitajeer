const shippingRateService = require('../services/ShippingRateService');
const { sendSuccess } = require('../utils/response');

class ShippingRateController {
  async index(req, res, next) {
    try {
      const data = await shippingRateService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const rate = await shippingRateService.findById(req.params.id);
      sendSuccess(res, { rate });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const rate = await shippingRateService.create(req.body);
      sendSuccess(res, { rate }, 'Shipping rate created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const rate = await shippingRateService.update(req.params.id, req.body);
      sendSuccess(res, { rate }, 'Shipping rate updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await shippingRateService.delete(req.params.id);
      sendSuccess(res, null, 'Shipping rate deleted');
    } catch (error) {
      next(error);
    }
  }

  async bulkImport(req, res, next) {
    try {
      const results = await shippingRateService.bulkUpsert(req.body.rates);
      sendSuccess(res, results, 'Bulk import completed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShippingRateController();
