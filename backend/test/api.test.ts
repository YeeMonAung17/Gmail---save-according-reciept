import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { createApp } from '../src/bootstrap';
import { DatabaseService } from '../src/database/database.service';
import type { PlanInput } from '../src/domain/models';

let app: INestApplication;
let base: string;
const plan: PlanInput = { income: '3200', rent: '950', utilities: '150', groceries: '250', bills: '150', emergencyMode: 'amount', emergency: '200', goalKind: 'travel', goalName: '', target: '2000', targetDate: '2099-06-01', initialRule: 'round10', step: 5, complete: true };

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.DEMO_ENABLED = 'true';
  app = await createApp(false);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => { await app.close(); });

async function session() {
  const response = await fetch(`${base}/api/dashboard`);
  return response.headers.get('set-cookie')!.split(';')[0];
}
async function call(cookie: string, path: string, method = 'GET', input?: unknown) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { Cookie: cookie, Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: input === undefined ? undefined : JSON.stringify(input) });
  return { status: response.status, data: await response.json() };
}

test('health reports actual storage and session cookies have security flags', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).storage, 'sqlite');
  const response = await fetch(`${base}/api/dashboard`);
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(response.headers.get('set-cookie')!, /SameSite=Lax/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('onboarding validates at runtime, rejects unknown fields and prevents plan rewrites', async () => {
  const cookie = await session();
  assert.equal((await call(cookie, '/onboarding', 'PUT', { ...plan, income: '-1' })).status, 422);
  assert.equal((await call(cookie, '/onboarding', 'PUT', { ...plan, income: 3200 })).status, 400);
  assert.equal((await call(cookie, '/onboarding', 'PUT', { ...plan, owner: 'someone' })).status, 400);
  assert.equal((await call(cookie, '/onboarding', 'PUT', plan)).status, 200);
  assert.equal((await call(cookie, '/onboarding', 'PUT', plan)).status, 409);
  assert.equal((await call(cookie, '/dashboard')).data.budget.weekly, 34615);
});

test('receipt replay does not create another purchase or savings transfer', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const receipt = { merchant: 'playstation', messageId: randomUUID() };
  const first = await call(cookie, '/receipts/simulate', 'POST', receipt);
  const repeated = await call(cookie, '/receipts/simulate', 'POST', receipt);
  assert.equal(first.status, 201);
  assert.equal(first.data.entry.saved, 1);
  assert.equal(repeated.data.duplicate, true);
  const dashboard = (await call(cookie, '/dashboard')).data;
  assert.equal(dashboard.entries.length, 1);
  assert.equal(dashboard.usage.weeklyCommitted, 5000);
  assert.equal(dashboard.goal.saved, 1);
});

test('insufficient budget keeps purchase and skips savings', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', { ...plan, income: '1520', emergency: '0' });
  const result = await call(cookie, '/receipts/simulate', 'POST', { merchant: 'playstation', messageId: randomUUID() });
  assert.equal(result.data.entry.amount, 4999);
  assert.equal(result.data.entry.saved, 0);
  assert.equal(result.data.entry.status, 'skipped');
  assert.equal((await call(cookie, '/dashboard')).data.usage.safeToSpend, 0);
});

test('rule settings avoid double counting explicitly classified essentials', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const rules = (await call(cookie, '/rules')).data.rules;
  rules.find((rule: { merchant: string }) => rule.merchant === 'gym').essential = true;
  assert.equal((await call(cookie, '/rules', 'PUT', { rules })).status, 200);
  await call(cookie, '/receipts/simulate', 'POST', { merchant: 'gym', messageId: randomUUID() });
  const dashboard = (await call(cookie, '/dashboard')).data;
  assert.equal(dashboard.usage.spending, 0);
  assert.equal(dashboard.usage.savings, 320);
  assert.equal(dashboard.usage.weeklyCommitted, 320);
  const duplicateRules = [rules[0], rules[0], rules[2]];
  assert.equal((await call(cookie, '/rules', 'PUT', { rules: duplicateRules })).status, 422);
});

