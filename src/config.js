require('dotenv').config({ quiet: true });

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number (got "${raw}").`);
  }
  return value;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: int('PORT', 4000),
  // Number of proxy hops in front of the server (0 when the app talks to it directly).
  trustProxy: Number.parseInt(process.env.TRUST_PROXY || '0', 10) || 0,
  corsOrigins: (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : '*'))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  redisUrl: process.env.REDIS_URL || '',
  otpSecret: process.env.OTP_SECRET || '',

  reset: {
    codeLength: int('RESET_CODE_LENGTH', 6),
    codeTtlSeconds: int('RESET_CODE_TTL_SECONDS', 10 * 60),
    resendCooldownSeconds: int('RESET_RESEND_COOLDOWN_SECONDS', 60),
    maxSendsPerHour: int('RESET_MAX_SENDS_PER_HOUR', 5),
    maxVerifyAttempts: int('RESET_MAX_VERIFY_ATTEMPTS', 5),
    resetTokenTtlSeconds: int('RESET_TOKEN_TTL_SECONDS', 15 * 60),
    maxRequestsPerIpPerHour: int('RESET_MAX_REQUESTS_PER_IP_PER_HOUR', 30),
    maxVerifiesPerIpPerHour: int('RESET_MAX_VERIFIES_PER_IP_PER_HOUR', 60),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int('SMTP_PORT', 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Enfield Royal Clinics <no-reply@enfieldroyal.com>',
  },

  firebase: {
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
  },
};

config.isProduction = config.env === 'production';

module.exports = config;
