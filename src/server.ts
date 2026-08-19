import { DatabaseService } from './services/DatabaseService.js';
import { createApiRouter } from './routes/index.js';
import { loadConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { CharacterSyncService } from './services/CharacterSyncService.js';
import { RollPersistenceService } from './services/RollPersistenceService.js';
import { WebSocketManager } from './services/WebSocketManager.js';
import { securityMiddleware } from './middleware/security.js';

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
}

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const nodeEnv =
    env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';
  return { port, nodeEnv };
}

async function start(): Promise<void> {
  const config = loadConfig();
  // The legacy server remains the HTTP/socket compatibility layer while typed
  // routes are mounted under /api/v2 during the migration.
  const legacy = await import('../server-legacy.js');
  legacy.app.use(securityMiddleware);

  const database = new DatabaseService(config.databasePath);
  await database.migrate();
  const rollPersistence = new RollPersistenceService(database);
  legacy.setRollPersistence((event: unknown) => rollPersistence.persist(event as never));
  const websocketManager = new WebSocketManager(legacy.io);
  legacy.setRealtimeManager(websocketManager);

  legacy.app.use(
    '/api/v2',
    createApiRouter(database, config.jwtSecret, (character) => {
      legacy.io.emit('character-updated', character);
    }),
  );
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
  logger.error('Server bootstrap failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
