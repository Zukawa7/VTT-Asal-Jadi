import { Router } from 'express';
import type { DatabaseService } from '../services/DatabaseService.js';
import { createAuthRouter } from './auth.js';
import { createCharacterRouter } from './character.js';
import { createRollsRouter } from './rolls.js';
import { createSessionsRouter } from './sessions.js';

export function createApiRouter(db: DatabaseService, jwtSecret: string, onCharacterUpdate?: Parameters<typeof createCharacterRouter>[3]): Router {
  const router = Router();
  router.use('/auth', createAuthRouter(db, jwtSecret));
  router.use('/character', createCharacterRouter(db, jwtSecret, undefined, onCharacterUpdate));
  router.use('/rolls', createRollsRouter(db));
  router.use('/sessions', createSessionsRouter(db, jwtSecret));
  return router;
}
