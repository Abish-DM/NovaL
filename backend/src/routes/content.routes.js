const express = require('express');
const contentController = require('../controllers/content.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, contentController.listContent);
router.get('/:id', requireAuth, contentController.getContentDetail);
router.get('/:id/stream', requireAuth, contentController.streamVideo);
router.get('/:id/pdf', requireAuth, contentController.getPdfStream);
router.get('/:id/html', requireAuth, contentController.getHtmlContent);

module.exports = router;
