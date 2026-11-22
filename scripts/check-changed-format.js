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
const isCi = Boolean(process.env.GITHUB_EVENT_NAME);
const explicitBase = process.argv[2];
let base = explicitBase ?? event.pull_request?.base?.sha;
let useMergeBase = isPullRequest || Boolean(explicitBase);
let fallbackAfterMissingTip = false;

if (!base) {
  const before =
    event.before && !/^0+$/.test(event.before) ? event.before : null;
  if (before) {
    try {
      execFileSync("git", ["cat-file", "-e", `${before}^{commit}`], {
        stdio: "ignore",
      });
      base = before;
    } catch {
      try {
        execFileSync("git", ["fetch", "--no-tags", "origin", before], {
          stdio: "ignore",
        });
        execFileSync("git", ["cat-file", "-e", `${before}^{commit}`], {
          stdio: "ignore",
        });
        base = before;
      } catch {
        // A force-pushed-away tip may no longer be fetchable. Compare the
        // pushed branch with its configured base instead of failing the check.
        const defaultBranch = event.repository?.default_branch;
        base = defaultBranch ? `origin/${defaultBranch}` : "origin/dev";
        useMergeBase = true;
        fallbackAfterMissingTip = true;
      }
    }
  } else {
    const defaultBranch = event.repository?.default_branch;
    base = defaultBranch ? `origin/${defaultBranch}` : "origin/dev";
    useMergeBase = isCi;
  }
}

const head = process.env.GITHUB_SHA ?? "HEAD";
const range = `${base}${useMergeBase ? "..." : ".."}${head}`;
let changedOutput;
try {
  const sameCommit =
    fallbackAfterMissingTip &&
    execFileSync("git", ["rev-parse", `${base}^{commit}`], {
      encoding: "utf8",
    }).trim() ===
      execFileSync("git", ["rev-parse", `${head}^{commit}`], {
        encoding: "utf8",
      }).trim();
  if (sameCommit)
    console.warn("Previous push tip unavailable; checking all tracked files.");
  changedOutput = execFileSync(
    "git",
    sameCommit
      ? ["ls-tree", "-r", "--name-only", "-z", head]
      : ["diff", "--name-only", "-z", "--diff-filter=ACMR", range],
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

if (!isCi && !explicitBase) {
  const workingTreeChanges = [
    ["diff", "--name-only", "-z", "--diff-filter=ACMR"],
    ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"],
    ["ls-files", "--others", "--exclude-standard", "-z"],
  ].flatMap((args) =>
    execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean),
  );
  changedPaths.push(
    ...workingTreeChanges.filter(
      (file) =>
        file !== "package-lock.json" &&
        supportedExtensions.has(path.extname(file).toLowerCase()),
    ),
  );
}

const uniqueChangedPaths = [...new Set(changedPaths)];

if (uniqueChangedPaths.length === 0) {
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
  // Batch paths to stay below Windows' command-line length limit.
  for (let i = 0; i < uniqueChangedPaths.length; i += 70) {
    execFileSync(
      process.execPath,
      [
        prettierCli,
        "--check",
        "--ignore-path",
        ".gitignore",
        "--ignore-path",
        ".prettierignore",
        ...uniqueChangedPaths.slice(i, i + 70),
      ],
      { stdio: "inherit" },
    );
  }
} catch (error) {
  process.exit(error.status ?? 1);
}
