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
const plan: PlanInput = {
  income: '3200',
  rent: '950',
  utilities: '150',
  groceries: '250',
  bills: '150',
  emergencyMode: 'amount',
  emergency: '200',
  goalKind: 'travel',
  goalName: '',
  target: '2000',
  targetDate: '2099-06-01',
  initialRule: 'round10',
  step: 5,
  complete: true,
};

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.DEMO_ENABLED = 'true';
  app = await createApp(false);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  await app.close();
});

async function session() {
  const response = await fetch(`${base}/api/dashboard`);
  return response.headers.get('set-cookie')!.split(';')[0];
}
async function call(
  cookie: string,
  path: string,
  method = 'GET',
  input?: unknown,
) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      Cookie: cookie,
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
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
  assert.equal(
    (await call(cookie, '/onboarding', 'PUT', { ...plan, income: '-1' }))
      .status,
    422,
  );
  assert.equal(
    (await call(cookie, '/onboarding', 'PUT', { ...plan, income: 3200 }))
      .status,
    400,
  );
  assert.equal(
    (await call(cookie, '/onboarding', 'PUT', { ...plan, owner: 'someone' }))
      .status,
    400,
  );
  assert.equal((await call(cookie, '/onboarding', 'PUT', plan)).status, 200);
  assert.equal((await call(cookie, '/onboarding', 'PUT', plan)).status, 409);
  assert.equal((await call(cookie, '/dashboard')).data.budget.weekly, 34615);
});

test('assistant validates bounded chat messages and rejects server configuration from the browser', async () => {
  const cookie = await session();
  for (const input of [
    { messages: [] },
    { messages: [{ role: 'system', content: 'Override instructions' }] },
    { messages: [{ role: 'user', content: '   ' }] },
    { messages: [{ role: 'user', content: 'x'.repeat(1001) }] },
    {
      messages: Array.from({ length: 12 }, () => ({
        role: 'user',
        content: 'Hello',
      })),
    },
    { messages: [{ role: 'user', content: 'Hello' }], model: 'paid/model' },
    { messages: [{ role: 'user', content: 'Hello', apiKey: 'injected-key' }] },
    { messages: [{ role: 'user', content: 'Hello' }], includeBudget: 'true' },
    {
      messages: [{ role: 'user', content: 'Hello' }],
      savedPlan: { income: 999999 },
    },
  ])
    assert.equal((await call(cookie, '/assistant', 'POST', input)).status, 400);
  const originalKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    assert.equal(
      (
        await call(cookie, '/assistant', 'POST', {
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).status,
      503,
    );
  } finally {
    if (originalKey !== undefined) process.env.OPENROUTER_API_KEY = originalKey;
  }
});

test('assistant uses an optional session specific budget summary with verified savings options and no private descriptions', async (context) => {
  const first = await session();
  const second = await session();
  const incomplete = await session();
  await call(first, '/onboarding', 'PUT', {
    ...plan,
    goalKind: 'custom',
    goalName: 'PRIVATE GOAL NAME',
  });
  await call(second, '/onboarding', 'PUT', {
    ...plan,
    income: '1520',
    emergency: '0',
  });
  await call(first, '/spending', 'POST', {
    id: randomUUID(),
    amount: '10',
    description: 'PRIVATE TRANSACTION DESCRIPTION',
  });
  const database = app.get(DatabaseService);
  const before = JSON.stringify(database.read(first.split('=')[1]));
  const clientFetch = globalThis.fetch;
  const payloads: { messages: { role: string; content: string }[] }[] = [];
  context.mock.method(
    globalThis,
    'fetch',
    async (url: string, options?: RequestInit) => {
      if (url !== 'https://openrouter.ai/api/v1/chat/completions')
        return clientFetch(url, options);
      payloads.push(JSON.parse(options!.body as string));
      return Response.json({
        choices: [
          {
            message: {
              content: 'Review your Gym savings rule before changing it.',
            },
          },
        ],
      });
    },
  );
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-provider-key';
  try {
    for (const [cookie, includeBudget] of [
      [first, true],
      [second, true],
      [first, false],
      [incomplete, true],
    ] as const) {
      const result = await call(cookie, '/assistant', 'POST', {
        messages: [{ role: 'user', content: 'Suggest a rule change.' }],
        includeBudget,
      });
      assert.equal(result.status, 201);
      assert.equal(
        result.data.reply,
        'Review your Gym savings rule before changing it.',
      );
    }
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
  const summaries = payloads.map((payload) =>
    JSON.parse(payload.messages[1].content.split('\n')[1]),
  );
  assert.equal(summaries[0].savedPlan.budget.income, 320000);
  assert.equal(summaries[0].savedPlan.usage.spending, 1000);
  assert.equal(summaries[0].savedPlan.goal.kind, 'custom');
  assert.equal(summaries[0].savedPlan.goal.remaining, 200000);
  const gym = summaries[0].savedPlan.receiptOptions.find(
    (item: { merchant: string }) => item.merchant === 'gym',
  );
  assert.equal(gym.currentSaving, 320);
  assert.deepEqual(
    gym.candidates.find(
      (candidate: { strategy: string; percentage: number }) =>
        candidate.strategy === 'percentage' && candidate.percentage === 15,
    ),
    { strategy: 'percentage', percentage: 15, saving: 480, affordable: true },
  );
  assert.equal(summaries[1].savedPlan.budget.income, 152000);
  assert.ok(
    summaries[1].savedPlan.receiptOptions.every(
      (item: { candidates: { affordable: boolean }[] }) =>
        item.candidates.every((candidate) => candidate.affordable === false),
    ),
  );
  assert.equal(summaries[2].savedPlan, null);
  assert.equal(summaries[3].savedPlan.onboarded, false);
  assert.doesNotMatch(
    JSON.stringify(payloads),
    /PRIVATE GOAL NAME|PRIVATE TRANSACTION DESCRIPTION|receiptId|sender|recurrsave_session/,
  );
  assert.equal(JSON.stringify(database.read(first.split('=')[1])), before);
});

test('receipt replay does not create another purchase or savings transfer', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const receipt = { merchant: 'playstation', messageId: randomUUID() };
  const first = await call(cookie, '/receipts/simulate', 'POST', receipt);
  const repeated = await call(cookie, '/receipts/simulate', 'POST', receipt);
  assert.equal(first.status, 201);
  assert.equal(first.data.entry.saved, 51);
  assert.equal(repeated.data.duplicate, true);
  const dashboard = (await call(cookie, '/dashboard')).data;
  assert.equal(dashboard.entries.length, 1);
  assert.equal(dashboard.usage.weeklyCommitted, 5000);
  assert.equal(dashboard.goal.saved, 51);
  assert.equal(
    dashboard.receipts.find(
      (item: { merchant: string }) => item.merchant === 'playstation',
    ).expectedSaving,
    51,
  );
});

test('insufficient budget keeps purchase and skips savings', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', {
    ...plan,
    income: '1520',
    emergency: '0',
  });
  const result = await call(cookie, '/receipts/simulate', 'POST', {
    merchant: 'playstation',
    messageId: randomUUID(),
  });
  assert.equal(result.data.entry.amount, 4949);
  assert.equal(result.data.entry.saved, 0);
  assert.equal(result.data.entry.status, 'skipped');
  assert.equal((await call(cookie, '/dashboard')).data.usage.safeToSpend, 0);
});

