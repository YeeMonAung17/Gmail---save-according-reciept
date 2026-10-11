import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { DatabaseService } from '../src/database/database.service';

test('session state and unique delivery records survive reopening SQLite', () => {
  process.env.DATABASE_PATH = join(
    mkdtempSync(join(tmpdir(), 'recurrsave-storage-')),
    'test.sqlite',
  );
  const first = new DatabaseService();
  first.create('session', {
    draft: null,
    plan: null,
    rules: [],
    entries: [],
    days: [],
    boosts: [],
    demoDate: '2026-10-10',
  });
  first.update('session', (state) => {
    state.boosts.push('2026-10-10');
    state.entries.push({
      id: 'entry',
      receiptId: 'message',
      merchant: 'gym',
      date: '2026-10-10',
      description: 'Gym',
      amount: 3200,
      saved: 320,
      essential: true,
      source: 'receipt',
      status: 'saved',
      reason: 'Saved',
    });
  });
  first.onModuleDestroy();
  const reopened = new DatabaseService();
  assert.equal(reopened.read('session').entries[0].saved, 320);
  assert.deepEqual(reopened.read('session').boosts, ['2026-10-10']);
  assert.throws(() =>
    reopened.update('session', (state) => {
      state.boosts.push('2026-10-11', '2026-10-11');
    }),
  );
  assert.deepEqual(reopened.read('session').boosts, ['2026-10-10']);
  reopened.onModuleDestroy();
});

test('reset permanently removes session and related records and rolls back on failure', () => {
  const path = join(
    mkdtempSync(join(tmpdir(), 'recurrsave-reset-')),
    'test.sqlite',
  );
  process.env.DATABASE_PATH = path;
  const database = new DatabaseService();
  const inspect = new DatabaseSync(path);
  try {
    database.create('reset-session', {
      draft: null,
      plan: null,
      rules: [],
      entries: [],
      days: [],
      boosts: [],
      demoDate: '2026-10-10',
    });
    inspect.exec(`
      INSERT INTO receipt_deliveries VALUES ('reset-session', 'receipt');
      INSERT INTO boost_awards VALUES ('reset-session', '2026-10-10');
      CREATE TRIGGER reject_reset BEFORE DELETE ON sessions
      BEGIN SELECT RAISE(ABORT, 'Intentional failure'); END;
    `);
    assert.throws(
      () => database.delete('reset-session'),
      /Intentional failure/,
    );
    assert.equal(database.exists('reset-session'), true);
    for (const table of ['receipt_deliveries', 'boost_awards'])
      assert.equal(inspect.prepare(`SELECT * FROM ${table}`).all().length, 1);
    inspect.exec('DROP TRIGGER reject_reset');
    database.delete('reset-session');
    assert.equal(database.exists('reset-session'), false);
  } finally {
    inspect.close();
    database.onModuleDestroy();
  }
  const reopened = new DatabaseSync(path);
  try {
    for (const table of ['sessions', 'receipt_deliveries', 'boost_awards'])
      assert.equal(reopened.prepare(`SELECT * FROM ${table}`).all().length, 0);
  } finally {
    reopened.close();
  }
});
