# Public Frontend Reference

Folder `public/` berisi seluruh frontend aplikasi VTT Asal Jadi yang berjalan sebagai halaman statis tanpa framework build step. Semua file ini dipanggil langsung oleh Express melalui `public/` root dan diakses oleh browser.

## Struktur utama

### Halaman aplikasi
- `index.html`  
  Halaman masuk / redirect otomatis ke dashboard.

- `login.html`  
  Form login. Mengirim request ke `/api/v2/auth/login` dan menyimpan token di `localStorage`.

- `register.html`  
  Form registrasi akun baru.

- `dashboard.html`  
  Dashboard user untuk melihat karakter yang sudah diimport, import karakter baru, dan membuka VTT/session.

- `vtt.html`  
  Layar utama Virtual Tabletop. Berisi map, token, dice tray, OBS URL, dan game log.

- `overlay.html`  
  Halaman overlay untuk OBS. Menampilkan hasil lemparan dadu secara real-time. 

- `overlay-settings.html`  
  Pengaturan UI overlay seperti posisi, animasi, ukuran font, show formula, timeout, dll.

- `session-dashboard.html`  
  Dashboard sesi / aktivitas room dan riwayat session.

- `character-view.html`  
  Tampilan detail/readonly karakter dan roll stat skill. Biasanya dipakai untuk melihat sheet karakter.

### Script frontend
- `app.js`  
  File logika utama untuk VTT. Berisi:
  - koneksi Socket.IO
  - room join
  - map update
  - token add/move/remove
  - import character
  - render HP/stat
  - dice tray & log history

- `overlay.js`  
  Logika khusus overlay OBS. Menangani render hasil roll dalam bentuk card overlay animasi.

- `js/components.js`  
  Library komponen reusable: modal, notification, tabs, confirm dialog.

- `js/theme-toggle.js`  
  Toggle tema gelap/terang dan simpan preferensi ke `localStorage`.

- `js/mobile-nav.js`  
  Logic untuk navigasi mobile jika ada elemen nav yang perlu berinteraksi.

- `js/shortcuts.js`  
  Shortcut keyboard untuk dice roll, show/hide UI, atau aksi cepat di VTT.

### Styling
- `styles/variables.css`  
  Design tokens utama: warna, spacing, font, shadow, theme variables, z-index.

- `styles/components.css`  
  Komponen UI umum: tombol, card, input, badge, panel, form controls.

- `styles/theme.css`  
  Override tema khusus untuk mode light/dark.

- `styles/responsive.css`  
  Responsive layout untuk berbagai ukuran layar.

- `styles/animations.css`  
  Animasi transisi, slide, fade, pulse, hover, dll.

---

## Alur kerja edit frontend

### 1) Tentukan halaman yang mau diubah
- Mau ubah login/register? buka file HTML terkait.
- Mau ubah gameplay board? fokus ke `vtt.html` dan `app.js`.
- Mau ubah overlay OBS? fokus ke `overlay.html` dan `overlay.js`.
- Mau ubah layout umum / tombol / warna? fokus ke `styles/*.css`.

### 2) Hubungkan HTML dengan JS
Setiap elemen yang mau dipakai JavaScript harus punya `id` atau `data-*` yang konsisten.
Contoh:
- `roomIdInput`, `joinRoomBtn`, `mapContainer`
- `charIdInput`, `importBtn`, `logContainer`

Jika elemen baru ditambahkan di HTML, pastikan juga dipasang di file JS yang relevan.

### 3) Jangan edit CSS di banyak tempat secara acak
Prioritaskan:
- `variables.css` untuk token warna / spacing / font
- `components.css` untuk button, card, form
- `theme.css` untuk override tema
- `responsive.css` untuk layout mobile/desktop
- `animations.css` untuk motion

Jika desain global berubah, ubah file utama itu dulu sebelum memodifikasi halaman spesifik.

### 4) Untuk logika, gunakan file JS yang sesuai
- `app.js` = logika VTT utama
- `overlay.js` = logika overlay
- `components.js` = reusable UI component class
- `theme-toggle.js` = tema
- `shortcuts.js` = keyboard events

Jangan menaruh logic khusus VTT di file CSS atau HTML kecuali untuk event inline sederhana.

### 5) Selalu cocokkan event socket dan event DOM
Untuk fitur real-time, biasanya flow-nya seperti ini:
1. HTML trigger event (klik tombol / drop map / token)
2. JS emit ke socket: `join-room`, `update-map`, `add-token`, `move-token`
3. server memproses di `WebSocketManager`
4. server emit event balik seperti:
   - `room-state`
   - `map-updated`
   - `token-added`
   - `token-moved`
   - `token-removed`
   - `new-roll`
5. client menangkap event dan memanggil `renderTokens()`, `updateMapBackground()`, `addLogMessage()`

### 6) Validasi perubahan dengan browser
Setelah edit:
1. jalankan `npm start`
2. buka halaman utama di browser
3. cek route yang sedang diedit
4. pastikan:
   - form bisa submit
   - tombol ada respon
   - socket event tidak error
   - tidak merusak UI yang sudah berjalan

---

## Panduan pengeditan per area

### Login / register / dashboard
Edit file:
- `login.html`
- `register.html`
- `dashboard.html`

Biasanya berhubungan dengan:
- fetch ke `/api/v2/auth/*`
- localStorage token
- redirect ke halaman berikutnya
- render list karakter dan tombol aksi

### VTT Board
Edit file:
- `vtt.html`
- `app.js`

Biasanya berhubungan dengan:
- room connection
- map background
- token position
- dice tray
- game log
- OBS URL generation

### Overlay OBS
Edit file:
- `overlay.html`
- `overlay.js`
- `overlay-settings.html`

Biasanya berhubungan dengan:
- `Socket.IO` room sync
- design card roll
- formula display
- animation on new roll
- auto-hide timeout

### Styling sistemik
Edit file:
- `styles/variables.css`
- `styles/components.css`
- `styles/theme.css`
- `styles/responsive.css`
- `styles/animations.css`

Biasanya berhubungan dengan:
- warna tema
- ukuran tombol
- typography
- spacing dan layout
- motion/transition

---

## Aturan penting saat edit frontend
- Jangan menghapus `id` yang dipakai JS.
- Jangan mengubah nama event socket tanpa update server dan frontend bersamaan.
- Jangan mengubah `data-theme` atau struktur theme tanpa cek mode light/dark.
- Kalau menambah elemen HTML baru, pastikan style-nya konsisten dengan `components.css`.
- Prioritaskan perubahan kecil dan aman; VTT butuh performa stabil dan real-time.
- Jangan merusak fitur yang sudah berjalan, terutama room sync, dice roll, dan OBS overlay.

---

## Ringkasan cepat
- UI halaman = file HTML di root `public/`
- Logika = `app.js`, `overlay.js`, `js/*.js`
- Styling = `styles/*.css`
- Tema sistem = `variables.css` dan `theme.css`
- Alur pengeditan = HTML -> JS -> CSS -> test di browser

Jika mau mengubah fitur besar, selalu mulai dari halaman yang relevan, lalu sesuaikan JS, lalu styling terakhir agar perubahan tetap kontrolable.
