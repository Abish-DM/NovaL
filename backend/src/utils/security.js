const jwt = require('jsonwebtoken');
const config = require('../config/env');

const DEFAULT_SESSION_EXPIRE_HOURS = 24;

/**
 * Creates signed session JWT token structure for user authentication.
 */
function createSessionToken(data, expiresInHours = DEFAULT_SESSION_EXPIRE_HOURS) {
  const payload = { ...data };
  return jwt.sign(payload, config.SESSION_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${expiresInHours}h`,
  });
}

/**
 * Decodes and verifies session JWT string. Returns payload object or null.
 */
function decodeSessionToken(token) {
  try {
    return jwt.verify(token, config.SESSION_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (err) {
    return null;
  }
}

module.exports = {
  createSessionToken,
  decodeSessionToken,
};
