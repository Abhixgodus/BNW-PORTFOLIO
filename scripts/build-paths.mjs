import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
// A cloud-synced macOS Documents folder can create dataless conflict copies
// while Vite copies public photographs. Keep disposable local build output in
// the user's cache. Netlify's Linux build still publishes its normal dist/.
const localCache =
  process.platform === "darwin" && projectRoot.includes("/Documents/");
export const buildRoot = localCache
  ? path.join(
      os.homedir(),
      ".cache",
      "abhimanyu-photo-build",
      createHash("sha256").update(projectRoot).digest("hex").slice(0, 12),
    )
  : projectRoot;
export const publicDir = path.join(buildRoot, ".astro-public");
export const outDir = path.join(buildRoot, "dist");
