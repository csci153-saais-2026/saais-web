import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, operationsFor } from '../functions/_shared/http.ts';
import { environment } from '../functions/_shared/serve.ts';
import snapshot from '../functions/_shared/contract.json' with { type: 'json' };

const env = { url: 'https://example.supabase.co', publicKey: 'public-test-key', origins: ['https://saais.test'] };
const headers = { apikey: env.publicKey, Authorization: 'Bearer verified-test-session', 'Content-Type': 'application/json' };
const id = '00000000-0000-4000-8000-000000000001';
const identity = () => Response.json({ id });

test('all 47 exact contract methods and paths dispatch with declared success status', async () => {
  assert.equal(snapshot.operations.length, 47);
  assert.equal(new Set(snapshot.operations.map(o => o.method + o.path)).size, 47);
  for (const operation of snapshot.operations) {
    const group = operation.path.split('/')[3];
    const calls = [];
    const handler = createHandler(group, { env, fetch: async (url, options) => {
      calls.push({ url, options });
      return url.endsWith('/user') ? identity() : Response.json({ result: operation.id });
    } });
    const path = operation.path.replace(/\{[^}]+\}/g, id);
    const result = await handler(new Request(env.url + path, { method: operation.method, headers,
      ...(operation.input ? { body: '{}' } : {}) }));
    assert.equal(result.status, operation.status, operation.id);
    assert.equal(calls.length, 2, operation.id);
    assert.equal(JSON.parse(calls[1].options.body).p_operation, operation.id);
    if (operation.status === 204) assert.equal(await result.text(), '');
  }
});

test('students exposes only Jerome operations through its separate list', () => {
  assert.equal(operationsFor('students').length, 11);
});

test('authentication, CORS, invalid identifiers, query and body guards stop before database access', async () => {
  let calls = 0;
  const handler = createHandler('catalog', { env, fetch: async () => { calls++; return identity(); } });
  const cases = [
    [new Request(env.url + '/catalog/faculty', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } }), 401],
    [new Request(env.url + '/catalog/faculty', { method: 'POST', body: '{}', headers: { ...headers, origin: 'https://forbidden.test' } }), 403],
    [new Request(env.url + '/catalog/faculty/not-a-uuid', { method: 'PATCH', body: '{}', headers }), 400],
    [new Request(env.url + '/catalog/faculty/%ZZ', { method: 'PATCH', body: '{}', headers }), 400],
    [new Request(env.url + '/catalog/faculty?actor=spoof', { method: 'POST', body: '{}', headers }), 400],
    [new Request(env.url + '/catalog/faculty', { method: 'POST', body: '{bad', headers }), 400],
    [new Request(env.url + '/catalog/faculty', { method: 'POST', headers }), 400],
    [new Request(env.url + '/catalog/faculty/' + id, { method: 'DELETE', body: '{}', headers }), 400],
    [new Request(env.url + '/catalog/faculty', { method: 'POST', body: 'x'.repeat(1024 * 1024 + 1), headers }), 400],
  ];
  for (const [request, status] of cases) assert.equal((await handler(request)).status, status);
  assert.equal(calls, 0);
  const preflight = await handler(new Request(env.url + '/catalog/faculty', { method: 'OPTIONS', headers: { origin: env.origins[0] } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), env.origins[0]);
});

test('hosted named publishable keys and legacy anon keys are accepted without secret keys', async () => {
  const configured = environment(name => ({ SUPABASE_URL: env.url, SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_test","rotated":"sb_publishable_rotated"}', SUPABASE_ANON_KEY: 'legacy-anon', SUPABASE_SERVICE_ROLE_KEY: 'do-not-accept' })[name]);
  assert.deepEqual(configured.publicKeys, ['sb_publishable_test', 'sb_publishable_rotated', 'legacy-anon']);
  for (const key of configured.publicKeys) {
    const handler = createHandler('catalog', { env: configured, fetch: async (url, options) => {
      assert.equal(options.headers.apikey, key);
      return url.endsWith('/user') ? identity() : Response.json({});
    } });
    assert.equal((await handler(new Request(env.url + '/catalog/faculty', { method: 'POST', body: '{}', headers: { ...headers, apikey: key } }))).status, 201);
  }
});

test('expired Auth credentials, SQL conflict, rate limit and internal detail sanitization', async () => {
  for (const [status, code, expected] of [[409, 'PT409', 'Reviewed conflict'], [429, 'PT429', 'Reviewed conflict'], [500, 'XX000', 'The operation could not be completed.']]) {
    const handler = createHandler('catalog', { env, fetch: async url => url.endsWith('/user') ? identity() :
      Response.json({ code, message: code === 'XX000' ? 'SQL private record dump' : 'Reviewed conflict', details: 'secret' }, { status }) });
    const result = await handler(new Request(env.url + '/catalog/faculty', { method: 'POST', headers, body: '{}' }));
    assert.equal(result.status, status);
    const body = await result.json();
    assert.equal(body.message, expected);
    assert.equal(body.details, null);
    if (status === 429) assert.equal(result.headers.get('Retry-After'), '60');
  }
  const handler = createHandler('catalog', { env, fetch: async () => new Response(null, { status: 401 }) });
  assert.equal((await handler(new Request(env.url + '/catalog/faculty', { method: 'POST', headers, body: '{}' }))).status, 401);
});
