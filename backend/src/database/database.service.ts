import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SessionState } from '../domain/models';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly db: DatabaseSync;

  constructor() {
    const path = process.env.DATABASE_PATH || './data/recurrsave.sqlite';
    if (path !== ':memory:')
      mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    const version = this.db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    if (version.user_version > 1) {
      this.db.close();
      throw new Error(
        'This database schema is newer than the application supports.',
      );
    }
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK(json_valid(state)),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS receipt_deliveries (
        session_id TEXT NOT NULL REFERENCES sessions(id),
        receipt_id TEXT NOT NULL,
        PRIMARY KEY (session_id, receipt_id)
      );
      CREATE TABLE IF NOT EXISTS boost_awards (
        session_id TEXT NOT NULL REFERENCES sessions(id),
        day TEXT NOT NULL,
        PRIMARY KEY (session_id, day)
      );
      PRAGMA user_version = 1;
    `);
  }

  exists(id: string): boolean {
    return (
      this.db.prepare('SELECT 1 FROM sessions WHERE id = ?').get(id) !==
      undefined
    );
  }

  create(id: string, state: SessionState): void {
    this.db
      .prepare('INSERT INTO sessions (id, state) VALUES (?, ?)')
      .run(id, JSON.stringify(state));
  }

  read(id: string): SessionState {
    const row = this.db
      .prepare('SELECT state FROM sessions WHERE id = ?')
      .get(id) as { state: string } | undefined;
    if (!row) throw new Error('Session storage is unavailable.');
    return JSON.parse(row.state) as SessionState;
  }

  update<T>(id: string, action: (state: SessionState) => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const state = this.read(id);
      const oldReceipts = new Set(
        state.entries.map((entry) => entry.receiptId),
      );
      const oldBoosts = new Set(state.boosts);
      const result = action(state);
      for (const entry of state.entries) {
        if (entry.receiptId && !oldReceipts.has(entry.receiptId)) {
          this.db
            .prepare(
              'INSERT INTO receipt_deliveries (session_id, receipt_id) VALUES (?, ?)',
            )
            .run(id, entry.receiptId);
        }
      }
      for (const day of state.boosts) {
        if (!oldBoosts.has(day))
          this.db
            .prepare('INSERT INTO boost_awards (session_id, day) VALUES (?, ?)')
            .run(id, day);
      }
      this.db
        .prepare('UPDATE sessions SET state = ? WHERE id = ?')
        .run(JSON.stringify(state), id);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  delete(id: string): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare('DELETE FROM receipt_deliveries WHERE session_id = ?')
        .run(id);
      this.db.prepare('DELETE FROM boost_awards WHERE session_id = ?').run(id);
      this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  health(): boolean {
    return this.db.prepare('SELECT 1').get() !== undefined;
  }
  onModuleDestroy(): void {
    this.db.close();
  }
}
