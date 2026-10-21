const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const RedisMock = require('ioredis-mock');
const { createApp } = require('../src/app');

const EMAIL = 'debra.holt@example.com';

function makeConfig(overrides = {}) {
  return {
    trustProxy: 0,
    otpSecret: 'test-secret-that-is-long-enough',
    reset: {
      codeLength: 6,
      codeTtlSeconds: 600,
      resendCooldownSeconds: 60,
      maxSendsPerHour: 5,
      maxVerifyAttempts: 5,
      resetTokenTtlSeconds: 900,
      maxRequestsPerIpPerHour: 1000,
      maxVerifiesPerIpPerHour: 1000,
      ...overrides,
    },
  };
}

let server;
let baseUrl;
let redis;
let sent;
let passwords;
let mailShouldFail;

async function stop() {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

async function start(overrides) {
  await stop();
  redis = new RedisMock();
  await redis.flushall();
  sent = [];
  passwords = new Map();
  mailShouldFail = false;

  const users = {
    async findByEmail(email) {
      return email === EMAIL ? { uid: 'uid-1', email: EMAIL } : null;
    },
    async setPassword(uid, password) {
      passwords.set(uid, password);
    },
  };
  const mailer = {
    async sendResetCode(message) {
      if (mailShouldFail) throw new Error('SMTP down');
      sent.push(message);
    },
  };

  const app = createApp({ redis, mailer, users, config: makeConfig(overrides) });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}/api/auth/password-reset/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), headers: res.headers };
}

const lastCode = () => sent.at(-1).code;

beforeEach(() => start());
afterEach(() => stop());

test('full flow: request code, verify, set new password', async () => {
  const req = await post('request', { email: '  Debra.Holt@Example.com ' });
  assert.equal(req.status, 200);
  assert.equal(req.body.cooldownSeconds, 60);
  assert.equal(req.body.codeLength, 6);
  assert.equal(sent.length, 1);
  assert.match(lastCode(), /^\d{6}$/);
  assert.equal(sent[0].to, EMAIL);

  const verify = await post('verify', { email: EMAIL, code: lastCode() });
  assert.equal(verify.status, 200);
  assert.ok(verify.body.resetToken.length >= 40);

  const confirm = await post('confirm', { resetToken: verify.body.resetToken, password: 'NewPass123' });
  assert.equal(confirm.status, 200);
  assert.equal(passwords.get('uid-1'), 'NewPass123');
});

test('code is stored hashed, never in plain text', async () => {
  await post('request', { email: EMAIL });
  const stored = await redis.hgetall(`pr:code:${EMAIL}`);
  assert.notEqual(stored.hash, lastCode());
  assert.ok(!JSON.stringify(stored).includes(lastCode()));
  const ttl = await redis.ttl(`pr:code:${EMAIL}`);
  assert.ok(ttl > 590 && ttl <= 600);
});

test('rejects invalid email', async () => {
  const res = await post('request', { email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'INVALID_EMAIL');
  assert.equal(sent.length, 0);
});

test('unknown email gets the same success response but no email is sent', async () => {
  const res = await post('request', { email: 'nobody@example.com' });
  assert.equal(res.status, 200);
  assert.equal(sent.length, 0);
  const verify = await post('verify', { email: 'nobody@example.com', code: '123456' });
  assert.equal(verify.status, 400);
  assert.equal(verify.body.error, 'CODE_EXPIRED');
});

test('resend cooldown blocks a second request and reports seconds left', async () => {
  await post('request', { email: EMAIL });
  const again = await post('request', { email: EMAIL });
  assert.equal(again.status, 429);
  assert.equal(again.body.error, 'COOLDOWN');
  assert.ok(again.body.retryAfterSeconds > 0 && again.body.retryAfterSeconds <= 60);
  assert.equal(again.headers.get('retry-after'), String(again.body.retryAfterSeconds));
  assert.equal(sent.length, 1);
});

test('after cooldown a new code is sent and the old one stops working', async () => {
  await start({ resendCooldownSeconds: 1 });
  await post('request', { email: EMAIL });
  const oldCode = lastCode();
  await new Promise((r) => setTimeout(r, 1100));
  const again = await post('request', { email: EMAIL });
  assert.equal(again.status, 200);
  assert.equal(sent.length, 2);
  if (oldCode !== lastCode()) {
    const old = await post('verify', { email: EMAIL, code: oldCode });
    assert.equal(old.status, 400);
  }
  const ok = await post('verify', { email: EMAIL, code: lastCode() });
  assert.equal(ok.status, 200);
});

test('hourly send limit per email', async () => {
  await start({ resendCooldownSeconds: 1, maxSendsPerHour: 2 });
  await post('request', { email: EMAIL });
  await new Promise((r) => setTimeout(r, 1100));
  await post('request', { email: EMAIL });
  await new Promise((r) => setTimeout(r, 1100));
  const third = await post('request', { email: EMAIL });
  assert.equal(third.status, 429);
  assert.equal(third.body.error, 'TOO_MANY_CODES');
  assert.equal(sent.length, 2);
});

test('wrong code counts down attempts, then locks the code', async () => {
  await post('request', { email: EMAIL });
  const good = lastCode();
  const wrong = good === '000000' ? '111111' : '000000';

  for (let left = 4; left >= 1; left -= 1) {
    const res = await post('verify', { email: EMAIL, code: wrong });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'WRONG_CODE');
    assert.equal(res.body.attemptsLeft, left);
  }
  const fifth = await post('verify', { email: EMAIL, code: wrong });
  assert.equal(fifth.status, 429);
  assert.equal(fifth.body.error, 'TOO_MANY_ATTEMPTS');

  // Even the right code no longer works.
  const late = await post('verify', { email: EMAIL, code: good });
  assert.equal(late.status, 400);
  assert.equal(late.body.error, 'CODE_EXPIRED');
});

