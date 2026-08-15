# API Reference

Base URL: `/api/v2`

## Authentication

- `POST /auth/register` — `{ username, password }`
- `POST /auth/login` — returns `{ token, username }`

Send the token with:

```http
Authorization: Bearer <token>
```

## Characters

- `POST /character/import` — authenticated; body `{ characterId }`
- `GET /character/:id/sheet` — returns normalized character data

## Sessions

- `POST /sessions` — authenticated; creates a room. Optional body: `roomId`, `name`, `description`, `password`.
- `GET /sessions/:roomId` — session metadata
- `POST /sessions/:roomId/join` — authenticated; body `{ password, characterId }`
- `GET /sessions/:roomId/participants` — authenticated
- `GET /sessions/:roomId/analytics` — roll statistics
- `GET /sessions/:roomId/export` — JSON roll export
- `GET /sessions/:roomId/export.csv` — CSV roll export
- `GET /rolls/:roomId` — latest 100 rolls
