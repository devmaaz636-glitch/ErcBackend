const Redis = require('ioredis');

function createRedis(url) {
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    // rediss:// URLs (Upstash, Redis Cloud TLS) need TLS; ioredis enables it from the scheme.
  });
  client.on('error', (error) => {
    console.error(`[redis] ${error.message}`);
  });
  return client;
}

module.exports = { createRedis };
