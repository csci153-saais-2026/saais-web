import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import snapshot from "../functions/_shared/academic-contract.json" with { type: "json" };
import catalog from "../functions/_shared/contract.json" with { type: "json" };

const require = createRequire(import.meta.url);
const { withPinnedContract } = require("../tools/snapshot-contract.cjs");
const {
  buildSnapshot,
  migration,
} = require("../tools/snapshot-matt-contract.cjs");

test("student and account runtime matches the approved 0.3.1 contract", () => {
  assert.deepEqual(snapshot, withPinnedContract(buildSnapshot));
  assert.equal(snapshot.version, catalog.version);
  assert.equal(snapshot.revision, catalog.revision);
  assert.equal(snapshot.candidateHash, catalog.candidateHash);
  const catalogIds = new Set(
    catalog.operations.map((operation) => operation.id),
  );
  assert.equal(snapshot.operations.length, 41);
  assert.ok(
    snapshot.operations.every((operation) => !catalogIds.has(operation.id)),
  );
});

test("saved-attempt deletion declares only rejection responses", () => {
  const deletion = snapshot.operations.find(
    (operation) => operation.id === "deleteOpenTermAttempt",
  );
  assert.equal(deletion.method, "DELETE");
  assert.equal(deletion.status, null);
  assert.equal(deletion.output, null);
  assert.ok(deletion.errors.includes(409));
  assert.equal(
    snapshot.operations.filter((operation) => operation.status === null).length,
    1,
  );
});

test("the additive migration stores the runtime and restores shared schemas", () => {
  const sql = readFileSync(migration, "utf8");
  assert.deepEqual(JSON.parse(sql.split("$contract$")[1]), snapshot);
  assert.match(
    sql,
    /on conflict \(id\) do update set document=excluded.document/,
  );
  assert.match(
    sql,
    /update saais_private\.contract set document = jsonb_set\(document, '\{schemas\}', document->'schemas' \|\|/,
  );
  const initialSql = readFileSync(
    "supabase/migrations/20261113000010_matt_contract.sql",
    "utf8",
  );
  assert.equal(
    JSON.parse(initialSql.split("$contract$")[1]).revision,
    "cfa620c97c2a506537825edc1323f37ee5f843b3",
  );
});
