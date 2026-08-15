import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/user.js';

export function authenticateToken(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) { res.status(401).json({ error: 'Access token required' }); return; }
    try {
      const user = jwt.verify(token, secret) as JwtPayload;
      res.locals.user = user;
      next();
    } catch { res.status(403).json({ error: 'Invalid or expired token' }); }
  };
}
