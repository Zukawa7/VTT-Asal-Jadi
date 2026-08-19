import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createRollsRouter } from './rolls.js';

function createDb() {
  return {
    get: vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id FROM game_sessions')) return { id: 4 };
      return { totalRolls: 2, averageResult: 12.5, criticalCount: 1 };
    }),
    all: vi.fn(async (sql: string) => {
      if (sql.includes('GROUP BY')) return [{ formula: '1d20', uses: 2 }];
      return [
        {
          id: 1,
          characterId: '123',
          characterName: 'Hero',
          rollName: 'Attack',
          formula: '1d20',
          result: 20,
          isCritical: 1,
          rolls: '[20]',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];
    }),
    run: vi.fn(),
  };
}

function createApp(db: ReturnType<typeof createDb>) {
  const app = express();
  app.use('/rolls', createRollsRouter(db as never));
  return app;
}

describe('typed roll routes', () => {
  it('returns roll history with parsed rolls', async () => {
    const response = await request(createApp(createDb())).get('/rolls/room-test');

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ characterName: 'Hero', result: 20, rolls: [20] });
  });

  it('returns roll analytics', async () => {
    const response = await request(createApp(createDb())).get('/rolls/room-test/analytics');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ totalRolls: 2, averageResult: 12.5, criticalCount: 1 });
    expect(response.body.formulas).toEqual([{ formula: '1d20', uses: 2 }]);
  });

  it('rejects invalid room IDs', async () => {
    const db = createDb();
    const response = await request(createApp(db)).get('/rolls/INVALID_ROOM!');

    expect(response.status).toBe(400);
    expect(db.get).not.toHaveBeenCalled();
  });
});
