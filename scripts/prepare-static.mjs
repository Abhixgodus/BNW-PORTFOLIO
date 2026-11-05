import { cp, mkdir, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { publicDir, projectRoot } from "./build-paths.mjs";

// Only the current editorial site is published. Old pages/styles/experiments
// are preserved outside this project in the workspace recovery archive.
if (path.basename(publicDir) !== ".astro-public")
  throw new Error("Refusing to clear a non-build directory");
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
for (const folder of ["images", "fonts"])
  await cp(path.join(projectRoot, folder), path.join(publicDir, folder), {
    recursive: true,
    filter: (source) => path.basename(source) !== ".DS_Store",
  });
for (const file of ["camera_favicon.svg", "favicon.ico", "apple-touch-icon.png"])
  await cp(path.join(projectRoot, file), path.join(publicDir, file));
async function photos(directory, relative = "gallery") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    const destination = path.join(publicDir, relative, entry.name);
    if (entry.isDirectory()) await photos(source, path.join(relative, entry.name));
    else if (/\.(jpe?g|png|webp|avif)$/i.test(entry.name)) {
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination);
    }
  }
}
await photos(path.join(projectRoot, "gallery"));
await import("./prepare-concept-media.mjs");
await cp(path.join(projectRoot, "cloudflare/compat-image-worker.js"), path.join(publicDir, "_worker.js"));
await writeFile(path.join(publicDir, "_routes.json"), JSON.stringify({ version: 1, include: ["/.netlify/images"], exclude: [] }, null, 2) + "\n");
// Match the unreleased concept's existing noindex metadata.
await writeFile(path.join(publicDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
console.log("Prepared current editorial fonts, portraits and all original album photographs.");
