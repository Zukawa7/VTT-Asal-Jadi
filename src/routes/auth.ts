import { Router } from 'express';
import jwt from 'jsonwebtoken';
import type { DatabaseService } from '../services/DatabaseService.js';
import { createSalt, hashPassword } from '../utils/crypto.js';
import { validateUsername } from '../utils/validators.js';

interface UserRow { id: number; username: string; password_hash: string; salt: string; }

export function createAuthRouter(db: DatabaseService, jwtSecret: string): Router {
  const router = Router();
  router.post('/register', async (req, res, next) => {
    try {
      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!validateUsername(username) || password.length < 6) { res.status(400).json({ error: 'Invalid username or password format' }); return; }
      if (await db.get('SELECT id FROM users WHERE username = ?', [username])) { res.status(409).json({ error: 'Username is already taken' }); return; }
      const salt = createSalt();
      await db.run('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)', [username, hashPassword(password, salt), salt]);
      res.status(201).json({ success: true });
    } catch (error) { next(error); }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const username = String(req.body?.username ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const user = await db.get<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
      if (!user || hashPassword(password, user.salt) !== user.password_hash) { res.status(401).json({ error: 'Invalid username or password' }); return; }
      const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '7d' });
      res.json({ token, username: user.username });
    } catch (error) { next(error); }
  });
  return router;
}
