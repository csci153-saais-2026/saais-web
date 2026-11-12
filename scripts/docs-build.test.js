import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat()
}

test('production assets exclude the protected specification and guide', async () => {
  const paths = await files('dist')
  assert.equal(paths.some(p => /openapi.*\.ya?ml$/i.test(p)), false)
  for (const file of paths.filter(p => /\.(?:js|html|json|ya?ml)$/i.test(p))) {
    const body = await readFile(file, 'utf8')
    assert.equal(body.includes('openapi: 3.1.0'), false, file)
    assert.equal(body.includes('## Canonical Source of Truth'), false, file)
  }
})
