# Novia Agency — site + espace admin

Deux faces :

- **Site public** (`/`) : présentation de l'agence (Novia Production + Novia Influence), méthode, formule, formulaire de contact.
- **Espace admin** (`/admin`, protégé par identifiant / mot de passe) : le poste de pilotage de toutes les activités.

## Ce que contient l'admin

| Section | À quoi ça sert |
|---|---|
| Tableau de bord | Contrats signés / objectif 9, compte à rebours au 1er novembre, CA mensuel et engagé, priorités, 7 prochains jours, production du mois, influence |
| Planning équipe | Emploi du temps de la semaine pour Moi, Inès, Zizou, Youssef (tournages, rendez-vous, tâches, deadlines de collabs) — clique dans une case pour ajouter |
| Tâches & démarches | Toutes les démarches (auto-entreprise, banque, contrats…) classées par pôle et priorité |
| Clients & pipeline | Kanban Prospect → Négociation → Essai → À signer → Signé (glisser-déposer), boutons « + Tournage », « + 7 vidéos », « Contrat » |
| Prospection | Liste des commerces à contacter, relances, conversion en client |
| Tournages | Date, équipe, coût calculé automatiquement (Inès 150 €, Zizou 80 €, Youssef 80 €), figurants, scripts |
| Vidéos | Suivi des 7 vidéos par client et par mois (Idée → Script → Tourné → Montage → Retouches → Livré) |
| Rentabilité | Marge réelle par client et par mois (équipe, frais, URSSAF, impôt), ce que tu dois à chaque membre, simulateur « 9 clients » |
| Factures | Génération des factures du mois pour les clients actifs, numérotation automatique, version imprimable / PDF |
| Dépenses | Montage, déplacements, matériel, logiciels… rattachés ou non à un client |
| Inès | Collabs (montant, part Novia, part Inès, deadline, paiement), fiche d'image de marque, étapes |
| Bilal | Fiche de clarification (rôle, positionnement, valeur), feuille de route, sponsors ciblés + objectif |
| Contrats & documents | Contrat client 4 mois, accord de gestion Inès, contrat intervenant — pré-remplis, imprimables |
| Messages du site | Les demandes du formulaire de contact, convertibles en prospects |
| Réglages | Entreprise (SIRET, IBAN…), objectifs, taux, équipe & tarifs, mot de passe, sauvegarde / restauration |

Au premier lancement, les données de départ sont créées : Mcrousty (Castres), Odwich (Perpignan), le tournage Mcrousty, les 7 vidéos d'octobre et toutes les démarches.

## Lancer en local

```bash
npm install
cp .env.example .env   # puis choisis ton mot de passe admin
npm start
```

Site : http://localhost:3000 — Admin : http://localhost:3000/admin

Sans `ADMIN_PASSWORD`, un mot de passe est généré et affiché dans la console au premier démarrage. Tu peux le changer ensuite dans **Réglages**.

## Mettre en ligne

Il faut un hébergeur Node.js avec un **disque persistant** (les données sont dans `data/db.json`) : Render (avec « Disk »), Railway (avec « Volume »), ou un petit VPS.

1. Déploie ce dépôt, commande de démarrage : `npm start`.
2. Variables d'environnement : `ADMIN_USER`, `ADMIN_PASSWORD`, `NODE_ENV=production`, `DATA_DIR=<chemin du disque persistant>`.
3. Pense à télécharger régulièrement une sauvegarde depuis **Réglages > Sauvegarde**.

> Les modèles de contrats et de factures sont une base de travail : fais-les relire par un juriste ou un expert-comptable avant la première signature.
