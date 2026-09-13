const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post(
  '/content',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  adminController.uploadContent
);

router.patch(
  '/content/:id',
  requireAuth,
  requireAdmin,
  adminController.updateContentMetadata
);

router.delete(
  '/content/:id',
  requireAuth,
  requireAdmin,
  adminController.deleteContent
);

router.get(
  '/audit-logs',
  requireAuth,
  requireAdmin,
  adminController.getAuditLogs
);

module.exports = router;
