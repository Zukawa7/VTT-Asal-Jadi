# AI Workboard / TODO

## 1) Perbaikan Inti
- [ ] Audit dan standardisasi validasi input room, token, map URL, dan karakter
- [ ] Perbaiki alur error handling agar konsisten di semua route dan service
- [ ] Menambah test coverage untuk route utama (`auth`, `session`, `character`, `rolls`)
- [ ] Konsistensikan penggunaan schema tipe dari `src/types/` di seluruh API dan socket event
- [ ] Review dan perbaiki logika `DatabaseService` untuk transaction dan migration yang aman
- [ ] Stabilkan `GameSessionService` untuk room creation/join/password handling
- [ ] Pastikan no silent failure pada Socket.IO event dan DB operation
- [ ] Refactor logika frontend `public/app.js` agar tidak terlalu long-lived dan sulit dipelihara
- [ ] Perbaiki UX mobile dan responsivitas halaman VTT serta overlay
- [ ] Tambahkan indikator status koneksi room/server yang jelas di UI

## 2) Fitur Gameplay
- [ ] Sinkronisasi map antar pemain dalam room yang sama
- [ ] Tambahkan upload/custom map background dan validasi URL file lokal/remote
- [ ] Implementasi drag-and-drop token dengan update posisi real-time ke semua client
- [ ] Tambahkan snap-to-grid atau grid editor yang lebih presisi
- [ ] Implementasi dice roller yang lebih kaya: d4, d6, d8, d10, d12, d20, d100, custom formula
- [ ] Sistem log roll per room dengan nama karakter, formula, result, critical success/failure
- [ ] Tambahkan overlay real-time untuk hasil roll dengan animasi yang lebih rapi
- [ ] Integrasi turn tracker / initiative tracker untuk encounter
- [ ] Fitur status HP / AC / condition tracker per token/karakter
- [ ] Marker dan efek status seperti blinded, poisoned, exhausted, prone, shielded
- [ ] Sistem chat room sederhana untuk roleplay dan koordinasi
- [ ] Fitur hide/show token, layer map, dan lock token
- [ ] Support multi-token per karakter dan grouping token
- [ ] History pergerakan token dan undo/redo sederhana
- [ ] Pemetaan aksi cepat seperti move, attack, save, skill check

## 3) Fitur Lanjutan
- [ ] Fitur fog of war / hidden map area untuk GM dan player
- [ ] Sistem GM tools: pin map, lock room, spawn token, manage NPC
- [ ] Export/import scene atau battle map ke format JSON/YAML
- [ ] Dashboard sesi dengan analytics roll, rata-rata result, karakter populer, room stats
- [ ] Fitur notes / journal / shared lore per room
- [ ] Integrasi asset library: monster token, portrait, map, icon set
- [ ] Multi-table / multi-room management dengan list room aktif
- [ ] Pencatatan battle log dan event timeline
- [ ] Support audio cue / SFX untuk dice roll atau turn change
- [ ] Pencarian/filter karakter, token, dan room di dashboard
- [ ] Sistem permission dasar: GM vs player view/edit
- [ ] Theme dan layout personalization untuk VTT board
- [ ] API documentation dan examples endpoint yang lebih lengkap
- [ ] CI/CD hardening dan deployment checks yang lebih kuat
- [ ] Peningkatan security: rate limit per room, input sanitization, audit log
- [ ] Fitur collaboration advanced: pointer cursor, spotlight, shared selection, emoji reactions
- [ ] Optimisasi rendering untuk banyak token dan map besar
- [ ] Modularisasi frontend agar lebih mudah dikembangkan sebagai app yang lebih kompleks di masa depan

## Prioritas Rekomendasi
- [ ] Prioritas 1: stabilitas, validasi, test coverage, room sync
- [ ] Prioritas 2: token movement, map sync, dice roller, HP/status tracker
- [ ] Prioritas 3: GM tools, fog of war, battle journal, advanced collaboration
