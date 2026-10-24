const brandService = require('../services/BrandService');
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

class BrandController {
  async index(req, res, next) {
    try {
      const isStaff = req.user && STAFF_ROLES.indexOf(req.user.role) !== -1;
      const data = await brandService.findAll(req.query, {
        tenantId: isStaff ? requestTenant(req) : null,
        publicOnly: !isStaff,
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const brand = await brandService.findById(req.params.id, requestTenant(req));
      sendSuccess(res, { brand });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const brand = await brandService.create(req.body, requestTenant(req));
      sendSuccess(res, { brand }, 'Brand created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const brand = await brandService.update(req.params.id, req.body, requestTenant(req));
      sendSuccess(res, { brand }, 'Brand updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await brandService.delete(req.params.id, requestTenant(req));
      sendSuccess(res, null, 'Brand deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BrandController();
