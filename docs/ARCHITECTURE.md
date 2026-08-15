# Architecture

The project is in an incremental JavaScript-to-TypeScript migration.

- `server-legacy.js` keeps existing Express, Socket.IO, authentication, and public page compatibility.
- `src/server.ts` boots the legacy compatibility layer and mounts typed routes under `/api/v2`.
- `src/services` contains domain services for D&D Beyond, SQLite, sessions, dice, synchronization, and WebSockets.
- `src/routes` contains typed Express route factories.
- `public` contains the web UI and OBS overlay.
- `data/vtt.db` is runtime state and must never be committed.

The compatibility boundary can be removed after all legacy routes are migrated and production verification is complete.
