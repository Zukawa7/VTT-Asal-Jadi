import { Router } from 'express';
import type { DatabaseService } from '../services/DatabaseService.js';
import { validateRoomId } from '../utils/validators.js';

interface RollRow { id: number; characterId: string | null; formula: string; result: number; isCritical: number; rolls: string; createdAt: string; }

export function createRollsRouter(db: DatabaseService): Router {
  const router = Router();
  router.get('/:roomId', async (req, res, next) => {
    try {
      if (!validateRoomId(req.params.roomId)) { res.status(400).json({ error: 'Invalid room ID' }); return; }
      const session = await db.get<{ id: number }>('SELECT id FROM game_sessions WHERE room_id = ?', [req.params.roomId]);
      if (!session) { res.json([]); return; }
      const rows = await db.all<RollRow>(`SELECT id, character_id AS characterId, roll_formula AS formula,
        result, is_critical AS isCritical, rolls_json AS rolls, created_at AS createdAt
        FROM dice_rolls WHERE session_id = ? ORDER BY id DESC LIMIT 100`, [session.id]);
      res.json(rows.map((row) => ({ ...row, rolls: JSON.parse(row.rolls || '[]') })));
    } catch (error) { next(error); }
  });
  return router;
}
