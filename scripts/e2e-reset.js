/**
 * End-to-end check: request → verify → confirm against the live API.
 * Captures the emailed code via a one-off in-process run (not the HTTP server).
 */
require('dotenv').config({ quiet: true });

const config = require('../src/config');
const { createRedis } = require('../src/redis');
const { createFirebaseUsers } = require('../src/users');
const { createPasswordReset } = require('../src/passwordReset');

const email = process.argv[2] || 'maazkhan29456@gmail.com';
const newPassword = process.argv[3] || 'Maaz1234';

async function main() {
  const redis = createRedis(config.redisUrl);
  await redis.ping();

  // Clear cooldown so this script can always request a fresh code.
  await redis.del(`pr:cooldown:${email.toLowerCase()}`);

  let capturedCode = '';
  const mailer = {
    async sendResetCode({ to, code, minutes }) {
      capturedCode = code;
      console.log(`[e2e] code for ${to}: ${code} (expires in ${minutes} min)`);
      // Also send the real SMTP email when configured.
      const { createMailer } = require('../src/mailer');
      const real = createMailer(config.smtp, { isProduction: false });
      if (real.sendResetCode && config.smtp.host) {
        await real.sendResetCode({ to, code, minutes });
        console.log('[e2e] SMTP email sent');
      }
    },
  };

  const users = createFirebaseUsers(config.firebase);
  const reset = createPasswordReset({
    redis,
    mailer,
    users,
    secret: config.otpSecret,
    settings: config.reset,
  });

  const requested = await reset.requestCode({ email, ip: '127.0.0.1' });
  console.log('[e2e] request', requested);
  if (!capturedCode) {
    throw new Error('No code captured — is the Firebase user missing for this email?');
  }

  const verified = await reset.verifyCode({ email, code: capturedCode, ip: '127.0.0.1' });
  console.log('[e2e] verify ok, token length', verified.resetToken?.length);

  await reset.confirmReset({ resetToken: verified.resetToken, password: newPassword });
  console.log('[e2e] password updated for', email, '→', newPassword);

  await redis.quit();
}

main().catch(async (error) => {
  console.error('[e2e] FAIL', error.message || error);
  process.exit(1);
});
