const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/google/login', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
