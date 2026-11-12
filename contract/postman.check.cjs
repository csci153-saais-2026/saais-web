const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saais-postman-check-'))
const outPath = path.join(tmpDir, 'openapi.json')
let spec
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/@redocly/cli/bin/cli.js',
      'bundle',
      'contract/openapi.yaml',
      '--config',
      'contract/redocly.yaml',
      '--output',
      outPath,
    ],
    { stdio: 'pipe' },
  )
  spec = JSON.parse(fs.readFileSync(outPath, 'utf8'))
} finally {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath)
  fs.rmdirSync(tmpDir)
}

const collectionPath = path.join(
  __dirname,
  'postman',
  'saais-api.postman_collection.json',
)
const mockEnvPath = path.join(
  __dirname,
  'postman',
  'saais-mock.postman_environment.json',
)
const stagingEnvPath = path.join(
  __dirname,
  'postman',
  'saais-staging.postman_environment.json',
)

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'))
const mockEnv = JSON.parse(fs.readFileSync(mockEnvPath, 'utf8'))
const stagingEnv = JSON.parse(fs.readFileSync(stagingEnvPath, 'utf8'))

const methods = ['get', 'post', 'put', 'patch', 'delete']
const contractOperations = []
for (const [route, pathItem] of Object.entries(spec.paths)) {
  for (const method of methods) {
    if (pathItem[method]) {
      contractOperations.push({
        method: method.toUpperCase(),
        route,
        operationId: pathItem[method].operationId,
      })
    }
  }
}

test('Postman collection covers every OpenAPI operation with authorized and denied requests', () => {
  assert.ok(contractOperations.length > 0)

  const operationFolders = new Map()
  for (const topFolder of collection.item) {
    if (topFolder.name === '00. Role & Scope Authorization Scenarios') continue
    for (const opFolder of topFolder.item || []) {
      operationFolders.set(opFolder.name, opFolder)
    }
  }
  assert.equal(operationFolders.size, contractOperations.length)

  for (const op of contractOperations) {
    const key = `[${op.method}] ${op.route} (${op.operationId})`
    const folder = operationFolders.get(key)
    assert.ok(folder, `Missing Postman operation folder: ${key}`)
    assert.ok(
      Array.isArray(folder.item) && folder.item.length >= 2,
      `Operation folder ${key} must include both Authorized and Denied requests`,
    )
    const [authorizedReq, deniedReq] = folder.item
    assert.match(authorizedReq.name, /^Authorized\b/)
    assert.match(deniedReq.name, /^Denied\b/)
    assert.equal(authorizedReq.request.method, op.method)
    assert.equal(deniedReq.request.method, op.method)
    assert.ok(
      authorizedReq.event?.some((e) => e.listen === 'test'),
      `Missing Postman test script on ${authorizedReq.name}`,
    )
    assert.ok(
      deniedReq.event?.some((e) => e.listen === 'test'),
      `Missing Postman test script on ${deniedReq.name}`,
    )
  }
})

test('Postman environments use placeholders/synthetic tokens only and never commit real credentials', () => {
  const rawCollection = fs.readFileSync(collectionPath, 'utf8')
  const rawMockEnv = fs.readFileSync(mockEnvPath, 'utf8')
  const rawStagingEnv = fs.readFileSync(stagingEnvPath, 'utf8')

  for (const content of [rawCollection, rawMockEnv, rawStagingEnv]) {
    assert.doesNotMatch(content, /sb_secret_/i)
    assert.doesNotMatch(content, /service_role/i)
    assert.doesNotMatch(content, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/)
  }

  for (const entry of stagingEnv.values) {
    assert.match(
      entry.value,
      /^<PLACEHOLDER_[A-Z0-9_]+>$/,
      `Staging env variable ${entry.key} must use a placeholder`,
    )
  }

  const mockKeys = new Set(mockEnv.values.map((v) => v.key))
  for (const roleKey of [
    'token_student',
    'token_adviser',
    'token_department_head',
    'token_department_staff',
    'token_dean',
    'token_admin',
  ]) {
    assert.ok(mockKeys.has(roleKey), `Missing ${roleKey} in mock environment`)
  }
})
