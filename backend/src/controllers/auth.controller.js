const config = require('../config/env');
const { getGoogleAuthUrl, exchangeGoogleCode, syncUser } = require('../services/auth.service');
const { createSessionToken } = require('../utils/security');

async function googleLogin(req, res, next) {
  try {
    const url = getGoogleAuthUrl();
    return res.json({ url: url });
  } catch (err) {
    next(err);
  }
}

async function googleCallback(req, res, next) {
  try {
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ detail: 'Authorization code is required.' });
    }

    const userInfo = await exchangeGoogleCode(code);
    if (!userInfo) {
      return res.status(400).json({
        detail: 'Failed to authenticate with Google. Invalid authorization code.',
      });
    }

    const googleId = userInfo.id || userInfo.sub;
    const email = userInfo.email;
    const name = userInfo.name || email;
    const avatarUrl = userInfo.picture || null;

    if (!googleId || !email) {
      return res.status(400).json({
        detail: 'Incomplete Google user profile response.',
      });
    }

    const user = await syncUser(googleId, email, name, avatarUrl);

    const sessionToken = createSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const targetPath = user.role === 'ADMIN' ? '/admin' : '/dashboard';
    const redirectUrl = `${config.FRONTEND_URL}${targetPath}`;

    const isProd = config.COOKIE_SECURE || config.ENVIRONMENT === 'production';
    const sameSitePolicy = isProd ? 'none' : 'lax';

    res.cookie(config.COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: sameSitePolicy,
      secure: isProd,
      path: '/',
    });

    return res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return res.json({
      id: req.user.id,
      google_id: req.user.google_id,
      email: req.user.email,
      name: req.user.name,
      avatar_url: req.user.avatar_url,
      role: req.user.role,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const isProd = config.COOKIE_SECURE || config.ENVIRONMENT === 'production';
    const sameSitePolicy = isProd ? 'none' : 'lax';

    res.clearCookie(config.COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: sameSitePolicy,
      secure: isProd,
    });
    return res.json({ message: 'Successfully logged out' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  googleLogin,
  googleCallback,
  getMe,
  logout,
};
