import crypto from 'node:crypto';
import type { DatabaseService } from './DatabaseService.js';

export interface GameSession { id: number; roomId: string; name: string; description: string; createdBy: number | null; createdAt: string; updatedAt: string; }
export interface Participant { userId: number; characterId: string | null; joinedAt: string; }

export class GameSessionService {
  constructor(private readonly db: DatabaseService) {}

  async create(roomId: string, createdBy: number, name = '', description = '', password?: string): Promise<GameSession> {
    await this.db.run('INSERT INTO game_sessions (room_id, created_by, name, description) VALUES (?, ?, ?, ?)', [roomId, createdBy, name, description]);
    if (password) await this.db.run('INSERT INTO session_passwords (session_id, password_hash) VALUES ((SELECT id FROM game_sessions WHERE room_id = ?), ?)', [roomId, this.hashPassword(password)]);
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

  async analytics(roomId: string): Promise<Record<string, unknown>> {
    const session = await this.get(roomId);
    if (!session) return { totalRolls: 0, averageResult: 0, criticalCount: 0, formulas: [] };
    const summary = await this.db.get<{ totalRolls: number; averageResult: number | null; criticalCount: number }>(`SELECT COUNT(*) AS totalRolls, AVG(result) AS averageResult, SUM(is_critical) AS criticalCount FROM dice_rolls WHERE session_id = ?`, [session.id]);
    const formulas = await this.db.all<{ formula: string; uses: number }>(`SELECT roll_formula AS formula, COUNT(*) AS uses FROM dice_rolls WHERE session_id = ? GROUP BY roll_formula ORDER BY uses DESC`, [session.id]);
    return { totalRolls: summary?.totalRolls ?? 0, averageResult: summary?.averageResult ?? 0, criticalCount: summary?.criticalCount ?? 0, formulas };
  }

  async exportRolls(roomId: string): Promise<Record<string, unknown>[]> {
    const session = await this.get(roomId);
    if (!session) return [];
    return this.db.all(`SELECT character_id AS characterId, roll_formula AS formula, result,
      is_critical AS isCritical, rolls_json AS rolls, created_at AS createdAt
      FROM dice_rolls WHERE session_id = ? ORDER BY id ASC`, [session.id]);
  }

  async join(roomId: string, userId: number, password?: string, characterId?: string): Promise<Participant> {
    const session = await this.get(roomId);
    if (!session) throw new Error('Session not found');
    const secret = await this.db.get<{ password_hash: string }>('SELECT password_hash FROM session_passwords WHERE session_id = ?', [session.id]);
    if (secret && this.hashPassword(password ?? '') !== secret.password_hash) throw new Error('Invalid session password');
    await this.db.run(`INSERT INTO session_participants (session_id, user_id, character_id) VALUES (?, ?, ?)
      ON CONFLICT(session_id, user_id) DO UPDATE SET character_id=excluded.character_id`, [session.id, userId, characterId ?? null]);
    return (await this.db.get<Participant>('SELECT user_id AS userId, character_id AS characterId, joined_at AS joinedAt FROM session_participants WHERE session_id = ? AND user_id = ?', [session.id, userId])) as Participant;
  }

  async participants(roomId: string): Promise<Participant[]> {
    const session = await this.get(roomId);
    return session ? this.db.all<Participant>('SELECT user_id AS userId, character_id AS characterId, joined_at AS joinedAt FROM session_participants WHERE session_id = ?', [session.id]) : [];
  }

  private hashPassword(password: string): string { return crypto.createHash('sha256').update(password).digest('hex'); }

  static generateRoomId(prefix = 'room'): string {
    return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
  }
}
