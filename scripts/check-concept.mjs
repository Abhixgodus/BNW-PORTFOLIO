/**
 * Build-time release gate for the isolated React photography concept.
 * This checks that all essential pages and their optimized image assets exist.
 */
import { access, readFile, stat, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { outDir, projectRoot } from "./build-paths.mjs";
import { journalPosts } from "../src/data/journal.js";

const folios = [
  "street-color-02",
  "street-bnw-04",
  "street-color-03",
  "street-color-05",
  "street-bnw-02",
  "street-bnw-03",
  "street-bnw-05",
  "street-bnw-06",
  "landscape-color-05",
  "landscape-color-01",
  "landscape-color-04",
  "landscape-color-06",
  "street-color-04",
  "street-color-06",
  "landscape-bnw-02",
  "landscape-bnw-03",
];
const { collections } = JSON.parse(
  await readFile("gallery-collections.json", "utf8"),
);
const homeHero = JSON.parse(
  await readFile(path.join(projectRoot, "src/data/home-hero.json"), "utf8"),
);
const files = [
  ...homeHero.desktop.flatMap(({ slug }) =>
    [1280, 1920, 2560].map((width) =>
      path.join(outDir, "_concept/hero", `${slug}-desktop-${width}.webp`),
    ),
  ),
  ...homeHero.phone.flatMap(({ slug }) =>
    [640, 960].map((width) =>
      path.join(outDir, "_concept/hero", `${slug}-phone-${width}.webp`),
    ),
  ),
  ...[640, 1280].map((width) =>
    path.join(outDir, "_concept/features", "kolkata-menu-" + width + ".webp"),
  ),
  ...collections.flatMap(({ slug }) =>
    [640, 1280].map((width) =>
      path.join(outDir, "_concept/covers", slug + "-mono-" + width + ".webp"),
    ),
  ),
  ...[
    "esplanade",
    "abhimanyu-sharma",
    "abhimanyu-about-portrait",
    "abhimanyu-about-hero-desktop",
    "abhimanyu-about-hero-mobile",
    "abhimanyu-journal-portrait",
    "abhimanyu-home-camera",
  ].flatMap((name) =>
    [320, 640, 1280, 1920].map((width) =>
      path.join(outDir, "_concept/features", name + "-" + width + ".webp"),
    ),
  ),
  ...collections.map(({ slug }) =>
    path.join(outDir, "_concept", "covers", slug + "-motion.webp"),
  ),
  ...["sikkim", "kumartuli"].map((slug) =>
    path.join(outDir, "_concept", "covers", slug + "-1920.webp"),
  ),
  ...folios.flatMap((name) =>
    [640, 1280].map((width) =>
      path.join(outDir, "_concept", "folio", name + "-" + width + ".webp"),
    ),
  ),
  ...collections.flatMap(({ slug }) =>
    [640, 1280].map((width) =>
      path.join(outDir, "_concept", "covers", slug + "-" + width + ".webp"),
    ),
  ),
];
for (const filename of files) {
  const info = await stat(filename);
  if (info.size < 512 || info.size > 2_500_000) {
    throw new Error(
      "Concept WebP outside expected file-size range: " +
        filename +
        " (" +
        info.size +
        " bytes)",
    );
  }
}
for (const file of ["concept.html", "_astro", "_worker.js", "_routes.json"]) {
  await access(path.join(outDir, file));
}
const html = await readFile(path.join(outDir, "concept.html"), "utf8");
const rootHtml = await readFile(path.join(outDir, "index.html"), "utf8");
if (
  !rootHtml.includes('data-editorial-page="home"') ||
  !rootHtml.includes('id="ed-hero-title"') ||
  !rootHtml.includes('aria-label="Moments from ordinary lives"') ||
  rootHtml.includes('class="ed-story-kicker"') ||
  rootHtml.includes('class="ed-story-marquee"') ||
  rootHtml.includes('class="ed-loading"')
) {
  throw new Error("The default homepage must be the current editorial concept");
}
if (
  !html.includes("Abhimanyu Sharma") ||
  !html.includes('name="robots"') ||
  !html.includes("noindex")
) {
  throw new Error("Concept page metadata is incomplete");
}
const preview = files.filter((x) => x.endsWith("-1280.webp")).slice(0, 2);
for (const filepath of preview) {
  const meta = await sharp(filepath).metadata();
  if (!meta.width || meta.width > 1280 || meta.format !== "webp") {
    throw new Error("Malformed WebP derivative: " + filepath);
  }
}

/* Collection-level integrity: validate every original album file and the
 * editorial metadata against real data. This guards against broken galleries
 * even when the homepage and its thumbnails happen to build successfully. */
const series = JSON.parse(
  await readFile("src/data/editorial-series.json", "utf8"),
);
for (const page of ["gallery", "about", "contact", "journal"]) {
  const source = await readFile(
    path.join(outDir, "concept", page + ".html"),
    "utf8",
  );
  if (!source.includes('id="main"') || !source.includes('aria-current="page"'))
    throw new Error("Missing editorial page semantics: " + page);
  for (const route of [
    "/concept",
    "/concept/gallery",
    "/concept/journal",
    "/concept/about",
    "/concept/contact",
  ])
    if (!source.includes('href="' + route + '"'))
      throw new Error("Missing shared navigation " + route);
}
if (series.length !== collections.length) {
  throw new Error("Editorial gallery does not include every collection");
}
let validatedPhotos = 0;
for (const collection of collections) {
  const full = JSON.parse(
    await readFile(
      path.join("src", "data", "collections", collection.slug + ".json"),
      "utf8",
    ),
  );
  const entry = series.find((item) => item.slug === collection.slug);
  if (!entry || Number(entry.count) !== full.photos.length) {
    throw new Error("Editorial count mismatch for " + collection.slug);
  }
  if (entry.cover.src !== "/" + collection.cover) {
    throw new Error("Editorial cover mismatch for " + collection.slug);
  }
  for (const [index, photo] of full.photos.entries()) {
    if (!photo.src || !photo.alt || !photo.title) {
      throw new Error("Missing photograph description in " + collection.slug);
    }
    await access(path.join(outDir, photo.src));
    for (const width of [320, 1280])
      await access(
        path.join(
          outDir,
          "_concept/albums",
          collection.slug,
          index + "-" + width + ".webp",
        ),
      );
    validatedPhotos++;
  }
}
// Every public entry must render this portfolio, with no legacy UI assets.
for (const [file, page] of [
  ["index.html", "home"],
  ["gallery.html", "gallery"],
  ["about.html", "about"],
  ["contact.html", "contact"],
  ["concept.html", "home"],
  ["concept/gallery.html", "gallery"],
  ["concept/about.html", "about"],
  ["concept/contact.html", "contact"],
  ["journal.html", "blog"],
  ["concept/journal.html", "blog"],
  ...journalPosts.flatMap((post) => [
    [`journal/${post.slug}.html`, "post"],
    [`concept/journal/${post.slug}.html`, "post"],
  ]),
]) {
  const content = await readFile(path.join(outDir, file), "utf8");
  if (
    !content.includes(`data-editorial-page="${page}"`) ||
    !content.includes('id="main"') ||
    (content.match(/<h1(?:\s|>)/g) || []).length !== 1 ||
    /(?:portfolio-glass|apple-system|site-foundation)\.css/.test(content)
  )
    throw new Error("Non-editorial or incomplete route: " + file);
}
for (const post of journalPosts) {
  const content = await readFile(
    path.join(outDir, "concept/journal", post.slug + ".html"),
    "utf8",
  );
  if (
    !content.includes(post.title) ||
    !content.includes('property="og:type" content="article"') ||
    !content.includes('aria-label="More journal entries"') ||
    /(?:A few lines.*go here|Lorem ipsum|placeholder photograph)/i.test(content)
  )
    throw new Error("Incomplete journal entry: " + post.slug);
  for (const photo of [post.cover, ...post.images]) {
    await access(path.join(outDir, photo.src));
    for (const width of [320, 1280])
      await access(path.join(outDir, photo.preview + `-${width}.webp`));
  }
}
let originals = 0;
async function verifyOriginals(folder) {
  for (const entry of await readdir(path.join(projectRoot, folder), {
    withFileTypes: true,
  })) {
    if (entry.name === ".DS_Store") continue;
    const relative = path.join(folder, entry.name);
    if (entry.isDirectory()) await verifyOriginals(relative);
    else {
      const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
      if (
        hash(await readFile(path.join(projectRoot, relative))) !==
        hash(await readFile(path.join(outDir, relative)))
      )
        throw new Error("Original bytes changed: " + relative);
      originals++;
    }
  }
}
for (const folder of ["gallery", "images", "fonts"])
  await verifyOriginals(folder);
console.log(
  `Current portfolio verified: ${10 + journalPosts.length * 2} editorial routes and ${originals} byte-identical original assets.`,
);
console.log(
  "Editorial albums verified: " + validatedPhotos + " original photographs.",
);

console.log(
  "Concept release checks passed: " +
    files.length +
    " WebP images, 7 collections, valid HTML.",
);
