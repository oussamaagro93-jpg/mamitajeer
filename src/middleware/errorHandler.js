const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const config = require('../config');

const errorHandler = (err, req, res, _next) => {
  logger.error(`${err.message}`, { stack: err.stack, url: req.originalUrl, method: req.method });

  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = (err.errors || []).map((e) => ({ field: e.path, message: e.message }));
    return sendError(res, 'Validation error', 400, errors);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = (err.errors || []).map((e) => ({ field: e.path, message: e.message }));
    const fields = err.fields || {};
    const isEmail = errors.some((e) => e.field === 'email')
      || Object.prototype.hasOwnProperty.call(fields, 'email');
    return sendError(
      res,
      isEmail ? 'Email already registered' : 'A record with these details already exists',
      400,
      errors,
    );
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return sendError(res, 'Referenced record not found', 400);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid or expired token', 401);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File too large', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' ? 'Internal Server Error' : err.message;

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;
