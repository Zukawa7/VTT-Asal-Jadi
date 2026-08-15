import { Router } from 'express';
import type { DatabaseService } from '../services/DatabaseService.js';
import { createAuthRouter } from './auth.js';
import { createCharacterRouter } from './character.js';

export function createApiRouter(db: DatabaseService, jwtSecret: string): Router {
  const router = Router();
  router.use('/auth', createAuthRouter(db, jwtSecret));
  router.use('/character', createCharacterRouter(db, jwtSecret));
  return router;
}
