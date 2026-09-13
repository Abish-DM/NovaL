const config = require('../config/env');
const prisma = require('../config/prisma');
const { decodeSessionToken } = require('../utils/security');

async function requireAuth(req, res, next) {
  try {
    let token = req.cookies ? req.cookies[config.COOKIE_NAME] : null;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        detail: 'Authentication required. Please sign in.',
      });
    }

    const payload = decodeSessionToken(token);
    if (!payload || !payload.sub) {
      return res.status(401).json({
        detail: 'Invalid or expired session. Please sign in again.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return res.status(401).json({
        detail: 'User account no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      detail: 'Authentication failed.',
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      detail: 'Forbidden: Administrative privileges required.',
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
