import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Character } from '../types/character.js';
import { createCharacterRouter } from './character.js';

const secret = 'test-secret';
const character: Character = {
  id: '123', name: 'Test Hero', avatarUrl: 'avatar.png', race: 'Human',
  classes: [{ name: 'Fighter', level: 3 }], level: 3,
  hp: { current: 20, max: 30, temp: 0 },
  stats: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
  modifiers: { str: 3, dex: 1, con: 2, int: 0, wis: 0, cha: -1 },
};

function createDatabase() {
  const rows = new Map<string, { id: string; user_id: number; character_data: string }>();
  return {
    rows,
    get: async <T>(_sql: string, params: unknown[] = []) => {
      const row = rows.get(String(params[0]));
      if (!row || (params.length > 1 && row.user_id !== Number(params[1]))) return undefined;
      return row as T;
    },
    all: async <T>(_sql: string, params: unknown[] = []) => [...rows.values()].filter((row) => row.user_id === Number(params[0])) as T[],
    run: async (sql: string, params: unknown[] = []) => {
      if (sql.includes('INSERT INTO character_sheets')) {
        rows.set(String(params[0]), { id: String(params[0]), user_id: Number(params[1]), character_data: String(params[2]) });
      } else if (sql.startsWith('UPDATE character_sheets')) {
        const row = rows.get(String(params[1]));
        if (row) row.character_data = String(params[0]);
      } else if (sql.startsWith('DELETE FROM character_sheets')) {
        rows.delete(String(params[0]));
      }
      return { lastID: 1, changes: 1 };
    },
  };
}

function token(userId = 7) { return jwt.sign({ id: userId, username: `user${userId}` }, secret); }
function createApp(db: ReturnType<typeof createDatabase>) {
  const ddb = { fetchCharacter: async () => character };
  const app = express();
  app.use(express.json());
  app.use('/character', createCharacterRouter(db as never, secret, ddb as never));
  return app;
}

describe('typed character routes', () => {
  it('imports and lists only the authenticated user characters', async () => {
    const db = createDatabase();
    const app = createApp(db);
    const imported = await request(app).post('/character/import').set('Authorization', `Bearer ${token()}`).send({ characterId: 'https://dndbeyond.com/characters/123' });
    const list = await request(app).get('/character').set('Authorization', `Bearer ${token()}`);

    expect(imported.status).toBe(200);
    expect(imported.body.name).toBe('Test Hero');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('updates HP and prevents access from another user', async () => {
    const db = createDatabase();
    const app = createApp(db);
    await request(app).post('/character/import').set('Authorization', `Bearer ${token()}`).send({ characterId: '123' });

    const updated = await request(app).put('/character/123').set('Authorization', `Bearer ${token()}`).send({ hp: { current: 12, temp: 3 } });
    const forbidden = await request(app).put('/character/123').set('Authorization', `Bearer ${token(99)}`).send({ hp: { current: 1 } });

    expect(updated.status).toBe(200);
    expect(updated.body.hp).toEqual({ current: 12, max: 30, temp: 3 });
    expect(forbidden.status).toBe(404);
  });

  it('preserves enrichment fields when updating equipment and handles new character fields', async () => {
    const db = createDatabase();
    const app = createApp(db);
    await request(app).post('/character/import').set('Authorization', `Bearer ${token()}`).send({ characterId: '123' });

    const charWithEquipment = { ...character, equipment: [{ id: '99', name: 'Sword', quantity: 1, weight: 3, equipped: false, category: 'Equipment', isWeapon: true, attackBonus: 5, damage: '1d8+3', range: '5 ft.' }] };
    db.rows.set('123', { id: '123', user_id: 7, character_data: JSON.stringify(charWithEquipment) });

    const updated = await request(app)
      .put('/character/123')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        equipment: [{ id: '99', name: 'Sword', quantity: 1, weight: 3, equipped: true, category: 'Equipment', isWeapon: true, attackBonus: 5, damage: '1d8+3', range: '5 ft.' }],
        currencies: { gp: 50 },
        inspiration: true,
        resources: [{ name: 'Rage', current: 1, max: 2, resetOn: 'long rest' }],
        notes: 'Test notes'
      });

    expect(updated.status).toBe(200);
    expect(updated.body.equipment[0]).toMatchObject({ id: '99', equipped: true, category: 'Equipment', isWeapon: true, attackBonus: 5, damage: '1d8+3' });
    expect(updated.body.currencies).toMatchObject({ gp: 50, cp: 0 });
    expect(updated.body.inspiration).toBe(true);
    expect(updated.body.resources[0]).toMatchObject({ name: 'Rage', current: 1, max: 2 });
    expect(updated.body.notes).toBe('Test notes');
  });

  it('requires authentication for import and supports deletion', async () => {
    const db = createDatabase();
    const app = createApp(db);
    const unauthorized = await request(app).post('/character/import').send({ characterId: '123' });
    await request(app).post('/character/import').set('Authorization', `Bearer ${token()}`).send({ characterId: '123' });
    const deleted = await request(app).delete('/character/123').set('Authorization', `Bearer ${token()}`);

    expect(unauthorized.status).toBe(401);
    expect(deleted.status).toBe(200);
  });
});
