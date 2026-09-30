'use strict';

// Stockage clé/valeur :
// - Upstash Redis si les variables d'environnement sont présentes (Vercel)
// - sinon des fichiers JSON dans DATA_DIR (en local ou sur un serveur classique)

const fs = require('fs');
const path = require('path');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = 'novia:';

function redisStore() {
  async function cmd(...args) {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (data.error) throw new Error('Redis : ' + data.error);
    return data.result;
  }
  return {
    kind: 'redis',
    async get(key) {
      const raw = await cmd('GET', PREFIX + key);
      return raw == null ? null : JSON.parse(raw);
    },
    async set(key, value) {
      await cmd('SET', PREFIX + key, JSON.stringify(value));
    },
    async del(key) {
      await cmd('DEL', PREFIX + key);
    },
    // Compteur avec expiration (anti brute-force)
    async hit(key, ttlSec) {
      const n = await cmd('INCR', PREFIX + key);
      if (n === 1) await cmd('EXPIRE', PREFIX + key, ttlSec);
      return n;
    },
    async count(key) {
      return Number(await cmd('GET', PREFIX + key)) || 0;
    },
  };
}

function fileStore() {
  const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const file = key => path.join(dir, `${key}.json`);
  const counters = new Map();
  return {
    kind: 'file',
    async get(key) {
      try {
        return JSON.parse(fs.readFileSync(file(key), 'utf8'));
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    async set(key, value) {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = file(key) + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
      fs.renameSync(tmp, file(key));
    },
    async del(key) {
      fs.rmSync(file(key), { force: true });
    },
    async hit(key, ttlSec) {
      const now = Date.now();
      const c = counters.get(key);
      if (!c || c.until < now) {
        counters.set(key, { n: 1, until: now + ttlSec * 1000 });
        return 1;
      }
      return ++c.n;
    },
    async count(key) {
      const c = counters.get(key);
      return c && c.until > Date.now() ? c.n : 0;
    },
  };
}

const configured = Boolean(REDIS_URL && REDIS_TOKEN);
// Sur Vercel, le disque n'est pas persistant : sans Redis, on refuse d'écrire plutôt que de perdre les données
const missingDatabase = !configured && Boolean(process.env.VERCEL);

module.exports = { store: configured ? redisStore() : fileStore(), missingDatabase };
