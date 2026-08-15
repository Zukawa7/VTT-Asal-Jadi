import type { Character } from '../types/character.js';
import type { DatabaseService } from './DatabaseService.js';
import { DnDBeyondService } from './DnDBeyondService.js';

interface CharacterSheetRow { id: string; user_id: number; character_data: string; last_synced: string; }

export class CharacterSyncService {
  constructor(
    private readonly db: DatabaseService,
    private readonly dndBeyond: DnDBeyondService = new DnDBeyondService(),
  ) {}

  private timer?: ReturnType<typeof setInterval>;

  start(intervalMs = 5 * 60 * 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.syncAll(); }, intervalMs);
    void this.syncAll();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async syncAll(): Promise<void> {
    const rows = await this.db.all<Pick<CharacterSheetRow, 'id' | 'user_id'>>('SELECT id, user_id FROM character_sheets');
    for (const row of rows) {
      try {
        const character = await this.dndBeyond.fetchCharacter(row.id);
        await this.save(character, row.user_id);
      } catch {
        // One unavailable/private character must not stop the remaining syncs.
      }
    }
  }

  async importAndStore(characterId: string, userId: number): Promise<Character> {
    const character = await this.dndBeyond.fetchCharacter(characterId);
    await this.save(character, userId);
    return character;
  }

  async save(character: Character, userId: number): Promise<void> {
    await this.db.run(
      `INSERT INTO character_sheets (id, user_id, character_data, last_synced)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET character_data=excluded.character_data,
       user_id=excluded.user_id, last_synced=CURRENT_TIMESTAMP`,
      [String(character.id), userId, JSON.stringify(character)],
    );
  }

  async get(characterId: string, userId?: number): Promise<Character | null> {
    const query = userId === undefined
      ? 'SELECT * FROM character_sheets WHERE id = ?'
      : 'SELECT * FROM character_sheets WHERE id = ? AND user_id = ?';
    const params = userId === undefined ? [characterId] : [characterId, userId];
    const row = await this.db.get<CharacterSheetRow>(query, params);
    return row ? JSON.parse(row.character_data) as Character : null;
  }

  async updateHitPoints(characterId: string, userId: number, current: number, temp?: number): Promise<Character | null> {
    if (!Number.isFinite(current) || current < 0) throw new Error('Current HP must be a non-negative number');
    const character = await this.get(characterId, userId);
    if (!character) return null;
    character.hp.current = Math.min(current, character.hp.max);
    if (temp !== undefined) character.hp.temp = Math.max(0, temp);
    await this.save(character, userId);
    return character;
  }
}
