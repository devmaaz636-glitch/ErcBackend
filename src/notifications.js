const DEFAULT_PREFERENCES = {
  channels: {
    push: false,
    email: true,
    inApp: true,
  },
  alerts: {
    // Account activity (profile / security)
    profileChanges: true,
    passwordChanges: true,
    bookingUpdates: true,
    // Clinic ops alerts
    refund: true,
    accountRequests: false,
    appointmentsThreshold: false,
    revenueThreshold: false,
    capacityThreshold: false,
    booking: false,
  },
};

const CHANNEL_KEYS = Object.keys(DEFAULT_PREFERENCES.channels);
const ALERT_KEYS = Object.keys(DEFAULT_PREFERENCES.alerts);

function prefsKey(uid) {
  return `notify:prefs:${uid}`;
}

function feedKey(uid) {
  return `notify:feed:${uid}`;
}

function channelKey(uid) {
  return `notify:channel:${uid}`;
}

function devicesKey(uid) {
  return `notify:devices:${uid}`;
}

function sanitizePreferences(input = {}) {
  const next = {
    channels: { ...DEFAULT_PREFERENCES.channels },
    alerts: { ...DEFAULT_PREFERENCES.alerts },
  };

  for (const key of CHANNEL_KEYS) {
    if (typeof input.channels?.[key] === 'boolean') {
      next.channels[key] = input.channels[key];
    }
  }
  for (const key of ALERT_KEYS) {
    if (typeof input.alerts?.[key] === 'boolean') {
      next.alerts[key] = input.alerts[key];
    }
  }
  return next;
}

async function sendExpoPush(tokens, { title, body, data }) {
  if (!tokens.length) return { sent: 0 };
  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data: data || {},
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => ({}));
    return { sent: tokens.length, result: json };
  } catch (error) {
    return { sent: 0, error: error.message };
  }
}

/**
 * Real-time notification hub.
 *
 * Channels:
 *  - inApp  → Redis feed + pub/sub → SSE / poll on clients
 *  - email  → SMTP via mailer (when enabled)
 *  - push   → Expo Push API to registered device tokens
 */
