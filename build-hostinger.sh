#!/usr/bin/env bash
# Construit dist/novia-hostinger.zip : à décompresser tel quel dans public_html sur Hostinger.
set -euo pipefail
cd "$(dirname "$0")"

OUT=dist/novia-hostinger
rm -rf "$OUT" dist/novia-hostinger.zip
mkdir -p "$OUT"

cp -r public/. "$OUT"/
cp -r hostinger/. "$OUT"/
rm -f "$OUT"/private/db.php "$OUT"/private/auth.php "$OUT"/private/attempts.php "$OUT"/private/*.tmp
node -e "process.stdout.write(JSON.stringify(require('./seed').build(), null, 2))" > "$OUT"/private/seed.json

(cd "$OUT" && zip -qr ../novia-hostinger.zip . -x '*.DS_Store')
echo "OK : dist/novia-hostinger.zip"
