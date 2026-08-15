# Production Deployment

```bash
cd /opt/VTT-Asal-Jadi
git pull --ff-only origin main
npm install --include=dev
npm rebuild sqlite3 --build-from-source
npm run type-check
npm run build
pm2 delete vtt-asal-jadi 2>/dev/null || true
pm2 start npm --name vtt-asal-jadi -- start
pm2 save
```

Verify:

```bash
curl -I http://127.0.0.1:3000/dashboard
curl -I https://vtt.polyport.my.id/dashboard
```

Required production variables: `PORT`, `JWT_SECRET`, `WEBHOOK_SECRET`, `DATABASE_PATH`, and optional `CORS_ORIGIN`.
Never delete `data/vtt.db` during deployment.
