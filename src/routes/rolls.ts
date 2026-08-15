import { Router } from 'express';
import type { DatabaseService } from '../services/DatabaseService.js';
import { validateRoomId } from '../utils/validators.js';

interface RollRow {
  id: number;
  characterId: string | null;
  characterName: string | null;
  rollName: string | null;
  formula: string;
  result: number;
  isCritical: number;
  rolls: string;
  createdAt: string;
}

export function createRollsRouter(db: DatabaseService): Router {
  const router = Router();

  router.get('/:roomId', async (req, res, next) => {
    try {
      const roomId = req.params.roomId.toLowerCase();
      if (!validateRoomId(roomId)) { res.status(400).json({ error: 'Invalid room ID' }); return; }
      const session = await db.get<{ id: number }>('SELECT id FROM game_sessions WHERE room_id = ?', [roomId]);
      if (!session) { res.json([]); return; }
      const rows = await db.all<RollRow>(
        `SELECT id, character_id AS characterId, character_name AS characterName,
                roll_name AS rollName, roll_formula AS formula, result,
                is_critical AS isCritical, rolls_json AS rolls, created_at AS createdAt
         FROM dice_rolls WHERE session_id = ? ORDER BY id DESC LIMIT 100`, [session.id],
      );
      res.json(rows.map((row) => ({ ...row, rolls: JSON.parse(row.rolls || '[]') })));
    } catch (error) { next(error); }
  });

  router.get('/:roomId/analytics', async (req, res, next) => {
    try {
      const roomId = req.params.roomId.toLowerCase();
      if (!validateRoomId(roomId)) { res.status(400).json({ error: 'Invalid room ID' }); return; }
      const session = await db.get<{ id: number }>('SELECT id FROM game_sessions WHERE room_id = ?', [roomId]);
      if (!session) { res.json({ totalRolls: 0, averageResult: 0, criticalCount: 0, formulas: [] }); return; }
      const summary = await db.get<{ totalRolls: number; averageResult: number; criticalCount: number }>(
        `SELECT COUNT(*) AS totalRolls, COALESCE(AVG(result), 0) AS averageResult,
                COALESCE(SUM(is_critical), 0) AS criticalCount FROM dice_rolls WHERE session_id = ?`, [session.id],
      );
      const formulas = await db.all<{ formula: string; uses: number }>(
        'SELECT roll_formula AS formula, COUNT(*) AS uses FROM dice_rolls WHERE session_id = ? GROUP BY roll_formula ORDER BY uses DESC', [session.id],
      );
      res.json({ ...summary, formulas });
    } catch (error) { next(error); }
  });

  return router;
}
