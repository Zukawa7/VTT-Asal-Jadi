import type { Express } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { TypedIo } from './src/services/WebSocketManager.js';
import type { RollEvent } from './src/types/events.js';

declare module '../server-legacy.js' {
  export const app: Express;
  export const io: TypedIo;
  export const httpServer: HttpServer;
  export function setRollPersistence(handler: (event: RollEvent & { characterId?: string }) => Promise<void>): void;
  export function setRealtimeManager(manager: unknown): void;
}
