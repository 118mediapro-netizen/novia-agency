'use strict';

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

loadDotEnv();

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const IS_PROD = process.env.NODE_ENV === 'production';
const COOKIE = 'novia_session';
const SESSION_DAYS = 14;

const COLLECTIONS = [
  'clients', 'shoots', 'videos', 'expenses', 'invoices', 'leads',
  'events', 'tasks', 'collabs', 'sponsors', 'messages',
];

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Stockage : un fichier JSON, écrit de façon atomique                 */
/* ------------------------------------------------------------------ */

let db = loadDb();

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const c of COLLECTIONS) data[c] = data[c] || [];
    data.settings = { ...require('./seed').settings, ...data.settings };
    return data;
  }
  const seeded = require('./seed').build();
  writeDb(seeded);
  return seeded;
}

function writeDb(data = db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

/* ------------------------------------------------------------------ */
/* Authentification admin                                              */
/* ------------------------------------------------------------------ */

const SECRET = process.env.SESSION_SECRET || getOrCreateAuth().secret;

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function getOrCreateAuth() {
  if (fs.existsSync(AUTH_FILE)) return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  const username = process.env.ADMIN_USER || 'admin';
  let password = process.env.ADMIN_PASSWORD;
  const generated = !password;
  if (generated) password = crypto.randomBytes(9).toString('base64url');
  const auth = { username, ...hashPassword(password), secret: crypto.randomBytes(32).toString('hex') };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
  if (generated) {
    console.log('\n==============================================');
    console.log(' Identifiants admin créés automatiquement :');
    console.log(`   utilisateur : ${username}`);
    console.log(`   mot de passe : ${password}`);
    console.log(' Change-le dans Admin > Réglages.');
    console.log('==============================================\n');
  }
  return auth;
}

function checkCredentials(username, password) {
  const auth = getOrCreateAuth();
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  const { hash } = hashPassword(password, auth.salt);
  const sameUser = username.trim().toLowerCase() === auth.username.toLowerCase();
  return sameUser && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(auth.hash, 'hex'));
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function createToken(username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(req) {
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
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

function requireAuth(req, res, next) {
  const session = readToken(req);
  if (!session) return res.status(401).json({ error: 'Non connecté' });
  req.user = session.u;
  next();
}

// Limite simple contre le brute-force : 8 essais / 15 min par IP
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 15 * 60e3);
  attempts.set(ip, list);
  return list.length >= 8;
}

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Pages admin protégées (le login reste public)
app.get(['/admin', '/admin/', '/admin/index.html'], (req, res) => {
  if (!readToken(req)) return res.redirect('/admin/login.html');
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// Le compte admin est créé au démarrage (voir getOrCreateAuth), pas d'écran de création
app.get('/api/status', (req, res) => res.json({ setup: false }));

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Trop de tentatives, réessaie dans 15 minutes.' });
  const { username, password } = req.body || {};
  if (!checkCredentials(username, password)) {
    attempts.get(ip).push(Date.now());
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }
  attempts.delete(ip);
  setCookie(res, createToken(getOrCreateAuth().username), SESSION_DAYS * 86400);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  setCookie(res, '', 0);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ username: req.user }));

app.post('/api/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  const auth = getOrCreateAuth();
  if (!checkCredentials(auth.username, current)) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
  if (typeof next !== 'string' || next.length < 8) return res.status(400).json({ error: '8 caractères minimum' });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ ...auth, ...hashPassword(next) }, null, 2));
  res.json({ ok: true });
});

// Formulaire de contact public -> arrive dans Admin > Messages
app.post('/api/contact', (req, res) => {
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
  db.messages.unshift(msg);
  writeDb();
  res.json({ ok: true });
});

// Données complètes (le panel admin charge tout d'un coup)
app.get('/api/data', requireAuth, (req, res) => res.json(db));

app.get('/api/export', requireAuth, (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="novia-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(db);
});

app.post('/api/import', requireAuth, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object' || !data.settings) return res.status(400).json({ error: 'Fichier invalide' });
  for (const c of COLLECTIONS) if (!Array.isArray(data[c])) data[c] = [];
  db = data;
  writeDb();
  res.json({ ok: true });
});

app.put('/api/settings', requireAuth, (req, res) => {
  db.settings = { ...db.settings, ...(req.body || {}) };
  writeDb();
  res.json(db.settings);
});

function collection(req, res, next) {
  if (!COLLECTIONS.includes(req.params.col)) return res.status(404).json({ error: 'Collection inconnue' });
  next();
}

app.post('/api/data/:col', requireAuth, collection, (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const created = items.map(item => ({ ...item, id: newId(), createdAt: new Date().toISOString() }));
  db[req.params.col].push(...created);
  writeDb();
  res.json(Array.isArray(req.body) ? created : created[0]);
});

app.put('/api/data/:col/:id', requireAuth, collection, (req, res) => {
  const list = db[req.params.col];
  const i = list.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Introuvable' });
  list[i] = { ...list[i], ...req.body, id: list[i].id, updatedAt: new Date().toISOString() };
  writeDb();
  res.json(list[i]);
});

app.delete('/api/data/:col/:id', requireAuth, collection, (req, res) => {
  db[req.params.col] = db[req.params.col].filter(x => x.id !== req.params.id);
  writeDb();
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue' }));

getOrCreateAuth();
app.listen(PORT, () => console.log(`Novia Agency en ligne sur http://localhost:${PORT}  (admin : /admin)`));

/* ------------------------------------------------------------------ */

function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
