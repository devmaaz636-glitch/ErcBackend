const crypto = require('crypto');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ResetError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Same rules as the app (ErcFrontend/src/lib/passwordReset.js). Keep both in sync.
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'Use 128 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Use at least one letter and one number.';
  }
  return null;
}

const keys = {
  cooldown: (email) => `pr:cooldown:${email}`,
  sends: (email) => `pr:sends:${email}`,
  code: (email) => `pr:code:${email}`,
  token: (hash) => `pr:token:${hash}`,
  ipRequests: (ip) => `pr:ip:req:${ip}`,
  ipVerifies: (ip) => `pr:ip:verify:${ip}`,
};

function createPasswordReset({ redis, mailer, users, secret, settings }) {
  if (!secret || secret.length < 16) {
    throw new Error('OTP_SECRET must be set to a random string of at least 16 characters.');
  }

  const hashCode = (email, code) =>
    crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
  const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
  const expiredError = () =>
    new ResetError(400, 'RESET_EXPIRED', 'This reset session has expired. Please start again.');

  function generateCode() {
    return String(crypto.randomInt(0, 10 ** settings.codeLength)).padStart(settings.codeLength, '0');
  }

  // Fixed-window counter. Returns { count, ttl } where ttl is seconds until the window resets.
  async function bump(key, windowSeconds) {
    const [[, count], [, ttl]] = await redis.multi().incr(key).ttl(key).exec();
    if (ttl < 0) {
      await redis.expire(key, windowSeconds);
      return { count, ttl: windowSeconds };
    }
    return { count, ttl };
  }

  async function limitIp(key, max) {
    const { count, ttl } = await bump(key, 3600);
    if (count > max) {
      throw new ResetError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.', {
        retryAfterSeconds: ttl,
      });
    }
  }

  async function requestCode({ email: rawEmail, ip }) {
    const email = normalizeEmail(rawEmail);
    if (!EMAIL_PATTERN.test(email)) {
      throw new ResetError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
    }
    await limitIp(keys.ipRequests(ip), settings.maxRequestsPerIpPerHour);

    // Cooldown: one code per email every N seconds.
    const cooldownKey = keys.cooldown(email);
    const gotSlot = await redis.set(cooldownKey, '1', 'EX', settings.resendCooldownSeconds, 'NX');
    if (!gotSlot) {
      const ttl = await redis.ttl(cooldownKey);
      throw new ResetError(429, 'COOLDOWN', 'Please wait before requesting another code.', {
        retryAfterSeconds: Math.max(ttl, 1),
      });
    }

    const sendsKey = keys.sends(email);
    const sends = await bump(sendsKey, 3600);
    if (sends.count > settings.maxSendsPerHour) {
      await redis.del(cooldownKey);
      throw new ResetError(
        429,
        'TOO_MANY_CODES',
        'Too many codes requested for this email. Please try again later.',
        { retryAfterSeconds: sends.ttl }
      );
    }

    const response = {
      cooldownSeconds: settings.resendCooldownSeconds,
      expiresInSeconds: settings.codeTtlSeconds,
      codeLength: settings.codeLength,
    };

    // Same response whether or not the account exists, so emails can't be probed.
    const user = await users.findByEmail(email);
    if (!user) return response;

    const code = generateCode();
    const codeKey = keys.code(email);
    await redis
      .multi()
      .del(codeKey)
      .hset(codeKey, 'hash', hashCode(email, code), 'attempts', '0')
      .expire(codeKey, settings.codeTtlSeconds)
      .exec();

    try {
      await mailer.sendResetCode({
        to: user.email || email,
        code,
        minutes: Math.round(settings.codeTtlSeconds / 60),
      });
    } catch (error) {
      console.error(`[reset] email to ${email} failed: ${error.message}`);
      await redis.multi().del(codeKey).del(cooldownKey).decr(sendsKey).exec();
      throw new ResetError(502, 'EMAIL_FAILED', 'We could not send the email. Please try again.');
    }

    return response;
  }

  async function verifyCode({ email: rawEmail, code, ip }) {
    const email = normalizeEmail(rawEmail);
    const cleanCode = typeof code === 'string' ? code.trim() : '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new ResetError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
    }
    if (!new RegExp(`^\\d{${settings.codeLength}}$`).test(cleanCode)) {
      throw new ResetError(400, 'INVALID_CODE', `Enter the ${settings.codeLength}-digit code.`);
    }
    await limitIp(keys.ipVerifies(ip), settings.maxVerifiesPerIpPerHour);

    const codeKey = keys.code(email);
    const [[, attempts], [, storedHash]] = await redis
      .multi()
      .hincrby(codeKey, 'attempts', 1)
      .hget(codeKey, 'hash')
      .exec();

    if (!storedHash) {
      // Expired or never sent; hincrby may have created an empty key, so remove it.
      await redis.del(codeKey);
      throw new ResetError(400, 'CODE_EXPIRED', 'This code is invalid or has expired. Request a new one.');
    }
    if (attempts > settings.maxVerifyAttempts) {
      await redis.del(codeKey);
      throw new ResetError(429, 'TOO_MANY_ATTEMPTS', 'Too many wrong attempts. Request a new code.');
    }

    const expected = Buffer.from(storedHash, 'hex');
    const actual = Buffer.from(hashCode(email, cleanCode), 'hex');
    if (!crypto.timingSafeEqual(expected, actual)) {
      const attemptsLeft = settings.maxVerifyAttempts - attempts;
      if (attemptsLeft <= 0) {
        await redis.del(codeKey);
        throw new ResetError(429, 'TOO_MANY_ATTEMPTS', 'Too many wrong attempts. Request a new code.');
      }
      throw new ResetError(
        400,
        'WRONG_CODE',
        `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`,
        { attemptsLeft }
      );
    }

    const resetToken = crypto.randomBytes(32).toString('base64url');
    await redis
      .multi()
      .del(codeKey)
      .set(keys.token(hashToken(resetToken)), email, 'EX', settings.resetTokenTtlSeconds)
      .exec();

    return { resetToken, expiresInSeconds: settings.resetTokenTtlSeconds };
  }

  async function confirmReset({ resetToken, password }) {
    if (typeof resetToken !== 'string' || resetToken.length < 20) {
      throw expiredError();
    }
    const problem = passwordProblem(password);
    if (problem) {
      throw new ResetError(400, 'WEAK_PASSWORD', problem);
    }

    // Single use: read and delete together.
    const tokenKey = keys.token(hashToken(resetToken));
    const [[, email]] = await redis.multi().get(tokenKey).del(tokenKey).exec();
    if (!email) throw expiredError();

    const user = await users.findByEmail(email);
    if (!user) throw expiredError();

    try {
      await users.setPassword(user.uid, password);
    } catch (error) {
      // Put the token back so the user can retry without a new code.
      await redis.set(tokenKey, email, 'EX', settings.resetTokenTtlSeconds);
      if (error?.code === 'auth/invalid-password') {
        throw new ResetError(400, 'WEAK_PASSWORD', 'Choose a stronger password.');
      }
      throw error;
    }

    await redis.del(keys.cooldown(email), keys.sends(email));
    return { ok: true };
  }

  return { requestCode, verifyCode, confirmReset };
}

module.exports = { createPasswordReset, ResetError, passwordProblem, normalizeEmail, keys };
