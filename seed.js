'use strict';

// Données de départ : tout ce qui a été décrit sur les activités Novia.
// Ce fichier ne sert qu'au premier lancement (quand data/db.json n'existe pas).

const crypto = require('crypto');
const id = () => crypto.randomBytes(6).toString('hex');
const now = () => new Date().toISOString();

const settings = {
  company: {
    name: 'Novia Agency',
    owner: '',
    legal: 'Entrepreneur individuel (micro-entreprise)',
    siret: '',
    address: '',
    email: '',
    phone: '',
    iban: '',
    bic: '',
  },
  goal: { contracts: 9, deadline: '2026-11-01', monthlyPrice: 550, videosPerClient: 7, months: 4 },
  team: [
    { id: 'moi', name: 'Moi', rate: 0, color: '#c8ff3d' },
    { id: 'ines', name: 'Inès', rate: 150, color: '#ff6fb5' },
    { id: 'zizou', name: 'Zizou', rate: 80, color: '#5ec8ff' },
    { id: 'youssef', name: 'Youssef', rate: 80, color: '#ffb547' },
  ],
  urssafRate: 21.2,
  taxRate: 1.7,
  inesCommission: 20,
  bilalSponsorGoal: 5,
  delivery: { days: 7, revisions: 2, rescheduleHours: 48 },
  invoiceCounter: 0,
  ines: {
    positioning: '', audience: '', image: '', values: '', visual: '', tone: '',
    pillars: '', brands: '', audienceGoal: '', rates: '',
  },
  bilal: {
    role: '', managed: '', positioning: '', audience: '', value: '', contents: '',
    counterparts: '', remuneration: '', responsibilities: '',
  },
};

function task(title, pole, priority, extra = {}) {
  return { id: id(), createdAt: now(), title, pole, priority, status: 'À faire', assignee: 'moi', due: '', notes: '', ...extra };
}

function build() {
  const mcrousty = {
    id: id(), createdAt: now(), name: 'Mcrousty', city: 'Castres', sector: 'Fast-food',
    contact: '', phone: '', email: '', status: 'À signer', price: 550, videos: 7, months: 4,
    start: '2026-10-01', notes: 'Client prévu pour début octobre. À caler : date de tournage, scripts, figurants, contrat 4 mois, facturation.',
  };
  const odwich = {
    id: id(), createdAt: now(), name: 'Odwich', city: 'Perpignan', sector: 'Restauration',
    contact: '', phone: '', email: '', status: 'Négociation', price: 550, videos: 7, months: 4,
    start: '', notes: '1 mois d\'essai déjà réalisé. Objectif : le faire repartir sur un engagement de 4 mois.',
  };

  const shoot = {
    id: id(), createdAt: now(), clientId: mcrousty.id, date: '2026-10-06', start: '14:00', end: '18:00',
    team: ['moi', 'ines', 'zizou'], status: 'À confirmer', location: 'Castres',
    extras: '', ideas: '', travel: 0, notes: 'Date à confirmer avec le client.',
  };

  const videos = Array.from({ length: 7 }, (_, i) => ({
    id: id(), createdAt: now(), clientId: mcrousty.id, month: '2026-10', title: `Vidéo ${i + 1} — idée à définir`,
    status: 'Idée', shootId: shoot.id, due: '', link: '', script: '',
  }));

  const tasks = [
    // 1. Officialiser Novia
    task('Créer l\'auto-entreprise (guichet unique INPI)', 'Structure', 1, { due: '2026-10-05' }),
    task('Ouvrir un compte bancaire dédié à l\'activité', 'Structure', 1, { due: '2026-10-08' }),
    task('Renseigner SIRET, adresse et IBAN dans Réglages (pour les factures)', 'Structure', 1),
    // 2. Contrats et factures
    task('Finaliser le modèle de contrat client (4 mois)', 'Structure', 1, { due: '2026-10-03' }),
    task('Préparer le contrat / accord d\'Inès', 'Structure', 1),
    task('Obtenir un premier exemplaire de contrat signé', 'Structure', 1),
    task('Valider le modèle de facture (Documents > Factures)', 'Structure', 1),
    task('Définir précisément les conditions de l\'offre (délais, retouches, report)', 'Structure', 1),
    // 3. Mcrousty
    task('Mcrousty : fixer la date du tournage', 'Production', 1, { due: '2026-10-02' }),
    task('Mcrousty : écrire les scripts et idées des 7 vidéos', 'Production', 1, { due: '2026-10-04' }),
    task('Mcrousty : trouver les figurants', 'Production', 2),
    task('Mcrousty : faire signer le contrat de 4 mois', 'Production', 1),
    task('Mcrousty : envoyer la première facture', 'Production', 2),
    // 4. Odwich
    task('Odwich : bilan du mois d\'essai + proposition 4 mois', 'Production', 1, { due: '2026-10-03' }),
    task('Odwich : relance et signature', 'Production', 1),
    // 5-6. Prospection
    task('Lister 40 commerces à prospecter (Castres, Perpignan, Toulouse…)', 'Prospection', 1),
    task('Envoyer 10 DM / messages de prospection par jour', 'Prospection', 1),
    task('Préparer une vidéo "portfolio" pour les prospects', 'Prospection', 2),
    // 7. Production
    task('Mettre en place le process : brief → script → tournage → montage → livraison', 'Production', 2),
    // 8-9. Inès
    task('Rédiger l\'accord de gestion (commission Novia) avec Inès', 'Influence Inès', 2),
    task('Définir le positionnement et le public d\'Inès', 'Influence Inès', 2),
    task('Créer l\'identité visuelle et la ligne éditoriale d\'Inès', 'Influence Inès', 3),
    task('Organiser un shooting photo pour Inès', 'Influence Inès', 3),
    task('Créer le media kit d\'Inès', 'Influence Inès', 3),
    task('Construire la grille tarifaire d\'Inès', 'Influence Inès', 3),
    task('Lister 30 marques à contacter pour Inès', 'Influence Inès', 3),
    // 10. Bilal
    task('Écrire à Bilal au sujet de l\'image à recréer', 'Bilal', 3),
    task('Clarifier le rôle de Bilal et ce que Novia gère pour lui', 'Bilal', 3),
    task('Définir le positionnement de Bilal avant tout contact sponsor', 'Bilal', 3),
    task('Construire l\'offre sponsor de Bilal (présentation, audience, contreparties)', 'Bilal', 3),
  ];

  return {
    settings: JSON.parse(JSON.stringify(settings)),
    clients: [mcrousty, odwich],
    shoots: [shoot],
    videos,
    expenses: [],
    invoices: [],
    leads: [],
    events: [],
    tasks,
    collabs: [],
    sponsors: [],
    messages: [],
  };
}

module.exports = { settings, build };
