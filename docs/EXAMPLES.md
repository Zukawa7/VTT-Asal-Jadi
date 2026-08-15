# Examples

## Import a character

1. Register at `/register`.
2. Login at `/login`.
3. Open `/dashboard`.
4. Enter a numeric D&D Beyond character ID or full character URL.
5. Select **Import to Database**.
6. Open **View & Export** to view the character sheet.

Typed API equivalent:

```bash
TOKEN='your-jwt-token'
curl -X POST https://vtt.polyport.my.id/api/v2/character/import \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"characterId":"12345678"}'
```

## Create and join a session

Create a session as an authenticated user:

```bash
curl -X POST https://vtt.polyport.my.id/api/v2/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"roomId":"friday-game","name":"Friday Game","description":"Campaign night"}'
```

Join it with a character:

```bash
curl -X POST https://vtt.polyport.my.id/api/v2/sessions/friday-game/join \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"characterId":"12345678"}'
```

## Configure OBS overlay

Open the settings page:

```text
https://vtt.polyport.my.id/overlay-settings.html?room=friday-game
```

Choose position, animation, font size, formula visibility, and timeout. Press **Open overlay**, then copy the opened URL into an OBS Browser Source.

An equivalent direct URL is:

```text
https://vtt.polyport.my.id/overlay.html?room=friday-game&position=top&animation=bounce&fontSize=large&showFormula=true&timeout=15
```

URL parameters take precedence over the browser's saved overlay settings.

## Use dice formulas

Supported examples:

```text
1d20
2d6+4
3d8-1
2d20h1   # advantage, keep highest
2d20l1   # disadvantage, keep lowest
```

The VTT sends rolls through Socket.IO. The result is broadcast to the room and persisted in the roll history.

## Export roll history

JSON:

```bash
curl https://vtt.polyport.my.id/api/v2/sessions/friday-game/export
```

CSV:

```bash
curl -OJ https://vtt.polyport.my.id/api/v2/sessions/friday-game/export.csv
```

Analytics:

```bash
curl https://vtt.polyport.my.id/api/v2/sessions/friday-game/analytics
```

## Development checks

```bash
npm install
npm run type-check
npm run lint
npm test
npm run build
npm start
```

## Deployment flow

Push to `main`:

```bash
git add .
git commit -m "describe the change"
git push origin main
```

GitHub Actions validates the project, then triggers the production webhook. The production host pulls the commit, installs dependencies, rebuilds ARM64 sqlite3, builds TypeScript, restarts PM2, and checks `/health`.
