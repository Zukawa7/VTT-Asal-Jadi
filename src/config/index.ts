import path from 'node:path';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  jwtSecret: string;
  webhookSecret: string;
  databasePath: string;
  dndBeyondApiUrl: string;
}

function requiredSecret(value: string | undefined, name: string, nodeEnv: string): string {
  if (value) return value;
  if (nodeEnv === 'production') throw new Error(`${name} must be set in production`);
  return `development-${name.toLowerCase()}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return {
    nodeEnv,
    port,
    jwtSecret: requiredSecret(env.JWT_SECRET, 'JWT_SECRET', nodeEnv),
    webhookSecret: requiredSecret(env.WEBHOOK_SECRET, 'WEBHOOK_SECRET', nodeEnv),
    databasePath: env.DATABASE_PATH ?? path.resolve('data/vtt.db'),
    dndBeyondApiUrl: env.DNDBEYOND_API_URL ?? 'https://character-service.dndbeyond.com',
  };
}
