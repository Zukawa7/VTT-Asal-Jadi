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

  it('returns participants for a valid room', async () => {
    const db = createDb();
    db.all.mockResolvedValueOnce([{ userId: 7, characterId: '123' }]);
    const app = express();
    app.use(express.json());
    app.use('/sessions', createSessionsRouter(db as never, secret));

    const response = await request(app)
      .get('/sessions/room-test/participants')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ userId: 7, characterId: '123' }]);
  });

  it('returns analytics for a valid room', async () => {
    const db = createDb();
    db.get.mockResolvedValueOnce({ id: 1, roomId: 'room-test' }) // session
          .mockResolvedValueOnce({ totalRolls: 5, averageResult: 15.5, criticalCount: 1 }); // summary
    db.all.mockResolvedValueOnce([{ formula: '1d20', uses: 5 }]); // formulas
    const app = express();
    app.use(express.json());
    app.use('/sessions', createSessionsRouter(db as never, secret));

    const response = await request(app).get('/sessions/room-test/analytics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ totalRolls: 5, averageResult: 15.5, criticalCount: 1, formulas: [{ formula: '1d20', uses: 5 }] });
  });

  it('exports rolls as JSON', async () => {
    const db = createDb();
    db.all.mockResolvedValueOnce([{ characterId: '123', formula: '1d20', result: 15 }]);
    const app = express();
    app.use(express.json());
    app.use('/sessions', createSessionsRouter(db as never, secret));

    const response = await request(app).get('/sessions/room-test/export');

    expect(response.status).toBe(200);
    expect(response.body.roomId).toBe('room-test');
    expect(response.body.rolls).toHaveLength(1);
    expect(response.body.rolls[0].formula).toBe('1d20');
  });

  it('exports rolls as CSV', async () => {
    const db = createDb();
    db.all.mockResolvedValueOnce([{ characterId: '123', formula: '1d20', result: 15, isCritical: 0, rolls: '[15]', createdAt: '2023-01-01' }]);
    const app = express();
    app.use(express.json());
    app.use('/sessions', createSessionsRouter(db as never, secret));

    const response = await request(app).get('/sessions/room-test/export.csv');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('characterId,formula,result,isCritical,rolls,createdAt');
    expect(response.text).toContain('"123","1d20","15","0","[15]","2023-01-01"');
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
