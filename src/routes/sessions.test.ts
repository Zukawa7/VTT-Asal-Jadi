import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createSessionsRouter } from './sessions.js';

const secret = 'test-secret';
function authToken() { return jwt.sign({ id: 7, username: 'tester' }, secret); }

function createDb() {
  const session = { id: 1, roomId: 'room-test', createdBy: 7, name: 'Test Game', description: 'Test', createdAt: '', updatedAt: '' };
  return {
    get: vi.fn(async (sql: string) => sql.includes('FROM game_sessions') ? session : undefined),
    all: vi.fn(async () => []),
    run: vi.fn(async () => ({ lastID: 1, changes: 1 })),
  };
}

describe('typed session routes', () => {
  it('creates a session for an authenticated user', async () => {
    const db = createDb();
    db.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: 1, roomId: 'room-test', createdBy: 7, name: 'Test Game', description: 'Test', createdAt: '', updatedAt: '' });
    const app = express();
    app.use(express.json());
    app.use('/sessions', createSessionsRouter(db as never, secret));

    const response = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ roomId: 'room-test', name: 'Test Game', description: 'Test' });

    expect(response.status).toBe(201);
    expect(response.body.roomId).toBe('room-test');
  });

  it('rejects invalid room IDs before database access', async () => {
    const db = createDb();
    const app = express();
    app.use(express.json());
    app.use('/sessions', createSessionsRouter(db as never, secret));

    const response = await request(app).get('/sessions/INVALID_ROOM!');

    expect(response.status).toBe(400);
    expect(db.get).not.toHaveBeenCalled();
  });
});
