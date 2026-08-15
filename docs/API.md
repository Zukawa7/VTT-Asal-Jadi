# API Reference

Base URL production: `https://vtt.polyport.my.id`

Typed API base path: `/api/v2`

Most JSON endpoints return `{ "error": "..." }` on failure. Protected endpoints require:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

## Authentication

### Register

```http
POST /api/v2/auth/register
```

```json
{ "username": "player_one", "password": "a-secure-password" }
```

Success: `201 Created`

```json
{ "success": true }
```

Username format: lowercase letters, numbers, `_`, or `-`, between 3 and 32 characters. Passwords must contain at least 6 characters.

### Login

```http
POST /api/v2/auth/login
```

```bash
curl -X POST https://vtt.polyport.my.id/api/v2/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"player_one","password":"a-secure-password"}'
```

Returns a JWT token and username.

### Current user

```http
GET /api/v2/auth/me
Authorization: Bearer <JWT>
```

## Characters

### Import from D&D Beyond

```http
POST /api/v2/character/import
Authorization: Bearer <JWT>
```

```json
{ "characterId": "12345678" }
```

A full D&D Beyond character URL is also accepted. The server normalizes the numeric ID and fetches data through the D&D Beyond v5 character endpoint.

### List owned characters

```http
GET /api/v2/character
Authorization: Bearer <JWT>
```

### Public character sheet

```http
GET /api/v2/character/:id/sheet
```

### Update HP

```http
PUT /api/v2/character/:id
Authorization: Bearer <JWT>
```

```json
{ "hp": { "current": 18, "temp": 4 } }
```

Only the character owner can update the character. Current HP is clamped between `0` and maximum HP.

### Delete character

```http
DELETE /api/v2/character/:id
Authorization: Bearer <JWT>
```

## Sessions

### Create session

```http
POST /api/v2/sessions
Authorization: Bearer <JWT>
```

```json
{
  "roomId": "campaign-1",
  "name": "Lost Mine",
  "description": "Friday session",
  "password": "optional-room-password"
}
```

### Get session

```http
GET /api/v2/sessions/:roomId
```

### Join session

```http
POST /api/v2/sessions/:roomId/join
Authorization: Bearer <JWT>
```

```json
{ "password": "optional-room-password", "characterId": "12345678" }
```

### List participants

```http
GET /api/v2/sessions/:roomId/participants
Authorization: Bearer <JWT>
```

### Session analytics

```http
GET /api/v2/sessions/:roomId/analytics
```

Returns total rolls, average result, critical count, and formula usage.

### Export session JSON

```http
GET /api/v2/sessions/:roomId/export
```

### Export session CSV

```http
GET /api/v2/sessions/:roomId/export.csv
```

## Roll history

```http
GET /api/v2/rolls/:roomId
```

Returns up to the latest 100 rolls for the room. Socket.IO remains the real-time roll transport; this endpoint is used for history and dashboard loading.

```json
{
  "characterName": "Hero",
  "rollName": "Attack",
  "formula": "1d20+5",
  "result": 20,
  "isCritical": 1,
  "rolls": [15],
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## Health

```http
GET /health
```

Returns HTTP 200 when the Node process is available. GitHub Actions can use this endpoint after deployment.

## Rate limits and errors

- General API traffic is rate-limited.
- Login and registration have a stricter attempt limit.
- Invalid room IDs return `400`.
- Missing authentication returns `401`.
- Invalid or expired JWT returns `403`.
- Missing resources return `404`.
- Duplicate sessions return `409`.
- Unexpected server/database errors return `500`.
