const categoryService = require('../services/CategoryService');
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

class CategoryController {
  async index(req, res, next) {
    try {
      const isStaff = req.user && STAFF_ROLES.indexOf(req.user.role) !== -1;
      const data = await categoryService.findAll(req.query, {
        tenantId: isStaff ? requestTenant(req) : null,
        publicOnly: !isStaff,
      });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async tree(req, res, next) {
    try {
      const isStaff = req.user && STAFF_ROLES.indexOf(req.user.role) !== -1;
      const categories = await categoryService.getTree(
        isStaff ? requestTenant(req) : null,
        !isStaff,
      );
      sendSuccess(res, { categories });
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const category = await categoryService.findById(req.params.id, requestTenant(req));
      sendSuccess(res, { category });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) data.image = req.file.path;
      const category = await categoryService.create(data, requestTenant(req));
      sendSuccess(res, { category }, 'Category created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.file) data.image = req.file.path;
      const category = await categoryService.update(req.params.id, data, requestTenant(req));
      sendSuccess(res, { category }, 'Category updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await categoryService.delete(req.params.id, requestTenant(req));
      sendSuccess(res, null, 'Category deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
