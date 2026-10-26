const config = require('./config');
const { createApp } = require('./app');
const { createRedis } = require('./redis');
const { createMailer } = require('./mailer');
const { createFirebaseUsers } = require('./users');

function fail(message) {
  console.error(`\n[startup] ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!config.redisUrl) fail('REDIS_URL is not set. Copy .env.example to .env and fill it in.');
  if (!config.otpSecret) fail('OTP_SECRET is not set. Copy .env.example to .env and fill it in.');

  let users;
  let mailer;
  try {
    users = createFirebaseUsers(config.firebase);
    mailer = createMailer(config.smtp, { isProduction: config.isProduction });
  } catch (error) {
    fail(error.message);
  }

  const redis = createRedis(config.redisUrl);
  try {
    await redis.ping();
    console.log('[redis] connected');
  } catch (error) {

    fail(`Could not connect to Redis: ${error.message}`);
  }

  if (mailer.verify) {
    mailer.verify().then(
      () => console.log('[mail] SMTP connection OK'),
      (error) => console.error(`[mail] SMTP check failed: ${error.message}`)
    );
  }

  let app;
  try {
    app = createApp({ redis, mailer, users, config });
  } catch (error) {
    fail(error.message);
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`ERC API listening on port ${config.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      redis.quit().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
