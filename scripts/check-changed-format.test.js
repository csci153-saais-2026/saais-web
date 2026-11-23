import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(
  new URL("./check-changed-format.js", import.meta.url),
);

test("checks tracked files when an unavailable previous push equals the default branch", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "saais-format-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  try {
    git("init");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Test");
    mkdirSync(path.join(dir, "scripts"));
    writeFileSync(path.join(dir, "package.json"), '{"type":"module"}');
    writeFileSync(path.join(dir, "sentinel.ts"), "const answer = 42;\n");
    writeFileSync(
      path.join(dir, "scripts", "check-changed-format.js"),
      readFileSync(source),
    );
    git("add", ".");
    git("commit", "-m", "initial");
    git("update-ref", "refs/remotes/origin/main", "HEAD");
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();
    const event = path.join(dir, "event.json");
    writeFileSync(
      event,
      JSON.stringify({
        before: "1".repeat(40),
        repository: { default_branch: "main" },
      }),
    );
    mkdirSync(path.join(dir, "node_modules", "prettier", "bin"), {
      recursive: true,
    });
    writeFileSync(
      path.join(dir, "node_modules", "prettier", "bin", "prettier.cjs"),
      'console.log("CHECKED:", process.argv.slice(2).join(" "))',
    );
    const output = execFileSync(
      process.execPath,
      [path.join(dir, "scripts", "check-changed-format.js")],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: "push",
          GITHUB_EVENT_PATH: event,
          GITHUB_SHA: head,
        },
      },
    );
    assert.match(output, /sentinel\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
