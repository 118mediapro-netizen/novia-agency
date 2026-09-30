'use strict';

/* =====================================================================
   Novia Admin — panneau de gestion de toutes les activités
   ===================================================================== */

const S = { db: null, month: new Date().toISOString().slice(0, 7), week: mondayOf(todayISO()), clientView: 'kanban', taskPole: '', taskStatus: 'open', doc: { type: 'client', ref: '' } };

/* ---------- Constantes métier ---------- */

const CLIENT_STATUS = ['Prospect', 'Négociation', 'Essai', 'À signer', 'Signé', 'Terminé', 'Perdu'];
const SHOOT_STATUS = ['À confirmer', 'Confirmé', 'Tourné', 'Reporté', 'Annulé'];
const VIDEO_STATUS = ['Idée', 'Script prêt', 'Tourné', 'Montage', 'Retouches', 'Livré'];
const LEAD_STATUS = ['À contacter', 'Contacté', 'Relancé', 'RDV', 'Offre envoyée', 'Signé', 'Refus'];
const INVOICE_STATUS = ['Brouillon', 'Envoyée', 'Payée', 'En retard'];
const TASK_STATUS = ['À faire', 'En cours', 'Fait'];
const POLES = ['Structure', 'Production', 'Prospection', 'Influence Inès', 'Bilal', 'Perso'];
const COLLAB_STATUS = ['Prospect', 'Contactée', 'Négociation', 'Confirmée', 'En production', 'Livrée', 'Payée', 'Refus'];
const SPONSOR_STATUS = ['Idée', 'À contacter', 'Contacté', 'Discussion', 'Signé', 'Refus'];
const EXPENSE_CATS = ['Montage', 'Déplacement', 'Matériel', 'Logiciel', 'Figurants', 'Publicité', 'Banque / assurance', 'Autre'];
const CHANNELS = ['TikTok', 'Instagram', 'Visite sur place', 'Téléphone', 'Email', 'Recommandation', 'Site web'];

const TAG_COLOR = {
  'Signé': 'green', 'Payée': 'green', 'Livré': 'green', 'Livrée': 'green', 'Fait': 'green', 'Tourné': 'green', 'Reçu': 'green', 'Confirmée': 'lime', 'Confirmé': 'lime', 'Traité': 'green',
  'À signer': 'lime', 'Offre envoyée': 'lime', 'RDV': 'lime', 'Discussion': 'lime', 'En production': 'lime', 'Montage': 'lime', 'Retouches': 'lime',
  'Négociation': 'orange', 'Essai': 'orange', 'En cours': 'orange', 'Envoyée': 'orange', 'À confirmer': 'orange', 'Relancé': 'orange', 'En attente': 'orange', 'Script prêt': 'orange', 'Reporté': 'orange',
  'Perdu': 'red', 'Refus': 'red', 'Annulé': 'red', 'En retard': 'red',
  'Contacté': 'blue', 'Contactée': 'blue', 'Prospect': 'blue', 'Nouveau': 'pink', 'Terminé': '',
};

/* ---------- Schémas des fiches (formulaires + validations) ---------- */

