import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseService } from '../src/database/database.service';

test('session state and unique delivery records survive reopening SQLite', () => {
  process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), 'recurrsave-storage-')), 'test.sqlite');
  const first = new DatabaseService();
  first.create('session', { draft: null, plan: null, rules: [], entries: [], days: [], boosts: [], demoDate: '2026-10-10' });
  first.update('session', (state) => {
    state.boosts.push('2026-10-10');
    state.entries.push({ id: 'entry', receiptId: 'message', merchant: 'gym', date: '2026-10-10', description: 'Gym', amount: 3200, saved: 320, essential: true, source: 'receipt', status: 'saved', reason: 'Saved' });
  });
  first.onModuleDestroy();
  const reopened = new DatabaseService();
  assert.equal(reopened.read('session').entries[0].saved, 320);
  assert.deepEqual(reopened.read('session').boosts, ['2026-10-10']);
  assert.throws(() => reopened.update('session', (state) => { state.boosts.push('2026-10-11', '2026-10-11'); }));
  assert.deepEqual(reopened.read('session').boosts, ['2026-10-10']);
  reopened.onModuleDestroy();
});
