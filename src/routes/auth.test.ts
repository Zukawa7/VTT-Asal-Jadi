import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAuthRouter } from './auth.js';

function createDb() {
  const users: Array<{ id: number; username: string; password_hash: string; salt: string }> = [];
  return {
    users,
    get: async (_sql: string, params: unknown[] = []) => users.find((user) => user.username === params[0]),
    run: async (_sql: string, params: unknown[] = []) => {
      users.push({ id: users.length + 1, username: String(params[0]), password_hash: String(params[1]), salt: String(params[2]) });
      return { lastID: users.length, changes: 1 };
    },
  };
}

describe('typed auth routes', () => {
  it('registers and logs in a user with JSON responses', async () => {
    const db = createDb();
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(db as never, 'test-secret'));

    const register = await request(app).post('/auth/register').send({ username: 'tester', password: 'password123' });
    const login = await request(app).post('/auth/login').send({ username: 'tester', password: 'password123' });

    expect(register.status).toBe(201);
    expect(register.body.success).toBe(true);
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
  });

  it('rejects invalid credentials', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter(createDb() as never, 'test-secret'));

    const response = await request(app).post('/auth/login').send({ username: 'unknown', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid username or password' });
  });
});
