const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');

function mockRedis() {
  return {
    ping: async () => 'PONG',
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    incr: async () => 1,
    expire: async () => 1,
    quit: async () => 'OK',
  };
}

function request(server, { method = 'GET', path, token, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data || '{}');
          } catch {
            json = { raw: data };
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('clinic API routes', () => {
  let server;

  before(async () => {
    const app = createApp({
      redis: mockRedis(),
      mailer: { sendMail: async () => ({}) },
      users: {
        verifyIdToken: async (token) => {
          if (token === 'test-token') return { uid: 'u1', email: 'admin@test.com', role: 'admin' };
          if (token === 'manager-token') {
            return {
              uid: 'u2',
              email: 'manager@test.com',
              role: 'clinic_manager',
              branchId: 'br-dubai',
              clinicId: 'br-dubai',
            };
          }
          throw new Error('bad token');
        },
      },
      config: {
        trustProxy: 0,
        otpSecret: 'test-otp-secret-16+',
        reset: {
          codeLength: 6,
          codeTtlSeconds: 600,
          resendCooldownSeconds: 60,
          maxSendsPerHour: 5,
          maxVerifyAttempts: 5,
          resetTokenTtlSeconds: 900,
          maxRequestsPerIpPerHour: 30,
          maxVerifiesPerIpPerHour: 60,
        },
      },
    });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('rejects unauthenticated clinic dashboard', async () => {
    const res = await request(server, { path: '/api/clinic/dashboard' });
    assert.equal(res.status, 401);
  });

  it('returns dashboard, appointments, branches, managers', async () => {
    const token = 'test-token';
    const dash = await request(server, { path: '/api/clinic/dashboard', token });
    assert.equal(dash.status, 200);
    assert.ok(dash.json.stats?.length);

    const appts = await request(server, { path: '/api/clinic/appointments', token });
    assert.equal(appts.status, 200);
    assert.ok(appts.json.items?.length);

    const firstId = appts.json.items[0].id;
    const one = await request(server, { path: `/api/clinic/appointments/${firstId}`, token });
    assert.equal(one.status, 200);
    assert.equal(one.json.item.id, firstId);

    const branches = await request(server, { path: '/api/clinic/branches', token });
    assert.equal(branches.status, 200);
    const branchId = branches.json.items[0].id;
    const branch = await request(server, { path: `/api/clinic/branches/${branchId}`, token });
    assert.equal(branch.status, 200);
    assert.ok(branch.json.item.stats);

    const managers = await request(server, { path: '/api/clinic/managers', token });
    assert.equal(managers.status, 200);
    const mgrId = managers.json.items[0].id;
    const mgr = await request(server, { path: `/api/clinic/managers/${mgrId}`, token });
    assert.equal(mgr.status, 200);
    assert.ok(mgr.json.item.clinic);
  });

  it('scopes manager data and blocks admin clinic routes', async () => {
    const token = 'manager-token';
    const profile = await request(server, { path: '/api/me', token });
    assert.equal(profile.status, 200);
    assert.equal(profile.json.user.role, 'clinic_manager');
    assert.equal(profile.json.user.branchId, 'br-dubai');

    const dashboard = await request(server, { path: '/api/manager/dashboard', token });
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.json.clinic.id, 'br-dubai');
    assert.ok(dashboard.json.doctors.every((doctor) => doctor.branchId === 'br-dubai'));
    assert.ok(dashboard.json.appointments.every((appointment) => appointment.branchId === 'br-dubai'));
    assert.equal(dashboard.json.pendingApprovals, 1);
    assert.ok(dashboard.json.treatments.every((treatment) => 'quota' in treatment));

    const appointments = await request(server, { path: '/api/manager/appointments', token });
    assert.equal(appointments.status, 200);
    assert.ok(appointments.json.items.every((appointment) => appointment.branchId === 'br-dubai'));

    const doctors = await request(server, { path: '/api/manager/doctors', token });
    assert.equal(doctors.status, 200);
    assert.ok(doctors.json.items.every((doctor) => doctor.branchId === 'br-dubai'));

    const treatments = await request(server, { path: '/api/manager/treatments', token });
    assert.equal(treatments.status, 200);
    assert.ok(treatments.json.items.length);

    const requests = await request(server, { path: '/api/manager/appointment-requests', token });
    assert.equal(requests.status, 200);
    assert.equal(requests.json.items.length, 1);
    const requestId = requests.json.items[0].id;
    const requestDetail = await request(server, {
      path: `/api/manager/appointment-requests/${requestId}`,
      token,
    });
    assert.equal(requestDetail.status, 200);

    const rescheduled = await request(server, {
      method: 'PATCH',
      path: `/api/manager/appointment-requests/${requestId}`,
      token,
      body: { action: 'reschedule', requestedDate: '2026-10-30', requestedTime: '10:00 AM' },
    });
    assert.equal(rescheduled.status, 200);
    assert.equal(rescheduled.json.item.status, 'rescheduled');
    assert.equal(rescheduled.json.item.requestedDate, '2026-10-30');

    const adminDashboard = await request(server, { path: '/api/clinic/dashboard', token });
    assert.equal(adminDashboard.status, 403);
  });
});
