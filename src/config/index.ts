import path from 'node:path';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  jwtSecret: string;
  webhookSecret: string;
  databasePath: string;
  dndBeyondApiUrl: string;
  characterSyncEnabled: boolean;
}

function requiredSecret(value: string | undefined, name: string, nodeEnv: string): string {
  if (value) return value;
  if (nodeEnv === 'production') throw new Error(`${name} must be set in production`);
  return `development-${name.toLowerCase()}`;
}

function resolveDatabasePath(env: NodeJS.ProcessEnv): string {
  if (env.DATABASE_PATH) return env.DATABASE_PATH;
  if (env.VERCEL) return '/tmp/vtt.db';
  return path.resolve('data/vtt.db');
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv =
    env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return {
    nodeEnv,
    port,
    jwtSecret: requiredSecret(env.JWT_SECRET, 'JWT_SECRET', nodeEnv),
    webhookSecret: requiredSecret(env.WEBHOOK_SECRET, 'WEBHOOK_SECRET', nodeEnv),
    databasePath: resolveDatabasePath(env),
    dndBeyondApiUrl: env.DNDBEYOND_API_URL ?? 'https://character-service.dndbeyond.com',
    characterSyncEnabled: env.CHARACTER_SYNC_ENABLED === 'true',
  };
}