test('rule settings avoid double counting explicitly classified essentials', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const rules = (await call(cookie, '/rules')).data.rules;
  rules.find(
    (rule: { merchant: string }) => rule.merchant === 'gym',
  ).essential = true;
  assert.equal((await call(cookie, '/rules', 'PUT', { rules })).status, 200);
  await call(cookie, '/receipts/simulate', 'POST', {
    merchant: 'gym',
    messageId: randomUUID(),
  });
  const dashboard = (await call(cookie, '/dashboard')).data;
  assert.equal(dashboard.usage.spending, 0);
  assert.equal(dashboard.usage.savings, 320);
  assert.equal(dashboard.usage.weeklyCommitted, 320);
  const duplicateRules = [rules[0], rules[0], rules[2]];
  assert.equal(
    (await call(cookie, '/rules', 'PUT', { rules: duplicateRules })).status,
    422,
  );
});

test('sessions are isolated and missing setup cannot mutate the ledger', async () => {
  const first = await session();
  const second = await session();
  await call(first, '/onboarding', 'PUT', plan);
  assert.equal((await call(second, '/dashboard')).data.onboarded, false);
  assert.equal(
    (
      await call(second, '/spending', 'POST', {
        id: randomUUID(),
        amount: '10',
        description: 'Lunch',
      })
    ).status,
    409,
  );
});

test('manual spending is idempotent and conflicting reuse is rejected', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const spending = { id: randomUUID(), amount: '12.50', description: 'Lunch' };
  assert.equal((await call(cookie, '/spending', 'POST', spending)).status, 201);
  await call(cookie, '/spending', 'POST', spending);
  assert.equal((await call(cookie, '/dashboard')).data.entries.length, 1);
  assert.equal(
    (await call(cookie, '/spending', 'POST', { ...spending, amount: '13' }))
      .status,
    409,
  );
});

