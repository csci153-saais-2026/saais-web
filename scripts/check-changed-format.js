import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const supportedExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

function getEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return {};
  return JSON.parse(readFileSync(eventPath, "utf8"));
}

const event = getEvent();
const isPullRequest = process.env.GITHUB_EVENT_NAME === "pull_request";
let base =
  process.argv[2] ??
  event.pull_request?.base?.sha ??
  (event.before && !/^0+$/.test(event.before) ? event.before : undefined);

if (!base) {
  const defaultBranch = event.repository?.default_branch;
  base = defaultBranch
    ? `origin/${defaultBranch}`
    : "origin/feat/contract-mock";
}

const head = process.env.GITHUB_SHA ?? "HEAD";
const range = `${base}${isPullRequest || process.argv[2] ? "..." : ".."}${head}`;
let changedOutput;
try {
  changedOutput = execFileSync(
    "git",
    ["diff", "--name-only", "-z", "--diff-filter=ACMR", range],
    { encoding: "utf8" },
  );
} catch {
  console.error(`Cannot compare ${range}. Fetch the base ref and retry.`);
  process.exit(2);
}

const changedPaths = changedOutput
  .split("\0")
  .filter(Boolean)
  .filter((file) => file !== "package-lock.json")
  .filter((file) => supportedExtensions.has(path.extname(file).toLowerCase()));

if (changedPaths.length === 0) {
  console.log("No changed human-authored files need a formatting check.");
  process.exit(0);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const prettierCli = path.join(
  scriptDirectory,
  "..",
  "node_modules",
  "prettier",
  "bin",
  "prettier.cjs",
);

try {
  execFileSync(
    process.execPath,
    [prettierCli, "--check", "--ignore-path", ".gitignore", ...changedPaths],
    { stdio: "inherit" },
  );
} catch (error) {
  process.exit(error.status ?? 1);
}
