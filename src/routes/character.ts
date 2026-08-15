import { Router } from 'express';
import type { Character } from '../types/character.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import { DnDBeyondService } from '../services/DnDBeyondService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCharacterId } from '../utils/validators.js';

interface CharacterRow { id: string; name: string; data: string; user_id: number; }

export function createCharacterRouter(db: DatabaseService, jwtSecret: string, ddb = new DnDBeyondService()): Router {
  const router = Router();
  const auth = authenticateToken(jwtSecret);

  router.post('/import', auth, async (req, res, next) => {
    try {
      const rawId = String(req.body?.characterId ?? '').match(/\d+/)?.[0] ?? '';
      if (!validateCharacterId(rawId)) { res.status(400).json({ error: 'Invalid character ID' }); return; }
      const character = await ddb.fetchCharacter(rawId);
      const userId = res.locals.user.id as number;
      await db.run(`INSERT INTO character_sheets (id, user_id, character_data, last_synced) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET character_data=excluded.character_data, last_synced=CURRENT_TIMESTAMP`, [String(character.id), userId, JSON.stringify(character)]);
      res.json(character);
    } catch (error) { next(error); }
  });

  router.get('/:id/sheet', async (req, res, next) => {
    try {
      const row = await db.get<CharacterRow>('SELECT id, name, data, user_id FROM characters WHERE id = ?', [req.params.id]);
      if (!row) { res.status(404).json({ error: 'Character not found' }); return; }
      res.json(JSON.parse(row.data) as Character);
    } catch (error) { next(error); }
  });
  return router;
}