test('sessions are isolated and missing setup cannot mutate the ledger', async () => {
  const first = await session();
  const second = await session();
  await call(first, '/onboarding', 'PUT', plan);
  assert.equal((await call(second, '/dashboard')).data.onboarded, false);
  assert.equal((await call(second, '/spending', 'POST', { id: randomUUID(), amount: '10', description: 'Lunch' })).status, 409);
});

test('manual spending is idempotent and conflicting reuse is rejected', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const spending = { id: randomUUID(), amount: '12.50', description: 'Lunch' };
  assert.equal((await call(cookie, '/spending', 'POST', spending)).status, 201);
  await call(cookie, '/spending', 'POST', spending);
  assert.equal((await call(cookie, '/dashboard')).data.entries.length, 1);
  assert.equal((await call(cookie, '/spending', 'POST', { ...spending, amount: '13' })).status, 409);
});

test('ten confirmed days award one boost and closed days refuse spending', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  for (let index = 0; index < 10; index++) {
    const close = await call(cookie, '/days/close', 'POST', {});
    assert.equal(close.status, 201);
    if (index < 9) await call(cookie, '/demo/advance-day', 'POST', {});
  }
  const result = (await call(cookie, '/dashboard')).data;
  assert.equal(result.streak, 10);
  assert.equal(result.boosts, 1);
  assert.equal(result.rate, '2.01');
  assert.equal((await call(cookie, '/days/close', 'POST', {})).status, 422);
  assert.equal((await call(cookie, '/spending', 'POST', { id: randomUUID(), amount: '1', description: 'Late spending' })).status, 409);
});

test('unexpected origin, invalid JSON, oversized input and unsupported types are rejected', async () => {
  const badOrigin = await fetch(`${base}/api/spending`, { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(badOrigin.status, 403);
  const malformed = await fetch(`${base}/api/spending`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(malformed.status, 400);
  const oversized = await fetch(`${base}/api/spending`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify({ description: 'x'.repeat(20000) }) });
  assert.equal(oversized.status, 413);
  const plain = await fetch(`${base}/api/spending`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(plain.status, 415);
});

test('database mutations roll back all changes on failure', async () => {
  const database = app.get(DatabaseService);
  const id = randomUUID();
  database.create(id, { draft: null, plan: null, rules: [], entries: [], days: [], boosts: [], demoDate: '2026-10-10' });
  assert.throws(() => database.update(id, (state) => { state.demoDate = '2026-10-11'; throw new Error('Intentional failure'); }));
  assert.equal(database.read(id).demoDate, '2026-10-10');
});

test('concurrent delivery of one receipt creates only one transfer', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const receipt = { merchant: 'gym', messageId: randomUUID() };
  const results = await Promise.all(Array.from({ length: 5 }, () => call(cookie, '/receipts/simulate', 'POST', receipt)));
  assert.equal(results.filter((result) => result.data.duplicate === false).length, 1);
  assert.equal(results.filter((result) => result.data.duplicate === true).length, 4);
  const dashboard = (await call(cookie, '/dashboard')).data;
  assert.equal(dashboard.entries.length, 1);
  assert.equal(dashboard.goal.saved, 320);
});

test('monthly cap prevents savings even when this week has room', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  app.get(DatabaseService).update(cookie.split('=')[1], (state) => { state.demoDate = '2026-10-01'; });
  await call(cookie, '/spending', 'POST', { id: randomUUID(), amount: '1499', description: 'Earlier monthly spending' });
  for (let count = 0; count < 7; count++) await call(cookie, '/demo/advance-day', 'POST', {});
  const rules = (await call(cookie, '/rules')).data.rules;
  rules.forEach((rule: { essential: boolean }) => { rule.essential = true; });
  await call(cookie, '/rules', 'PUT', { rules });
  const dashboard = (await call(cookie, '/dashboard')).data;
  const result = await call(cookie, '/receipts/simulate', 'POST', { merchant: 'gym', messageId: randomUUID() });
  assert.equal(result.data.entry.saved, 0);
  assert.equal(dashboard.usage.weeklyCommitted, 0);
  assert.equal(dashboard.usage.monthlyRemaining, 100);
});
