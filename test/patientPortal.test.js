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

/** Next date at least `minDays` ahead that falls on an allowed weekday (0=Sun). */
function nextWorkingDate(minDays, workingDays = [1, 2, 3, 4, 5, 6]) {
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

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

describe('patient portal API (small → large)', () => {
  let server;

  before(async () => {
    const app = createApp({
      redis: mockRedis(),
      mailer: { sendMail: async () => ({}) },
      users: {
        verifyIdToken: async (token) => {
          if (token === 'patient-a') {
            return { uid: 'patient-a', email: 'a@test.com', name: 'Patient A', role: 'patient' };
          }
          if (token === 'patient-b') {
            return { uid: 'patient-b', email: 'b@test.com', name: 'Patient B', role: 'patient' };
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

  it('returns full catalog shape', async () => {
    const catalog = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    assert.equal(catalog.status, 200);
    assert.ok(catalog.json.treatments.length > 0);
    assert.ok(catalog.json.doctors.length > 0);
    assert.ok(catalog.json.categories.length > 0);
    assert.ok(catalog.json.banners.length > 0);
    assert.ok(Array.isArray(catalog.json.popular));
  });

  it('rejects past booking dates and returns no past slots', async () => {
    const catalog = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    const treatment = catalog.json.treatments.find((item) => item.department === 'Laser');
    const doctor = catalog.json.doctors.find((item) => item.department === treatment.department);
    const past = yesterdayKey();

    const availability = await request(server, {
      path: `/api/patient/availability?doctorId=${doctor.id}&date=${past}`,
      token: 'patient-a',
    });
    assert.equal(availability.status, 200);
    assert.deepEqual(availability.json.slots, []);

    const created = await request(server, {
      method: 'POST',
      path: '/api/patient/appointments',
      token: 'patient-a',
      body: { treatmentId: treatment.id, doctorId: doctor.id, date: past, time: '09:00 AM' },
    });
    assert.equal(created.status, 400);
  });

  it('books, reschedules, scopes by patient, ranks popular, then cancels', async () => {
    const catalog = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    const laser = catalog.json.treatments.find((item) => item.department === 'Laser');
    const hair = catalog.json.treatments.find((item) => item.department === 'Hair');
    const laserDoctor = catalog.json.doctors.find((item) => item.department === laser.department);
    const hairDoctor = catalog.json.doctors.find((item) => item.department === hair.department);

    const date = nextWorkingDate(10, laserDoctor.workingDays);
    const availability = await request(server, {
      path: `/api/patient/availability?doctorId=${laserDoctor.id}&date=${date}`,
      token: 'patient-a',
    });
    assert.ok(availability.json.slots.length > 0);
    const slot = availability.json.slots[0];

    const booked = await request(server, {
      method: 'POST',
      path: '/api/patient/appointments',
      token: 'patient-a',
      body: { treatmentId: laser.id, doctorId: laserDoctor.id, date, time: slot },
    });
    assert.equal(booked.status, 201);
    assert.equal(booked.json.item.patientUid, 'patient-a');

    const afterBook = await request(server, {
      path: `/api/patient/availability?doctorId=${laserDoctor.id}&date=${date}`,
      token: 'patient-a',
    });
    assert.equal(afterBook.json.slots.includes(slot), false);

    const nextDate = nextWorkingDate(20, laserDoctor.workingDays);
    const nextSlots = await request(server, {
      path: `/api/patient/availability?doctorId=${laserDoctor.id}&date=${nextDate}`,
      token: 'patient-a',
    });
    assert.ok(nextSlots.json.slots.length > 0);

    const rescheduled = await request(server, {
      method: 'PATCH',
      path: `/api/patient/appointments/${booked.json.item.id}`,
      token: 'patient-a',
      body: {
        action: 'reschedule',
        date: nextDate,
        time: nextSlots.json.slots[0],
        reason: 'Travel conflict',
      },
    });
    assert.equal(rescheduled.status, 200);
    assert.equal(rescheduled.json.item.date, nextDate);

    const otherList = await request(server, { path: '/api/patient/appointments', token: 'patient-b' });
    assert.equal(otherList.json.items.length, 0);

    const otherCancel = await request(server, {
      method: 'PATCH',
      path: `/api/patient/appointments/${booked.json.item.id}`,
      token: 'patient-b',
      body: { action: 'cancel' },
    });
    assert.equal(otherCancel.status, 404);

    // Popular: patient-b books hair once + laser once; patient-a still has laser pending
    const hairDate = nextWorkingDate(12, hairDoctor.workingDays);
    const hairSlots = await request(server, {
      path: `/api/patient/availability?doctorId=${hairDoctor.id}&date=${hairDate}`,
      token: 'patient-b',
    });
    await request(server, {
      method: 'POST',
      path: '/api/patient/appointments',
      token: 'patient-b',
      body: {
        treatmentId: hair.id,
        doctorId: hairDoctor.id,
        date: hairDate,
        time: hairSlots.json.slots[0],
      },
    });

    const laserDate2 = nextWorkingDate(15, laserDoctor.workingDays);
    const laserSlots2 = await request(server, {
      path: `/api/patient/availability?doctorId=${laserDoctor.id}&date=${laserDate2}`,
      token: 'patient-b',
    });
    await request(server, {
      method: 'POST',
      path: '/api/patient/appointments',
      token: 'patient-b',
      body: {
        treatmentId: laser.id,
        doctorId: laserDoctor.id,
        date: laserDate2,
        time: laserSlots2.json.slots[0],
      },
    });

    const popularCatalog = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    const laserPopular = popularCatalog.json.popular.find((item) => item.id === laser.id);
    const hairPopular = popularCatalog.json.popular.find((item) => item.id === hair.id);
    assert.ok(laserPopular.bookingCount >= 2);
    assert.ok(hairPopular.bookingCount >= 1);
    assert.ok(laserPopular.bookingCount >= hairPopular.bookingCount);
    assert.equal(popularCatalog.json.popular[0].id, laser.id);

    const cancelled = await request(server, {
      method: 'PATCH',
      path: `/api/patient/appointments/${booked.json.item.id}`,
      token: 'patient-a',
      body: { action: 'cancel', reason: 'Changed plans' },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.item.status, 'canceled');

    const afterCancel = await request(server, { path: '/api/patient/catalog', token: 'patient-a' });
    const laserAfter = afterCancel.json.popular.find((item) => item.id === laser.id);
    assert.equal(laserAfter.bookingCount, laserPopular.bookingCount - 1);
  });
});
