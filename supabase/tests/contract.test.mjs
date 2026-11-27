import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import snapshot from "../functions/_shared/contract.json" with { type: "json" };
const require = createRequire(import.meta.url);
const {
  revision,
  version,
  candidateHash,
  migration,
  withPinnedContract,
  buildSnapshot,
} = require("../tools/snapshot-contract.cjs");

test("the runtime snapshot matches the approved modular OpenAPI version and hash", () => {
  const expected = withPinnedContract(buildSnapshot);
  assert.equal(snapshot.revision, revision);
  assert.equal(snapshot.version, version);
  assert.equal(snapshot.candidateHash, candidateHash);
  assert.deepEqual(snapshot, expected);
  const sql = readFileSync(migration, "utf8");
  assert.deepEqual(JSON.parse(sql.split("$contract$")[1]), snapshot);
  assert.match(
    sql,
    /on conflict \(id\) do update set document=excluded.document/,
  );
});

test("the original 0.3.0 contract migration remains a historical baseline", () => {
  const sql = readFileSync(
    "supabase/migrations/20261112000400_jerome_contract.sql",
    "utf8",
  );
  const initial = JSON.parse(sql.split("$contract$")[1]);
  assert.equal(initial.revision, "cfa620c97c2a506537825edc1323f37ee5f843b3");
  assert.equal(initial.operations.length, 47);
});
