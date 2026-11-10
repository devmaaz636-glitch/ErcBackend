const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const Redis = require('ioredis-mock');
const { createNotifications } = require('../src/notifications');

describe('notification delivery and read history', () => {
  const redis = new Redis();
  const notifications = createNotifications({
    redis,
    mailer: { sendMail: async () => ({}) },
    resolveUserEmail: async () => 'admin@example.com',
  });
  const uid = 'notification-test-user';

  after(async () => {
    await redis.quit();
  });

  it('does not create a feed item when that alert type is disabled', async () => {
    await notifications.savePreferences(uid, {
      channels: { inApp: true, email: false, push: false },
      alerts: { bookingUpdates: false },
    });

    const result = await notifications.publishEvent({
      uid,
      type: 'bookingUpdates',
      title: 'Booking updated',
      body: 'This must not appear in the feed.',
    });

    assert.equal(result.delivered, false);
    assert.equal(result.reason, 'ALERT_DISABLED');
    assert.deepEqual(await notifications.listFeed(uid), []);
  });

  it('keeps read notifications in history and only marks the selected item', async () => {
    await notifications.savePreferences(uid, {
      channels: { inApp: true, email: false, push: false },
      alerts: { bookingUpdates: true, profileChanges: true },
    });

    const first = await notifications.publishEvent({
      uid,
      type: 'bookingUpdates',
      title: 'Booking updated',
      body: 'A real booking action occurred.',
    });
    const second = await notifications.publishEvent({
      uid,
      type: 'profileChanges',
      title: 'Profile updated',
      body: 'Your profile was updated.',
    });

    const marked = await notifications.markFeedRead(uid, [first.item.id]);
    assert.equal(marked.marked, 1);
    assert.equal(marked.items.length, 2);

    const firstItem = marked.items.find((item) => item.id === first.item.id);
    const secondItem = marked.items.find((item) => item.id === second.item.id);
    assert.equal(firstItem.read, true);
    assert.equal(secondItem.read, false);

    const persisted = await notifications.listFeed(uid);
    assert.equal(persisted.length, 2);
    assert.equal(persisted.find((item) => item.id === first.item.id).read, true);
    assert.equal(persisted.find((item) => item.id === second.item.id).read, false);
  });
});
