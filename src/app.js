const express = require('express');
const cors = require('cors');
const { createPasswordReset, ResetError } = require('./passwordReset');
const { createNotifications } = require('./notifications');
const { createClinicStore } = require('./clinicData');
const { DEMO_MANAGERS } = require('./demoManagers');

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createApp({ redis, mailer, users, config }) {
  const app = express();
  const corsOrigins = config.corsOrigins || ['*'];
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new ApiError(403, 'CORS_FORBIDDEN', 'Origin is not allowed.'));
      },
    })
  );
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

  function requireRole(...roles) {
    return (req, _res, next) => {
      if (!roles.includes(req.user?.role)) {
        return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'));
      }
      next();
    };
  }

  function requireManager(req, _res, next) {
    if (req.user?.role !== 'clinic_manager' || !req.user.branchId) {
      return next(
        new ApiError(403, 'MANAGER_SCOPE_REQUIRED', 'A clinic manager account with an assigned clinic is required.')
      );
    }
    next();
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

  /** Patient-only public signup. Never creates admin / manager / doctor accounts. */
  app.post('/api/auth/patient/signup', async (req, res) => {
    if (typeof users.createPatientAccount !== 'function') {
      throw new ApiError(503, 'SIGNUP_UNAVAILABLE', 'Patient signup is not available.');
    }
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const fullName = String(req.body?.fullName || req.body?.name || '').trim();
    const confirmPassword = String(req.body?.confirmPassword || password);
    if (!email || !password || !fullName) {
      throw new ApiError(400, 'INVALID_SIGNUP', 'Full name, email, and password are required.');
    }
    if (password !== confirmPassword) {
      throw new ApiError(400, 'PASSWORD_MISMATCH', 'Passwords do not match.');
    }
    try {
      const result = await users.createPatientAccount({ email, password, fullName });
      res.status(201).json({ ok: true, ...result });
    } catch (error) {
      if (error?.code === 'INVALID_EMAIL' || error?.code === 'INVALID_NAME' || error?.code === 'WEAK_PASSWORD') {
        throw new ApiError(400, error.code, error.message);
      }
      if (error?.code === 'EMAIL_EXISTS' || error?.code === 'EMAIL_STAFF') {
        throw new ApiError(409, error.code, error.message);
      }
      if (error?.code === 'auth/email-already-exists') {
        throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists. Sign in instead.');
      }
      throw error;
    }
  });

  /** Demo clinic-manager email/password login (creates/repairs Auth user + returns custom token). */
  app.post('/api/auth/demo-login', async (req, res) => {
    if (typeof users.ensureDemoManagerLogin !== 'function') {
      throw new ApiError(503, 'DEMO_LOGIN_UNAVAILABLE', 'Demo login is not available.');
    }
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      throw new ApiError(400, 'INVALID_CREDENTIALS', 'Email and password are required.');
    }
    try {
      const result = await users.ensureDemoManagerLogin(email, password);
      res.json({ ok: true, ...result });
    } catch (error) {
      if (error?.code === 'DEMO_UNKNOWN' || error?.code === 'DEMO_BAD_PASSWORD') {
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      }
      throw error;
    }
  });

  app.get('/api/me', requireUser, async (req, res) => {
    let profile = null;
    if (typeof users.getUser === 'function') {
      profile = await users.getUser(req.user.uid);
    }
    const branchId = req.user.branchId || req.user.clinicId || null;
    const branch =
      branchId && typeof clinic.getBranch === 'function' ? clinic.getBranch(branchId) : null;
    const region =
      req.user.region ||
      profile?.region ||
      branch?.region ||
      branch?.city ||
      null;
    res.json({
      ok: true,
      user: {
        ...req.user,
        ...(profile || {}),
        role: req.user.role,
        branchId,
        clinicId: req.user.clinicId || branchId,
        region,
        branch: branch
          ? {
              id: branch.id,
              name: branch.name,
              city: branch.city,
              region: branch.region,
            }
          : null,
      },
    });
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

  app.post('/api/notifications/read', requireUser, async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : undefined;
    const result = await notifications.markFeedRead(req.user.uid, ids);
    res.json({ ok: true, ...result });
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
  app.get('/api/clinic/dashboard', requireUser, requireRole('admin'), (_req, res) => {
    res.json({ ok: true, ...clinic.getDashboard() });
  });

  app.get('/api/clinic/appointments', requireUser, requireRole('admin'), (_req, res) => {
    res.json({ ok: true, ...clinic.listAppointments() });
  });

  app.get('/api/clinic/appointments/:id', requireUser, requireRole('admin'), (req, res) => {
    const item = clinic.getAppointment(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Appointment not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/clinic/branches', requireUser, requireRole('admin'), (_req, res) => {
    res.json({ ok: true, ...clinic.listBranches() });
  });

  app.get('/api/clinic/branches/:id', requireUser, requireRole('admin'), (req, res) => {
    const item = clinic.getBranch(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Branch not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/clinic/managers', requireUser, requireRole('admin'), (_req, res) => {
    res.json({ ok: true, ...clinic.listManagers() });
  });

  app.get('/api/clinic/managers/:id', requireUser, requireRole('admin'), (req, res) => {
    const item = clinic.getManager(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Clinic manager not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/clinic/doctors/:id', requireUser, requireRole('admin'), (req, res) => {
    const item = clinic.getDoctor(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/clinic/appointment-requests/:id', requireUser, requireRole('admin'), (req, res) => {
    const item = clinic.getAppointmentRequest(req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Appointment request not found.');
    res.json({ ok: true, item });
  });

  // Clinic-manager domain. All data is scoped from the verified token claim;
  // the client cannot choose another clinic by passing a query parameter.
  app.get('/api/manager/dashboard', requireUser, requireManager, (req, res) => {
    const data = clinic.getManagerDashboard(req.user.branchId);
    if (!data) throw new ApiError(403, 'CLINIC_NOT_FOUND', 'The assigned clinic could not be found.');
    res.json({ ok: true, ...data });
  });

  app.get('/api/manager/appointments', requireUser, requireManager, (req, res) => {
    res.json({ ok: true, ...clinic.listManagerAppointments(req.user.branchId) });
  });

  app.get('/api/manager/appointments/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.getManagerAppointment(req.params.id, req.user.branchId);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Appointment not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/manager/appointment-requests', requireUser, requireManager, (req, res) => {
    res.json({ ok: true, ...clinic.listManagerAppointmentRequests(req.user.branchId) });
  });

  app.get('/api/manager/appointment-requests/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.getManagerAppointmentRequest(req.params.id, req.user.branchId);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Appointment request not found.');
    res.json({ ok: true, item });
  });

  app.patch('/api/manager/appointment-requests/:id', requireUser, requireManager, (req, res) => {
    const action = String(req.body?.action || '').trim().toLowerCase();
    const allowedActions = new Set(['approve', 'reject', 'reschedule']);
    if (!allowedActions.has(action)) {
      throw new ApiError(400, 'INVALID_ACTION', 'action must be approve, reject, or reschedule.');
    }

    const update = {
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'rescheduled',
      reviewedBy: req.user.uid,
      reviewedAt: new Date().toISOString(),
    };

    if (action === 'reschedule') {
      const requestedDate = String(req.body?.requestedDate || '').trim();
      const requestedTime = String(req.body?.requestedTime || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !requestedTime) {
        throw new ApiError(400, 'INVALID_RESCHEDULE', 'requestedDate and requestedTime are required.');
      }
      update.requestedDate = requestedDate;
      update.requestedTime = requestedTime;
    }

    const item = clinic.updateManagerAppointmentRequest(req.params.id, req.user.branchId, update);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Appointment request not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/manager/treatments', requireUser, requireManager, (req, res) => {
    res.json({ ok: true, ...clinic.listManagerTreatments(req.user.branchId) });
  });

  app.get('/api/manager/treatments/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.getManagerTreatment(req.params.id, req.user.branchId);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Treatment not found.');
    res.json({ ok: true, item });
  });

  app.post('/api/manager/treatments', requireUser, requireManager, (req, res) => {
    try {
      const item = clinic.createManagerTreatment(req.user.branchId, req.body || {});
      if (!item) throw new ApiError(404, 'NOT_FOUND', 'Branch not found.');
      res.status(201).json({ ok: true, item });
    } catch (err) {
      if (err?.code === 'INVALID_TREATMENT') {
        throw new ApiError(400, 'INVALID_TREATMENT', err.message);
      }
      throw err;
    }
  });

  app.patch('/api/manager/treatments/:id', requireUser, requireManager, (req, res) => {
    try {
      const item = clinic.updateManagerTreatment(req.user.branchId, req.params.id, req.body || {});
      if (!item) throw new ApiError(404, 'NOT_FOUND', 'Treatment not found.');
      res.json({ ok: true, item });
    } catch (err) {
      if (err?.code === 'INVALID_TREATMENT') {
        throw new ApiError(400, 'INVALID_TREATMENT', err.message);
      }
      throw err;
    }
  });

  app.delete('/api/manager/treatments/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.deleteManagerTreatment(req.user.branchId, req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Treatment not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/manager/doctors', requireUser, requireManager, (req, res) => {
    res.json({ ok: true, ...clinic.listManagerDoctors(req.user.branchId) });
  });

  app.get('/api/manager/patients', requireUser, requireManager, (req, res) => {
    res.json({ ok: true, ...clinic.listManagerPatients(req.user.branchId) });
  });

  app.get('/api/manager/patients/:id', requireUser, requireManager, (req, res) => {
    const region = req.query?.region ? String(req.query.region) : null;
    const item = clinic.getManagerPatient(req.user.branchId, req.params.id, region);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Patient not found.');
    res.json({ ok: true, item });
  });

  app.get('/api/manager/alerts', requireUser, requireManager, (req, res) => {
    res.json({ ok: true, ...clinic.listManagerAlerts(req.user.branchId) });
  });

  app.get('/api/manager/alerts/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.getManagerAlert(req.user.branchId, req.params.id);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Alert not found.');
    res.json({ ok: true, item });
  });

  async function publishScheduleNotify({ uid, title, body, meta = {} }) {
    if (!uid) return null;
    try {
      return await notifications.publishEvent({
        uid,
        type: 'bookingUpdates',
        title,
        body,
        meta: { kind: 'doctor_schedule', ...meta },
        force: true,
      });
    } catch {
      return null;
    }
  }

  async function notifyAllClinicManagers({ title, body, meta = {} }) {
    const results = await Promise.all(
      DEMO_MANAGERS.map(async (manager) => {
        try {
          const account = await users.findByEmail(manager.email);
          if (!account?.uid) return null;
          return publishScheduleNotify({
            uid: account.uid,
            title,
            body,
            meta: { open: 'ManagerAlerts', ...meta },
          });
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean);
  }

  app.patch('/api/manager/alerts/:id', requireUser, requireManager, async (req, res) => {
    const item = clinic.updateManagerAlert(req.user.branchId, req.params.id, req.body || {});
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Alert not found.');

    if (item.type === 'doctor_schedule' && item.resolvedAction) {
      const approved = item.resolvedAction === 'approve';
      const modeLabel = item.mode === 'leave' ? 'leave request' : 'schedule change';
      const status = approved ? 'approved' : 'declined';
      const sharedMeta = {
        alertId: item.id,
        scheduleRequestId: item.scheduleRequestId || null,
        status,
        mode: item.mode || 'hours',
      };

      // Live notify doctor + confirming manager (no re-login required).
      await Promise.all([
        publishScheduleNotify({
          uid: item.doctorUid,
          title: approved ? 'Schedule request approved' : 'Schedule request declined',
          body: approved
            ? `Your ${modeLabel} was approved by the clinic manager.`
            : `Your ${modeLabel} was declined by the clinic manager.`,
          meta: sharedMeta,
        }),
        publishScheduleNotify({
          uid: req.user.uid,
          title: approved ? 'You approved a doctor request' : 'You declined a doctor request',
          body: approved
            ? `${item.doctorName || 'Doctor'}'s ${modeLabel} is now approved.`
            : `${item.doctorName || 'Doctor'}'s ${modeLabel} was declined.`,
          meta: { ...sharedMeta, open: 'ManagerAlerts' },
        }),
      ]);
    }

    res.json({ ok: true, item });
  });

  app.post('/api/doctor/schedule-requests', requireUser, requireRole('doctor'), async (req, res) => {
    const body = req.body || {};
    const created = clinic.createDoctorScheduleRequest({
      mode: body.mode,
      doctorUid: req.user.uid,
      doctorName: body.doctorName || req.user.name || req.user.displayName || 'Doctor',
      branchId: body.branchId || req.user.branchId || 'br-dubai',
      preferDay: body.preferDay || null,
      preferTime: body.preferTime || null,
      reason: body.reason || '',
      weeklySchedule: body.weeklySchedule || null,
    });

    const modeLabel = created.request.mode === 'leave' ? 'leave request' : 'working hours change';
    const title = created.alert?.title || 'Doctor schedule request';
    const requestBody =
      created.alert?.body ||
      `${created.request.doctorName} submitted a ${modeLabel} for approval.`;
    const meta = {
      alertId: created.alert?.id || null,
      scheduleRequestId: created.request.id,
      mode: created.request.mode,
      status: 'pending',
    };

    // Live notify every clinic manager + the doctor (SSE / in-app feed).
    await Promise.all([
      notifyAllClinicManagers({ title, body: requestBody, meta }),
      publishScheduleNotify({
        uid: req.user.uid,
        title: 'Schedule request sent',
        body: `Your ${modeLabel} was sent to the clinic manager for approval.`,
        meta,
      }),
    ]);

    res.status(201).json({ ok: true, item: created.request, alert: created.alert });
  });

  app.get('/api/doctor/schedule-requests', requireUser, requireRole('doctor'), (req, res) => {
    const items = clinic.listDoctorScheduleRequests({ doctorUid: req.user.uid });
    res.json({ ok: true, items });
  });

  app.get('/api/doctor/schedule-requests/:id', requireUser, requireRole('doctor'), (req, res) => {
    const item = clinic.getDoctorScheduleRequest(req.params.id);
    if (!item || (item.doctorUid && item.doctorUid !== req.user.uid)) {
      throw new ApiError(404, 'NOT_FOUND', 'Schedule request not found.');
    }
    res.json({ ok: true, item });
  });

  app.get('/api/manager/doctors/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.getManagerDoctor(req.params.id, req.user.branchId);
    if (!item || item.status === 'inactive') {
      throw new ApiError(404, 'NOT_FOUND', 'Doctor not found.');
    }
    res.json({ ok: true, item });
  });

  function normalizeWeeklySchedule(raw) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!raw || typeof raw !== 'object') return null;
    const weekly = {};
    let any = false;
    for (const day of days) {
      const item = raw[day];
      if (!item || typeof item !== 'object') {
        weekly[day] = { enabled: false, start: '09:00 AM', end: '05:00 PM' };
        continue;
      }
      const enabled = Boolean(item.enabled);
      if (enabled) any = true;
      weekly[day] = {
        enabled,
        start: String(item.start || '09:00 AM').trim(),
        end: String(item.end || '05:00 PM').trim(),
      };
    }
    return any ? weekly : null;
  }

  function doctorInput(body) {
    const name = String(body?.name || '').trim();
    const specialty = String(body?.specialty || '').trim();
    if (!name || !specialty) {
      throw new ApiError(400, 'INVALID_DOCTOR', 'name and specialty are required.');
    }
    const contact = body?.contact || {};
    const weeklySchedule = normalizeWeeklySchedule(body?.weeklySchedule);
    const firstDay = weeklySchedule
      ? Object.values(weeklySchedule).find((d) => d.enabled)
      : null;
    return {
      name,
      specialty,
      photo: body?.photo ? String(body.photo).trim() : null,
      status: body?.status === 'inactive' ? 'inactive' : 'active',
      availability: String(body?.availability || 'Available').trim(),
      schedule: {
        start: String(body?.schedule?.start || firstDay?.start || '09:00 AM').trim(),
        end: String(body?.schedule?.end || firstDay?.end || '05:00 PM').trim(),
      },
      weeklySchedule,
      contact: {
        phone: String(contact.phone || '').trim(),
        email: String(contact.email || '').trim(),
      },
    };
  }

  app.post('/api/manager/doctors', requireUser, requireManager, (req, res) => {
    const item = clinic.createManagerDoctor(req.user.branchId, doctorInput(req.body));
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Branch not found.');
    res.status(201).json({ ok: true, item });
  });

  app.patch('/api/manager/doctors/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.updateManagerDoctor(req.params.id, req.user.branchId, doctorInput(req.body));
    if (!item || item.status === 'inactive') {
      throw new ApiError(404, 'NOT_FOUND', 'Doctor not found.');
    }
    res.json({ ok: true, item });
  });

  app.delete('/api/manager/doctors/:id', requireUser, requireManager, (req, res) => {
    const item = clinic.deactivateManagerDoctor(req.params.id, req.user.branchId);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Doctor not found.');
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
