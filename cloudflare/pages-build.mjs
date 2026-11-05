import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const options = {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  stdio: "inherit",
};

execFileSync(
  "npx",
  [
    "--yes",
    "pnpm@11.25.0",
    "--dir",
    "cloudflare",
    "install",
    "--frozen-lockfile",
  ],
  options,
);
execFileSync(
  "npx",
  ["--yes", "pnpm@11.25.0", "exec", "node", "cloudflare/build.mjs"],
  options,
);
