
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



  router.get('/', auth, async (_req, res, next) => {
    try {
      const rows = await db.all<CharacterRow>(`SELECT id, character_data, user_id FROM character_sheets WHERE user_id = ?
        UNION ALL
        SELECT id, data AS character_data, user_id FROM characters
        WHERE user_id = ? AND NOT EXISTS (SELECT 1 FROM character_sheets WHERE character_sheets.id = characters.id)`, [res.locals.user.id, res.locals.user.id]);
      res.json(rows.map((row) => JSON.parse(row.character_data) as Character));
    } catch (error) { next(error); }
  });


  router.post('/import', auth, async (req, res, next) => {
    try {
      const rawId = String(req.body?.characterId ?? '').match(/\d+/)?.[0] ?? '';
      if (!validateCharacterId(rawId)) { res.status(400).json({ error: 'Invalid character ID' }); return; }
      const character = await ddb.fetchCharacter(rawId);
      const userId = res.locals.user.id as number;
      const characterData = JSON.stringify(character);
      await db.run(`INSERT INTO character_sheets (id, user_id, character_data, last_synced) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, character_data=excluded.character_data, last_synced=CURRENT_TIMESTAMP`, [String(character.id), userId, characterData]);
      await db.run(`INSERT INTO characters (id, user_id, name, data) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, name=excluded.name, data=excluded.data`, [String(character.id), userId, character.name, characterData]);
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
      const prevHp = character.hp?.current ?? 0;
      if (req.body?.hp && typeof req.body.hp.current === 'number') character.hp.current = Math.max(0, Math.min(character.hp.max, req.body.hp.current));
      if (req.body?.hp && typeof req.body.hp.temp === 'number') character.hp.temp = Math.max(0, req.body.hp.temp);
      // If character was at 0 HP and is now above 0, reset death saves
      if ((prevHp === 0 || prevHp === undefined) && character.hp.current > 0) {
        character.deathSaves = { successes: 0, failures: 0 };
      }
      
      if (Array.isArray(req.body?.equipment)) {
        if (req.body.equipment.length > 200) { res.status(400).json({ error: 'Equipment limit exceeded' }); return; }
        character.equipment = req.body.equipment.map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? 'Unknown Item'),
          quantity: Math.max(1, Number(item.quantity ?? 1)),
          weight: Math.max(0, Number(item.weight ?? 0)),
          equipped: Boolean(item.equipped),
          attuned: Boolean(item.attuned),
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
          category: item.category === 'Equipment' || item.category === 'Backpack' ? item.category : undefined,
          isWeapon: Boolean(item.isWeapon),
          type: typeof item.type === 'string' ? item.type.slice(0, 100) : undefined,
          attackBonus: typeof item.attackBonus === 'number' ? item.attackBonus : undefined,
          damage: typeof item.damage === 'string' ? item.damage.slice(0, 50) : undefined,
          range: typeof item.range === 'string' ? item.range.slice(0, 50) : undefined,
          description: typeof item.description === 'string' ? item.description.slice(0, 2000) : undefined,
        })).filter((item: { id: string }) => item.id.length > 0);
      }
      if (req.body?.spellSlots && typeof req.body.spellSlots === 'object') {
        const slots = Object.fromEntries(Object.entries(req.body.spellSlots).slice(0, 9).map(([level, value]) => {
          const slot = value as { current?: unknown; max?: unknown };
          return [level, { current: Math.max(0, Number(slot.current ?? 0)), max: Math.max(0, Number(slot.max ?? 0)) }];
        }));
        character.spellSlots = slots;
      }
      if (Array.isArray(req.body?.conditions)) {
        if (req.body.conditions.length > 20) { res.status(400).json({ error: 'Condition limit exceeded' }); return; }
        character.conditions = req.body.conditions.filter((condition: unknown): condition is string => typeof condition === 'string' && condition.length <= 50).slice(0, 20);
      }

      if (req.body?.currencies && typeof req.body.currencies === 'object') {
        const c = req.body.currencies as Record<string, unknown>;
        character.currencies = {
          cp: Math.max(0, Number(c.cp ?? character.currencies?.cp ?? 0)),
          sp: Math.max(0, Number(c.sp ?? character.currencies?.sp ?? 0)),
          ep: Math.max(0, Number(c.ep ?? character.currencies?.ep ?? 0)),
          gp: Math.max(0, Number(c.gp ?? character.currencies?.gp ?? 0)),
          pp: Math.max(0, Number(c.pp ?? character.currencies?.pp ?? 0)),
        };
      }

      if (typeof req.body?.inspiration === 'boolean') {
        character.inspiration = req.body.inspiration;
      }

      if (Array.isArray(req.body?.resources)) {
        if (req.body.resources.length > 50) { res.status(400).json({ error: 'Resource limit exceeded' }); return; }
        character.resources = req.body.resources
          .map((item: Record<string, unknown>) => ({
            name: String(item.name ?? '').slice(0, 100),
            current: Math.max(0, Number(item.current ?? 0)),
            max: Math.max(0, Number(item.max ?? 0)),
            resetOn: typeof item.resetOn === 'string' ? item.resetOn.slice(0, 50) : undefined,
          }))
          .filter((item: { name: string }) => item.name.length > 0);
      }

      if (req.body?.deathSaves && typeof req.body.deathSaves === 'object') {
        const ds = req.body.deathSaves as { successes?: unknown; failures?: unknown };
        character.deathSaves = {
          successes: Math.max(0, Math.min(3, Number(ds.successes ?? character.deathSaves?.successes ?? 0))),
          failures: Math.max(0, Math.min(3, Number(ds.failures ?? character.deathSaves?.failures ?? 0)))
        };
      }

      if (typeof req.body?.notes === 'string') {
        character.notes = req.body.notes.slice(0, 10000);
      }

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
