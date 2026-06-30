#!/usr/bin/env bash
# sysapp — install & build script for the homeserver
set -e

cd "$(dirname "$0")"
ROOT="$(pwd)"
echo "==> sysapp root: $ROOT"

# 1. Check Node
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang. Pasang dulu (butuh v18+; v22/24 LTS direkomendasikan, v25 juga jalan):"
  echo "  curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -"
  echo "  sudo apt-get install -y nodejs"
  exit 1
fi
echo "==> Node $(node -v)"

# 2. (opsional) sensor suhu — biar temperature terbaca di server
if ! command -v sensors >/dev/null 2>&1; then
  echo "==> lm-sensors belum ada (opsional, untuk baca suhu CPU). Pasang dengan:"
  echo "      sudo apt-get install -y lm-sensors && sudo sensors-detect --auto"
fi

# node_modules tidak boleh dipindah antar-mesin (symlink rusak).
# Kalau vite binary tidak resolve, bersihkan & install ulang dari nol.
if [ -d client/node_modules ] && ! ( cd client && node -e "require.resolve('vite/package.json')" >/dev/null 2>&1 ); then
  echo "==> node_modules tampak hasil copy / rusak, membersihkan..."
  rm -rf server/node_modules client/node_modules \
         server/package-lock.json client/package-lock.json
fi

# 3. Install backend deps
echo "==> Install backend deps..."
( cd server && npm install --omit=dev )

# 4. Install frontend deps + build
echo "==> Build frontend..."
( cd client && npm install && npm run build )

echo ""
echo "==> Selesai! Jalankan server dengan:"
echo "      cd server && npm start"
echo "    lalu buka http://<IP-SERVER>:4000"
echo ""
echo "    Untuk jalan otomatis saat boot, lihat sysapp.service (systemd)."
