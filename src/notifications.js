const DEFAULT_PREFERENCES = {
  channels: {
    push: false,
    email: true,
    inApp: false,
  },
  alerts: {
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

function createNotifications({ redis }) {
  async function getPreferences(uid) {
    const raw = await redis.get(prefsKey(uid));
    if (!raw) return { ...DEFAULT_PREFERENCES, channels: { ...DEFAULT_PREFERENCES.channels }, alerts: { ...DEFAULT_PREFERENCES.alerts } };
    try {
      return sanitizePreferences(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_PREFERENCES, channels: { ...DEFAULT_PREFERENCES.channels }, alerts: { ...DEFAULT_PREFERENCES.alerts } };
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

  async function publishEvent({ uid, type, title, body, meta = {} }) {
    const prefs = await getPreferences(uid);
    if (!prefs.alerts[type]) {
      return { delivered: false, reason: 'ALERT_DISABLED' };
    }
    if (!prefs.channels.inApp && !prefs.channels.push && !prefs.channels.email) {
      return { delivered: false, reason: 'CHANNELS_DISABLED' };
    }

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      body,
      meta,
      channels: { ...prefs.channels },
      createdAt: new Date().toISOString(),
      read: false,
    };

    await redis.lpush(feedKey(uid), JSON.stringify(item));
    await redis.ltrim(feedKey(uid), 0, 99);
    await redis.publish(channelKey(uid), JSON.stringify(item));
    return { delivered: true, item };
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
    publishEvent,
    subscribe,
  };
}

module.exports = {
  createNotifications,
  DEFAULT_PREFERENCES,
  CHANNEL_KEYS,
  ALERT_KEYS,
};
