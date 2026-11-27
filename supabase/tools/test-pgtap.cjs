const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const source = "supabase/pg-tap";
const output = "supabase/.temp/backend-pgtap";
fs.mkdirSync(output, { recursive: true });

const tests = fs.readdirSync(source).filter((name) => name.endsWith(".sql"));
const staged = tests.map((name) => {
  const input = fs.readFileSync(path.join(source, name), "utf8");
  // Supabase mounts only the test directory in the pg_prove container.
  const expanded = input.replace(
    /^\\ir (\.\.\/tests\/[\w.-]+\.sql)\r?$/gm,
    (_, include) => fs.readFileSync(path.resolve(source, include), "utf8"),
  );
  const file = path.join(output, name);
  fs.writeFileSync(file, expanded, "utf8");
  return file;
});

const result = spawnSync("supabase", ["test", "db", "--local", ...staged], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
