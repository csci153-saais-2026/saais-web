const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saais-freeze-"));
try {
  const output = path.join(dir, "openapi.json");
  execFileSync(
    process.execPath,
    [
      "node_modules/@redocly/cli/bin/cli.js",
      "bundle",
      "contract/openapi.yaml",
      "--config",
      "contract/redocly.yaml",
      "--output",
      output,
    ],
    { stdio: "pipe" },
  );
  const sort = (value) =>
    Array.isArray(value)
      ? value.map(sort)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, sort(value[key])]),
          )
        : value;
  const canonical = JSON.stringify(
    sort(JSON.parse(fs.readFileSync(output, "utf8"))),
  );
  console.log(createHash("sha256").update(canonical, "utf8").digest("hex"));
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
