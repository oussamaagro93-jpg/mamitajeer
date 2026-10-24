const { User } = require('../models');
const ApiError = require('./ApiError');

function parseAdminId(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'Invalid admin account');
  }
  return parsed;
}

// Scope helper: when tenantId is null the caller is a super_admin, so the
// query stays unscoped. Otherwise every query is restricted to that tenant.
function tenantWhere(tenantId, where) {
  var scoped = Object.assign({}, where || {});
  if (tenantId) scoped.adminId = tenantId;
  return scoped;
}

// For super_admin creates without an explicit adminId, fall back to the first
// admin account so newly created resources still have a valid owner.
async function resolveAdminId(tenantId) {
  if (tenantId) return tenantId;

  const admin = await User.findOne({
    where: { role: 'admin', isActive: true },
    order: [['id', 'ASC']],
  });

  return admin ? admin.id : null;
}

async function findTenantResource(Model, id, tenantId) {
  const where = tenantWhere(tenantId, { id: id });
  return Model.findOne({ where: where });
}

module.exports = {
  tenantWhere,
  resolveAdminId,
  findTenantResource,
  parseAdminId,
};
