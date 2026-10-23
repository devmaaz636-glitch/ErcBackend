const express = require('express');
const cors = require('cors');
const { createPasswordReset, ResetError } = require('./passwordReset');
const { createNotifications } = require('./notifications');
const { createClinicStore } = require('./clinicData');

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createApp({ redis, mailer, users, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(cors());
  app.use(express.json({ limit: '32kb' }));

  const reset = createPasswordReset({
    redis,
    mailer,
    users,
    secret: config.otpSecret,
    settings: config.reset,
  });
  const notifications = createNotifications({
    redis,
    mailer,
    resolveUserEmail: async (uid) => {
      try {
        if (typeof users.getUserEmail === 'function') {
          return users.getUserEmail(uid);
        }
        if (typeof users.getUser === 'function') {
          const record = await users.getUser(uid);
          return record?.email || null;
        }
      } catch {
        return null;
      }
      return null;
    },
  });
  const clinic = createClinicStore();

  const clientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';

  async function requireUser(req, _res, next) {
    try {
      const header = req.get('authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!token) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required.');
      }
      req.user = await users.verifyIdToken(token);
      next();
    } catch (error) {
      if (error instanceof ApiError) return next(error);
      next(new ApiError(401, 'UNAUTHORIZED', 'Sign in required.'));
    }
  }

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

  app.get('/api/notifications/preferences', requireUser, async (req, res) => {
    const preferences = await notifications.getPreferences(req.user.uid);
    res.json({ ok: true, preferences, defaults: notifications.defaults });
  });

  app.put('/api/notifications/preferences', requireUser, async (req, res) => {
    const preferences = await notifications.savePreferences(req.user.uid, req.body || {});
    res.json({ ok: true, preferences });
  });

  app.post('/api/notifications/preferences/reset', requireUser, async (req, res) => {
    const preferences = await notifications.resetPreferences(req.user.uid);
    res.json({ ok: true, preferences });
  });

  app.get('/api/notifications/feed', requireUser, async (req, res) => {
    const items = await notifications.listFeed(req.user.uid);
    res.json({ ok: true, items });
  });

  app.post('/api/notifications/devices', requireUser, async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token) throw new ApiError(400, 'INVALID_TOKEN', 'Push token is required.');
    const result = await notifications.registerDevice(req.user.uid, {
      token,
      platform: req.body?.platform,
    });
    res.json({ ok: true, ...result });
  });

  app.delete('/api/notifications/devices', requireUser, async (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token) throw new ApiError(400, 'INVALID_TOKEN', 'Push token is required.');
    await notifications.unregisterDevice(req.user.uid, token);
    res.json({ ok: true });
  });

  // Publish a domain event; delivered on enabled channels (inApp / email / push).
  app.post('/api/notifications/events', requireUser, async (req, res) => {
    const type = String(req.body?.type || '');
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    if (!type || !title || !body) {
      throw new ApiError(400, 'INVALID_EVENT', 'type, title, and body are required.');
    }
    const result = await notifications.publishEvent({
      uid: req.user.uid,
      type,
      title,
      body,
      meta: req.body?.meta || {},
      email: req.user.email || req.body?.email,
    });
    res.json({ ok: true, ...result });
  });

  // ── Clinic domain (dynamic dashboard / appointments / branches / managers) ──
  app.get('/api/clinic/dashboard', requireUser, (_req, res) => {
    res.json({ ok: true, ...clinic.getDashboard() });
  });

  app.get('/api/clinic/appointments', requireUser, (_req, res) => {
    res.json({ ok: true, ...clinic.listAppointments() });
  });

  app.get('/api/clinic/appointments/:id', requireUser, (req, res) => {
    const item = clinic.getAppointment(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Appointment not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/clinic/branches', requireUser, (_req, res) => {
    res.json({ ok: true, ...clinic.listBranches() });
  });

  app.get('/api/clinic/branches/:id', requireUser, (req, res) => {
    const item = clinic.getBranch(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Branch not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/clinic/managers', requireUser, (_req, res) => {
    res.json({ ok: true, ...clinic.listManagers() });
  });

  app.get('/api/clinic/managers/:id', requireUser, (req, res) => {
    const item = clinic.getManager(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Clinic manager not found.');
    res.json({ ok: true, item });
  });

  // Real-time stream (SSE). Expo Go can also poll /feed; this is for live updates.
  app.get('/api/notifications/stream', requireUser, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send({ type: 'connected', at: new Date().toISOString() });
    const existing = await notifications.listFeed(req.user.uid, 10);
    send({ type: 'snapshot', items: existing });

    const unsubscribe = notifications.subscribe(req.user.uid, (item) => {
      send({ type: 'notification', item });
    });

    const heartbeat = setInterval(() => {
      res.write(`: ping\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND', message: 'Not found.' });
  });

  // Express needs all four arguments to treat this as the error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error instanceof ResetError || error instanceof ApiError) {
      if (error.extra?.retryAfterSeconds) {
        res.set('Retry-After', String(error.extra.retryAfterSeconds));
      }
      return res
        .status(error.status)
        .json({ ok: false, error: error.code, message: error.message, ...(error.extra || {}) });
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
