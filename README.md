# sysapp — Homeserver Monitor

Dashboard realtime untuk memantau homeserver: CPU, RAM, suhu, disk, network, per-core, info sistem (Public/Private IPv4, location, dll).

> Support by Claude Code

- **server/** — backend Node (Express + WebSocket + systeminformation), port `4000`
- **client/** — frontend React (Vite), di-build ke `client/dist` dan di-serve oleh backend

## Install di server (Ubuntu/Linux)

### 1. Pastikan Node.js v18+ terpasang
v22/24 LTS direkomendasikan; v25 (non-LTS) juga jalan normal.
```bash
node -v   # kalau belum ada:
curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Pindahkan folder ke server
Pilih salah satu:
```bash
# via scp dari laptop ini:
scp -r /home/unknown/sysapp user@IP_SERVER:~/

# atau via git kalau sudah di-push ke repo
git clone https://github.com/IotTechId/sysapp sysapp
```

### 3. (Opsional) sensor suhu CPU
Biar suhu terbaca di server:
```bash
sudo apt-get install -y lm-sensors
sudo sensors-detect --auto
```

### 4. Install & build
```bash
cd ~/sysapp
chmod +x setup.sh
./setup.sh
```

### 5. Jalankan
```bash
cd server && npm start
```
Buka `http://IP_SERVER:4000` dari browser di jaringan yang sama.

### 6. Buka port firewall (kalau perlu)
```bash
sudo ufw allow 4000/tcp
```

## Jalan otomatis saat boot (systemd)

```bash
# edit User & path di sysapp.service kalau berbeda
sudo cp sysapp.service /etc/systemd/system/sysapp.service
sudo systemctl daemon-reload
sudo systemctl enable --now sysapp
sudo systemctl status sysapp        # cek status
journalctl -u sysapp -f             # lihat log realtime
```

## Konfigurasi
Lewat environment variable:
- `PORT` — port HTTP (default `4000`)
- `POLL_INTERVAL` — interval refresh metrics dalam ms (default `2000`)

## Update setelah ubah kode frontend
```bash
cd client && npm run build
sudo systemctl restart sysapp   # kalau pakai systemd
```
