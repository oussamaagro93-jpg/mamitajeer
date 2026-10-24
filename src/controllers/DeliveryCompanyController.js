const deliveryCompanyService = require('../services/DeliveryCompanyService');
const { sendSuccess } = require('../utils/response');
const { STAFF_ROLES, getTenantAdminId } = require('../config/permissions');
const { parseAdminId } = require('../utils/tenant');

function requestTenant(req) {
  if (req.tenantAdminId !== undefined) return req.tenantAdminId;
  if (req.user && STAFF_ROLES.indexOf(req.user.role) !== -1) {
    const ownTenant = getTenantAdminId(req.user);
    return ownTenant || parseAdminId(req.query.adminId);
  }
  return null;
}

class DeliveryCompanyController {
  async index(req, res, next) {
    try {
      const data = await deliveryCompanyService.findAll(req.query, req.tenantAdminId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const company = await deliveryCompanyService.findById(req.params.id, req.tenantAdminId);
      sendSuccess(res, { company });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const company = await deliveryCompanyService.create(req.body, req.tenantAdminId);
      sendSuccess(res, { company }, 'Delivery company created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const company = await deliveryCompanyService.update(req.params.id, req.body, req.tenantAdminId);
      sendSuccess(res, { company }, 'Delivery company updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await deliveryCompanyService.delete(req.params.id, req.tenantAdminId);
      sendSuccess(res, null, 'Delivery company deleted');
    } catch (error) {
      next(error);
    }
  }

  async getActive(req, res, next) {
    try {
      const companies = await deliveryCompanyService.getActive(requestTenant(req));
      sendSuccess(res, { companies });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeliveryCompanyController();
