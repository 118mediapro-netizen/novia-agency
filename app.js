'use strict';

// Application Express : API + pages. Utilisée par server.js (local / serveur)
// et par api/index.js (Vercel).

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const seed = require('./seed');
const { store, missingDatabase } = require('./lib/store');

const IS_PROD = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const COOKIE = 'novia_session';
const SESSION_DAYS = 14;

const COLLECTIONS = [
  'clients', 'shoots', 'videos', 'expenses', 'invoices', 'leads',
  'events', 'tasks', 'collabs', 'sponsors', 'messages',
];

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

async function loadDb() {
  const data = await store.get('db');
  if (!data) {
    const seeded = seed.build();
    await store.set('db', seeded);
    return seeded;
  }
  for (const c of COLLECTIONS) data[c] = data[c] || [];
  data.settings = { ...seed.settings, ...data.settings };
  return data;
}

const saveDb = db => store.set('db', db);

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

/* ------------------------------------------------------------------ */
/* Authentification admin                                              */
/* ------------------------------------------------------------------ */

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function newAuth(username, password) {
  return { username, ...hashPassword(password), secret: crypto.randomBytes(32).toString('hex') };
}

// Le compte est créé depuis ADMIN_USER / ADMIN_PASSWORD s'ils existent,
// sinon depuis l'écran « Premier lancement » de la page de connexion.
async function getAuth() {
  let auth = await store.get('auth');
  if (!auth && process.env.ADMIN_PASSWORD) {
    auth = newAuth(process.env.ADMIN_USER || 'admin', process.env.ADMIN_PASSWORD);
    await store.set('auth', auth);
  }
  return auth;
}

function checkPassword(auth, password) {
  if (!auth || typeof password !== 'string') return false;
  const { hash } = hashPassword(password, auth.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(auth.hash, 'hex'));
}

function secretOf(auth) {
  return process.env.SESSION_SECRET || auth.secret;
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createToken(auth) {
  const payload = Buffer.from(JSON.stringify({ u: auth.username, exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
  return `${payload}.${sign(payload, secretOf(auth))}`;
}

async function readSession(req) {
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const auth = await store.get('auth');
  if (!auth) return null;
  const expected = sign(payload, secretOf(auth));
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function setCookie(res, value, maxAgeSec) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${IS_PROD ? '; Secure' : ''}`);
}

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireAuth = wrap(async (req, res, next) => {
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: 'Non connecté' });
  req.user = session.u;
  next();
});

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

app.use('/api', (req, res, next) => {
  if (missingDatabase) return res.status(500).json({ error: 'Base de données non connectée : ajoute Upstash Redis dans Vercel (Storage) puis redéploie.' });
  next();
});

// Pages admin protégées (le login reste public). Sur Vercel, les pages sont
// servies en statique et l'admin redirige vers le login si l'API répond 401.
app.get(['/admin', '/admin/', '/admin/index.html'], wrap(async (req, res) => {
  if (!(await readSession(req))) return res.redirect('/admin/login.html');
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
}));

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

app.get('/api/status', wrap(async (req, res) => {
  res.json({ setup: !(await getAuth()) });
}));

app.post('/api/setup', wrap(async (req, res) => {
  if (await getAuth()) return res.status(400).json({ error: 'Compte déjà créé' });
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Identifiant requis et mot de passe de 8 caractères minimum' });
  }
  const auth = newAuth(username.trim(), password);
  await store.set('auth', auth);
  await loadDb();
  setCookie(res, createToken(auth), SESSION_DAYS * 86400);
  res.json({ ok: true });
}));

// 8 essais / 15 min par IP
app.post('/api/login', wrap(async (req, res) => {
  const key = 'attempts:' + req.ip;
  if ((await store.count(key)) >= 8) return res.status(429).json({ error: 'Trop de tentatives, réessaie dans 15 minutes.' });
  const auth = await getAuth();
  const { username, password } = req.body || {};
  const ok = auth && typeof username === 'string' && username.trim().toLowerCase() === auth.username.toLowerCase() && checkPassword(auth, password);
  if (!ok) {
    await store.hit(key, 15 * 60);
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  await store.del(key);
  setCookie(res, createToken(auth), SESSION_DAYS * 86400);
  res.json({ ok: true });
}));

app.post('/api/logout', (req, res) => {
  setCookie(res, '', 0);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ username: req.user }));

app.post('/api/password', requireAuth, wrap(async (req, res) => {
  const { current, next } = req.body || {};
  const auth = await getAuth();
  if (!checkPassword(auth, current)) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
  if (typeof next !== 'string' || next.length < 8) return res.status(400).json({ error: '8 caractères minimum' });
  await store.set('auth', { ...auth, ...hashPassword(next) });
  res.json({ ok: true });
}));

// Formulaire de contact public -> arrive dans Admin > Messages
app.post('/api/contact', wrap(async (req, res) => {
  const b = req.body || {};
  const clean = (v, max = 500) => String(v || '').trim().slice(0, max);
  if (b.website) return res.json({ ok: true }); // pot de miel anti-spam
  const msg = {
    id: newId(),
    name: clean(b.name, 120),
    business: clean(b.business, 120),
    email: clean(b.email, 160),
    phone: clean(b.phone, 40),
    city: clean(b.city, 80),
    service: clean(b.service, 60),
    message: clean(b.message, 3000),
    status: 'Nouveau',
    createdAt: new Date().toISOString(),
  };
  if (!msg.name || (!msg.email && !msg.phone)) return res.status(400).json({ error: 'Nom et email ou téléphone requis' });
  const db = await loadDb();
  db.messages.unshift(msg);
  await saveDb(db);
  res.json({ ok: true });
}));

// Données complètes (le panel admin charge tout d'un coup)
app.get('/api/data', requireAuth, wrap(async (req, res) => res.json(await loadDb())));

app.get('/api/export', requireAuth, wrap(async (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="novia-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(await loadDb());
}));

app.post('/api/import', requireAuth, wrap(async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object' || !data.settings) return res.status(400).json({ error: 'Fichier invalide' });
  for (const c of COLLECTIONS) if (!Array.isArray(data[c])) data[c] = [];
  await saveDb(data);
  res.json({ ok: true });
}));

app.put('/api/settings', requireAuth, wrap(async (req, res) => {
  const db = await loadDb();
  db.settings = { ...db.settings, ...(req.body || {}) };
  await saveDb(db);
  res.json(db.settings);
}));

function collection(req, res, next) {
  if (!COLLECTIONS.includes(req.params.col)) return res.status(404).json({ error: 'Collection inconnue' });
  next();
}

app.post('/api/data/:col', requireAuth, collection, wrap(async (req, res) => {
  const db = await loadDb();
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const created = items.map(item => ({ ...item, id: newId(), createdAt: new Date().toISOString() }));
  db[req.params.col].push(...created);
  await saveDb(db);
  res.json(Array.isArray(req.body) ? created : created[0]);
}));

app.put('/api/data/:col/:id', requireAuth, collection, wrap(async (req, res) => {
  const db = await loadDb();
  const list = db[req.params.col];
  const i = list.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Introuvable' });
  list[i] = { ...list[i], ...req.body, id: list[i].id, updatedAt: new Date().toISOString() };
  await saveDb(db);
  res.json(list[i]);
}));

app.delete('/api/data/:col/:id', requireAuth, collection, wrap(async (req, res) => {
  const db = await loadDb();
  db[req.params.col] = db[req.params.col].filter(x => x.id !== req.params.id);
  await saveDb(db);
  res.json({ ok: true });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur : ' + err.message });
});

module.exports = app;