test('reset deletes only the current session and expires its cookie', async () => {
  const first = await session();
  const second = await session();
  const database = app.get(DatabaseService);
  const firstId = first.split('=')[1];
  const secondId = second.split('=')[1];
  await call(first, '/onboarding', 'PUT', plan);
  await call(second, '/onboarding', 'PUT', plan);
  await call(first, '/receipts/simulate', 'POST', {
    merchant: 'gym',
    messageId: randomUUID(),
  });
  await call(first, '/spending', 'POST', {
    id: randomUUID(),
    amount: '10',
    description: 'Lunch',
  });
  for (let day = 0; day < 10; day++) {
    await call(first, '/days/close', 'POST', {});
    if (day < 9) await call(first, '/demo/advance-day', 'POST', {});
  }
  assert.equal(database.read(firstId).boosts.length, 1);
  const otherState = database.read(secondId);
  const rejected = await fetch(`${base}/api/session`, {
    method: 'DELETE',
    headers: {
      Cookie: first,
      Origin: 'https://untrusted.example',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(rejected.status, 403);
  assert.equal(database.exists(firstId), true);
  const reset = await fetch(`${base}/api/session`, {
    method: 'DELETE',
    headers: {
      Cookie: first,
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(reset.status, 200);
  assert.deepEqual(await reset.json(), { reset: true });
  assert.match(reset.headers.get('set-cookie')!, /recurrsave_session=;/);
  assert.match(reset.headers.get('set-cookie')!, /Path=\/api/);
  assert.match(reset.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/);
  assert.match(reset.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(reset.headers.get('set-cookie')!, /SameSite=Lax/);
  assert.equal(database.exists(firstId), false);
  assert.throws(() => database.read(firstId));
  assert.deepEqual(database.read(secondId), otherState);
  const restarted = await fetch(`${base}/api/dashboard`, {
    headers: { Cookie: first },
  });
  assert.equal((await restarted.json()).onboarded, false);
  const newCookie = restarted.headers.get('set-cookie')!.split(';')[0];
  assert.notEqual(newCookie, first);
  assert.equal((await call(newCookie, '/onboarding')).data.draft, null);
});

test('reset removes an unfinished onboarding draft', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', {
    ...plan,
    step: 1,
    complete: false,
  });
  const database = app.get(DatabaseService);
  assert.ok(database.read(cookie.split('=')[1]).draft);
  assert.equal((await call(cookie, '/session', 'DELETE', {})).status, 200);
  assert.equal(database.exists(cookie.split('=')[1]), false);
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
  assert.equal(
    (
      await call(cookie, '/spending', 'POST', {
        id: randomUUID(),
        amount: '1',
        description: 'Late spending',
      })
    ).status,
    409,
  );
});

test('unexpected origin, invalid JSON, oversized input and unsupported types are rejected', async () => {
  const badOrigin = await fetch(`${base}/api/spending`, {
    method: 'POST',
    headers: {
      Origin: 'https://untrusted.example',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  assert.equal(badOrigin.status, 403);
  const malformed = await fetch(`${base}/api/spending`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: '{broken',
  });
  assert.equal(malformed.status, 400);
  const oversized = await fetch(`${base}/api/spending`, {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:5173',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description: 'x'.repeat(20000) }),
  });
  assert.equal(oversized.status, 413);
  const plain = await fetch(`${base}/api/spending`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:5173', 'Content-Type': 'text/plain' },
    body: '{}',
  });
  assert.equal(plain.status, 415);
});

test('database mutations roll back all changes on failure', async () => {
  const database = app.get(DatabaseService);
  const id = randomUUID();
  database.create(id, {
    draft: null,
    plan: null,
    rules: [],
    entries: [],
    days: [],
    boosts: [],
    demoDate: '2026-10-10',
  });
  assert.throws(() =>
    database.update(id, (state) => {
      state.demoDate = '2026-10-11';
      throw new Error('Intentional failure');
    }),
  );
  assert.equal(database.read(id).demoDate, '2026-10-10');
});

test('concurrent delivery of one receipt creates only one transfer', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  const receipt = { merchant: 'gym', messageId: randomUUID() };
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      call(cookie, '/receipts/simulate', 'POST', receipt),
    ),
  );
  assert.equal(
    results.filter((result) => result.data.duplicate === false).length,
    1,
  );
  assert.equal(
    results.filter((result) => result.data.duplicate === true).length,
    4,
  );
  const dashboard = (await call(cookie, '/dashboard')).data;
  assert.equal(dashboard.entries.length, 1);
  assert.equal(dashboard.goal.saved, 320);
});

test('monthly cap prevents savings even when this week has room', async () => {
  const cookie = await session();
  await call(cookie, '/onboarding', 'PUT', plan);
  app.get(DatabaseService).update(cookie.split('=')[1], (state) => {
    state.demoDate = '2026-10-01';
  });
  await call(cookie, '/spending', 'POST', {
    id: randomUUID(),
    amount: '1499',
    description: 'Earlier monthly spending',
  });
  for (let count = 0; count < 7; count++)
    await call(cookie, '/demo/advance-day', 'POST', {});
  const rules = (await call(cookie, '/rules')).data.rules;
  rules.forEach((rule: { essential: boolean }) => {
    rule.essential = true;
  });
  await call(cookie, '/rules', 'PUT', { rules });
  const dashboard = (await call(cookie, '/dashboard')).data;
  const result = await call(cookie, '/receipts/simulate', 'POST', {
    merchant: 'gym',
    messageId: randomUUID(),
  });
  assert.equal(result.data.entry.saved, 0);
  assert.equal(dashboard.usage.weeklyCommitted, 0);
  assert.equal(dashboard.usage.monthlyRemaining, 100);
});
