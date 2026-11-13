import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../functions/_shared/http.ts';

test('checks record scope before contacting the assistant provider', async () => {
  const endpoint = 'https://assistant.example.test/chat/completions';
  const id = '00000005-0000-4000-8000-000000000000';
  const env = { url: 'https://example.supabase.co', publicKey: 'test', origins: [],
    assistant: { endpoint, key: 'provider-test-key', model: 'test' } };
  let allowed = false;
  let called = 0;
  const handler = createHandler('students', { env, fetch: async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id });
    if (url.endsWith('/matt_assistant_context')) {
      if (!allowed) return Response.json({ code: 'PT403', message: 'Denied' }, { status: 403 });
      return Response.json({ grounded_at: '2026-11-13T00:00:00Z', request: { message: 'What is the GWA?' }, record: { gwa: 2 } });
    }
    assert.equal(url, endpoint);
    assert.equal(options.headers.Authorization, 'Bearer provider-test-key');
    called++;
    return Response.json({ choices: [{ message: { content: 'The record shows a GWA of 2.' } }] });
  } });
  const request = () => new Request(env.url + '/students/' + id + '/assistant', {
    method: 'POST', headers: { apikey: 'test', Authorization: 'Bearer session', 'Content-Type': 'application/json' },
    body: '{"message":"What is the GWA?"}',
  });
  assert.equal((await handler(request())).status, 403);
  assert.equal(called, 0);
  allowed = true;
  const result = await handler(request());
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.mutates_records, false);
  assert.match(data.answer, /GWA of 2/);
  assert.equal(called, 1);
});
