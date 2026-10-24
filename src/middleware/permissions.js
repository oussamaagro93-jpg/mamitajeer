const ApiError = require('../utils/ApiError');
const { hasPermission } = require('../config/permissions');

function requirePermission(permission) {
  return function (req, _res, next) {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (hasPermission(req.user, permission)) return next();
    return next(new ApiError(403, 'Insufficient permissions'));
  };
}

module.exports = { requirePermission };
