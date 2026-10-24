const customerService = require('../services/CustomerService');
const { sendSuccess } = require('../utils/response');

class CustomerController {
  async index(req, res, next) {
    try {
      const data = await customerService.findAll(req.query, req.tenantAdminId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const customer = await customerService.findById(req.params.id, req.tenantAdminId);
      sendSuccess(res, { customer });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const customer = await customerService.update(req.params.id, req.body, req.tenantAdminId);
      sendSuccess(res, { customer }, 'Customer updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await customerService.delete(req.params.id, req.tenantAdminId);
      sendSuccess(res, null, 'Customer deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
