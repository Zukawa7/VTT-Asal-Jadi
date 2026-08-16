// PM2-compatible production entrypoint.
// The TypeScript application is compiled during deployment to dist/server.js.
import { app } from './server-legacy.js';

export default app;

if (!process.env.VERCEL) {
  await import('./dist/server.js');
}
