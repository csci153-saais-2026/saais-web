// Run the approved contract's unchanged security checks with its modular files.
const cp = require("node:child_process");
const { withPinnedContract } = require("./snapshot-contract.cjs");

withPinnedContract((_contract, directory) => {
  cp.execFileSync(
    process.execPath,
    [
      "node_modules/@redocly/cli/bin/cli.js",
      "lint",
      "contract/openapi.yaml",
      "--config",
      "contract/redocly.yaml",
    ],
    { cwd: directory, stdio: "inherit" },
  );
  cp.execFileSync(
    process.execPath,
    [
      "--test",
      "contract/security.check.cjs",
      "contract/server-policy.check.cjs",
    ],
    { cwd: directory, stdio: "inherit" },
  );
});
