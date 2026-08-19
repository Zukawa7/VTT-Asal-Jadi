import sqlite3 from 'sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export interface DatabaseRunResult {
  lastID: number;
  changes: number;
}

function resolveWritableDatabasePath(databasePath: string): string {
  try {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    return databasePath;
  } catch (error) {
    const fallback = path.join('/tmp', 'vtt.db');
    if (databasePath !== fallback) {
      try {
        fs.mkdirSync(path.dirname(fallback), { recursive: true });
        return fallback;
      } catch {
        return fallback;
      }
    }
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'EROFS') {
      return fallback;
    }
    throw error;
  }
}

export class DatabaseService {
  private readonly db: sqlite3.Database;

  constructor(databasePath: string) {
    const safePath = resolveWritableDatabasePath(databasePath);
    this.db = new sqlite3.Database(safePath);
  }

  async migrate(): Promise<void> {
    await this.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT UNIQUE NOT NULL,
        created_by INTEGER,
        name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS session_participants (
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        character_id TEXT,
        joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id, user_id),
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS session_passwords (
        session_id INTEGER PRIMARY KEY,
        password_hash TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS dice_rolls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        character_id TEXT,
        user_id INTEGER,
        roll_formula TEXT NOT NULL,
        result INTEGER NOT NULL,
        is_critical INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS character_sheets (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        character_data TEXT NOT NULL,
        last_synced TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Backfill characters imported by the legacy runtime into the typed store.
    await this.exec(`
      INSERT OR IGNORE INTO character_sheets (id, user_id, character_data, last_synced)
      SELECT id, user_id, data, COALESCE(created_at, CURRENT_TIMESTAMP)
      FROM characters
    `);
  }

  run(sql: string, params: unknown[] = []): Promise<DatabaseRunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function onRun(error) {
        if (error) reject(error);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) =>
        error ? reject(error) : resolve(row as T | undefined),
      );
    });
  }

  all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) =>
        error ? reject(error) : resolve((rows ?? []) as T[]),
      );
    });
  }

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (error) => (error ? reject(error) : resolve()));
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) =>
      this.db.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
