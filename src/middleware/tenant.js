const ApiError = require('../utils/ApiError');
const { User } = require('../models');
const { getTenantAdminId } = require('../config/permissions');

// Resolves the tenant (admin account) that owns the current request.
// super_admin can opt into a tenant with ?adminId= / body.adminId; no value
// means "all tenants" for reads.
async function tenantContext(req, _res, next) {
  try {
    if (!req.user) throw new ApiError(401, 'Authentication required');

    if (req.user.role === 'super_admin') {
      const requested = req.query.adminId || (req.body && req.body.adminId) || null;
      if (requested) {
        const parsed = parseInt(requested, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new ApiError(400, 'Invalid admin account');
        }
        const admin = await User.findByPk(parsed);
        if (!admin || admin.role !== 'admin') {
          throw new ApiError(400, 'Invalid admin account');
        }
        req.tenantAdminId = parsed;
      } else {
        req.tenantAdminId = null;
      }
      return next();
    }

    const tenantId = getTenantAdminId(req.user);
    if (!tenantId) {
      throw new ApiError(403, 'No admin account is associated with this user');
    }
    req.tenantAdminId = tenantId;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireTenantAdmin(req, _res, next) {
  if (!req.tenantAdminId) {
    return next(new ApiError(400, 'adminId is required for this operation'));
  }
  return next();
}

module.exports = { tenantContext, requireTenantAdmin };