test('code is single use', async () => {
  await post('request', { email: EMAIL });
  const code = lastCode();
  assert.equal((await post('verify', { email: EMAIL, code })).status, 200);
  const again = await post('verify', { email: EMAIL, code });
  assert.equal(again.status, 400);
  assert.equal(again.body.error, 'CODE_EXPIRED');
});

test('code with wrong format is rejected without using an attempt', async () => {
  await post('request', { email: EMAIL });
  const res = await post('verify', { email: EMAIL, code: '12ab' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'INVALID_CODE');
  const stored = await redis.hget(`pr:code:${EMAIL}`, 'attempts');
  assert.equal(stored, '0');
});

test('weak password is rejected and the reset token stays valid', async () => {
  await post('request', { email: EMAIL });
  const { body } = await post('verify', { email: EMAIL, code: lastCode() });

  for (const weak of ['short1', 'onlyletters', '12345678']) {
    const res = await post('confirm', { resetToken: body.resetToken, password: weak });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'WEAK_PASSWORD');
  }
  const ok = await post('confirm', { resetToken: body.resetToken, password: 'Strong123' });
  assert.equal(ok.status, 200);
});

test('reset token is single use', async () => {
  await post('request', { email: EMAIL });
  const { body } = await post('verify', { email: EMAIL, code: lastCode() });
  assert.equal((await post('confirm', { resetToken: body.resetToken, password: 'Strong123' })).status, 200);
  const again = await post('confirm', { resetToken: body.resetToken, password: 'Other1234' });
  assert.equal(again.status, 400);
  assert.equal(again.body.error, 'RESET_EXPIRED');
  assert.equal(passwords.get('uid-1'), 'Strong123');
});

test('fake reset token is rejected', async () => {
  const res = await post('confirm', { resetToken: 'x'.repeat(43), password: 'Strong123' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'RESET_EXPIRED');
});

test('successful reset clears the cooldown so a new code can be requested', async () => {
  await post('request', { email: EMAIL });
  const { body } = await post('verify', { email: EMAIL, code: lastCode() });
  await post('confirm', { resetToken: body.resetToken, password: 'Strong123' });
  const again = await post('request', { email: EMAIL });
  assert.equal(again.status, 200);
});

test('email failure rolls back so the user can retry immediately', async () => {
  mailShouldFail = true;
  const res = await post('request', { email: EMAIL });
  assert.equal(res.status, 502);
  assert.equal(res.body.error, 'EMAIL_FAILED');
  assert.equal(await redis.exists(`pr:code:${EMAIL}`), 0);

  mailShouldFail = false;
  const retry = await post('request', { email: EMAIL });
  assert.equal(retry.status, 200);
  assert.equal(sent.length, 1);
});

test('per-IP limit on code requests', async () => {
  await start({ maxRequestsPerIpPerHour: 2 });
  await post('request', { email: 'a@example.com' });
  await post('request', { email: 'b@example.com' });
  const third = await post('request', { email: 'c@example.com' });
  assert.equal(third.status, 429);
  assert.equal(third.body.error, 'RATE_LIMITED');
});

test('bad JSON and unknown routes return clean errors', async () => {
  const bad = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{oops',
  });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'BAD_JSON');

  const missing = await fetch(`${baseUrl}/nope`);
  assert.equal(missing.status, 404);
});

test('health check pings redis', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
});
