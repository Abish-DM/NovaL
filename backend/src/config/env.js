const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root or backend .env
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: true });
}

const config = {
  ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  PORT: parseInt(process.env.PORT || '8000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
  SESSION_SECRET: process.env.SESSION_SECRET || 'super-secret-key-change-this-in-production-min-32-chars',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  COOKIE_NAME: 'session_token',

  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/secure_content_portal',

  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase(),
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || 'admin@example.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback',

  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || null,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'secure-portal-content',
  STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || null,
  STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || null,
  STORAGE_REGION: process.env.STORAGE_REGION || 'us-east-1',

  MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100', 10),
};

// Returns full admin email allowlist including single ADMIN_EMAIL
config.getAdminEmails = function () {
  const list = new Set([config.ADMIN_EMAIL, ...config.ADMIN_EMAILS]);
  return Array.from(list).filter(Boolean);
};

module.exports = config;
