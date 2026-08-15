import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createSessionsRouter } from './sessions.js';

function createDb() {
  return {
    get: vi.fn(async (sql: string) => sql.includes('FROM game_sessions') ? { id: 3, roomId: 'room-test' } : undefined),
    all: vi.fn(async () => [{ characterId: '123', formula: '2d6+4', result: 12, isCritical: 0, rolls: '[4,4]', createdAt: '2026-01-01T00:00:00.000Z' }]),
    run: vi.fn(),
  };
}

function createApp(db: ReturnType<typeof createDb>) {
  const app = express();
  app.use('/sessions', createSessionsRouter(db as never, 'test-secret'));
  return app;
}

describe('session export routes', () => {
  it('exports session rolls as JSON', async () => {
    const response = await request(createApp(createDb())).get('/sessions/room-test/export');

    expect(response.status).toBe(200);
    expect(response.body.roomId).toBe('room-test');
    expect(response.body.rolls[0]).toMatchObject({ characterId: '123', result: 12 });
  });

  it('exports session rolls as CSV with a header', async () => {
    const response = await request(createApp(createDb())).get('/sessions/room-test/export.csv');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('characterId,formula,result,isCritical,rolls,createdAt');
    expect(response.text).toContain('"2d6+4"');
  });

  it('returns an empty JSON export for an unknown room', async () => {
    const db = createDb();
    db.get.mockResolvedValue(undefined);
    const response = await request(createApp(db)).get('/sessions/room-test/export');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ roomId: 'room-test', rolls: [] });
  });
});
