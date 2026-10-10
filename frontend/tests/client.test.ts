import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, request } from '../src/api/client.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('requests use the API prefix and session credentials', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/spending');
    assert.equal(init?.credentials, 'same-origin');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, '{"amount":"1"}');
    return Response.json({ message: 'Recorded.' });
  };
  assert.deepEqual(await request('/spending', 'POST', { amount: '1' }), { message: 'Recorded.' });
});

test('server validation errors preserve field messages', async () => {
  globalThis.fetch = async () => Response.json({ message: 'Check fields.', fields: { amount: 'Invalid amount.' } }, { status: 422 });
  await assert.rejects(request('/spending'), (error: unknown) => error instanceof ApiError && error.fields.amount === 'Invalid amount.');
});

test('network failures and invalid responses produce recoverable messages', async () => {
  globalThis.fetch = async () => { throw new TypeError('Network unavailable'); };
  await assert.rejects(request('/dashboard'), /Cannot reach the backend/);
  globalThis.fetch = async () => new Response('<html>Error</html>', { status: 502 });
  await assert.rejects(request('/dashboard'), /unreadable response/);
});
