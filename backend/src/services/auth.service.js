const querystring = require('querystring');
const config = require('../config/env');
const prisma = require('../config/prisma');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function getGoogleAuthUrl(state = 'state') {
  const params = {
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  };
  return `${GOOGLE_AUTH_URL}?${querystring.stringify(params)}`;
}

async function exchangeGoogleCode(code) {
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: querystring.stringify({
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: config.GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      return null;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return null;
    }

    const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userinfoRes.ok) {
      return null;
    }

    return await userinfoRes.json();
  } catch (err) {
    return null;
  }
}

async function syncUser(googleId, email, name, avatarUrl = null) {
  const emailClean = email.trim().toLowerCase();

  // Role determined strictly server-side by checking ADMIN_EMAIL allowlist
  const adminEmails = config.getAdminEmails();
  const isAdmin = adminEmails.includes(emailClean);
  const targetRole = isAdmin ? 'ADMIN' : 'VIEWER';

  // Check existing user by google_id or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ google_id: googleId }, { email: emailClean }],
    },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name,
        avatar_url: avatarUrl,
        role: targetRole,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        google_id: googleId,
        email: emailClean,
        name: name,
        avatar_url: avatarUrl,
        role: targetRole,
      },
    });
  }

  return user;
}

module.exports = {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  syncUser,
};
