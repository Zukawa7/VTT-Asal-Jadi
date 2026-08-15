import type { Character } from '../types/character.js';
import { DnDBeyondService } from './DnDBeyondService.js';
import type { DatabaseService } from './DatabaseService.js';

export class CharacterSyncService {
  private timer?: NodeJS.Timeout;

  constructor(private readonly db: DatabaseService, private readonly ddb: DnDBeyondService = new DnDBeyondService()) {}

  async sync(characterId: string, userId: number): Promise<Character> {
    const character = await this.ddb.fetchCharacter(characterId);
    await this.db.run(`INSERT INTO character_sheets (id, user_id, character_data, last_synced)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET character_data=excluded.character_data, last_synced=CURRENT_TIMESTAMP`,
    [String(character.id), userId, JSON.stringify(character)]);
    return character;
  }

  start(intervalMs = 5 * 60 * 1000): void {
    this.stop();
    this.timer = setInterval(() => void this.syncAll(), intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async syncAll(): Promise<void> {
    const rows = await this.db.all<{ id: string; user_id: number }>('SELECT id, user_id FROM character_sheets');
    await Promise.allSettled(rows.map((row) => this.sync(row.id, row.user_id)));
  }
}
