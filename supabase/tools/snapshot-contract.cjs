// Bundle the pinned Git tree so working-tree edits cannot change the runtime contract.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
const { createHash } = require("node:crypto");

const revision = "b81a1a8b9c670d5c15699c44ea1e0e02af3f2c39";
const version = "0.4.1";
const candidateHash =
  "d0f10eea37b37f2a69ab062f7f17f91ca9c267bcd1ce6daff34eacfab97b4a12";
const migration = "supabase/migrations/20261129000100_runtime_contract_041.sql";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function withPinnedContract(callback) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "saais-contract-snapshot-"),
  );
  try {
    const archive = cp.execFileSync("git", ["archive", revision, "contract"], {
      maxBuffer: 32 * 1024 * 1024,
    });
    cp.execFileSync("tar", ["-xf", "-", "-C", directory], { input: archive });
    fs.symlinkSync(
      path.resolve("node_modules"),
      path.join(directory, "node_modules"),
      "junction",
    );
    const output = path.join(directory, "openapi.json");
    cp.execFileSync(
      process.execPath,
      [
        path.resolve("node_modules/@redocly/cli/bin/cli.js"),
        "bundle",
        "contract/openapi.yaml",
        "--config",
        "contract/redocly.yaml",
        "--output",
        output,
      ],
      { cwd: directory, stdio: "pipe" },
    );
    const contract = JSON.parse(fs.readFileSync(output, "utf8"));
    const hash = createHash("sha256")
      .update(JSON.stringify(canonicalize(contract)), "utf8")
      .digest("hex");
    if (contract.info.version !== version || hash !== candidateHash) {
      throw Error(
        "The pinned contract does not match the expected OpenAPI version and hash.",
      );
    }
    return callback(contract, directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function buildSnapshot(contract) {
  const studentSuffix =
    /\/(shift-preview|curriculum|curriculum-transfers|outside-credits(?:\/\{credit_id\}\/revoke)?|elective-mappings(?:\/\{decision_id\}(?:\/revoke)?)?|equivalencies(?:\/\{decision_id\}(?:\/revoke)?)?)$/;
  const operations = [];
  for (const [route, item] of Object.entries(contract.paths)) {
    if (!route.startsWith("/functions/v1/")) continue;
    if (
      !/^\/functions\/v1\/(catalog|school-terms|curriculum-transfers|notifications)(\/|$)/.test(
        route,
      ) &&
      !(
        route.startsWith("/functions/v1/students/{student_id}/") &&
        studentSuffix.test(route)
      )
    )
      continue;
    for (const [method, operation] of Object.entries(item)) {
      if (!operation.operationId) continue;
      const success = Object.keys(operation.responses).find((status) =>
        /^2/.test(status),
      );
      operations.push({
        id: operation.operationId,
        method: method.toUpperCase(),
        path: route,
        roles: operation["x-required-roles"],
        scope: operation["x-access-scope"],
        parameters: operation.parameters || [],
        bodyRequired: operation.requestBody?.required || false,
        input:
          operation.requestBody?.content["application/json"].schema || null,
        status: Number(success),
        output:
          operation.responses[success].content?.["application/json"].schema ||
          null,
        errors: Object.keys(operation.responses)
          .filter((status) => !/^2/.test(status))
          .map(Number),
      });
    }
  }
  if (operations.length !== 47)
    throw Error(`Expected 47 operations, found ${operations.length}`);
  const schemas = {};
  function collect(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      const name = value.$ref.split("/").pop();
      if (!schemas[name]) {
        schemas[name] = contract.components.schemas[name];
        collect(schemas[name]);
      }
    }
    for (const nested of Object.values(value)) collect(nested);
  }
  operations.forEach(collect);
  return { revision, version, candidateHash, operations, schemas };
}

module.exports = {
  revision,
  version,
  candidateHash,
  migration,
  withPinnedContract,
  buildSnapshot,
};

if (require.main === module)
  require("./snapshot-runtime-contracts.cjs").writeRuntimeSnapshots();
