import type { DatabaseService } from './DatabaseService.js';
import type { RollEvent } from '../types/events.js';

export class RollPersistenceService {
  constructor(private readonly db: DatabaseService) {}

  async persist(event: RollEvent & { characterId?: string }): Promise<void> {
    if (!/^[a-z0-9-]{3,50}$/.test(event.roomId)) return;
    await this.db.run('INSERT OR IGNORE INTO game_sessions (room_id) VALUES (?)', [event.roomId]);
    const session = await this.db.get<{ id: number }>('SELECT id FROM game_sessions WHERE room_id = ?', [event.roomId]);
    if (!session) throw new Error(`Unable to create session for room ${event.roomId}`);
    const firstRoll = event.rolls?.[0];
    const isCritical = firstRoll === 20 || firstRoll === 1 ? 1 : 0;
    await this.db.run(
      `INSERT INTO dice_rolls (session_id, character_id, character_name, roll_name, roll_formula, result, is_critical, rolls_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, event.characterId ?? null, event.characterName || 'Adventurer', event.rollName || 'Roll',
        event.formula || '', Number(event.result) || 0, isCritical, JSON.stringify(event.rolls ?? [])],
    );
  }
}
