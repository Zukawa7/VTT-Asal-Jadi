import { describe, expect, it, vi } from 'vitest';
import { GameSessionService } from './GameSessionService.js';

const session = { id: 1, roomId: 'room-test', name: 'Test Game', description: 'A test', createdBy: 7, createdAt: '', updatedAt: '' };

describe('GameSessionService', () => {
  it('creates a session and generates valid room IDs', async () => {
    const db = {
      run: vi.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
      get: vi.fn().mockResolvedValue(session),
    };
    const service = new GameSessionService(db as never);
    const result = await service.create('room-test', 7, 'Test Game', 'A test');

    expect(result).toEqual(session);
    expect(db.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO game_sessions'), ['room-test', 7, 'Test Game', 'A test']);
    expect(GameSessionService.generateRoomId()).toMatch(/^room-[a-f0-9]{8}$/);
  });

  it('joins a public session with a character', async () => {
    const db = {
      get: vi.fn()
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ userId: 9, characterId: '123', joinedAt: '' }),
      run: vi.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
    };
    const participant = await new GameSessionService(db as never).join('room-test', 9, undefined, '123');

    expect(participant.characterId).toBe('123');
    expect(db.run).toHaveBeenCalledWith(expect.stringContaining('session_participants'), [1, 9, '123']);
  });

  it('returns analytics for a session', async () => {
    const db = {
      get: vi.fn()
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce({ totalRolls: 10, averageResult: 12.5, criticalCount: 2 }),
      all: vi.fn().mockResolvedValueOnce([{ formula: '1d20', uses: 5 }]),
    };
    const analytics = await new GameSessionService(db as never).analytics('room-test');
    expect(analytics.totalRolls).toBe(10);
    expect(analytics.averageResult).toBe(12.5);
    expect(analytics.criticalCount).toBe(2);
    expect(analytics.formulas).toEqual([{ formula: '1d20', uses: 5 }]);
  });

  it('exports rolls for a session', async () => {
    const db = {
      get: vi.fn().mockResolvedValueOnce(session),
      all: vi.fn().mockResolvedValueOnce([{ characterId: '123', formula: '1d20', result: 15 }]),
    };
    const rolls = await new GameSessionService(db as never).exportRolls('room-test');
    expect(rolls).toHaveLength(1);
    expect(rolls[0].formula).toBe('1d20');
  });

  it('gets participants for a session', async () => {
    const db = {
      get: vi.fn().mockResolvedValueOnce(session),
      all: vi.fn().mockResolvedValueOnce([{ userId: 9, characterId: '123', joinedAt: '' }]),
    };
    const participants = await new GameSessionService(db as never).participants('room-test');
    expect(participants).toHaveLength(1);
    expect(participants[0].userId).toBe(9);
  });

  it('ensures a session exists', async () => {
    const db = {
      run: vi.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
      get: vi.fn().mockResolvedValue(session),
    };
    const result = await new GameSessionService(db as never).ensure('room-test');
    expect(result).toEqual(session);
    expect(db.run).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE'), ['room-test']);
  });


  it('rejects an incorrect protected session password', async () => {
    const db = {
      get: vi.fn()
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce({ password_hash: 'different-hash' }),
      run: vi.fn(),
    };
    await expect(new GameSessionService(db as never).join('room-test', 9, 'wrong')).rejects.toThrow('Invalid session password');
    expect(db.run).not.toHaveBeenCalled();
  });
});
