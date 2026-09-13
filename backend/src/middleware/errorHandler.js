const config = require('../config/env');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const detail =
    config.ENVIRONMENT === 'development' || statusCode < 500
      ? err.message || 'An error occurred'
      : 'An internal error occurred. Please contact system administrator.';

  return res.status(statusCode).json({
    detail: detail,
  });
}

module.exports = errorHandler;
