const deliveryCompanyService = require('../services/DeliveryCompanyService');
const { sendSuccess } = require('../utils/response');

class DeliveryCompanyController {
  async index(req, res, next) {
    try {
      const data = await deliveryCompanyService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const company = await deliveryCompanyService.findById(req.params.id);
      sendSuccess(res, { company });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const company = await deliveryCompanyService.create(req.body);
      sendSuccess(res, { company }, 'Delivery company created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const company = await deliveryCompanyService.update(req.params.id, req.body);
      sendSuccess(res, { company }, 'Delivery company updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await deliveryCompanyService.delete(req.params.id);
      sendSuccess(res, null, 'Delivery company deleted');
    } catch (error) {
      next(error);
    }
  }

  async getActive(req, res, next) {
    try {
      const companies = await deliveryCompanyService.getActive();
      sendSuccess(res, { companies });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeliveryCompanyController();
