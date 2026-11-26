const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Redis = require('ioredis-mock');
const { createApp } = require('../src/app');

const ACCOUNTS = {
  patient: { uid: 'flow-patient', email: 'flow@test.com', name: 'Flow Patient', role: 'patient' },
  doctor: { uid: 'flow-doctor', email: 'ercdoctor@gmail.com', role: 'doctor', branchId: 'br-dubai' },
  stranger: { uid: 'flow-doctor-2', email: 'other@test.com', role: 'doctor', doctorId: 'dr-sarah-malik' },
  unlinked: { uid: 'flow-doctor-3', email: 'nobody@test.com', role: 'doctor' },
  manager: { uid: 'flow-manager', email: 'm@test.com', role: 'clinic_manager', branchId: 'br-dubai' },
};

const redis = new Redis({ keyPrefix: 'doctor-flow:' });

function buildServer() {
  const app = createApp({
    redis,
    mailer: { sendMail: async () => ({}) },
    users: {
      verifyIdToken: async (token) => {
        if (ACCOUNTS[token]) return { ...ACCOUNTS[token] };
        throw new Error('bad token');
      },
    },
    config: { trustProxy: 0, otpSecret: 'test-otp-secret-16+', reset: {} },
  });
  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let server;

function call(token, path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(data || '{}') }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const key = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A date at least `min` days ahead that the doctor works (Mon-Sat). */
function workday(min) {
  const date = new Date();
  date.setDate(date.getDate() + min);
  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return key(date);
}

const slotsFor = async (date) =>
  (await call('patient', `/api/patient/availability?doctorId=dr-ahmed-khan&date=${date}`)).json.slots;

describe('doctor and patient flow', () => {
  let appointment;

  before(async () => {
    server = await buildServer();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await redis.quit();
  });

  it('starts empty: no invented numbers or patients', async () => {
    const dash = await call('doctor', '/api/doctor/dashboard');
    assert.equal(dash.status, 200);
    assert.deepEqual(dash.json.stats, { today: 0, upcoming: 0, pending: 0, canceledToday: 0 });
    assert.deepEqual((await call('doctor', '/api/doctor/patients')).json.items, []);
    assert.equal((await call('unlinked', '/api/doctor/dashboard')).status, 403);
    assert.equal((await call('patient', '/api/doctor/dashboard')).status, 403);
  });

  it('never sends doctor login emails to patients', async () => {
    const catalog = await call('patient', '/api/patient/catalog');
    assert.ok(catalog.json.doctors.every((doctor) => !('email' in doctor)));
  });

  it('shows a patient booking to that doctor only', async () => {
    const date = workday(3);
    const booked = await call('patient', '/api/patient/appointments', 'POST', {
      treatmentId: 'laser-hair-removal',
      doctorId: 'dr-ahmed-khan',
      date,
      time: (await slotsFor(date))[0],
    });
    assert.equal(booked.status, 201);
    appointment = booked.json.item;

    const mine = await call('doctor', '/api/doctor/appointments');
    assert.equal(mine.json.items.length, 1);
    assert.equal(mine.json.items[0].status, 'pending');
    assert.equal((await call('stranger', '/api/doctor/appointments')).json.items.length, 0);
    assert.equal((await call('stranger', `/api/doctor/appointments/${appointment.id}`)).status, 404);
    assert.equal(
      (await call('stranger', `/api/doctor/appointments/${appointment.id}`, 'PATCH', { action: 'confirm' })).status,
      404
    );
  });

  it('lets the doctor confirm, and blocks completing a future visit', async () => {
    const path = `/api/doctor/appointments/${appointment.id}`;
    assert.equal((await call('doctor', path, 'PATCH', { action: 'complete' })).status, 400);
    const confirmed = await call('doctor', path, 'PATCH', { action: 'confirm' });
    assert.equal(confirmed.json.item.status, 'upcoming');
    assert.equal((await call('doctor', path, 'PATCH', { action: 'complete' })).status, 400);
    const seen = await call('patient', '/api/patient/appointments');
    assert.equal(seen.json.items[0].status, 'upcoming');
    const feed = await call('patient', '/api/notifications/feed');
    assert.ok(feed.json.items.some((item) => item.title === 'Appointment confirmed'));
  });

  it('shares the medical record between patient and their doctor', async () => {
    const saved = await call('patient', '/api/patient/medical', 'PUT', {
      allergies: ['Latex'],
      medications: [{ name: 'Cetirizine', frequency: 'Daily' }],
    });
    assert.equal(saved.status, 200);
    const detail = await call('doctor', `/api/doctor/appointments/${appointment.id}`);
    assert.deepEqual(detail.json.medical.allergies, ['Latex']);
    const edited = await call('doctor', '/api/doctor/patients/flow-patient/medical', 'PUT', {
      allergies: ['Latex', 'Aspirin'],
      medications: [],
    });
    assert.equal(edited.status, 200);
    assert.deepEqual((await call('patient', '/api/patient/medical')).json.medical.allergies, ['Latex', 'Aspirin']);
    assert.equal((await call('stranger', '/api/doctor/patients/flow-patient/medical', 'PUT', {})).status, 404);
  });

  it('blocks patient slots only after the manager approves leave', async () => {
    const date = workday(10);
    assert.ok((await slotsFor(date)).length > 0);
    const sent = await call('doctor', '/api/doctor/schedule-requests', 'POST', {
      mode: 'leave',
      leaveFrom: date,
      leaveTo: date,
      reason: 'Conference',
    });
    assert.equal(sent.status, 201);
    assert.ok((await slotsFor(date)).length > 0);

    // A restart must keep the request in the manager's queue.
    await new Promise((resolve) => server.close(resolve));
    server = await buildServer();
    const alerts = await call('manager', '/api/manager/alerts');
    assert.equal(alerts.status, 200);

    const decided = await call('manager', `/api/manager/alerts/${sent.json.alert.id}`, 'PATCH', { action: 'approve' });
    assert.equal(decided.status, 200);
    assert.deepEqual(await slotsFor(date), []);
    const schedule = await call('doctor', '/api/doctor/schedule');
    assert.equal(schedule.json.leaves[0].status, 'approved');
  });

  it('keeps appointments after a restart', async () => {
    const mine = await call('doctor', '/api/doctor/appointments');
    assert.equal(mine.json.items[0].id, appointment.id);
    assert.equal(mine.json.items[0].status, 'upcoming');
  });
});
