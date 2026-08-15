# Troubleshooting

## Cloudflare 502 Bad Gateway

A 502 means Cloudflare cannot reach the origin process. On the production host run:

```bash
cd /opt/VTT-Asal-Jadi
pm2 status
pm2 logs vtt-asal-jadi --lines 100 --nostream
curl -i http://127.0.0.1:3000/health
```

If port 3000 is inactive:

```bash
npm install --include=dev
npm rebuild sqlite3 --build-from-source
npm run build
pm2 restart vtt-asal-jadi --update-env
pm2 save
```

Do not delete `data/vtt.db`.

## `sqlite3` native binding errors

The production host is ARM64. Rebuild the native module:

```bash
npm rebuild sqlite3 --build-from-source
```

Avoid `npm ci --ignore-scripts` on the production host.

## Module not found or stale `dist`

Compile the TypeScript entrypoint:

```bash
npm run build
pm2 restart vtt-asal-jadi --update-env
```

The PM2 entrypoint is `server.js`, which loads `dist/server.js`.

## Login returns HTML or `Unexpected token '<'`

The browser expected JSON but received an HTML error page. Check:

```bash
curl -i -X POST https://vtt.polyport.my.id/api/v2/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"name","password":"password"}'
```

A healthy endpoint returns JSON. Confirm the typed build is current with `npm run build`.

## D&D Beyond import fails

Check that:

- The numeric character ID is correct.
- The character can be accessed by the D&D Beyond endpoint.
- The server can reach `character-service.dndbeyond.com`.
- The response is using API v5, not v2.

Inspect PM2 logs without exposing secrets.

## OBS overlay is blank

Use a URL like:

```text
https://vtt.polyport.my.id/overlay.html?room=campaign-1
```

Check that:

- The room ID is identical to the VTT room.
- The OBS Browser Source allows JavaScript.
- The Browser Source can reach Socket.IO.
- The overlay URL uses HTTPS.

Settings can be configured at `/overlay-settings.html`.

## Roll history is empty

Check the room name and then request:

```bash
curl -i https://vtt.polyport.my.id/api/v2/rolls/campaign-1
```

A roll is persisted after the Socket.IO `send-roll` event. The typed runtime uses `RollPersistenceService`.

## Tests fail locally

Run the checks separately:

```bash
npm run type-check
npm run lint
npm test
npm run build
```

Tests use mocks and do not require the production database.

## PM2 startup

After changing the PM2 process:

```bash
pm2 save
pm2 startup
```

Run the generated startup command as the same system user that owns the PM2 process.
