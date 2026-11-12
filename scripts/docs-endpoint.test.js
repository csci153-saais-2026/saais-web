import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/docs.js'

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v }, status(n) { this.statusCode = n; return this }, end() { return this }, send(body) { this.body = body; return this } }
}

test('documentation endpoint requires a valid active user and only serves allowlisted files', async () => {
  const oldFetch = globalThis.fetch
  const oldUrl = process.env.SUPABASE_URL
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key'
  let active = true
  globalThis.fetch = async (input, options) => {
    const request = new Request(input, options)
    if (request.headers.get('authorization') !== 'Bearer valid-token') return Response.json({ message: 'invalid token' }, { status: 401 })
    if (request.url.includes('/auth/v1/user')) return Response.json({ id: '11111111-1111-4111-8111-111111111111' })
    if (request.url.includes('/rest/v1/profile')) return Response.json(active ? { id: '11111111-1111-4111-8111-111111111111', status: 'active' } : null)
    throw new Error('Unexpected request')
  }
  try {
    let res = response(); await handler({ method: 'GET', query: { document: 'openapi' }, headers: {} }, res); assert.equal(res.statusCode, 401)
    res = response(); await handler({ method: 'GET', query: { document: 'openapi' }, headers: { authorization: 'Bearer invalid-token' } }, res); assert.equal(res.statusCode, 401)
    res = response(); await handler({ method: 'GET', query: { document: '../.env' }, headers: { authorization: 'Bearer valid-token' } }, res); assert.equal(res.statusCode, 404)
    res = response(); await handler({ method: 'GET', query: { document: 'openapi' }, headers: { authorization: 'Bearer valid-token' } }, res); assert.equal(res.statusCode, 200); assert.match(res.body, /^openapi:/); assert.equal(res.headers['Cache-Control'], 'private, no-store')
    active = false
    res = response(); await handler({ method: 'GET', query: { document: 'guide' }, headers: { authorization: 'Bearer valid-token' } }, res); assert.equal(res.statusCode, 403)
  } finally {
    globalThis.fetch = oldFetch
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey
  }
})
