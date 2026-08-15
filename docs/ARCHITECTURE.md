# Architecture

## Runtime overview

```text
Browser / OBS Browser Source
          |
          v
Cloudflare Tunnel
          |
Express + Socket.IO (server-legacy compatibility layer)
          |
          +-- /api/*       existing production endpoints
          +-- /api/v2/*    typed route modules
          +-- /health
          +-- static public/ pages
          |
       SQLite data/vtt.db
```

The compatibility layer is intentional. It allows existing users, OBS, and VTT clients to continue using `/api/*` while new frontend code migrates to `/api/v2/*`.

## TypeScript modules

```text
src/server.ts
  ├── config/index.ts
  ├── middleware/
  ├── routes/index.ts
  │     ├── auth.ts
  │     ├── character.ts
  │     ├── rolls.ts
  │     └── sessions.ts
  └── services/
        ├── DatabaseService.ts
        ├── DnDBeyondService.ts
        ├── CharacterSyncService.ts
        ├── DiceRollerService.ts
        ├── RollPersistenceService.ts
        ├── GameSessionService.ts
        └── WebSocketManager.ts
```

`server.js` loads the compiled `dist/server.js`. The TypeScript bootstrap imports the legacy Express/Socket.IO server, migrates the database, registers typed routes, and configures typed services.

## Request flow

1. A request reaches Express through Cloudflare Tunnel.
2. Rate limiting and security headers run in the legacy compatibility layer.
3. `/api/v2` requests are handled by typed routers.
4. Authentication middleware verifies the JWT when required.
5. Services perform database or D&D Beyond operations.
6. Errors are passed to the typed error handler where applicable.

## Authentication flow

1. Registration validates the username and password.
2. Passwords are salted and hashed with PBKDF2 before storage.
3. Login verifies the hash and returns a seven-day JWT.
4. The browser stores the token for the current application session.
5. Protected requests send `Authorization: Bearer <token>`.

## Character synchronization flow

```text
D&D Beyond v5 API
        |
        v
DnDBeyondService -> normalized Character
        |
        v
CharacterSyncService -> character_sheets table
        |
        +-- scheduled refresh (optional, 5 minutes)
        +-- HP/resource update through typed route
        +-- Socket.IO character update event
```

Only normalized application data is stored. The D&D Beyond credential/cookie is not stored by this application.

## Dice and session flow

```text
VTT client --send-roll--> Socket.IO
                            |
                            +--> broadcast new-roll to room
                            +--> RollPersistenceService
                                      |
                                      +--> game_sessions
                                      +--> dice_rolls

Session dashboard --GET /api/v2/rolls/:roomId--> SQLite history
Session dashboard --GET /api/v2/sessions/:roomId/analytics--> aggregate queries
```

The roll persistence service is the typed path. A fallback remains in `server-legacy.js` for direct legacy execution.

## Database

Core tables:

- `users`: accounts and password hashes.
- `characters`: legacy character storage.
- `character_sheets`: typed persistent normalized character data.
- `game_sessions`: room and campaign metadata.
- `session_participants`: users and characters in a session.
- `session_passwords`: optional room password hashes.
- `dice_rolls`: persistent roll history and critical status.

All queries use parameter binding. Existing databases are upgraded with additive compatibility columns only.

## Deployment

GitHub Actions runs type-check, lint, build, and tests before triggering the webhook. The production webhook performs:

```text
git pull --ff-only
npm install --include=dev
npm rebuild sqlite3 --build-from-source
npm run build
PM2 restart
health check
```

The native SQLite rebuild is required for the ARM64 production host.
