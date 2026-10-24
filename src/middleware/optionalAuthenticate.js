const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { getPermissionsForUser } = require('../config/permissions');

// Adds req.user when a valid bearer token is present, but keeps the route
// public when there is no token or the token is invalid.
async function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });
    if (user && user.isActive) {
      req.user = user;
      req.userId = user.id;
      req.permissions = getPermissionsForUser(user);
    }
  } catch (error) {
    // Public request: ignore invalid/expired tokens.
  }

  return next();
}

module.exports = optionalAuthenticate;
