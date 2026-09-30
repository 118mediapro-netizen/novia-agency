'use strict';

// Lancement local ou sur un serveur classique : `npm start`.
// Sur Vercel, c'est api/index.js qui est utilisé.

const fs = require('fs');
const path = require('path');

loadDotEnv();

const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Novia Agency en ligne sur http://localhost:${PORT}  (admin : /admin)`);
  if (!process.env.ADMIN_PASSWORD) console.log('Premier lancement ? Ouvre /admin pour créer ton compte admin.');
});

function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
