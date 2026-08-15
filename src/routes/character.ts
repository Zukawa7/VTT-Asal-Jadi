import { Router } from 'express';
import type { Character } from '../types/character.js';
import type { DatabaseService } from '../services/DatabaseService.js';
import { DnDBeyondService } from '../services/DnDBeyondService.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCharacterId } from '../utils/validators.js';

interface CharacterRow { id: string; character_data: string; user_id: number; }

export function createCharacterRouter(db: DatabaseService, jwtSecret: string, ddb = new DnDBeyondService(), onUpdate?: (character: Character) => void): Router {
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
      const row = await db.get<CharacterRow>('SELECT id, character_data, user_id FROM character_sheets WHERE id = ?', [req.params.id]);
      if (!row) { res.status(404).json({ error: 'Character not found' }); return; }
      res.json(JSON.parse(row.character_data) as Character);
    } catch (error) { next(error); }
  });

  router.put('/:id', auth, async (req, res, next) => {
    try {
      const userId = res.locals.user.id as number;
      const row = await db.get<CharacterRow>('SELECT id, character_data, user_id FROM character_sheets WHERE id = ? AND user_id = ?', [req.params.id, userId]);
      if (!row) { res.status(404).json({ error: 'Character not found' }); return; }
      const character = JSON.parse(row.character_data) as Character;
      if (req.body?.hp && typeof req.body.hp.current === 'number') character.hp.current = Math.max(0, Math.min(character.hp.max, req.body.hp.current));
      if (req.body?.hp && typeof req.body.hp.temp === 'number') character.hp.temp = Math.max(0, req.body.hp.temp);
      await db.run('UPDATE character_sheets SET character_data = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [JSON.stringify(character), req.params.id, userId]);
      onUpdate?.(character);
      res.json(character);
    } catch (error) { next(error); }
  });

  router.delete('/:id', auth, async (req, res, next) => {
    try {
      const result = await db.run('DELETE FROM character_sheets WHERE id = ? AND user_id = ?', [req.params.id, res.locals.user.id]);
      if (!result.changes) { res.status(404).json({ error: 'Character not found' }); return; }
      res.json({ success: true });
    } catch (error) { next(error); }
  });
  return router;
}
