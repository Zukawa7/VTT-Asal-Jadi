import { DatabaseService } from './services/DatabaseService.js';
import { createApiRouter } from './routes/index.js';
import { loadConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { CharacterSyncService } from './services/CharacterSyncService.js';

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
}

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const nodeEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';
  return { port, nodeEnv };
}

async function start(): Promise<void> {
  const config = loadConfig();
  // The legacy server remains the HTTP/socket compatibility layer while typed
  // routes are mounted under /api/v2 during the migration.
  // @ts-expect-error Legacy JavaScript module is typed by the migration boundary.
  const legacy = await import('../server-legacy.js');
  const database = new DatabaseService(config.databasePath);
  await database.migrate();
  legacy.app.use('/api/v2', createApiRouter(database, config.jwtSecret));
  const characterSync = new CharacterSyncService(database);
  if (config.characterSyncEnabled) {
    characterSync.start();
    logger.info('Character sync enabled', { intervalMinutes: 5 });
  }
  process.once('SIGTERM', () => characterSync.stop());
  process.once('SIGINT', () => characterSync.stop());
  logger.info('Typed API mounted', { prefix: '/api/v2', environment: config.nodeEnv });
}

void start().catch((error: unknown) => {
  logger.error('Server bootstrap failed', { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