const SCHEMAS = {
  clients: { title: 'Client', fields: [
    { k: 'name', label: 'Nom de la marque', req: true },
    { k: 'city', label: 'Ville' },
    { k: 'sector', label: 'Secteur' },
    { k: 'status', label: 'Statut', type: 'select', options: CLIENT_STATUS, def: 'Négociation' },
    { k: 'contact', label: 'Contact (nom)' },
    { k: 'phone', label: 'Téléphone' },
    { k: 'email', label: 'Email' },
    { k: 'price', label: 'Prix mensuel (€)', type: 'number', def: () => S.db.settings.goal.monthlyPrice },
    { k: 'videos', label: 'Vidéos / mois', type: 'number', def: () => S.db.settings.goal.videosPerClient },
    { k: 'months', label: 'Engagement (mois)', type: 'number', def: () => S.db.settings.goal.months },
    { k: 'start', label: 'Début du contrat', type: 'date' },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  shoots: { title: 'Tournage', fields: [
    { k: 'clientId', label: 'Client', type: 'client', req: true },
    { k: 'status', label: 'Statut', type: 'select', options: SHOOT_STATUS, def: 'À confirmer' },
    { k: 'date', label: 'Date', type: 'date', req: true },
    { k: 'location', label: 'Lieu' },
    { k: 'start', label: 'Début', type: 'time', def: '14:00' },
    { k: 'end', label: 'Fin', type: 'time', def: '18:00' },
    { k: 'team', label: 'Équipe présente', type: 'team', wide: true, def: () => ['moi'], hint: 'Le coût équipe est calculé automatiquement (Réglages > Équipe).' },
    { k: 'travel', label: 'Frais de déplacement (€)', type: 'number' },
    { k: 'extras', label: 'Figurants', type: 'textarea' },
    { k: 'ideas', label: 'Scripts / idées de vidéos', type: 'textarea', wide: true },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  videos: { title: 'Vidéo', fields: [
    { k: 'clientId', label: 'Client', type: 'client', req: true },
    { k: 'month', label: 'Mois', type: 'month', def: () => S.month },
    { k: 'title', label: 'Titre / concept', req: true, wide: true },
    { k: 'status', label: 'Statut', type: 'select', options: VIDEO_STATUS, def: 'Idée' },
    { k: 'due', label: 'Livraison prévue', type: 'date' },
    { k: 'link', label: 'Lien (Drive, WeTransfer…)', wide: true },
    { k: 'script', label: 'Script', type: 'textarea', wide: true },
  ] },
  expenses: { title: 'Dépense', fields: [
    { k: 'date', label: 'Date', type: 'date', def: todayISO, req: true },
    { k: 'amount', label: 'Montant (€)', type: 'number', req: true },
    { k: 'label', label: 'Libellé', req: true },
    { k: 'category', label: 'Catégorie', type: 'select', options: EXPENSE_CATS },
    { k: 'clientId', label: 'Client concerné (optionnel)', type: 'client' },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  invoices: { title: 'Facture', fields: [
    { k: 'number', label: 'Numéro', hint: 'Laisse vide : numéro automatique.' },
    { k: 'clientId', label: 'Client', type: 'client', req: true },
    { k: 'date', label: 'Date d\'émission', type: 'date', def: todayISO },
    { k: 'due', label: 'Échéance', type: 'date', def: () => addDays(todayISO(), 15) },
    { k: 'month', label: 'Mois facturé', type: 'month', def: () => S.month },
    { k: 'status', label: 'Statut', type: 'select', options: INVOICE_STATUS, def: 'Brouillon' },
    { k: 'label', label: 'Désignation', wide: true, def: 'Forfait création de contenu vidéo — 7 vidéos (tournage, montage, livraison)' },
    { k: 'qty', label: 'Quantité', type: 'number', def: 1 },
    { k: 'unit', label: 'Prix unitaire (€)', type: 'number', def: () => S.db.settings.goal.monthlyPrice },
    { k: 'paidAt', label: 'Payée le', type: 'date' },
    { k: 'notes', label: 'Notes internes', type: 'textarea', wide: true },
  ] },
  leads: { title: 'Prospect', fields: [
    { k: 'name', label: 'Nom du commerce', req: true },
    { k: 'city', label: 'Ville' },
    { k: 'sector', label: 'Secteur' },
    { k: 'channel', label: 'Canal', type: 'select', options: CHANNELS },
    { k: 'handle', label: 'Compte / contact' },
    { k: 'phone', label: 'Téléphone' },
    { k: 'status', label: 'Statut', type: 'select', options: LEAD_STATUS, def: 'À contacter' },
    { k: 'next', label: 'Prochaine action le', type: 'date' },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  events: { title: 'Événement', fields: [
    { k: 'title', label: 'Titre', req: true, wide: true },
    { k: 'date', label: 'Date', type: 'date', req: true, def: todayISO },
    { k: 'type', label: 'Type', type: 'select', options: ['Rendez-vous', 'Montage', 'Prospection', 'Shooting', 'Admin', 'Perso', 'Autre'] },
    { k: 'start', label: 'Début', type: 'time' },
    { k: 'end', label: 'Fin', type: 'time' },
    { k: 'people', label: 'Personnes', type: 'team', wide: true, def: () => ['moi'] },
    { k: 'location', label: 'Lieu', wide: true },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  tasks: { title: 'Tâche', fields: [
    { k: 'title', label: 'Tâche', req: true, wide: true },
    { k: 'pole', label: 'Pôle', type: 'select', options: POLES },
    { k: 'priority', label: 'Priorité', type: 'select', options: [{ v: 1, l: '1 — Urgent' }, { v: 2, l: '2 — Important' }, { v: 3, l: '3 — Plus tard' }], def: 2 },
    { k: 'status', label: 'Statut', type: 'select', options: TASK_STATUS, def: 'À faire' },
    { k: 'assignee', label: 'Pour', type: 'person', def: 'moi' },
    { k: 'due', label: 'Échéance', type: 'date' },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  collabs: { title: 'Collaboration Inès', fields: [
    { k: 'brand', label: 'Marque', req: true },
    { k: 'type', label: 'Type', type: 'select', options: ['Post', 'Story', 'Vidéo TikTok / Reel', 'UGC', 'Événement', 'Ambassadrice', 'Shooting', 'Autre'] },
    { k: 'status', label: 'Statut', type: 'select', options: COLLAB_STATUS, def: 'Prospect' },
    { k: 'contact', label: 'Contact marque' },
    { k: 'amount', label: 'Montant négocié (€)', type: 'number' },
    { k: 'commission', label: 'Part Novia (%)', type: 'number', def: () => S.db.settings.inesCommission },
    { k: 'due', label: 'Date limite', type: 'date' },
    { k: 'payment', label: 'Paiement', type: 'select', options: ['En attente', 'Reçu', 'Reversé à Inès'], def: 'En attente' },
    { k: 'deliverables', label: 'Contenus à produire', type: 'textarea', wide: true },
    { k: 'delivered', label: 'Contenus livrés', type: 'textarea', wide: true },
    { k: 'notes', label: 'Notes / échanges', type: 'textarea', wide: true },
  ] },
  sponsors: { title: 'Sponsor Bilal', fields: [
    { k: 'brand', label: 'Marque', req: true },
    { k: 'sector', label: 'Secteur' },
    { k: 'contact', label: 'Contact' },
    { k: 'status', label: 'Statut', type: 'select', options: SPONSOR_STATUS, def: 'Idée' },
    { k: 'target', label: 'Montant visé (€)', type: 'number' },
    { k: 'why', label: 'Pourquoi cette marque ?', type: 'textarea', wide: true },
    { k: 'counterpart', label: 'Contreparties proposées', type: 'textarea', wide: true },
    { k: 'notes', label: 'Notes', type: 'textarea', wide: true },
  ] },
  messages: { title: 'Message', fields: [
    { k: 'name', label: 'Nom' }, { k: 'business', label: 'Entreprise' },
    { k: 'email', label: 'Email' }, { k: 'phone', label: 'Téléphone' },
    { k: 'city', label: 'Ville' }, { k: 'service', label: 'Demande' },
    { k: 'status', label: 'Statut', type: 'select', options: ['Nouveau', 'Traité'] },
    { k: 'message', label: 'Message', type: 'textarea', wide: true },
  ] },
};

const NAV = [
  [null, [['dashboard', '◎', 'Tableau de bord'], ['planning', '▦', 'Planning équipe'], ['tasks', '✓', 'Tâches & démarches']]],
  ['Novia Production', [['clients', '◆', 'Clients & pipeline'], ['leads', '➜', 'Prospection'], ['shoots', '●', 'Tournages'], ['videos', '▶', 'Vidéos']]],
  ['Finances', [['finance', '€', 'Rentabilité'], ['invoices', '▤', 'Factures'], ['expenses', '−', 'Dépenses']]],
  ['Novia Influence', [['ines', '★', 'Inès']]],
  ['Développement', [['bilal', '◇', 'Bilal']]],
  ['Outils', [['documents', '✎', 'Contrats & documents'], ['messages', '✉', 'Messages du site'], ['settings', '⚙', 'Réglages']]],
];

/* ---------- Utilitaires ---------- */

function todayISO() { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function mondayOf(iso) { const d = new Date(iso + 'T12:00:00'); return addDays(iso, -((d.getDay() + 6) % 7)); }
function addMonths(ym, n) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function eur(n, dec = 0) { return (Number(n) || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: dec, minimumFractionDigits: dec }); }
function fdate(iso, opts = { day: 'numeric', month: 'short' }) { return iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', opts) : '—'; }
function fmonth(ym) { return new Date(ym + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
function tag(s) { return s ? `<span class="tag ${TAG_COLOR[s] || ''}">${esc(s)}</span>` : ''; }
function team() { return S.db.settings.team; }
function person(id) { return team().find(p => p.id === id) || { id, name: id || '—', rate: 0, color: '#888' }; }
function personChip(id) { const p = person(id); return `<span class="person"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</span>`; }
function client(id) { return S.db.clients.find(c => c.id === id); }
function clientName(id) { return client(id)?.name || '—'; }
function find(col, id) { return S.db[col].find(x => x.id === id); }
function sum(arr, f) { return arr.reduce((t, x) => t + (Number(f(x)) || 0), 0); }
function shootCost(s) { return sum(s.team || [], id => person(id).rate) + (Number(s.travel) || 0); }
function collabNovia(c) { return (Number(c.amount) || 0) * (Number(c.commission) || 0) / 100; }
function monthEnd(ym) { return addDays(addMonths(ym, 1) + '-01', -1); }

// Un client "signé" est actif sur un mois si le mois tombe dans sa période d'engagement
function activeIn(c, ym) {
  if (c.status !== 'Signé' && c.status !== 'Terminé') return false;
  if (!c.start) return c.status === 'Signé';
  const first = c.start.slice(0, 7);
  const last = addMonths(first, (Number(c.months) || 1) - 1);
  return ym >= first && ym <= last;
}

async function api(method, url, body) {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { location.href = '/admin/login.html'; throw new Error('Session expirée'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur');
  return data;
}

async function save(col, item) {
  if (item.id) {
    const updated = await api('PUT', `/api/data/${col}/${item.id}`, item);
    S.db[col] = S.db[col].map(x => x.id === updated.id ? updated : x);
    return updated;
  }
  const created = await api('POST', `/api/data/${col}`, item);
  S.db[col].push(...(Array.isArray(created) ? created : [created]));
  return created;
}

async function remove(col, id) {
  await api('DELETE', `/api/data/${col}/${id}`);
  S.db[col] = S.db[col].filter(x => x.id !== id);
}

async function saveSettings(patch) {
  S.db.settings = await api('PUT', '/api/settings', patch);
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Formulaires génériques ---------- */

function fieldHTML(f, val) {
  const name = `name="${f.k}"`;
  const req = f.req ? 'required' : '';
  let input;
  switch (f.type) {
    case 'textarea': input = `<textarea ${name} rows="3">${esc(val)}</textarea>`; break;
    case 'select': input = `<select ${name}>${f.options.map(o => { const v = o.v ?? o; const l = o.l ?? o; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`; break;
    case 'client': input = `<select ${name} ${req}><option value="">—</option>${S.db.clients.map(c => `<option value="${c.id}" ${c.id === val ? 'selected' : ''}>${esc(c.name)}${c.city ? ' — ' + esc(c.city) : ''}</option>`).join('')}</select>`; break;
    case 'person': input = `<select ${name}>${team().map(p => `<option value="${p.id}" ${p.id === val ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`; break;
    case 'team': input = `<div class="checks">${team().map(p => `<label><input type="checkbox" name="${f.k}" value="${p.id}" ${(val || []).includes(p.id) ? 'checked' : ''}> ${esc(p.name)}${p.rate ? ` <span class="muted">(${eur(p.rate)})</span>` : ''}</label>`).join('')}</div>`; break;
    default: input = `<input type="${f.type || 'text'}" ${f.type === 'number' ? 'step="any"' : ''} ${name} value="${esc(val)}" ${req}>`;
  }
  return `<label class="${f.wide || f.type === 'textarea' || f.type === 'team' ? 'wide' : ''}">${esc(f.label)}${f.req ? ' *' : ''}${input}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</label>`;
}

function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal').hidden = false;
  document.querySelector('#modal-body input, #modal-body select, #modal-body textarea')?.focus();
}
function closeModal() { document.getElementById('modal').hidden = true; }

function openForm(col, item, preset = {}) {
  const schema = SCHEMAS[col];
  const values = { ...preset, ...(item || {}) };
  for (const f of schema.fields) {
    if (values[f.k] === undefined && f.def !== undefined) values[f.k] = typeof f.def === 'function' ? f.def() : f.def;
  }
  openModal((item ? 'Modifier — ' : 'Nouveau — ') + schema.title, `
    <form id="entity-form" class="form-grid">
      ${schema.fields.map(f => fieldHTML(f, values[f.k])).join('')}
      <div class="form-actions wide">
        ${item ? `<button type="button" class="btn danger" id="del-btn">Supprimer</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn" onclick="closeModal()">Annuler</button>
        <button class="btn primary">Enregistrer</button>
      </div>
    </form>`);

  const form = document.getElementById('entity-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = item ? { id: item.id } : { ...preset };
    for (const f of schema.fields) {
      if (f.type === 'team') data[f.k] = fd.getAll(f.k);
      else if (f.type === 'number' || f.k === 'priority') data[f.k] = fd.get(f.k) === '' ? '' : Number(fd.get(f.k));
      else data[f.k] = (fd.get(f.k) ?? '').toString().trim();
    }
    if (col === 'invoices' && !data.number) data.number = await nextInvoiceNumber();
    try {
      await save(col, data);
      closeModal();
      toast('Enregistré');
      render();
    } catch (err) { toast(err.message); }
  });
  document.getElementById('del-btn')?.addEventListener('click', async () => {
    if (!confirm('Supprimer définitivement ?')) return;
    await remove(col, item.id);
    closeModal();
    toast('Supprimé');
    render();
  });
}

async function nextInvoiceNumber() {
  const n = (Number(S.db.settings.invoiceCounter) || 0) + 1;
  await saveSettings({ invoiceCounter: n });
  return `F${new Date().getFullYear()}-${String(n).padStart(3, '0')}`;
}

/* ---------- Tableau générique ---------- */

function table(col, rows, cols, opts = {}) {
  if (!rows.length) return `<div class="empty">${opts.empty || 'Rien pour l\'instant.'}</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}${opts.actions ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows.map(r => `<tr data-act="edit" data-col="${col}" data-id="${r.id}" style="cursor:pointer">${cols.map(c => `<td>${c[1](r)}</td>`).join('')}${opts.actions ? `<td class="actions">${opts.actions(r)}</td>` : ''}</tr>`).join('')}</tbody>
    ${opts.foot ? `<tfoot><tr>${opts.foot}</tr></tfoot>` : ''}
  </table></div>`;
}

function monthNav() {
  return `<div class="toolbar"><button class="btn sm" data-act="month" data-d="-1">←</button><strong style="min-width:140px;text-align:center;text-transform:capitalize">${fmonth(S.month)}</strong><button class="btn sm" data-act="month" data-d="1">→</button></div>`;
}

function btnNew(col, label, preset) {
  return `<button class="btn primary" data-act="new" data-col="${col}" ${preset ? `data-preset='${esc(JSON.stringify(preset))}'` : ''}>+ ${label}</button>`;
}

/* =====================================================================
   VUES
   ===================================================================== */

const VIEWS = {};

/* ---------- Tableau de bord ---------- */

VIEWS.dashboard = () => {
  const st = S.db.settings;
  const today = todayISO();
  const signed = S.db.clients.filter(c => c.status === 'Signé');
  const goal = st.goal.contracts;
  const left = Math.max(0, goal - signed.length);
  const daysLeft = daysBetween(today, st.goal.deadline);
  const mrr = sum(signed, c => c.price);
  const committed = sum(signed, c => c.price * c.months);
  const pipeline = S.db.clients.filter(c => ['Négociation', 'Essai', 'À signer'].includes(c.status));
  const weekEnd = addDays(today, 7);
  const upcoming = [
    ...S.db.shoots.filter(s => s.date >= today && s.date <= weekEnd && s.status !== 'Annulé').map(s => ({ date: s.date, time: s.start, html: `<strong>Tournage ${esc(clientName(s.clientId))}</strong><div class="muted small">${(s.team || []).map(personChip).join('')}</div>`, col: 'shoots', id: s.id, tag: s.status })),
    ...S.db.events.filter(e => e.date >= today && e.date <= weekEnd).map(e => ({ date: e.date, time: e.start, html: `<strong>${esc(e.title)}</strong><div class="muted small">${(e.people || []).map(personChip).join('')}</div>`, col: 'events', id: e.id, tag: e.type })),
    ...S.db.collabs.filter(c => c.due >= today && c.due <= weekEnd && !['Payée', 'Refus', 'Livrée'].includes(c.status)).map(c => ({ date: c.due, time: '', html: `<strong>Deadline collab ${esc(c.brand)}</strong><div class="muted small">Inès</div>`, col: 'collabs', id: c.id, tag: c.status })),
  ].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  const openTasks = S.db.tasks.filter(t => t.status !== 'Fait').sort((a, b) => a.priority - b.priority || (a.due || '9').localeCompare(b.due || '9'));
  const late = openTasks.filter(t => t.due && t.due < today);
  const ym = today.slice(0, 7);
  const active = S.db.clients.filter(c => activeIn(c, ym));
  const videoTarget = sum(active, c => c.videos);
  const videosMonth = S.db.videos.filter(v => v.month === ym);
  const delivered = videosMonth.filter(v => v.status === 'Livré').length;
  const unpaid = S.db.invoices.filter(i => ['Envoyée', 'En retard'].includes(i.status));
  const newMsgs = S.db.messages.filter(m => m.status === 'Nouveau');
  const leadsDue = S.db.leads.filter(l => l.next && l.next <= today && !['Signé', 'Refus'].includes(l.status));
  const collabsOpen = S.db.collabs.filter(c => !['Payée', 'Refus'].includes(c.status) && c.status !== 'Prospect');

  const perWeek = daysLeft > 0 ? (left / (daysLeft / 7)).toFixed(1) : left;

  return `
  <div class="grid g4">
    <div class="panel kpi hero">
      <div class="label">Contrats signés</div>
      <div class="value">${signed.length} / ${goal}</div>
      <div class="progress"><div style="width:${Math.min(100, signed.length / goal * 100)}%"></div></div>
      <div class="sub" style="margin-top:8px">${left ? `Encore ${left} contrat${left > 1 ? 's' : ''} → ~${perWeek} / semaine` : 'Objectif atteint 🎉'}</div>
    </div>
    <div class="panel kpi"><div class="label">Échéance objectif</div><div class="value">${daysLeft >= 0 ? 'J-' + daysLeft : 'Passée'}</div><div class="sub">${fdate(st.goal.deadline, { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
    <div class="panel kpi"><div class="label">CA mensuel signé</div><div class="value">${eur(mrr)}</div><div class="sub">Objectif : ${eur(goal * st.goal.monthlyPrice)} / mois</div></div>
    <div class="panel kpi"><div class="label">CA engagé (contrats)</div><div class="value">${eur(committed)}</div><div class="sub">Objectif : ${eur(goal * st.goal.monthlyPrice * st.goal.months)}</div></div>
  </div>

  ${late.length || newMsgs.length || leadsDue.length || unpaid.length ? `<div class="callout warn">
    ${late.length ? `⚠︎ <strong>${late.length}</strong> tâche(s) en retard · ` : ''}
    ${leadsDue.length ? `<a href="#/leads"><strong>${leadsDue.length}</strong> prospect(s) à relancer</a> · ` : ''}
    ${unpaid.length ? `<a href="#/invoices"><strong>${unpaid.length}</strong> facture(s) non payée(s) (${eur(sum(unpaid, i => i.qty * i.unit))})</a> · ` : ''}
    ${newMsgs.length ? `<a href="#/messages"><strong>${newMsgs.length}</strong> nouveau(x) message(s) du site</a>` : ''}
  </div>` : ''}

  <div class="grid g2">
    <div class="panel">
      <h3>Priorités <a class="btn sm" href="#/tasks">Tout voir</a></h3>
      <div class="list">${openTasks.slice(0, 9).map(taskRow).join('') || '<div class="empty">Tout est fait 👌</div>'}</div>
    </div>
    <div class="panel">
      <h3>Les 7 prochains jours <a class="btn sm" href="#/planning">Planning</a></h3>
      <div class="list">${upcoming.map(u => `<div class="list-item" data-act="edit" data-col="${u.col}" data-id="${u.id}" style="cursor:pointer">
        <div style="width:64px" class="small"><strong>${fdate(u.date, { weekday: 'short', day: 'numeric' })}</strong><div class="muted">${esc(u.time || '')}</div></div>
        <div class="grow">${u.html}</div>${tag(u.tag)}</div>`).join('') || '<div class="empty">Rien de prévu. <a href="#/planning">Planifier</a></div>'}</div>
    </div>
  </div>

  <div class="grid g3">
    <div class="panel">
      <h3>Pipeline clients <a class="btn sm" href="#/clients">Ouvrir</a></h3>
      <div class="list">${CLIENT_STATUS.filter(s => s !== 'Perdu').map(s => {
        const n = S.db.clients.filter(c => c.status === s).length;
        return `<div class="list-item"><div class="grow">${tag(s)}</div><strong>${n}</strong></div>`;
      }).join('')}</div>
      <p class="muted small" style="margin-top:10px">${pipeline.length} en cours de closing : ${pipeline.map(c => esc(c.name)).join(', ') || '—'}</p>
    </div>
    <div class="panel">
      <h3>Production — ${fmonth(ym)} <a class="btn sm" href="#/videos">Vidéos</a></h3>
      <div class="kpi"><div class="value">${delivered} / ${videoTarget || videosMonth.length}</div><div class="sub">vidéos livrées ce mois</div></div>
      <div class="progress"><div style="width:${videoTarget ? Math.min(100, delivered / videoTarget * 100) : 0}%"></div></div>
      <div class="list" style="margin-top:12px">${active.map(c => {
        const vs = videosMonth.filter(v => v.clientId === c.id);
        return `<div class="list-item"><div class="grow">${esc(c.name)}</div><span class="muted small">${vs.filter(v => v.status === 'Livré').length}/${c.videos} livrées</span></div>`;
      }).join('') || '<div class="empty">Aucun client actif ce mois.</div>'}</div>
    </div>
    <div class="panel">
      <h3>Novia Influence <a class="btn sm" href="#/ines">Inès</a></h3>
      <div class="kpi"><div class="value">${collabsOpen.length}</div><div class="sub">collab(s) en cours pour Inès</div></div>
      <div class="list" style="margin-top:12px">${collabsOpen.slice(0, 4).map(c => `<div class="list-item"><div class="grow">${esc(c.brand)}</div>${tag(c.status)}</div>`).join('') || '<div class="empty">Aucune collab en cours.</div>'}</div>
      <p class="muted small" style="margin-top:10px">Commission Novia à venir : <strong>${eur(sum(S.db.collabs.filter(c => ['Confirmée', 'En production', 'Livrée'].includes(c.status)), collabNovia))}</strong></p>
    </div>
  </div>`;
};

function taskRow(t) {
  const late = t.due && t.due < todayISO() && t.status !== 'Fait';
  return `<div class="list-item">
    <input type="checkbox" data-change="toggleTask" data-id="${t.id}" ${t.status === 'Fait' ? 'checked' : ''}>
    <div class="grow" data-act="edit" data-col="tasks" data-id="${t.id}" style="cursor:pointer">
      <div style="${t.status === 'Fait' ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(t.title)}</div>
      <div class="muted small">${esc(t.pole || '')}${t.due ? ` · <span class="${late ? 'neg' : ''}">${late ? 'En retard — ' : ''}${fdate(t.due)}</span>` : ''}</div>
    </div>
    ${t.assignee && t.assignee !== 'moi' ? personChip(t.assignee) : ''}
    <span class="tag ${t.priority == 1 ? 'red' : t.priority == 2 ? 'orange' : ''}">P${t.priority}</span>
  </div>`;
}

/* ---------- Planning ---------- */

VIEWS.planning = () => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(S.week, i));
  const today = todayISO();
  const itemsFor = (pid, d) => {
    const out = [];
    for (const s of S.db.shoots) if (s.date === d && (s.team || []).includes(pid) && s.status !== 'Annulé')
      out.push({ t: s.start || '', html: `<div class="ev shoot" data-act="edit" data-col="shoots" data-id="${s.id}">🎬 ${esc(clientName(s.clientId))}<small>${esc(s.start || '')}${s.end ? '–' + esc(s.end) : ''} · ${esc(s.status)}</small></div>` });
    for (const e of S.db.events) if (e.date === d && (e.people || []).includes(pid))
      out.push({ t: e.start || '', html: `<div class="ev event" data-act="edit" data-col="events" data-id="${e.id}">${esc(e.title)}<small>${esc(e.start || '')}${e.end ? '–' + esc(e.end) : ''} ${esc(e.type || '')}</small></div>` });
    for (const t of S.db.tasks) if (t.due === d && t.assignee === pid && t.status !== 'Fait')
      out.push({ t: '99', html: `<div class="ev task" data-act="edit" data-col="tasks" data-id="${t.id}">☐ ${esc(t.title)}</div>` });
    if (pid === 'ines') for (const c of S.db.collabs) if (c.due === d && !['Payée', 'Refus'].includes(c.status))
      out.push({ t: '98', html: `<div class="ev collab" data-act="edit" data-col="collabs" data-id="${c.id}">★ ${esc(c.brand)}<small>Deadline collab</small></div>` });
    return out.sort((a, b) => a.t.localeCompare(b.t)).map(x => x.html).join('');
  };

  const workload = team().map(p => {
    const n = S.db.shoots.filter(s => days.includes(s.date) && (s.team || []).includes(p.id) && s.status !== 'Annulé').length;
    return `<span class="person"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)} : <strong>${n}</strong> tournage(s)${p.rate ? ` · ${eur(n * p.rate)}` : ''}</span>`;
  }).join('');

  return `
  <div class="toolbar">
    <button class="btn sm" data-act="week" data-d="-7">← Semaine</button>
    <button class="btn sm" data-act="week" data-d="0">Aujourd'hui</button>
    <button class="btn sm" data-act="week" data-d="7">Semaine →</button>
    <strong style="margin-left:8px">Du ${fdate(days[0], { day: 'numeric', month: 'long' })} au ${fdate(days[6], { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
  </div>
  <div class="legend"><span>🎬 Tournage</span><span style="color:var(--blue)">■ Rendez-vous / événement</span><span style="color:var(--orange)">■ Tâche</span><span style="color:var(--pink)">■ Deadline collab Inès</span><span>Clique dans une case vide pour ajouter.</span></div>
  <div class="planning-wrap"><div class="planning">
    <div class="pl-head"></div>
    ${days.map(d => `<div class="pl-head ${d === today ? 'today' : ''}">${fdate(d, { weekday: 'short' })}<b>${fdate(d, { day: 'numeric', month: 'short' })}</b></div>`).join('')}
    ${team().map(p => `
      <div class="pl-person"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</div>
      ${days.map(d => `<div class="pl-cell ${d === today ? 'today' : ''}" data-act="cell" data-date="${d}" data-person="${p.id}">${itemsFor(p.id, d)}</div>`).join('')}
    `).join('')}
  </div></div>
  <div class="panel"><h3>Charge de la semaine</h3>${workload}</div>`;
};

/* ---------- Tâches ---------- */

VIEWS.tasks = () => {
  let rows = S.db.tasks.slice();
  if (S.taskPole) rows = rows.filter(t => t.pole === S.taskPole);
  if (S.taskStatus === 'open') rows = rows.filter(t => t.status !== 'Fait');
  if (S.taskStatus === 'done') rows = rows.filter(t => t.status === 'Fait');
  rows.sort((a, b) => a.priority - b.priority || (a.due || '9').localeCompare(b.due || '9'));
  const total = S.db.tasks.length, done = S.db.tasks.filter(t => t.status === 'Fait').length;
  return `
  <div class="toolbar">
    <select data-change="taskPole"><option value="">Tous les pôles</option>${POLES.map(p => `<option ${p === S.taskPole ? 'selected' : ''}>${p}</option>`).join('')}</select>
    <select data-change="taskStatus">${[['open', 'À faire / en cours'], ['done', 'Terminées'], ['all', 'Toutes']].map(([v, l]) => `<option value="${v}" ${v === S.taskStatus ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <span class="muted">${done}/${total} terminées</span>
  </div>
  <div class="progress"><div style="width:${total ? done / total * 100 : 0}%"></div></div>
  <div class="grid g2">
    ${POLES.filter(p => !S.taskPole || p === S.taskPole).map(p => {
      const list = rows.filter(t => t.pole === p);
      if (!list.length) return '';
      return `<div class="panel"><h3>${p} <span class="muted small">${list.length}</span></h3><div class="list">${list.map(taskRow).join('')}</div></div>`;
    }).join('') || '<div class="empty">Aucune tâche.</div>'}
  </div>`;
};

/* ---------- Clients ---------- */

VIEWS.clients = () => {
  const cols = CLIENT_STATUS;
  const kanban = `<div class="kanban">${cols.map(s => {
    const list = S.db.clients.filter(c => c.status === s);
    return `<div class="kcol" data-drop="${s}">
      <div class="kcol-head">${tag(s)}<span class="muted">${list.length}</span></div>
      ${list.map(c => `<div class="kcard" draggable="true" data-drag="${c.id}" data-act="edit" data-col="clients" data-id="${c.id}">
        <strong>${esc(c.name)}</strong><span class="muted small">${esc(c.city || '')} · ${eur(c.price)}/mois · ${c.months} mois</span>
        ${c.notes ? `<div class="muted small clamp" style="margin-top:4px">${esc(c.notes)}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }).join('')}</div><p class="muted small">Glisse une carte pour changer le statut. Passe un client en « Signé » pour qu'il compte dans l'objectif.</p>`;

  const list = table('clients', S.db.clients.slice().sort((a, b) => CLIENT_STATUS.indexOf(a.status) - CLIENT_STATUS.indexOf(b.status)), [
    ['Client', c => `<strong>${esc(c.name)}</strong><div class="muted small">${esc(c.sector || '')}</div>`],
    ['Ville', c => esc(c.city)],
    ['Statut', c => tag(c.status)],
    ['Prix', c => eur(c.price) + '/mois'],
    ['Engagement', c => `${c.months} mois${c.start ? ` <span class="muted small">dès ${fdate(c.start)}</span>` : ''}`],
    ['Valeur', c => eur(c.price * c.months)],
  ], { actions: c => `
      <button class="btn sm" data-act="planShoot" data-id="${c.id}">+ Tournage</button>
      <button class="btn sm" data-act="genVideos" data-id="${c.id}">+ ${c.videos} vidéos</button>
      <button class="btn sm" data-act="docFor" data-type="client" data-id="${c.id}">Contrat</button>` });

  return `
  <div class="toolbar">
    <button class="btn sm ${S.clientView === 'kanban' ? 'primary' : ''}" data-act="clientView" data-v="kanban">Pipeline</button>
    <button class="btn sm ${S.clientView === 'table' ? 'primary' : ''}" data-act="clientView" data-v="table">Liste</button>
  </div>
  ${S.clientView === 'kanban' ? kanban : list}`;
};

/* ---------- Prospection ---------- */

VIEWS.leads = () => {
  const today = todayISO();
  const by = s => S.db.leads.filter(l => l.status === s).length;
  const rows = S.db.leads.slice().sort((a, b) => (a.next || '9').localeCompare(b.next || '9'));
  const signed = S.db.clients.filter(c => c.status === 'Signé').length;
  const need = Math.max(0, S.db.settings.goal.contracts - signed);
  return `
  <div class="grid g4">
    <div class="panel kpi"><div class="label">Prospects</div><div class="value">${S.db.leads.length}</div><div class="sub">dans la liste</div></div>
    <div class="panel kpi"><div class="label">Contactés</div><div class="value">${S.db.leads.filter(l => l.status !== 'À contacter').length}</div><div class="sub">${by('RDV') + by('Offre envoyée')} en RDV / offre</div></div>
    <div class="panel kpi"><div class="label">À relancer aujourd'hui</div><div class="value">${S.db.leads.filter(l => l.next && l.next <= today && !['Signé', 'Refus'].includes(l.status)).length}</div></div>
    <div class="panel kpi"><div class="label">Contrats manquants</div><div class="value">${need}</div><div class="sub">≈ ${need * 10} prospects à contacter (1 sur 10 signe)</div></div>
  </div>
  <div class="callout">Astuce : avec le skill <strong>prospection-tiktok</strong>, demande « trouve-moi des fast-foods à Toulouse sur TikTok » pour préparer des DM, puis ajoute les prospects ici.</div>
  ${table('leads', rows, [
    ['Commerce', l => `<strong>${esc(l.name)}</strong><div class="muted small">${esc(l.sector || '')}</div>`],
    ['Ville', l => esc(l.city)],
    ['Canal', l => `${esc(l.channel || '')}<div class="muted small">${esc(l.handle || '')}</div>`],
    ['Statut', l => tag(l.status)],
    ['Prochaine action', l => l.next ? `<span class="${l.next <= today ? 'neg' : ''}">${fdate(l.next)}</span>` : '—'],
    ['Notes', l => `<div class="clamp muted">${esc(l.notes)}</div>`],
  ], { empty: 'Aucun prospect. Ajoute les commerces à contacter.', actions: l => l.status !== 'Signé' ? `<button class="btn sm" data-act="convertLead" data-id="${l.id}">→ Client</button>` : '' })}`;
};

/* ---------- Tournages ---------- */

VIEWS.shoots = () => {
  const today = todayISO();
  const rows = S.db.shoots.slice().sort((a, b) => b.date.localeCompare(a.date));
  const upcoming = rows.filter(s => s.date >= today).reverse();
  const past = rows.filter(s => s.date < today);
  const cols = [
    ['Date', s => `<strong>${fdate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><div class="muted small">${esc(s.start || '')}${s.end ? '–' + esc(s.end) : ''}</div>`],
    ['Client', s => `${esc(clientName(s.clientId))}<div class="muted small">${esc(s.location || '')}</div>`],
    ['Équipe', s => (s.team || []).map(personChip).join('')],
    ['Coût', s => eur(shootCost(s))],
    ['Statut', s => tag(s.status)],
    ['Figurants / idées', s => `<div class="clamp muted">${esc([s.extras, s.ideas].filter(Boolean).join(' · '))}</div>`],
  ];
  const combos = team().filter(p => p.rate).flatMap((p, i, arr) => [[p], ...arr.slice(i + 1).map(q => [p, q])]);
  return `
  <h3>À venir</h3>
  ${table('shoots', upcoming, cols, { empty: 'Aucun tournage prévu.' })}
  <h3>Passés</h3>
  ${table('shoots', past, cols, { empty: 'Aucun tournage passé.', foot: `<td colspan="3">Total coûts équipe + déplacements</td><td>${eur(sum(past, shootCost))}</td><td colspan="2"></td>` })}
  <div class="panel"><h3>Configurations d'équipe possibles</h3>
    <div class="grid g3">${combos.map(c => `<div class="list-item"><div class="grow">${c.map(p => personChip(p.id)).join('')}</div><strong>${eur(sum(c, p => p.rate))}</strong></div>`).join('')}</div>
  </div>`;
};

/* ---------- Vidéos ---------- */

VIEWS.videos = () => {
  const vids = S.db.videos.filter(v => v.month === S.month);
  const clients = S.db.clients.filter(c => activeIn(c, S.month) || vids.some(v => v.clientId === c.id) || (c.status === 'À signer'));
  return `
  ${monthNav()}
  <div class="grid g2">${clients.map(c => {
    const vs = vids.filter(v => v.clientId === c.id);
    const done = vs.filter(v => v.status === 'Livré').length;
    return `<div class="panel">
      <h3>${esc(c.name)} <span class="muted small">${done}/${c.videos} livrées</span></h3>
      <div class="progress" style="margin:-4px 0 12px"><div style="width:${c.videos ? done / c.videos * 100 : 0}%"></div></div>
      <div class="list">${vs.map(v => `<div class="list-item">
        <div class="grow" data-act="edit" data-col="videos" data-id="${v.id}" style="cursor:pointer">${esc(v.title)}${v.due ? `<div class="muted small">Livraison ${fdate(v.due)}</div>` : ''}</div>
        <select data-change="videoStatus" data-id="${v.id}" style="width:auto">${VIDEO_STATUS.map(s => `<option ${s === v.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>`).join('') || '<div class="empty">Aucune vidéo pour ce mois.</div>'}</div>
      <div class="toolbar" style="margin-top:10px">
        ${vs.length < c.videos ? `<button class="btn sm" data-act="genVideos" data-id="${c.id}">Générer ${c.videos - vs.length} vidéo(s)</button>` : ''}
        <button class="btn sm" data-act="new" data-col="videos" data-preset='${esc(JSON.stringify({ clientId: c.id, month: S.month }))}'>+ Vidéo</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty">Aucun client actif ce mois. Passe un client en « Signé » avec une date de début.</div>'}</div>`;
};

/* ---------- Rentabilité ---------- */

function monthFinance(ym) {
  const st = S.db.settings;
  const inMonth = d => d && d.slice(0, 7) === ym;
  const rows = S.db.clients.filter(c => activeIn(c, ym) || S.db.shoots.some(s => s.clientId === c.id && inMonth(s.date))).map(c => {
    const revenue = activeIn(c, ym) ? Number(c.price) || 0 : 0;
    const shoots = S.db.shoots.filter(s => s.clientId === c.id && inMonth(s.date) && s.status !== 'Annulé');
    const teamCost = sum(shoots, shootCost);
    const other = sum(S.db.expenses.filter(e => e.clientId === c.id && inMonth(e.date)), e => e.amount);
    const charges = revenue * (st.urssafRate + st.taxRate) / 100;
    return { c, revenue, teamCost, other, charges, margin: revenue - teamCost - other - charges };
  });
  const collabs = S.db.collabs.filter(c => inMonth(c.due) && !['Refus', 'Prospect'].includes(c.status));
  const influence = sum(collabs, collabNovia);
  const influenceCharges = influence * (st.urssafRate + st.taxRate) / 100;
  const overhead = sum(S.db.expenses.filter(e => !e.clientId && inMonth(e.date)), e => e.amount);
  const total = sum(rows, r => r.margin) + influence - influenceCharges - overhead;
  const payouts = team().filter(p => p.rate).map(p => {
    const n = S.db.shoots.filter(s => inMonth(s.date) && s.status !== 'Annulé' && (s.team || []).includes(p.id)).length;
    return { p, n, amount: n * p.rate };
  });
  return { rows, influence, influenceCharges, overhead, total, payouts, revenue: sum(rows, r => r.revenue) + influence };
}

VIEWS.finance = () => {
  const st = S.db.settings;
  const f = monthFinance(S.month);
  const rate = st.urssafRate + st.taxRate;
  return `
  ${monthNav()}
  <div class="grid g4">
    <div class="panel kpi"><div class="label">Chiffre d'affaires</div><div class="value">${eur(f.revenue)}</div><div class="sub">Production + commissions Inès</div></div>
    <div class="panel kpi"><div class="label">À payer à l'équipe</div><div class="value">${eur(sum(f.payouts, p => p.amount))}</div><div class="sub">${f.payouts.map(p => `${esc(p.p.name)} ${eur(p.amount)}`).join(' · ')}</div></div>
    <div class="panel kpi"><div class="label">Charges estimées (${rate.toLocaleString('fr-FR')} %)</div><div class="value">${eur(sum(f.rows, r => r.charges) + f.influenceCharges)}</div><div class="sub">URSSAF + impôt (Réglages)</div></div>
    <div class="panel kpi hero"><div class="label">Ce qu'il te reste</div><div class="value ${f.total < 0 ? 'neg' : ''}">${eur(f.total)}</div><div class="sub">après équipe, frais, charges</div></div>
  </div>

  <div class="table-wrap"><table>
    <thead><tr><th>Client</th><th>CA</th><th>Équipe + déplacements</th><th>Autres frais</th><th>Charges</th><th>Marge</th><th>Marge %</th></tr></thead>
    <tbody>
      ${f.rows.map(r => `<tr data-act="edit" data-col="clients" data-id="${r.c.id}" style="cursor:pointer"><td><strong>${esc(r.c.name)}</strong></td><td>${eur(r.revenue)}</td><td>${eur(r.teamCost)}</td><td>${eur(r.other)}</td><td>${eur(r.charges)}</td><td class="${r.margin < 0 ? 'neg' : 'pos'}"><strong>${eur(r.margin)}</strong></td><td>${r.revenue ? Math.round(r.margin / r.revenue * 100) + ' %' : '—'}</td></tr>`).join('')}
      <tr><td>★ Commissions Inès</td><td>${eur(f.influence)}</td><td>—</td><td>—</td><td>${eur(f.influenceCharges)}</td><td class="pos">${eur(f.influence - f.influenceCharges)}</td><td></td></tr>
      <tr><td>Frais généraux (logiciels, matériel…)</td><td>—</td><td>—</td><td>${eur(f.overhead)}</td><td>—</td><td class="neg">${eur(-f.overhead)}</td><td></td></tr>
    </tbody>
    <tfoot><tr><td>Total</td><td>${eur(f.revenue)}</td><td>${eur(sum(f.rows, r => r.teamCost))}</td><td>${eur(sum(f.rows, r => r.other) + f.overhead)}</td><td>${eur(sum(f.rows, r => r.charges) + f.influenceCharges)}</td><td class="${f.total < 0 ? 'neg' : 'pos'}">${eur(f.total)}</td><td></td></tr></tfoot>
  </table></div>

  <div class="panel">
    <h3>Simulateur — et si j'atteins l'objectif ?</h3>
    <div class="form-grid" id="simu" style="grid-template-columns:repeat(5,minmax(0,1fr))">
      <label>Nombre de clients<input type="number" name="n" value="${st.goal.contracts}"></label>
      <label>Prix / mois (€)<input type="number" name="price" value="${st.goal.monthlyPrice}"></label>
      <label>Coût équipe / tournage (€)<select name="team">${[['150', 'Inès seule — 150 €'], ['80', 'Zizou ou Youssef — 80 €'], ['160', 'Zizou + Youssef — 160 €'], ['230', 'Inès + 1 — 230 €']].map(([v, l]) => `<option value="${v}" ${v === '230' ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Autres frais / client (€)<input type="number" name="other" value="30"></label>
      <label>Durée (mois)<input type="number" name="months" value="${st.goal.months}"></label>
    </div>
    <div id="simu-out" style="margin-top:14px"></div>
  </div>`;
};

function runSimu() {
  const form = document.getElementById('simu');
  if (!form) return;
  const v = k => Number(form.querySelector(`[name=${k}]`).value) || 0;
  const st = S.db.settings;
  const ca = v('n') * v('price');
  const team = v('n') * v('team');
  const other = v('n') * v('other');
  const charges = ca * (st.urssafRate + st.taxRate) / 100;
  const net = ca - team - other - charges;
  document.getElementById('simu-out').innerHTML = `<div class="grid g4">
    <div class="kpi"><div class="label">CA / mois</div><div class="value">${eur(ca)}</div></div>
    <div class="kpi"><div class="label">Équipe + frais</div><div class="value">${eur(team + other)}</div></div>
    <div class="kpi"><div class="label">Charges</div><div class="value">${eur(charges)}</div></div>
    <div class="kpi"><div class="label">Net / mois · sur ${v('months')} mois</div><div class="value pos">${eur(net)}</div><div class="sub">${eur(net * v('months'))} au total · ${v('n') * st.goal.videosPerClient} vidéos / ${v('n')} tournages par mois</div></div>
  </div>
  <p class="hint" style="margin-top:8px">Micro-entreprise : plafond de CA annuel pour les prestations de services ≈ 77 700 € ; au-delà de ≈ 37 500 €, la TVA devient due. À vérifier sur autoentrepreneur.urssaf.fr.</p>`;
}

/* ---------- Factures ---------- */

VIEWS.invoices = () => {
  const rows = S.db.invoices.slice().sort((a, b) => (b.number || '').localeCompare(a.number || ''));
  const total = i => (Number(i.qty) || 0) * (Number(i.unit) || 0);
  const paid = rows.filter(i => i.status === 'Payée');
  const waiting = rows.filter(i => ['Envoyée', 'En retard'].includes(i.status));
  return `
  <div class="grid g3">
    <div class="panel kpi"><div class="label">Encaissé</div><div class="value pos">${eur(sum(paid, total))}</div></div>
    <div class="panel kpi"><div class="label">En attente</div><div class="value">${eur(sum(waiting, total))}</div><div class="sub">${waiting.length} facture(s)</div></div>
    <div class="panel kpi"><div class="label">Brouillons</div><div class="value">${rows.filter(i => i.status === 'Brouillon').length}</div></div>
  </div>
  <div class="toolbar">${monthNav()}<button class="btn" data-act="genInvoices">Générer les factures de ${fmonth(S.month)} pour les clients actifs</button></div>
  ${!S.db.settings.company.siret ? '<div class="callout warn">⚠︎ Ajoute ton SIRET, ton adresse et ton IBAN dans <a href="#/settings">Réglages</a> : ils apparaissent automatiquement sur les factures.</div>' : ''}
  ${table('invoices', rows, [
    ['N°', i => `<strong>${esc(i.number)}</strong>`],
    ['Client', i => esc(clientName(i.clientId))],
    ['Mois', i => i.month ? fmonth(i.month) : '—'],
    ['Émise', i => fdate(i.date)],
    ['Échéance', i => `<span class="${i.status !== 'Payée' && i.due && i.due < todayISO() ? 'neg' : ''}">${fdate(i.due)}</span>`],
    ['Montant', i => eur(total(i), 2)],
    ['Statut', i => tag(i.status)],
  ], { empty: 'Aucune facture.', actions: i => `<button class="btn sm" data-act="printInvoice" data-id="${i.id}">Voir / PDF</button>${i.status !== 'Payée' ? ` <button class="btn sm" data-act="markPaid" data-id="${i.id}">Payée ✓</button>` : ''}` })}`;
};

VIEWS.invoice = id => {
  const i = find('invoices', id);
  if (!i) return '<div class="empty">Facture introuvable.</div>';
  const co = S.db.settings.company;
  const c = client(i.clientId) || {};
  const total = (Number(i.qty) || 0) * (Number(i.unit) || 0);
  const blank = v => v ? esc(v) : '<span class="fill">à compléter</span>';
  return `
  <div class="toolbar no-print"><a class="btn" href="#/invoices">← Factures</a><button class="btn primary" data-act="print">Imprimer / Enregistrer en PDF</button></div>
  <div class="doc">
    <div class="row-between">
      <div><h2>${esc(co.name)}</h2><div>${blank(co.owner)} — ${esc(co.legal)}</div><div>${blank(co.address)}</div><div>SIRET : ${blank(co.siret)}</div><div>${esc(co.email)} ${esc(co.phone)}</div></div>
      <div style="text-align:right"><h2>FACTURE</h2><div>N° <strong>${esc(i.number)}</strong></div><div>Date : ${fdate(i.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</div><div>Échéance : ${fdate(i.due, { day: '2-digit', month: '2-digit', year: 'numeric' })}</div></div>
    </div>
    <div style="margin-top:28px"><div class="muted">Facturé à</div><strong>${esc(c.name || '')}</strong><div>${esc(c.contact || '')}</div><div>${esc(c.city || '')}</div><div>${esc(c.email || '')}</div></div>
    <table>
      <thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire HT</th><th>Total HT</th></tr></thead>
      <tbody><tr><td>${esc(i.label)}${i.month ? `<div class="muted">Période : ${fmonth(i.month)}</div>` : ''}</td><td>${esc(i.qty)}</td><td>${eur(i.unit, 2)}</td><td>${eur(total, 2)}</td></tr></tbody>
    </table>
    <div class="total">Total à payer : ${eur(total, 2)}</div>
    <p class="muted" style="text-align:right">TVA non applicable, art. 293 B du CGI</p>
    <h4>Conditions de paiement</h4>
    <p>Paiement par virement à réception, au plus tard le ${fdate(i.due, { day: '2-digit', month: '2-digit', year: 'numeric' })}.<br>IBAN : ${blank(co.iban)} ${co.bic ? '— BIC : ' + esc(co.bic) : ''}</p>
    <p class="muted small">En cas de retard de paiement : pénalités au taux de 3 fois le taux d'intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce). Pas d'escompte pour paiement anticipé.</p>
  </div>`;
};

/* ---------- Dépenses ---------- */

VIEWS.expenses = () => {
  const rows = S.db.expenses.filter(e => (e.date || '').slice(0, 7) === S.month).sort((a, b) => b.date.localeCompare(a.date));
  const byCat = EXPENSE_CATS.map(c => [c, sum(rows.filter(e => e.category === c), e => e.amount)]).filter(x => x[1]);
  return `
  ${monthNav()}
  <div class="grid g2">
    <div class="panel kpi"><div class="label">Dépenses du mois</div><div class="value">${eur(sum(rows, e => e.amount), 2)}</div><div class="sub">Hors paiements d'équipe (calculés via les tournages)</div></div>
    <div class="panel"><h3>Par catégorie</h3>${byCat.map(([c, v]) => `<div class="list-item" style="margin-bottom:6px"><div class="grow">${c}</div><strong>${eur(v, 2)}</strong></div>`).join('') || '<span class="muted">—</span>'}</div>
  </div>
  ${table('expenses', rows, [
    ['Date', e => fdate(e.date)],
    ['Libellé', e => `<strong>${esc(e.label)}</strong>`],
    ['Catégorie', e => esc(e.category)],
    ['Client', e => e.clientId ? esc(clientName(e.clientId)) : '<span class="muted">Général</span>'],
    ['Montant', e => eur(e.amount, 2)],
  ], { empty: 'Aucune dépense ce mois-ci.' })}`;
};

/* ---------- Inès (Novia Influence) ---------- */

const INES_FIELDS = [
  ['positioning', 'Positionnement', 'En une phrase : qui est Inès et pourquoi on la suit ?'],
  ['image', 'Image à renvoyer', 'Ce que les gens doivent penser en voyant son contenu.'],
  ['audience', 'Public cible', 'Âge, ville, centres d\'intérêt…'],
  ['values', 'Valeurs', ''],
  ['visual', 'Identité visuelle & style', 'Couleurs, tenues, lieux, montage…'],
  ['tone', 'Ton & ligne éditoriale', ''],
  ['pillars', 'Piliers de contenu', 'Ex : motivation, lifestyle, food, coulisses…'],
  ['brands', 'Types de marques visées', ''],
  ['rates', 'Grille tarifaire', 'Story, post, TikTok, UGC, pack…'],
  ['audienceGoal', 'Objectifs d\'audience', 'Ex : 10k abonnés TikTok d\'ici mars'],
];
const BILAL_FIELDS = [
  ['role', 'Son rôle exact', ''],
  ['managed', 'Ce que Novia gère pour lui', ''],
  ['positioning', 'Identité & positionnement', 'À définir AVANT de contacter des sponsors.'],
  ['audience', 'Son audience', 'Plateformes, abonnés, profil du public'],
  ['value', 'Ce qu\'il apporte aux marques', ''],
  ['contents', 'Contenus proposés', 'Vidéos de motivation, shootings…'],
  ['counterparts', 'Contreparties possibles pour sponsors', ''],
  ['remuneration', 'Rémunération / commission Novia', ''],
  ['responsibilities', 'Responsabilités de chacun', ''],
];

function profileForm(key, fields) {
  const data = S.db.settings[key] || {};
  const filled = fields.filter(([k]) => (data[k] || '').trim()).length;
  return `<div class="panel">
    <h3>Fiche d'identité <span class="muted small">${filled}/${fields.length} complétés</span></h3>
    <div class="progress" style="margin:-4px 0 14px"><div style="width:${filled / fields.length * 100}%"></div></div>
    <form class="form-grid" data-profile="${key}">
      ${fields.map(([k, l, h]) => `<label>${l}<textarea name="${k}" rows="2" placeholder="${esc(h)}">${esc(data[k])}</textarea></label>`).join('')}
      <div class="form-actions wide"><button class="btn primary">Enregistrer la fiche</button></div>
    </form>
  </div>`;
}

VIEWS.ines = () => {
  const cs = S.db.collabs;
  const won = cs.filter(c => ['Confirmée', 'En production', 'Livrée', 'Payée'].includes(c.status));
  const tasks = S.db.tasks.filter(t => t.pole === 'Influence Inès').sort((a, b) => (a.status === 'Fait') - (b.status === 'Fait') || a.priority - b.priority);
  return `
  <div class="grid g4">
    <div class="panel kpi"><div class="label">Collabs signées</div><div class="value">${won.length}</div><div class="sub">${cs.filter(c => c.status === 'Prospect' || c.status === 'Contactée').length} marque(s) en prospection</div></div>
    <div class="panel kpi"><div class="label">Montant négocié</div><div class="value">${eur(sum(won, c => c.amount))}</div></div>
    <div class="panel kpi hero"><div class="label">Part Novia</div><div class="value">${eur(sum(won, collabNovia))}</div><div class="sub">Commission par défaut : ${S.db.settings.inesCommission} %</div></div>
    <div class="panel kpi"><div class="label">Paiements en attente</div><div class="value">${eur(sum(won.filter(c => c.payment === 'En attente'), c => c.amount))}</div></div>
  </div>
  <div class="panel">
    <h3>Collaborations & marques ${btnNew('collabs', 'Collab / marque')}</h3>
    ${table('collabs', cs.slice().sort((a, b) => COLLAB_STATUS.indexOf(a.status) - COLLAB_STATUS.indexOf(b.status)), [
      ['Marque', c => `<strong>${esc(c.brand)}</strong><div class="muted small">${esc(c.type || '')}</div>`],
      ['Statut', c => tag(c.status)],
      ['Montant', c => eur(c.amount)],
      ['Part Novia', c => `${eur(collabNovia(c))} <span class="muted small">(${c.commission || 0} %)</span>`],
      ['Part Inès', c => eur((Number(c.amount) || 0) - collabNovia(c))],
      ['Deadline', c => fdate(c.due)],
      ['Paiement', c => tag(c.payment)],
      ['Contenus', c => `<div class="clamp muted">${esc(c.deliverables)}</div>`],
    ], { empty: 'Aucune collab. Commence par lister les marques à contacter (statut « Prospect »).' })}
  </div>
  <div class="grid g2">
    ${profileForm('ines', INES_FIELDS)}
    <div class="panel"><h3>Construire l'image d'Inès ${btnNew('tasks', 'Étape', { pole: 'Influence Inès', assignee: 'moi' })}</h3><div class="list">${tasks.map(taskRow).join('')}</div>
      <p class="muted small" style="margin-top:12px">Pense à l'<a href="#/documents" data-act="docFor" data-type="ines">accord de gestion Inès ↔ Novia</a> avant la première collab.</p></div>
  </div>`;
};

/* ---------- Bilal ---------- */

VIEWS.bilal = () => {
  const sp = S.db.sponsors;
  const goal = S.db.settings.bilalSponsorGoal;
  const signed = sp.filter(s => s.status === 'Signé').length;
  const filled = BILAL_FIELDS.filter(([k]) => (S.db.settings.bilal?.[k] || '').trim()).length;
  const tasks = S.db.tasks.filter(t => t.pole === 'Bilal').sort((a, b) => (a.status === 'Fait') - (b.status === 'Fait') || a.priority - b.priority);
  return `
  <div class="callout warn">Priorité 10 — ne pas contacter de sponsors au hasard : d'abord compléter la fiche (positionnement + valeur apportée). ${filled < 5 ? `Fiche complétée à ${Math.round(filled / BILAL_FIELDS.length * 100)} %.` : '✓ Fiche bien avancée, tu peux démarcher.'}</div>
  <div class="grid g3">
    <div class="panel kpi"><div class="label">Objectif sponsors</div><div class="value">${signed} / ${goal}</div><div class="progress"><div style="width:${goal ? Math.min(100, signed / goal * 100) : 0}%"></div></div></div>
    <div class="panel kpi"><div class="label">Sponsors ciblés</div><div class="value">${sp.length}</div><div class="sub">${sp.filter(s => ['Contacté', 'Discussion'].includes(s.status)).length} en discussion</div></div>
    <div class="panel kpi"><div class="label">Montant visé</div><div class="value">${eur(sum(sp.filter(s => s.status !== 'Refus'), s => s.target))}</div></div>
  </div>
  <div class="grid g2">
    ${profileForm('bilal', BILAL_FIELDS)}
    <div class="panel"><h3>Feuille de route ${btnNew('tasks', 'Étape', { pole: 'Bilal', assignee: 'moi', priority: 3 })}</h3><div class="list">${tasks.map(taskRow).join('')}</div></div>
  </div>
  <div class="panel">
    <h3>Sponsors à cibler ${btnNew('sponsors', 'Sponsor')}</h3>
    ${table('sponsors', sp, [
      ['Marque', s => `<strong>${esc(s.brand)}</strong><div class="muted small">${esc(s.sector || '')}</div>`],
      ['Statut', s => tag(s.status)],
      ['Montant visé', s => eur(s.target)],
      ['Pourquoi', s => `<div class="clamp muted">${esc(s.why)}</div>`],
      ['Contreparties', s => `<div class="clamp muted">${esc(s.counterpart)}</div>`],
    ], { empty: 'Aucun sponsor listé.' })}
  </div>`;
};

/* ---------- Documents (contrats) ---------- */

VIEWS.documents = () => {
  const d = S.doc;
  const st = S.db.settings;
  const co = st.company;
  const f = v => v ? esc(v) : '<span class="fill">__________</span>';
  let picker = '', body = '';

  if (d.type === 'client') {
    const c = client(d.ref) || S.db.clients[0] || {};
    picker = `<select data-change="docRef">${S.db.clients.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
    const total = (Number(c.price) || 0) * (Number(c.months) || 0);
    body = `
      <h2>Contrat de prestation — création de contenu vidéo</h2>
      <p class="muted">Entre les soussignés :</p>
      <p><strong>${esc(co.name)}</strong>, ${esc(co.legal)}, représentée par ${f(co.owner)}, SIRET ${f(co.siret)}, domiciliée ${f(co.address)}, ci-après « le Prestataire » ;</p>
      <p>et <strong>${f(c.name)}</strong>, situé à ${f(c.city)}, représenté par ${f(c.contact)}, ci-après « le Client ».</p>
      <h4>Article 1 — Objet</h4>
      <p>Le Prestataire réalise pour le Client des vidéos au format court destinées aux réseaux sociaux (TikTok, Instagram Reels, YouTube Shorts) : conception des idées et scripts, tournage, montage et livraison.</p>
      <h4>Article 2 — Durée et engagement</h4>
      <p>Le contrat est conclu pour une durée ferme de <strong>${f(c.months)} mois</strong> à compter du ${f(c.start ? fdate(c.start, { day: 'numeric', month: 'long', year: 'numeric' }) : '')}. À son terme, il pourra être renouvelé par accord écrit des parties.</p>
      <h4>Article 3 — Contenu de la prestation</h4>
      <ul>
        <li><strong>${f(c.videos)} vidéos par mois</strong>, livrées montées et prêtes à publier ;</li>
        <li>un tournage mensuel d'environ une demi-journée (un après-midi) dans les locaux du Client ou un lieu convenu ;</li>
        <li>proposition des idées et scripts avant chaque tournage, validés par le Client ;</li>
        <li>mobilisation de talents et/ou figurants selon les concepts retenus, à la charge du Prestataire.</li>
      </ul>
      <h4>Article 4 — Organisation du tournage</h4>
      <p>La date du tournage est fixée d'un commun accord au moins 7 jours à l'avance. Le Client s'engage à rendre les lieux accessibles, à fournir les produits nécessaires et à désigner un interlocuteur présent.</p>
      <h4>Article 5 — Livraison et retouches</h4>
      <p>Les vidéos sont livrées dans un délai de <strong>${f(st.delivery.days)} jours</strong> après le tournage. Chaque vidéo inclut <strong>${f(st.delivery.revisions)} série(s) de retouches</strong> demandées dans les 5 jours suivant la livraison. Au-delà, les modifications supplémentaires peuvent être facturées.</p>
      <h4>Article 6 — Prix et paiement</h4>
      <p>Le prix est de <strong>${eur(c.price)} HT par mois</strong>, soit ${eur(total)} HT sur la durée d'engagement. TVA non applicable, art. 293 B du CGI. Une facture est émise au début de chaque mois ; elle est payable par virement sous 15 jours. Tout retard entraîne les pénalités légales et une indemnité forfaitaire de 40 € pour frais de recouvrement.</p>
      <h4>Article 7 — Annulation et report</h4>
      <p>Un tournage peut être reporté sans frais s'il est annulé au moins <strong>${f(st.delivery.rescheduleHours)} heures</strong> à l'avance. En cas d'annulation plus tardive ou d'absence du Client, le tournage est considéré comme réalisé et les frais engagés (équipe, déplacement) restent dus. Un report à l'initiative du Prestataire est reprogrammé sans frais. L'engagement de ${f(c.months)} mois ne peut être résilié avant son terme, sauf manquement grave de l'une des parties non corrigé 15 jours après mise en demeure.</p>
      <h4>Article 8 — Droits d'utilisation</h4>
      <p>Après paiement complet, le Client peut librement utiliser les vidéos livrées sur ses propres supports de communication. Le Prestataire peut présenter les vidéos dans son portfolio, sauf refus écrit du Client. Les rushes restent la propriété du Prestataire.</p>
      <h4>Article 9 — Droit à l'image</h4>
      <p>Le Prestataire obtient l'autorisation des talents et figurants apparaissant dans les vidéos. Le Client obtient celle de son personnel et de ses clients filmés à sa demande.</p>
      <p style="margin-top:18px">Fait à ${f('')}, le ${f('')}, en deux exemplaires.</p>
      <div class="sign"><div>Le Prestataire<br><span class="muted">« Lu et approuvé », signature</span></div><div>Le Client<br><span class="muted">« Lu et approuvé », signature</span></div></div>`;
  } else if (d.type === 'ines') {
    body = `
      <h2>Accord de gestion de talent — Inès</h2>
      <p>Entre <strong>${esc(co.name)}</strong>, représentée par ${f(co.owner)}, SIRET ${f(co.siret)}, ci-après « l'Agence » ;</p>
      <p>et <strong>Inès ${f('')}</strong>, domiciliée ${f('')}, ci-après « le Talent ».</p>
      <h4>1 — Mission de l'Agence</h4>
      <ul><li>rechercher et contacter des marques pour des collaborations ;</li><li>négocier les tarifs et conditions ;</li><li>organiser les campagnes et assurer le suivi avec les marques ;</li><li>accompagner le Talent dans la construction de son image (positionnement, contenus, media kit).</li></ul>
      <h4>2 — Exclusivité</h4>
      <p>${f('Exclusive / non exclusive')} pour les collaborations commerciales, pendant la durée de l'accord.</p>
      <h4>3 — Rémunération de l'Agence</h4>
      <p>L'Agence perçoit une commission de <strong>${f(st.inesCommission)} %</strong> sur le montant HT de chaque collaboration trouvée ou négociée par elle. Selon le cas, la marque paie l'Agence qui reverse la part du Talent sous ${f('15')} jours après encaissement, ou paie le Talent qui reverse la commission à l'Agence dans le même délai.</p>
      <h4>4 — Engagements du Talent</h4>
      <p>Le Talent respecte les contenus et délais validés avec les marques, et ne négocie pas directement avec une marque présentée par l'Agence sans l'en informer.</p>
      <h4>5 — Tournages Novia Production</h4>
      <p>Les participations du Talent aux tournages Novia Production pour les clients de l'Agence sont rémunérées séparément, ${f(person('ines').rate + ' €')} par tournage, et ne relèvent pas du présent accord.</p>
      <h4>6 — Durée</h4>
      <p>L'accord est conclu pour ${f('12 mois')}, renouvelable. Chaque partie peut y mettre fin avec un préavis de ${f('1 mois')}. Les commissions sur les collaborations signées avant la fin restent dues.</p>
      <p style="margin-top:18px">Fait à ${f('')}, le ${f('')}.</p>
      <div class="sign"><div>L'Agence</div><div>Le Talent</div></div>`;
  } else {
    const p = person(d.ref && d.ref !== 'moi' ? d.ref : 'ines');
    picker = `<select data-change="docRef">${team().filter(x => x.rate).map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
    body = `
      <h2>Contrat de prestation — intervention sur tournages</h2>
      <p>Entre <strong>${esc(co.name)}</strong>, représentée par ${f(co.owner)}, SIRET ${f(co.siret)}, ci-après « l'Agence » ;</p>
      <p>et <strong>${esc(p.name)} ${f('')}</strong>, ${f('statut : auto-entrepreneur, SIRET …')}, ci-après « l'Intervenant ».</p>
      <h4>1 — Objet</h4><p>L'Intervenant participe, à la demande de l'Agence, à des tournages de vidéos pour ses clients (jeu, figuration, animation). Chaque tournage est proposé à l'avance et l'Intervenant est libre de l'accepter.</p>
      <h4>2 — Rémunération</h4><p><strong>${eur(p.rate)} par tournage</strong> (environ un après-midi), payés sous ${f('7')} jours sur facture ou note de l'Intervenant.</p>
      <h4>3 — Droit à l'image</h4><p>L'Intervenant autorise l'Agence et ses clients à diffuser les vidéos où il apparaît, sur les réseaux sociaux et supports de communication, pour une durée de ${f('5 ans')}, sans rémunération supplémentaire.</p>
      <h4>4 — Annulation</h4><p>Un tournage annulé moins de ${f(st.delivery.rescheduleHours)} h à l'avance par l'Agence est ${f('payé à 50 %')}.</p>
      <h4>5 — Confidentialité</h4><p>L'Intervenant ne publie pas les contenus avant leur diffusion par le client.</p>
      <p style="margin-top:18px">Fait à ${f('')}, le ${f('')}.</p>
      <div class="sign"><div>L'Agence</div><div>L'Intervenant</div></div>`;
  }

  return `
  <div class="toolbar no-print">
    <select data-change="docType">${[['client', 'Contrat client (4 mois)'], ['ines', 'Accord de gestion Inès'], ['crew', 'Contrat intervenant tournage']].map(([v, l]) => `<option value="${v}" ${v === d.type ? 'selected' : ''}>${l}</option>`).join('')}</select>
    ${picker}
    <button class="btn primary" data-act="print">Imprimer / PDF</button>
  </div>
  <div class="callout no-print">Modèles pré-remplis avec tes réglages et la fiche client (les zones <span class="fill" style="color:#111">jaunes</span> sont à compléter). Fais-les relire par un juriste ou ton expert-comptable avant la première signature. Pour Inès : un statut d'auto-entrepreneuse (prestation) est plus simple qu'un contrat de salariée pour une micro-entreprise.</div>
  <div class="doc">${body}</div>`;
};

/* ---------- Messages du site ---------- */

VIEWS.messages = () => table('messages', S.db.messages, [
  ['Reçu', m => fdate(m.createdAt?.slice(0, 10))],
  ['Nom', m => `<strong>${esc(m.name)}</strong><div class="muted small">${esc(m.business)}</div>`],
  ['Contact', m => `${esc(m.email)}<div class="muted small">${esc(m.phone)}</div>`],
  ['Demande', m => `${esc(m.service)}<div class="clamp muted">${esc(m.message)}</div>`],
  ['Statut', m => tag(m.status)],
], { empty: 'Aucun message. Les demandes du formulaire de contact du site arrivent ici.', actions: m => `<button class="btn sm" data-act="msgToLead" data-id="${m.id}">→ Prospect</button>` });

/* ---------- Réglages ---------- */

VIEWS.settings = () => {
  const st = S.db.settings;
  const co = st.company;
  const inp = (name, label, val, type = 'text') => `<label>${label}<input name="${name}" type="${type}" ${type === 'number' ? 'step="any"' : ''} value="${esc(val)}"></label>`;
  return `
  <form class="panel" data-settings="company">
    <h3>Entreprise (apparaît sur factures & contrats)</h3>
    <div class="form-grid">
      ${inp('name', 'Nom commercial', co.name)}${inp('owner', 'Ton nom et prénom', co.owner)}
      ${inp('legal', 'Forme', co.legal)}${inp('siret', 'SIRET', co.siret)}
      ${inp('address', 'Adresse', co.address)}${inp('email', 'Email', co.email)}
      ${inp('phone', 'Téléphone', co.phone)}${inp('iban', 'IBAN', co.iban)}${inp('bic', 'BIC', co.bic)}
    </div>
    <div class="form-actions"><button class="btn primary">Enregistrer</button></div>
  </form>
  <form class="panel" data-settings="goal">
    <h3>Objectifs & offre</h3>
    <div class="form-grid">
      ${inp('contracts', 'Contrats visés', st.goal.contracts, 'number')}${inp('deadline', 'Date limite', st.goal.deadline, 'date')}
      ${inp('monthlyPrice', 'Prix mensuel standard (€)', st.goal.monthlyPrice, 'number')}${inp('videosPerClient', 'Vidéos / mois', st.goal.videosPerClient, 'number')}
      ${inp('months', 'Engagement (mois)', st.goal.months, 'number')}
    </div>
    <div class="form-actions"><button class="btn primary">Enregistrer</button></div>
  </form>
  <form class="panel" data-settings="terms">
    <h3>Conditions, taux & commissions</h3>
    <div class="form-grid">
      ${inp('days', 'Délai de livraison (jours)', st.delivery.days, 'number')}${inp('revisions', 'Retouches incluses / vidéo', st.delivery.revisions, 'number')}
      ${inp('rescheduleHours', 'Report gratuit si prévenu (heures avant)', st.delivery.rescheduleHours, 'number')}
      ${inp('urssafRate', 'Cotisations URSSAF (%)', st.urssafRate, 'number')}
      ${inp('taxRate', 'Impôt — versement libératoire (%)', st.taxRate, 'number')}
      ${inp('inesCommission', 'Commission Novia sur collabs Inès (%)', st.inesCommission, 'number')}
      ${inp('bilalSponsorGoal', 'Objectif sponsors Bilal', st.bilalSponsorGoal, 'number')}
    </div>
    <p class="hint">Le taux URSSAF dépend de ta catégorie d'activité (BIC prestations ≈ 21,2 %, BNC plus élevé) : vérifie-le sur autoentrepreneur.urssaf.fr une fois l'entreprise créée.</p>
    <div class="form-actions"><button class="btn primary">Enregistrer</button></div>
  </form>
  <form class="panel" data-settings="team">
    <h3>Équipe & tarifs par tournage</h3>
    <div class="list">${team().map((p, i) => `<div class="list-item">
      <input type="color" name="color${i}" value="${esc(p.color)}" style="width:44px;padding:2px">
      <input name="name${i}" value="${esc(p.name)}">
      <input name="rate${i}" type="number" value="${esc(p.rate)}" style="max-width:120px"> <span class="muted">€</span>
    </div>`).join('')}</div>
    <div class="form-actions"><button class="btn primary">Enregistrer</button></div>
  </form>
  <div class="grid g2">
    <form class="panel" id="pwd-form">
      <h3>Mot de passe admin</h3>
      <div class="form-grid">
        <label>Actuel<input type="password" name="current" autocomplete="current-password"></label>
        <label>Nouveau (8+ caractères)<input type="password" name="next" autocomplete="new-password"></label>
      </div>
      <div class="form-actions"><button class="btn primary">Changer</button></div>
    </form>
    <div class="panel">
      <h3>Sauvegarde</h3>
      <p class="muted">Télécharge régulièrement une copie de toutes tes données.</p>
      <div class="toolbar" style="margin-top:12px">
        <a class="btn" href="/api/export">Télécharger la sauvegarde</a>
        <label class="btn" style="display:inline-flex">Restaurer…<input type="file" id="import-file" accept=".json" hidden></label>
      </div>
    </div>
  </div>`;
};

/* =====================================================================
   Routage, rendu et interactions
   ===================================================================== */

const TITLES = Object.fromEntries(NAV.flatMap(g => g[1]).map(([k, , l]) => [k, l]));
const ACTIONS_BAR = {
  dashboard: () => `${btnNew('tasks', 'Tâche')}${btnNew('events', 'Événement')}`,
  planning: () => `${btnNew('events', 'Événement')}${btnNew('shoots', 'Tournage')}`,
  tasks: () => btnNew('tasks', 'Tâche'),
  clients: () => btnNew('clients', 'Client'),
  leads: () => btnNew('leads', 'Prospect'),
  shoots: () => btnNew('shoots', 'Tournage'),
  videos: () => btnNew('videos', 'Vidéo', { month: S.month }),
  finance: () => btnNew('expenses', 'Dépense'),
  invoices: () => btnNew('invoices', 'Facture'),
  expenses: () => btnNew('expenses', 'Dépense'),
};

function route() {
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: VIEWS[name] ? name : 'dashboard', arg };
}

function renderMenu(active) {
  const badges = { messages: S.db.messages.filter(m => m.status === 'Nouveau').length, tasks: S.db.tasks.filter(t => t.status !== 'Fait' && t.due && t.due < todayISO()).length };
  document.getElementById('menu').innerHTML = NAV.map(([g, items]) => `
    ${g ? `<div class="nav-group">${g}</div>` : ''}
    ${items.map(([k, ico, label]) => `<a class="nav-item ${k === active ? 'active' : ''}" href="#/${k}"><span class="ico">${ico}</span>${label}${badges[k] ? `<span class="badge">${badges[k]}</span>` : ''}</a>`).join('')}
  `).join('');
}

function render() {
  const { name, arg } = route();
  const menuKey = name === 'invoice' ? 'invoices' : name;
  renderMenu(menuKey);
  document.getElementById('page-title').textContent = name === 'invoice' ? 'Facture' : TITLES[name];
  document.getElementById('page-actions').innerHTML = (ACTIONS_BAR[name] || (() => ''))();
  document.getElementById('view').innerHTML = VIEWS[name](arg);
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'finance') runSimu();
}

const ACTIONS = {
  new: el => openForm(el.dataset.col, null, el.dataset.preset ? JSON.parse(el.dataset.preset) : {}),
  edit: el => openForm(el.dataset.col, find(el.dataset.col, el.dataset.id)),
  cell: el => openForm('events', null, { date: el.dataset.date, people: [el.dataset.person] }),
  week: el => { S.week = +el.dataset.d ? addDays(S.week, +el.dataset.d) : mondayOf(todayISO()); render(); },
  month: el => { S.month = addMonths(S.month, +el.dataset.d); render(); },
  clientView: el => { S.clientView = el.dataset.v; render(); },
  print: () => window.print(),
  printInvoice: el => { location.hash = '#/invoice/' + el.dataset.id; },
  docFor: (el, e) => { e.preventDefault(); S.doc = { type: el.dataset.type, ref: el.dataset.id || '' }; location.hash = '#/documents'; render(); },
  planShoot: el => { const c = client(el.dataset.id); openForm('shoots', null, { clientId: c.id, location: c.city }); },
  async markPaid(el) { await save('invoices', { id: el.dataset.id, status: 'Payée', paidAt: todayISO() }); toast('Facture payée ✓'); render(); },
  async genVideos(el) {
    const c = client(el.dataset.id);
    const month = route().name === 'videos' ? S.month : (c.start && c.start.slice(0, 7) > S.month ? c.start.slice(0, 7) : S.month);
    const existing = S.db.videos.filter(v => v.clientId === c.id && v.month === month).length;
    const n = (Number(c.videos) || 7) - existing;
    if (n <= 0) return toast(`Les ${c.videos} vidéos de ${fmonth(month)} existent déjà`);
    await save('videos', Array.from({ length: n }, (_, i) => ({ clientId: c.id, month, title: `Vidéo ${existing + i + 1} — idée à définir`, status: 'Idée' })));
    toast(`${n} vidéo(s) créées pour ${fmonth(month)}`);
    render();
  },
  async genInvoices() {
    const active = S.db.clients.filter(c => activeIn(c, S.month) && !S.db.invoices.some(i => i.clientId === c.id && i.month === S.month));
    if (!active.length) return toast('Aucune facture à créer (clients signés actifs ce mois déjà facturés)');
    for (const c of active) {
      const date = S.month + '-01' > todayISO() ? S.month + '-01' : todayISO();
      await save('invoices', { number: await nextInvoiceNumber(), clientId: c.id, month: S.month, date, due: addDays(date, 15), status: 'Brouillon', label: `Forfait création de contenu vidéo — ${c.videos} vidéos (tournage, montage, livraison)`, qty: 1, unit: Number(c.price) || 0 });
    }
    toast(`${active.length} facture(s) créée(s)`);
    render();
  },
  async convertLead(el) {
    const l = find('leads', el.dataset.id);
    const c = await save('clients', { name: l.name, city: l.city, sector: l.sector, phone: l.phone, contact: l.handle, status: 'Négociation', price: S.db.settings.goal.monthlyPrice, videos: S.db.settings.goal.videosPerClient, months: S.db.settings.goal.months, start: '', notes: l.notes });
    await save('leads', { id: l.id, status: 'Signé' });
    toast(`${c.name} ajouté aux clients`);
    location.hash = '#/clients';
  },
  async msgToLead(el) {
    const m = find('messages', el.dataset.id);
    await save('leads', { name: m.business || m.name, city: m.city, channel: 'Site web', handle: [m.name, m.email].filter(Boolean).join(' — '), phone: m.phone, status: 'Contacté', next: todayISO(), notes: m.message });
    await save('messages', { id: m.id, status: 'Traité' });
    toast('Ajouté à la prospection');
    render();
  },
};

const CHANGES = {
  async toggleTask(el) { await save('tasks', { id: el.dataset.id, status: el.checked ? 'Fait' : 'À faire' }); render(); },
  async videoStatus(el) { await save('videos', { id: el.dataset.id, status: el.value }); toast('Statut mis à jour'); render(); },
  taskPole(el) { S.taskPole = el.value; render(); },
  taskStatus(el) { S.taskStatus = el.value; render(); },
  docType(el) { S.doc = { type: el.value, ref: '' }; render(); },
  docRef(el) { S.doc.ref = el.value; render(); },
};

document.addEventListener('click', e => {
  if (e.target.closest('[data-change], input, select, textarea, label')) return;
  const el = e.target.closest('[data-act]');
  if (!el) return;
  e.stopPropagation();
  if (el.dataset.act === 'cell' && e.target !== el) return;
  Promise.resolve(ACTIONS[el.dataset.act](el, e)).catch(err => toast(err.message));
});

document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el) Promise.resolve(CHANGES[el.dataset.change](el)).catch(err => toast(err.message));
  if (e.target.closest('#simu')) runSimu();
  if (e.target.id === 'import-file') importBackup(e.target.files[0]);
});
document.addEventListener('input', e => { if (e.target.closest('#simu')) runSimu(); });

document.addEventListener('submit', async e => {
  const form = e.target;
  if (form.id === 'entity-form') return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.profile) {
      await saveSettings({ [form.dataset.profile]: { ...S.db.settings[form.dataset.profile], ...fd } });
    } else if (form.dataset.settings === 'company') {
      await saveSettings({ company: { ...S.db.settings.company, ...fd } });
    } else if (form.dataset.settings === 'goal') {
      await saveSettings({ goal: { contracts: +fd.contracts, deadline: fd.deadline, monthlyPrice: +fd.monthlyPrice, videosPerClient: +fd.videosPerClient, months: +fd.months } });
    } else if (form.dataset.settings === 'terms') {
      await saveSettings({ delivery: { days: +fd.days, revisions: +fd.revisions, rescheduleHours: +fd.rescheduleHours }, urssafRate: +fd.urssafRate, taxRate: +fd.taxRate, inesCommission: +fd.inesCommission, bilalSponsorGoal: +fd.bilalSponsorGoal });
    } else if (form.dataset.settings === 'team') {
      await saveSettings({ team: team().map((p, i) => ({ ...p, name: fd['name' + i], rate: +fd['rate' + i], color: fd['color' + i] })) });
    } else if (form.id === 'pwd-form') {
      await api('POST', '/api/password', fd);
      form.reset();
    }
    toast('Enregistré');
    render();
  } catch (err) { toast(err.message); }
});

// Glisser-déposer du pipeline clients
document.addEventListener('dragstart', e => { const id = e.target.dataset?.drag; if (id) e.dataTransfer.setData('text/plain', id); });
document.addEventListener('dragover', e => { const col = e.target.closest('[data-drop]'); if (col) { e.preventDefault(); col.classList.add('over'); } });
document.addEventListener('dragleave', e => e.target.closest?.('[data-drop]')?.classList.remove('over'));
document.addEventListener('drop', async e => {
  const col = e.target.closest('[data-drop]');
  if (!col) return;
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  const patch = { id, status: col.dataset.drop };
  if (patch.status === 'Signé' && !client(id).start) patch.start = todayISO();
  await save('clients', patch);
  toast(`${clientName(id)} → ${col.dataset.drop}`);
  render();
});

async function importBackup(file) {
  if (!file || !confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')) return;
  try {
    await api('POST', '/api/import', JSON.parse(await file.text()));
    S.db = await api('GET', '/api/data');
    toast('Sauvegarde restaurée');
    render();
  } catch (err) { toast(err.message); }
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('logout').addEventListener('click', async () => { await api('POST', '/api/logout'); location.href = '/admin/login.html'; });
addEventListener('hashchange', render);

(async () => {
  S.db = await api('GET', '/api/data');
  render();
})();
