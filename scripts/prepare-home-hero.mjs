import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";
import { projectRoot, publicDir } from "./build-paths.mjs";

const photographs = JSON.parse(
  await readFile(path.join(projectRoot, "src/data/home-hero.json"), "utf8"),
);
const destination = path.join(publicDir, "_concept/hero");
await mkdir(destination, { recursive: true });
const clamp = (value, max) => Math.max(0, Math.min(value, max));

for (const [device, aspect, sizes, set] of [
  ["desktop", 16 / 9, [1280, 1920, 2560], photographs.desktop],
  ["phone", 9 / 16, [640, 960], photographs.phone],
]) {
  for (const photograph of set) {
    const source = path.join(projectRoot, photograph.source);
    const metadata = await sharp(source).metadata();
    const turned = metadata.orientation >= 5;
    const width = turned ? metadata.height : metadata.width;
    const height = turned ? metadata.width : metadata.height;
    const cropWidth = Math.min(width, Math.round(height * aspect));
    const cropHeight = Math.min(height, Math.round(width / aspect));
    const crop = {
      left: clamp(
        Math.round(width * photograph.focus[0] - cropWidth / 2),
        width - cropWidth,
      ),
      top: clamp(
        Math.round(height * photograph.focus[1] - cropHeight / 2),
        height - cropHeight,
      ),
      width: cropWidth,
      height: cropHeight,
    };
    for (const size of sizes) {
      const { data, info } = await sharp(source)
        .rotate()
        .extract(crop)
        .resize(size, Math.round(size / aspect), { withoutEnlargement: true })
        .grayscale()
        .linear(1.18, -14)
        .raw()
        .toBuffer({ resolveWithObject: true });
      let seed = 173 + size;
      for (let pixel = 0; pixel < data.length; pixel += info.channels) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const grain = Math.round(((seed >>> 24) / 255 - 0.5) * 7);
        for (let channel = 0; channel < info.channels; channel++)
          data[pixel + channel] = clamp(data[pixel + channel] + grain, 255);
      }
      await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .webp({ quality: 86, effort: 3 })
        .toFile(
          path.join(destination, `${photograph.slug}-${device}-${size}.webp`),
        );
    }
  }
}
console.log(
  `Prepared ${photographs.desktop.length} desktop and ${photographs.phone.length} phone Home hero photographs.`,
);
