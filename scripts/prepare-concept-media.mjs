/**
 * Optimized presentation photographs for /concept only.
 * Preserves all originals. Creates small thumbnails and sharp display copies
 * so the editorial Gallery never downloads camera-size files for its filmstrip.
 */
import path from "node:path";
import { mkdir, readFile, stat } from "node:fs/promises";
import sharp from "sharp";
import { publicDir } from "./build-paths.mjs";

const root = process.cwd();
const coverCrops = {
  delhi: { left: 630, top: 0, width: 1600, height: 2000 },
  esplanade: { left: 500, top: 0, width: 1600, height: 2000 },
};
const entries = [
  "street-color-02.jpg",
  "street-bnw-04.jpg",
  "street-color-03.jpg",
  "street-color-05.jpg",
  "street-bnw-02.jpg",
  "street-bnw-03.jpg",
  "street-bnw-05.jpg",
  "street-bnw-06.jpg",
  "landscape-color-05.jpg",
  "landscape-color-01.jpg",
  "landscape-color-04.jpg",
  "landscape-color-06.jpg",
  "street-color-04.jpg",
  "street-color-06.jpg",
  "landscape-bnw-02.jpg",
  "landscape-bnw-03.jpg",
];
const { collections } = JSON.parse(
  await readFile(path.join(root, "gallery-collections.json"), "utf8"),
);
const jobs = [
  ...entries.map((filename) => ({
    source: path.join(root, "images/portfolio", filename),
    destination: path.join(
      publicDir,
      "_concept/folio",
      filename.replace(/\.[^.]+$/, ""),
    ),
    widths: [
      "landscape-color-04.jpg",
      "landscape-bnw-03.jpg",
      "street-color-03.jpg",
    ].includes(filename)
      ? [640, 1280, 1920]
      : [640, 1280],
  })),
  ...collections.map(({ slug, cover }) => ({
    source: path.join(root, cover),
    destination: path.join(publicDir, "_concept/covers", slug),
    widths: ["sikkim", "kumartuli", "princep-ghat"].includes(slug)
      ? [640, 1280, 1920]
      : [640, 1280],
    motion: true,
    crop: coverCrops[slug],
  })),
  {
    source: path.join(root, "images/editorial/kolkata-menu.jpg"),
    destination: path.join(publicDir, "_concept/features/kolkata-menu"),
    widths: [640, 1280],
    quality: 85,
  },
  ...collections.map(({ slug, cover }) => ({
    source: path.join(root, cover),
    destination: path.join(publicDir, "_concept/covers", slug + "-mono"),
    monochrome: true,
    contrast: slug === "kumartuli" ? 1.3 : 1.2,
    crop: coverCrops[slug],
  })),
  ...[
    ["gallery/ESPLANADE/ESPLANADE BNW-5.JPG", "esplanade"],
    ["gallery/DELHI/QUTUBMINAR BNW-1.JPG", "qutub-minar"],
    ["images/editorial/abhimanyu-sharma-about.jpg", "abhimanyu-sharma"],
    ["images/editorial/blog-opening-sunset.jpg", "blog-opening-sunset"],
    [
      "images/editorial/abhimanyu-about-portrait.jpg",
      "abhimanyu-about-portrait",
    ],
    [
      "images/editorial/abhimanyu-about-hero-headroom.jpg",
      "abhimanyu-about-hero-desktop",
    ],
    [
      "images/editorial/abhimanyu-about-hero-mobile.jpg",
      "abhimanyu-about-hero-mobile",
    ],
    [
      "images/editorial/abhimanyu-journal-portrait.jpg",
      "abhimanyu-journal-portrait",
    ],
    ["images/editorial/abhimanyu-home-01.jpg", "abhimanyu-home-01"],
    ["images/editorial/abhimanyu-home-02.jpg", "abhimanyu-home-02"],
    ["images/editorial/abhimanyu-home-03.jpg", "abhimanyu-home-03"],
    ["images/editorial/abhimanyu-home-camera.jpg", "abhimanyu-home-camera"],
  ].map(([source, name]) => ({
    source: path.join(root, source),
    destination: path.join(publicDir, "_concept/features", name),
    widths: [320, 640, 1280, 1920],
    quality: 88,
  })),
];
for (const { slug } of collections) {
  const album = JSON.parse(
    await readFile(
      path.join(root, "src/data/collections", slug + ".json"),
      "utf8",
    ),
  );
  album.photos.forEach((photo, index) =>
    jobs.push({
      source: path.join(root, photo.src),
      destination: path.join(publicDir, "_concept/albums", slug, String(index)),
      widths: [320, 1280],
      quality: 88,
    }),
  );
}
for (const job of jobs) {
  await stat(job.source);
  await mkdir(path.dirname(job.destination), { recursive: true });
}
// Two images at a time keeps Sharp's memory usage predictable in Cloudflare.
sharp.concurrency(1);
let cursor = 0;
async function consume() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    for (const width of job.widths || [640, 1280]) {
      const photograph = sharp(job.source, { failOn: "warning" }).rotate();
      if (job.crop) photograph.extract(job.crop);
      photograph.resize({ width, withoutEnlargement: true });
      if (job.monochrome) {
        const contrast = job.contrast || 1.2;
        photograph.grayscale().linear(contrast, 127.5 * (1 - contrast));
      }
      await photograph
        .webp({ quality: job.quality || 82, effort: 3 })
        .toFile(job.destination + "-" + width + ".webp");
    }
    if (job.motion) {
      const kernel = Array(63).fill(0);
      for (let x = 0; x < 21; x++) kernel[21 + x] = 1 / 21;
      const motion = sharp(job.source, { failOn: "warning" }).rotate();
      if (job.crop) motion.extract(job.crop);
      await motion
        .resize({ width: 640, withoutEnlargement: true })
        .convolve({ width: 21, height: 3, kernel, scale: 1 })
        .webp({ quality: 66, effort: 3 })
        .toFile(job.destination + "-motion.webp");
    }
  }
}
await Promise.all([consume(), consume()]);
console.log(
  "Prepared " +
    jobs.reduce(
      (sum, job) =>
        sum + (job.widths?.length || 2) + Number(Boolean(job.motion)),
      0,
    ) +
    " WebP photographs and motion layers for /concept.",
);
