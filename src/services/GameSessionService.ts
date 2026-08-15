import crypto from 'node:crypto';
import type { DatabaseService } from './DatabaseService.js';

export interface GameSession { id: number; roomId: string; name: string; description: string; createdBy: number | null; createdAt: string; updatedAt: string; }

export class GameSessionService {
  constructor(private readonly db: DatabaseService) {}

  async create(roomId: string, createdBy: number, name = '', description = ''): Promise<GameSession> {
    await this.db.run('INSERT INTO game_sessions (room_id, created_by, name, description) VALUES (?, ?, ?, ?)', [roomId, createdBy, name, description]);
    return this.get(roomId) as Promise<GameSession>;
  }

  async get(roomId: string): Promise<GameSession | undefined> {
    return this.db.get<GameSession>(`SELECT id, room_id AS roomId, created_by AS createdBy, name, description,
      created_at AS createdAt, updated_at AS updatedAt FROM game_sessions WHERE room_id = ?`, [roomId]);
  }

  async ensure(roomId: string): Promise<GameSession> {
    await this.db.run('INSERT OR IGNORE INTO game_sessions (room_id) VALUES (?)', [roomId]);
    return this.get(roomId) as Promise<GameSession>;
  }

  async exportRolls(roomId: string): Promise<Record<string, unknown>[]> {
    const session = await this.get(roomId);
    if (!session) return [];
    return this.db.all(`SELECT character_id AS characterId, roll_formula AS formula, result,
      is_critical AS isCritical, rolls_json AS rolls, created_at AS createdAt
      FROM dice_rolls WHERE session_id = ? ORDER BY id ASC`, [session.id]);
  }

  static generateRoomId(prefix = 'room'): string {
    return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
  }
}
