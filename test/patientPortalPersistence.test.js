const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Redis = require('ioredis-mock');
const { createApp } = require('../src/app');

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

function nextWorkingDate(minDays, workingDays) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + minDays);
  for (let i = 0; i < 14; i += 1) {
    if (workingDays.includes(date.getDay())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    date.setDate(date.getDate() + 1);
  }
  throw new Error('Could not find a working day');
}

function buildServer(redis) {
  const app = createApp({
    redis,
    mailer: { sendMail: async () => ({}) },
    users: {
      verifyIdToken: async (token) => {
        if (token === 'patient-a') return { uid: 'patient-a', email: 'a@test.com', name: 'Patient A', role: 'patient' };
        if (token === 'patient-b') return { uid: 'patient-b', email: 'b@test.com', name: 'Patient B', role: 'patient' };
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
  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const close = (server) => new Promise((resolve) => server.close(resolve));

describe('patient portal persistence, follow-ups and documents', () => {
  const redis = new Redis();
  let server;
  let treatment;
  let doctor;
  let appointment;

  before(async () => {
    server = await buildServer(redis);
    const catalog = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    treatment = catalog.json.treatments.find((item) => item.id === 'laser-hair-removal');
    doctor = catalog.json.doctors.find((item) => item.department === treatment.department);
  });

  after(async () => {
    await close(server);
    await redis.quit();
  });

  it('serves clinics, regions and a featured treatment from the catalog', async () => {
    const catalog = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    assert.ok(catalog.json.clinics.length >= 5);
    assert.ok(catalog.json.clinics.every((clinic) => clinic.region && clinic.address));
    assert.ok(catalog.json.regions.some((region) => region.key === 'UAE' && region.currency === 'AED'));
    assert.ok(catalog.json.treatments.some((item) => item.featured));
    const bannerTarget = catalog.json.banners.find((item) => item.treatmentId);
    assert.ok(catalog.json.treatments.some((item) => item.id === bannerTarget.treatmentId));
  });

  it('never offers time slots that have already started today', async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const working = (await request(server, { path: '/api/patient/catalog', token: 'patient-a' })).json.doctors.find(
      (item) => item.workingDays.includes(now.getDay())
    );
    if (!working) return;
    const slots = await request(server, {
      path: `/api/patient/availability?doctorId=${working.id}&date=${today}`,
      token: 'patient-a',
    });
    for (const slot of slots.json.slots) {
      const [, hh, mm, ap] = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      const hours = (Number(hh) % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, Number(mm));
      assert.ok(start.getTime() > Date.now() - 1000, `${slot} already started`);
    }
  });

  it('books once, blocks a second booking at the same time, and lists a follow-up', async () => {
    const date = nextWorkingDate(8, doctor.workingDays);
    const slots = await request(server, {
      path: `/api/patient/availability?doctorId=${doctor.id}&date=${date}`,
      token: 'patient-a',
    });
    const slot = slots.json.slots[0];
    const booked = await request(server, {
      method: 'POST',
      path: '/api/patient/appointments',
      token: 'patient-a',
      body: { treatmentId: treatment.id, doctorId: doctor.id, date, time: slot },
    });
    assert.equal(booked.status, 201);
    appointment = booked.json.item;

    const other = (await request(server, { path: '/api/patient/catalog', token: 'patient-a' })).json.doctors.find(
      (item) => item.department === 'Laser' && item.id !== doctor.id && item.workingDays.includes(new Date(`${date}T00:00:00`).getDay())
    );
    if (other) {
      const clash = await request(server, {
        method: 'POST',
        path: '/api/patient/appointments',
        token: 'patient-a',
        body: { treatmentId: treatment.id, doctorId: other.id, date, time: slot },
      });
      assert.equal(clash.status, 400);
    }

    const followUps = await request(server, { path: '/api/patient/followups', token: 'patient-a' });
    assert.equal(followUps.status, 200);
    assert.equal(followUps.json.items.length, 1);
    const plan = followUps.json.items[0];
    assert.equal(plan.status, 'upcoming');
    assert.equal(plan.sessions, treatment.sessions);
    assert.equal(plan.completed, 0);
    assert.equal(plan.next.id, appointment.id);

    const otherPatient = await request(server, { path: '/api/patient/followups', token: 'patient-b' });
    assert.deepEqual(otherPatient.json.items, []);
  });

  it('uploads, scopes and downloads an appointment document', async () => {
    const data = Buffer.from('%PDF-1.4 test file').toString('base64');
    const uploaded = await request(server, {
      method: 'POST',
      path: '/api/patient/documents',
      token: 'patient-a',
      body: { appointmentId: appointment.id, name: 'issue.pdf', mimeType: 'application/pdf', data },
    });
    assert.equal(uploaded.status, 201);

    const badType = await request(server, {
      method: 'POST',
      path: '/api/patient/documents',
      token: 'patient-a',
      body: { appointmentId: appointment.id, name: 'run.exe', mimeType: 'application/x-msdownload', data },
    });
    assert.equal(badType.status, 400);

    const foreign = await request(server, {
      method: 'POST',
      path: '/api/patient/documents',
      token: 'patient-b',
      body: { appointmentId: appointment.id, name: 'issue.pdf', mimeType: 'application/pdf', data },
    });
    assert.equal(foreign.status, 404);

    const list = await request(server, { path: '/api/patient/appointments', token: 'patient-a' });
    assert.equal(list.json.items[0].document.name, 'issue.pdf');

    const content = await request(server, {
      path: `/api/patient/documents/${uploaded.json.item.id}/content`,
      token: 'patient-a',
    });
    assert.equal(content.status, 200);
    assert.equal(content.json.data, data);

    const stolen = await request(server, {
      path: `/api/patient/documents/${uploaded.json.item.id}/content`,
      token: 'patient-b',
    });
    assert.equal(stolen.status, 404);
  });

  it('keeps appointments and documents after a server restart', async () => {
    await close(server);
    server = await buildServer(redis);
    const list = await request(server, { path: '/api/patient/appointments', token: 'patient-a' });
    assert.equal(list.status, 200);
    assert.equal(list.json.items.length, 1);
    assert.equal(list.json.items[0].id, appointment.id);
    assert.equal(list.json.items[0].document.name, 'issue.pdf');
  });
});
