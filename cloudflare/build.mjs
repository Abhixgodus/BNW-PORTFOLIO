import { execFileSync } from "node:child_process";
import {
  mkdir,
  copyFile,
  rm,
  stat,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
execFileSync("pnpm", ["run", "build"], { stdio: "inherit" });
const { outDir: source } = await import("../scripts/build-paths.mjs");
const output = path.join(root, ".cloudflare-dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
async function list(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory())
      files.push(...(await list(path.join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files;
}
const files = await list(source);
for (const file of files) {
  const destination = path.join(output, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(source, file), destination);
  if ((await stat(destination)).size > 25 * 1024 * 1024)
    throw new Error(`Oversized asset: ${file}`);
}
const photos = files.filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file));
const widths = [
  320, 480, 640, 720, 800, 960, 1200, 1280, 1440, 1600, 1920, 2560, 3840,
];
// Bound memory on Cloudflare's build machines. Preserve originals and embedded
// orientation; derivatives use high-quality WebP without enlarging originals.
sharp.concurrency(1);
let completed = 0;
async function consume() {
  while (photos.length) {
    const file = photos.shift();
    const directory = path.join(output, "_responsive", file);
    await mkdir(directory, { recursive: true });
    for (const width of widths)
      await sharp(path.join(source, file))
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toFile(path.join(directory, `${width}.webp`));
    await sharp(path.join(source, file))
      .rotate()
      .resize(1200, 630, { fit: "cover" })
      .webp({ quality: 85, effort: 4 })
      .toFile(path.join(directory, "1200x630.webp"));
    if (file === "images/hero-waterfall.jpg") {
      for (const width of [480, 720, 960, 1440, 1920]) {
        const height = (width * 4) / 3;
        await sharp(path.join(source, file))
          .rotate()
          .resize(width, height, { fit: "cover" })
          .webp({ quality: 85, effort: 4 })
          .toFile(path.join(directory, `${width}x${height}.webp`));
      }
    }
    if (++completed % 25 === 0)
      console.log(`Responsive photographs: ${completed}`);
  }
}
await Promise.all([consume(), consume()]);
// Pages uses advanced-mode Functions; Workers uses the same module through
// wrangler.jsonc. Only responsive image requests need a Pages Function.
await copyFile(
  path.join(root, "cloudflare/worker.js"),
  path.join(output, "_worker.js"),
);
await writeFile(
  path.join(output, "_routes.json"),
  JSON.stringify(
    { version: 1, include: ["/.netlify/images"], exclude: [] },
    null,
    2,
  ) + "\n",
);
console.log(
  `Cloudflare artifact: ${files.length} original files, ${completed * 14 + 5} responsive variants; no Git history or local previews.`,
);
