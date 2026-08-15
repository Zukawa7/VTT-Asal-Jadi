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
