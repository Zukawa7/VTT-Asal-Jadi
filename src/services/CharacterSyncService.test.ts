import { describe, expect, it, vi } from 'vitest';
import type { Character } from '../types/character.js';
import { CharacterSyncService } from './CharacterSyncService.js';

const character: Character = {
  id: '123',
  name: 'Test Hero',
  avatarUrl: 'https://example.com/avatar.png',
  race: 'Human',
  classes: [{ name: 'Fighter', level: 3 }],
  level: 3,
  hp: { current: 20, max: 30, temp: 0 },
  stats: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
  modifiers: { str: 3, dex: 1, con: 2, int: 0, wis: 0, cha: -1 },
};

function createDatabase() {
  const rows = new Map<string, { id: string; user_id: number; character_data: string; last_synced: string }>();
  return {
    rows,
    run: vi.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('INSERT INTO character_sheets')) {
        rows.set(String(params[0]), { id: String(params[0]), user_id: Number(params[1]), character_data: String(params[2]), last_synced: new Date().toISOString() });
      }
      return { lastID: 1, changes: 1 };
    }),
    get: vi.fn(async (_sql: string, params: unknown[] = []) => {
      const row = rows.get(String(params[0]));
      if (!row) return undefined;
      if (params.length > 1 && row.user_id !== Number(params[1])) return undefined;
      return row;
    }),
    all: vi.fn(async () => [...rows.values()]),
  };
}

describe('CharacterSyncService', () => {
  it('imports and stores a character', async () => {
    const db = createDatabase();
    const ddb = { fetchCharacter: vi.fn().mockResolvedValue(character) };
    const service = new CharacterSyncService(db as never, ddb as never);

    const result = await service.importAndStore('123', 7);

    expect(result).toEqual(character);
    expect(ddb.fetchCharacter).toHaveBeenCalledWith('123');
    expect(db.rows.get('123')?.user_id).toBe(7);
  });

  it('updates only the owner character HP', async () => {
    const db = createDatabase();
    const ddb = { fetchCharacter: vi.fn() };
    const service = new CharacterSyncService(db as never, ddb as never);
    await service.save(character, 7);

    const updated = await service.updateHitPoints('123', 7, 25, 4);
    const rejected = await service.updateHitPoints('123', 99, 10);

    expect(updated?.hp).toEqual({ current: 25, max: 30, temp: 4 });
    expect(rejected).toBeNull();
  });

  it('rejects negative hit points', async () => {
    const db = createDatabase();
    const service = new CharacterSyncService(db as never, {} as never);
    await expect(service.updateHitPoints('123', 7, -1)).rejects.toThrow('non-negative');
  });
});
