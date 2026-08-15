import { Router } from 'express';
import type { DatabaseService } from '../services/DatabaseService.js';
import { GameSessionService } from '../services/GameSessionService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRoomId } from '../utils/validators.js';

export function createSessionsRouter(db: DatabaseService, jwtSecret: string): Router {
  const router = Router();
  const sessions = new GameSessionService(db);
  const auth = authenticateToken(jwtSecret);

  router.post('/', auth, async (req, res, next) => {
    try {
      const roomId = String(req.body?.roomId ?? GameSessionService.generateRoomId()).toLowerCase();
      if (!validateRoomId(roomId)) { res.status(400).json({ error: 'Invalid room ID' }); return; }
      const existing = await sessions.get(roomId);
      if (existing) { res.status(409).json({ error: 'Room already exists' }); return; }
      const session = await sessions.create(roomId, res.locals.user.id, String(req.body?.name ?? ''), String(req.body?.description ?? ''));
      res.status(201).json(session);
    } catch (error) { next(error); }
  });

  router.get('/:roomId', async (req, res, next) => {
    try {
      if (!validateRoomId(req.params.roomId)) { res.status(400).json({ error: 'Invalid room ID' }); return; }
      const session = await sessions.get(req.params.roomId);
      if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
      res.json(session);
    } catch (error) { next(error); }
  });

  router.get('/:roomId/export', async (req, res, next) => {
    try {
      if (!validateRoomId(req.params.roomId)) { res.status(400).json({ error: 'Invalid room ID' }); return; }
      res.json({ roomId: req.params.roomId, rolls: await sessions.exportRolls(req.params.roomId) });
    } catch (error) { next(error); }
  });
  return router;
}