function createNotifications({ redis, mailer, resolveUserEmail }) {
  async function getPreferences(uid) {
    const raw = await redis.get(prefsKey(uid));
    if (!raw) {
      return {
        ...DEFAULT_PREFERENCES,
        channels: { ...DEFAULT_PREFERENCES.channels },
        alerts: { ...DEFAULT_PREFERENCES.alerts },
      };
    }
    try {
      return sanitizePreferences(JSON.parse(raw));
    } catch {
      return {
        ...DEFAULT_PREFERENCES,
        channels: { ...DEFAULT_PREFERENCES.channels },
        alerts: { ...DEFAULT_PREFERENCES.alerts },
      };
    }
  }

  async function savePreferences(uid, preferences) {
    const next = sanitizePreferences(preferences);
    await redis.set(prefsKey(uid), JSON.stringify(next));
    return next;
  }

  async function resetPreferences(uid) {
    const next = {
      channels: { ...DEFAULT_PREFERENCES.channels },
      alerts: { ...DEFAULT_PREFERENCES.alerts },
    };
    await redis.set(prefsKey(uid), JSON.stringify(next));
    return next;
  }

  async function listFeed(uid, limit = 30) {
    const rows = await redis.lrange(feedKey(uid), 0, Math.max(0, limit - 1));
    return rows
      .map((row) => {
        try {
          return JSON.parse(row);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  /** Mark feed items read. Pass ids to target specific items; omit / empty = mark all. */
  async function markFeedRead(uid, ids) {
    const key = feedKey(uid);
    const rows = await redis.lrange(key, 0, 99);
    if (!rows.length) return { items: [], marked: 0 };

    const idSet =
      Array.isArray(ids) && ids.length > 0 ? new Set(ids.map(String)) : null;

    let marked = 0;
    const next = rows.map((row) => {
      try {
        const item = JSON.parse(row);
        const shouldMark = !idSet || idSet.has(String(item.id));
        if (shouldMark && item && item.read !== true) {
          marked += 1;
          return JSON.stringify({ ...item, read: true });
        }
        return row;
      } catch {
        return row;
      }
    });

    if (marked > 0) {
      const multi = redis.multi();
      multi.del(key);
      // `next` is already newest-first (same order as LRANGE after LPUSH).
      if (next.length) multi.rpush(key, ...next);
      await multi.exec();
    }

    const items = next
      .map((row) => {
        try {
          return JSON.parse(row);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return { items, marked };
  }

  async function registerDevice(uid, { token, platform }) {
    const value = String(token || '').trim();
    if (!value) return { ok: false };
    await redis.sadd(devicesKey(uid), JSON.stringify({ token: value, platform: platform || 'unknown' }));
    return { ok: true, token: value };
  }

  async function unregisterDevice(uid, token) {
    const value = String(token || '').trim();
    if (!value) return { ok: false };
    const members = await redis.smembers(devicesKey(uid));
    for (const member of members) {
      try {
        const parsed = JSON.parse(member);
        if (parsed.token === value) {
          await redis.srem(devicesKey(uid), member);
        }
      } catch {
        if (member === value) await redis.srem(devicesKey(uid), member);
      }
    }
    return { ok: true };
  }

  async function listDeviceTokens(uid) {
    const members = await redis.smembers(devicesKey(uid));
    return members
      .map((member) => {
        try {
          return JSON.parse(member).token;
        } catch {
          return member;
        }
      })
      .filter(Boolean);
  }

  async function publishEvent({ uid, type, title, body, meta = {}, email }) {
    const prefs = await getPreferences(uid);
    if (!prefs.alerts[type]) {
      return { delivered: false, reason: 'ALERT_DISABLED' };
    }

    const channels = prefs.channels || {};
    if (!channels.inApp && !channels.push && !channels.email) {
      return { delivered: false, reason: 'CHANNELS_DISABLED' };
    }

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      body,
      meta,
      channels: { ...channels },
      createdAt: new Date().toISOString(),
      read: false,
    };

    const delivery = { inApp: false, email: false, push: false };

    // ── In-app (real-time): feed + Redis pub/sub → SSE clients ──
    if (channels.inApp) {
      await redis.lpush(feedKey(uid), JSON.stringify(item));
      await redis.ltrim(feedKey(uid), 0, 99);
      await redis.publish(channelKey(uid), JSON.stringify(item));
      delivery.inApp = true;
    }

    // ── Email ──
    if (channels.email && mailer?.sendMail) {
      try {
        const to =
          email ||
          (typeof resolveUserEmail === 'function' ? await resolveUserEmail(uid) : null);
        if (to) {
          await mailer.sendMail({
            to,
            subject: `[ERC] ${title}`,
            text: body,
            html: `<p>${body}</p><p style="color:#8D8680;font-size:12px">Enfield Royal Clinics</p>`,
          });
          delivery.email = true;
        }
      } catch (error) {
        delivery.emailError = error.message;
      }
    }

    // ── Push (Expo) ──
    if (channels.push) {
      const tokens = await listDeviceTokens(uid);
      const pushResult = await sendExpoPush(tokens, {
        title,
        body,
        data: { type, id: item.id, ...(meta || {}) },
      });
      delivery.push = pushResult.sent > 0;
      delivery.pushMeta = pushResult;
    }

    return {
      delivered: delivery.inApp || delivery.email || delivery.push,
      item,
      delivery,
    };
  }

  function subscribe(uid, onMessage) {
    const subscriber = redis.duplicate();
    const channel = channelKey(uid);
    subscriber.subscribe(channel);
    subscriber.on('message', (_ch, payload) => {
      try {
        onMessage(JSON.parse(payload));
      } catch {
        // ignore bad payloads
      }
    });
    return () => {
      subscriber.unsubscribe(channel).finally(() => subscriber.quit());
    };
  }

  return {
    defaults: DEFAULT_PREFERENCES,
    getPreferences,
    savePreferences,
    resetPreferences,
    listFeed,
    markFeedRead,
    publishEvent,
    subscribe,
    registerDevice,
    unregisterDevice,
    listDeviceTokens,
  };
}

module.exports = {
  createNotifications,
  DEFAULT_PREFERENCES,
  CHANNEL_KEYS,
  ALERT_KEYS,
};
