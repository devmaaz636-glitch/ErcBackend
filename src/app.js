const express = require('express');
const cors = require('cors');
const { createPasswordReset, ResetError } = require('./passwordReset');

function createApp({ redis, mailer, users, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  const reset = createPasswordReset({
    redis,
    mailer,
    users,
    secret: config.otpSecret,
    settings: config.reset,
  });

  const clientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';

  app.get('/health', async (_req, res) => {
    try {
      await redis.ping();
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.post('/api/auth/password-reset/request', async (req, res) => {
    const result = await reset.requestCode({ email: req.body?.email, ip: clientIp(req) });
    res.json({
      ok: true,
      message: 'If an account exists for this email, a verification code has been sent.',
      ...result,
    });
  });

  app.post('/api/auth/password-reset/verify', async (req, res) => {
    const result = await reset.verifyCode({
      email: req.body?.email,
      code: req.body?.code,
      ip: clientIp(req),
    });
    res.json({ ok: true, ...result });
  });

  app.post('/api/auth/password-reset/confirm', async (req, res) => {
    await reset.confirmReset({ resetToken: req.body?.resetToken, password: req.body?.password });
    res.json({ ok: true, message: 'Your password has been updated.' });
  });

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Not found.' });
  });

  // Express needs all four arguments to treat this as the error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error instanceof ResetError) {
      if (error.extra.retryAfterSeconds) {
        res.set('Retry-After', String(error.extra.retryAfterSeconds));
      }
      return res
        .status(error.status)
        .json({ ok: false, error: error.code, message: error.message, ...error.extra });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ ok: false, error: 'BAD_JSON', message: 'Invalid request body.' });
    }
    console.error('[api] unexpected error:', error);
    return res
      .status(500)
      .json({ ok: false, error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  });

  return app;
}

module.exports = { createApp };
