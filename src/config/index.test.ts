import { describe, it, expect } from 'vitest';
import { loadConfig } from './index.js';

describe('config loader', () => {
  it('uses a writable temp path when running on Vercel without DATABASE_PATH', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '3000',
      VERCEL: '1',
      JWT_SECRET: 'secret',
      WEBHOOK_SECRET: 'webhook',
    });

    expect(config.databasePath).toBe('/tmp/vtt.db');
  });
});
