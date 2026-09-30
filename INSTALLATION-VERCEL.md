# Mettre le site Novia en ligne sur Vercel

Le code est déjà sur GitHub (`118mediapro-netizen/novia-agency`). Vercel le déploie directement depuis là,
et chaque nouvelle modification poussée sur GitHub met le site à jour toute seule.

Sur Vercel, les fichiers ne sont pas conservés : les données (clients, factures, planning…) sont stockées
dans une base **Upstash Redis**. L'offre gratuite suffit largement.

## 1. Importer le projet

1. Va sur **vercel.com** et connecte-toi **avec GitHub**.
2. Clique sur **Add New… → Project**.
3. Choisis le dépôt **novia-agency**, puis **Import**.
   - Si le dépôt n'apparaît pas : clique sur « Adjust GitHub App Permissions » et autorise l'accès à `novia-agency`.
4. Ne change rien aux réglages (le fichier `vercel.json` s'en occupe), mais ouvre **Environment Variables** et ajoute :

   | Nom | Valeur |
   |---|---|
   | `ADMIN_USER` | ton identifiant admin (par ex. ton prénom) |
   | `ADMIN_PASSWORD` | un mot de passe solide (12 caractères ou plus) |

5. Clique sur **Deploy**. Le site public s'affiche déjà. L'admin affichera « Base de données non connectée »
   tant que l'étape 2 n'est pas faite : c'est normal.

## 2. Brancher la base de données (Upstash Redis)

1. Dans ton projet Vercel, ouvre l'onglet **Storage**.
2. Clique sur **Create Database** (ou « Browse Marketplace ») → choisis **Upstash** → **Redis** → offre **Free**.
   Région : **Frankfurt / Paris (eu-central / eu-west)**.
3. Clique sur **Connect** pour le relier au projet (coche Production, Preview et Development).
   Vercel ajoute tout seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. Onglet **Deployments** → sur le dernier déploiement, clique sur **⋯ → Redeploy**.

## 3. C'est en ligne

- Site public : `https://ton-projet.vercel.app`
- Admin : `https://ton-projet.vercel.app/admin/`. Connecte-toi avec `ADMIN_USER` / `ADMIN_PASSWORD`.

Au premier accès, les données de départ sont créées : Mcrousty, Odwich, le tournage, les vidéos d'octobre et les démarches.

## 4. Ton nom de domaine (facultatif)

Projet → **Settings → Domains** → ajoute ton domaine (par ex. `novia-agency.fr`), puis suis les instructions DNS
affichées. Si ton domaine est chez Hostinger : hPanel → Domaines → DNS, et ajoute les enregistrements indiqués par Vercel.

## À savoir

- **Changer le mot de passe** : Admin → Réglages. Le nouveau mot de passe remplace celui de `ADMIN_PASSWORD`.
- **Mot de passe oublié** : dans Upstash (Vercel → Storage → ta base → Open in Upstash → Data Browser),
  supprime la clé `novia:auth`. Le mot de passe redevient celui de `ADMIN_PASSWORD`. Tes données sont conservées.
- **Sauvegarde** : Admin → Réglages → « Télécharger la sauvegarde », à faire régulièrement.
- **Mise à jour du site** : toute modification poussée sur la branche principale du dépôt GitHub est redéployée automatiquement.
