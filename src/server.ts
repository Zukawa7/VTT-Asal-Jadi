import type { Server } from 'node:http';

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
}

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const nodeEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'test'
    ? env.NODE_ENV
    : 'development';

  return { port, nodeEnv };
}

// Compatibility bridge for the incremental migration. The existing runtime
// remains available while routes and services move into typed modules.
import '../server-legacy.js';

export type HttpServer = Server;
