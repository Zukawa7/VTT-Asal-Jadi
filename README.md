# VTT Asal Jadi 🎲

[![Quality Checks](https://github.com/Zukawa7/VTT-Asal-Jadi/actions/workflows/test.yml/badge.svg)](https://github.com/Zukawa7/VTT-Asal-Jadi/actions/workflows/test.yml)

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Menjalankan Secara Lokal](#cara-menjalankan-aplikasi-secara-lokal)
- [Deployment](#otomatisasi-deployment-cicd-via-cloudflare-tunnel--github-actions)
- [Dokumentasi](#dokumentasi)



Virtual Tabletop (VTT) sederhana yang terintegrasi dengan **D&D Beyond** dan **OBS Overlay** untuk melacak hasil lemparan dadu dan status karakter secara real-time.

## Fitur Utama

1. **Import Karakter D&D Beyond**: Masukkan ID karakter D&D Beyond Anda untuk memuat nama, ras, kelas, level, HP, stat kemampuan (STR, DEX, CON, INT, WIS, CHA), dan modifikatornya secara otomatis.
2. **Dice Roller & Stat Checks**:
   - Lempar dadu standar (d4, d6, d8, d10, d12, d20, d100).
   - Klik pada stat kemampuan (misalnya Strength) untuk otomatis melempar `1d20` ditambah modifikator stat tersebut.
   - Lempar dadu kustom dengan formula seperti `2d6+4` atau `1d100-5`.
3. **OBS Overlay Integration**:
   - Halaman khusus (`/overlay.html?room=nama-room`) dengan latar belakang transparan.
   - Menampilkan hasil lemparan dadu secara real-time dengan animasi menarik.
   - Mendukung deteksi otomatis untuk *Natural 20* (Critical Success) dan *Natural 1* (Critical Failure).
4. **Multiplayer Room Sync**: Bagikan Room ID yang sama dengan pemain lain untuk melihat lemparan dadu satu sama lain secara real-time di Log Game dan OBS Overlay.

## Cara Menjalankan Aplikasi Secara Lokal

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi 18 ke atas direkomendasikan).

### Langkah-langkah

1. **Instal dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan server**:
   ```bash
   npm start
   ```
   Secara default, server akan berjalan di `http://localhost:3000`.

3. **Buka aplikasi**:
   - Buka `http://localhost:3000` di peramban (browser) Anda.
   - Masukkan Room ID (misalnya: `room-petualang`) dan klik **Connect Room**.
   - Masukkan ID Karakter D&D Beyond Anda (angka di akhir URL karakter Anda, contoh: `https://www.dndbeyond.com/characters/12345678` -> ID-nya adalah `12345678`) dan klik **Import**.

4. **Integrasi ke OBS**:
   - Salin URL OBS Overlay dari kotak input di aplikasi (contoh: `http://localhost:3000/overlay.html?room=room-petualang`).
   - Di OBS, tambahkan **Browser Source** baru.
   - Tempel URL tersebut, atur resolusinya (disarankan Width: `400`, Height: `600`), lalu centang opsi untuk menyembunyikan source saat tidak aktif jika diperlukan.

---

## Otomatisasi Deployment (CI/CD via Cloudflare Tunnel & GitHub Actions)

Aplikasi ini dilengkapi dengan endpoint webhook (`/api/webhook/github`) untuk melakukan penarikan kode otomatis, membangun ulang native binding SQLite ARM64, menjalankan build TypeScript, lalu me-restart aplikasi.

### Cara Konfigurasi

#### 1. Menjalankan Aplikasi di Server Utama
Untuk memastikan server otomatis menyala kembali setelah melakukan `git pull`, disarankan menggunakan process manager seperti **PM2**:
```bash
# Instal PM2 secara global (jika belum)
npm install -g pm2

# Jalankan aplikasi dengan nama "vtt-asal-jadi"
pm2 start server.js --name "vtt-asal-jadi"

# Simpan konfigurasi PM2 agar otomatis menyala saat server reboot
pm2 save
pm2 startup
```
*Catatan: Parameter `--watch` atau fitur auto-restart dari PM2 akan mendeteksi ketika proses Node.js mati (`process.exit(0)`) setelah webhook berjalan, lalu menyalakannya kembali dengan kode terbaru.*

#### 2. Konfigurasi Environment Variables (Opsional)
Anda bisa mengatur variabel lingkungan berikut di server utama Anda:
- `PORT`: Port server (default: `3000`).
- `WEBHOOK_SECRET`: Token rahasia untuk memverifikasi payload webhook dari GitHub (default: `vtt-asal-jadi-secret`).

#### 3. Konfigurasi GitHub Secrets
Pada repositori GitHub Anda, buka **Settings > Secrets and variables > Actions**, lalu tambahkan dua *Repository Secrets* berikut:
1. `SERVER_WEBHOOK_URL`: URL lengkap ke endpoint webhook server Anda (contoh: `https://vtt.polyport.my.id/api/webhook/github`).
2. `SERVER_HEALTH_URL`: URL health check setelah deployment: `https://vtt.polyport.my.id/health`.
3. `WEBHOOK_SECRET`: Kata sandi rahasia yang sama dengan yang diatur di server. Jangan commit atau membagikan nilainya.

Setiap kali Anda melakukan `git push` ke cabang `main`, GitHub Actions akan otomatis memicu webhook di server utama Anda, yang akan melakukan `git pull`, menginstal dependensi baru, dan memuat ulang aplikasi secara real-time!

---



## Dokumentasi

- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Examples](docs/EXAMPLES.md)


---

*Dibuat dengan ❤️ untuk kemudahan bermain TTRPG.*
