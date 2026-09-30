# Mettre le site Novia en ligne sur Hostinger

Le fichier à utiliser : **`dist/novia-hostinger.zip`**.
Il fonctionne sur toutes les offres d'hébergement Hostinger (Premium, Business, Cloud), sans Node.js.

## Étapes

1. **hPanel → Sites web → ton domaine → Gérer.**
2. **Avancé → Configuration PHP** : choisis **PHP 8.1 ou plus** (8.2 ou 8.3 recommandé).
3. **Fichiers → Gestionnaire de fichiers**, puis ouvre le dossier **`public_html`**.
   - S'il contient un `default.php` ou un ancien site, supprime-le.
4. Clique sur **Importer** et envoie `novia-hostinger.zip`.
5. Fais un clic droit sur le zip → **Extraire** → dans `public_html` (pas dans un sous-dossier).
   Tu dois voir directement : `index.html`, `.htaccess`, `admin/`, `api/`, `css/`, `js/`, `private/`.
   Ensuite, supprime le zip.
6. **Sécurité → SSL** : vérifie que le certificat est actif et active **Forcer le HTTPS**.
7. Va sur **https://ton-domaine.fr/admin/** : au premier passage, la page te demande de **créer ton compte admin**
   (identifiant + mot de passe de 8 caractères minimum). Fais-le tout de suite après la mise en ligne.

C'est prêt. Le site public est sur `https://ton-domaine.fr`, l'admin sur `https://ton-domaine.fr/admin/`.

## À savoir

- Les fichiers `.htaccess` sont cachés par défaut dans le gestionnaire de fichiers. Ils sont bien là : ce sont eux qui
  font marcher l'admin et qui protègent le dossier `private/`.
- Tes données (clients, tournages, factures…) sont enregistrées dans `private/db.php`. **Ne supprime jamais le dossier
  `private/`**, et télécharge une sauvegarde régulièrement (Admin → Réglages → Sauvegarde).
- Pour **mettre à jour le site** plus tard, n'envoie que les dossiers `admin/`, `api/`, `css/`, `js/` et `index.html`,
  sans écraser `private/`.
- Mot de passe oublié : supprime `private/auth.php` dans le gestionnaire de fichiers, puis retourne sur `/admin/`
  pour recréer ton compte. Tes données sont conservées.
- Le site doit être à la racine du domaine (ou d'un sous-domaine, par exemple `admin.ton-domaine.fr`), pas dans
  un sous-dossier comme `ton-domaine.fr/novia/`.
