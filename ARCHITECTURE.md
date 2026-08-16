# Architecture

## Overview
Proyek ini adalah Virtual Tabletop (VTT) sederhana yang menggabungkan:
- backend Node.js + TypeScript
- server HTTP dan real-time Socket.IO
- persistence SQLite
- frontend statis di folder `public/`

Arsitektur umumnya dibagi menjadi:
- `src/server.ts` sebagai bootstrap server aplikasi
- `src/routes/` untuk endpoint API
- `src/services/` untuk logika bisnis dan sync
- `src/middleware/` untuk keamanan dan auth
- `src/types/` untuk schema data
- `src/utils/` untuk validasi, logger, helper
- `public/` untuk UI halaman browser dan script client-side

## Folder Structure
- `src/server.ts`
  - inisialisasi config dan lifecycle aplikasi
  - mount typed API di `/api/v2`
  - menghubungkan `DatabaseService`, `WebSocketManager`, dan `CharacterSyncService`

- `src/routes/`
  - handler HTTP seperti auth, karakter, session, roll
  - mengatur endpoint REST dan validasi request
  - biasanya berinteraksi dengan service layer

- `src/services/`
  - `DatabaseService.ts`: akses SQLite, migration, query
  - `WebSocketManager.ts`: mengelola room state, map, token, dan real-time broadcast
  - `GameSessionService.ts`: room/session logic, participants, analytics
  - `DiceRollerService.ts`: proses lempar dadu
  - `RollPersistenceService.ts`: menyimpan hasil lemparan
  - `CharacterSyncService.ts`: syncing karakter dan data terkait
  - `DnDBeyondService.ts`: integrasi import karakter dari D&D Beyond

- `src/types/`
  - definisi tipe data untuk API, events, room state, karakter, overlay config
  - menjaga kontrak komunikasi antar server dan client

- `src/middleware/`
  - `auth.ts`: autentikasi
  - `security.ts`: keamanan HTTP dan header
  - `error-handler.ts`: handling error umum

- `src/utils/`
  - `validators.ts`: validasi input room, ID, token, dsb.
  - `logger.ts`: logging aplikasi
  - `crypto.ts`: helper keamanan/kriptografi

- `public/`
  - file HTML untuk halaman seperti `index.html`, `vtt.html`, `overlay.html`, `dashboard.html`
  - script browser di `public/app.js` dan `public/overlay.js`
  - styling dan komponen UI di `public/styles/` dan `public/js/`

## UI Layer
Frontend app di `public/` masih berbasis HTML + JavaScript vanilla, bukan React/Vue/Next. Struktur UI biasanya terbagi menjadi:
- halaman utama untuk connect room dan import karakter
- halaman VTT untuk board/table
- halaman overlay untuk OBS
- dashboard/session management

Komponen UI yang paling relevan:
- `public/app.js`: logika umum halaman aplikasi
- `public/overlay.js`: render overlay dan hasil dice
- `public/js/components.js`: komponen reusable UI
- `public/js/mobile-nav.js`, `shortcuts.js`, `theme-toggle.js`: interaksi kecil dan UX

## State Management
State proyek terbagi menjadi dua kategori:

### 1. Server-side state
State utama ada di `WebSocketManager`:
- `rooms: Map<string, RoomState>`
- tiap room berisi:
  - `mapUrl`
  - `tokens: { [tokenId]: TokenState }`

Contoh state room:
- roomId sebagai key
- mapUrl untuk background battle map
- token position x/y untuk bidak
- token metadata seperti id, name, avatarUrl

State ini dibangun untuk sinkronisasi re-al time antar pemain dalam satu room.

### 2. Client-side state
Pada frontend browser, state lokal biasanya dikelola dengan variabel JS dan DOM state, misalnya:
- room id yang sedang aktif
- token yang sedang dipilih
- input formulir karakter, room, dan overlay
- daftar hasil roll saat ini
- state visual untuk token/transform/map

Karena app bukan framework-based, state client belum terstruktur seperti Redux/Zustand; lebih banyak berbentuk data runtime yang di-update di browser script.

## Data & Persistence
- `DatabaseService` menangani database SQLite
- `GameSessionService` menyimpan:
  - session/room
  - partisipan
  - password room
  - analytics roll
- `RollPersistenceService` menyimpan hasil roll
- `CharacterSyncService` memantau dan sinkronisasi karakter dari sumber eksternal

Data absensi / sesi / karakter / roll disimpan dalam database agar konsisten dan bisa di-export.

## Real-time Communication
Komunikasi real-time didominasi oleh Socket.IO.

### Event flow
- Client join room
- Server memanggil `joinRoom(roomId)`
- `WebSocketManager` meng-emit `room-state` ke socket tersebut
- perubahan map / token / roll dibroadcast ke semua client di room

Event utama:
- `room-state`
- `map-updated`
- `token-added`
- `token-moved`
- `token-removed`
- `new-roll`
- `character-updated`

## HTTP API Flow
API di mount pada `/api/v2` lewat `createApiRouter(...)` dalam `src/server.ts`.
Alur umum:
1. request masuk ke route
2. route memanggil service
3. service membaca/mengubah data dari database
4. hasil dikembalikan ke client
5. jika event real-time relevan, server juga emit Socket.IO message

Contoh area API:
- auth
- session management
- dice roll
- character import/sync
- export session data

## Legacy Compatibility
Ada server legacy (`server-legacy.js`) dan typed server (`src/server.ts`).
Saat ini repositori sedang dalam transisi:
- legacy server tetap dipakai untuk kompatibilitas
- typed API baru di `/api/v2`
- `WebSocketManager` dipasang ke legacy server instance untuk bridging real-time logic

Tujuannya adalah migrasi bertahap tanpa menghancurkan frontend lama.

## Rendering Efficiency Considerations
Karena ini adalah aplikasi VTT, komponen paling intensif adalah:
- map rendering
- token position movement
- multiple client updates
- overlay roll animation

Prinsip performa yang perlu dijaga:
- jangan melakukan update room global berlebihan
- fokus pada perubahan token yang relevan
- pantau ukuran payload event
- hindari render ulang seluruh board jika hanya 1 token yang bergerak
- gunakan validasi ketat agar event invalid tidak membebani server

## Summary
Struktur repositori saat ini adalah kombinasi:
- Express + Socket.IO sebagai backend real-time
- SQLite sebagai persistent storage
- static HTML/JS sebagai frontend
- service-based architecture untuk business logic
- room state managed by `WebSocketManager` and token state by `mapUrl + tokens`

Dengan model ini, fitur utama yang paling penting adalah:
- join room
- map sync
- token movement sync
- dice roll broadcast
- session/character persistence
