const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');

function post(server, path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(data || '{}') }));
      }
    );
    req.on('error', reject);
    req.end('{}');
  });
}

describe('google sign-in role completion', () => {
  let server;
  const calls = [];

  before(async () => {
    const app = createApp({
      redis: { ping: async () => 'PONG', get: async () => null, set: async () => 'OK', del: async () => 1, incr: async () => 1, expire: async () => 1 },
      mailer: { sendMail: async () => ({}) },
      users: {
        verifyIdToken: async (token) => {
          if (token === 'new-google' || token === 'staff-google') return { uid: token, email: `${token}@test.com`, role: '' };
          throw new Error('bad token');
        },
        ensurePatientRole: async (uid) => {
          calls.push(uid);
          if (uid === 'staff-google') throw Object.assign(new Error('staff'), { code: 'EMAIL_STAFF' });
          return { role: 'patient', created: true };
        },
      },
      config: { trustProxy: 0, otpSecret: 'test-otp-secret-16+', reset: {} },
    });
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('requires a signed-in user', async () => {
    assert.equal((await post(server, '/api/auth/google/complete')).status, 401);
  });

  it('makes a new Google account a patient', async () => {
    const res = await post(server, '/api/auth/google/complete', 'new-google');
    assert.equal(res.status, 200);
    assert.equal(res.json.role, 'patient');
  });

  it('refuses to turn a staff address into a patient', async () => {
    assert.equal((await post(server, '/api/auth/google/complete', 'staff-google')).status, 409);
  });
});
