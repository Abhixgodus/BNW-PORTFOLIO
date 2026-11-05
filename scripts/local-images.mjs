import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import sharp from "sharp";

/** Local-only equivalent of the existing Netlify image URLs. Production keeps
 * using Netlify Image CDN; no server or image endpoint is added to the deploy. */
export function localImages(root) {
  const cache = new Map();
  return async function images(request, response, next) {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname !== "/.netlify/images") {
      next();
      return;
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405);
      response.end();
      return;
    }
    try {
      const original = url.searchParams.get("url");
      if (!original?.startsWith("/") || original.startsWith("//"))
        throw new Error("Invalid photograph");
      const resolvedRoot = await realpath(root),
        source = await realpath(path.resolve(root, "." + original));
      if (
        !source.startsWith(resolvedRoot + path.sep) ||
        !/^\.(jpe?g|png|webp|avif)$/i.test(path.extname(source))
      )
        throw new Error("Invalid photograph");
      const dimension = (name) => {
        const n = Number(url.searchParams.get(name) || 0);
        if (!Number.isFinite(n) || n < 0) throw new Error("Invalid dimension");
        return Math.min(4096, Math.round(n));
      };
      const width = dimension("w"),
        height = dimension("h"),
        cover = url.searchParams.get("fit") === "cover" && width && height;
      const key = [
        source,
        (await stat(source)).mtimeMs,
        width,
        height,
        cover,
      ].join(":");
      let pending = cache.get(key);
      if (pending) {
        cache.delete(key);
        cache.set(key, pending);
      } else {
        pending = sharp(source)
          .rotate()
          .resize({
            width: width || 4096,
            height: height || 4096,
            fit: cover ? "cover" : "inside",
            withoutEnlargement: !cover,
          })
          .webp({ quality: 84, effort: 3 })
          .toBuffer();
        cache.set(key, pending);
        pending.catch(() => cache.delete(key));
        while (cache.size > 96) cache.delete(cache.keys().next().value);
      }
      const image = await pending;
      response.writeHead(200, {
        "Content-Type": "image/webp",
        "Content-Length": image.length,
        "Cache-Control": "public, max-age=3600",
      });
      response.end(request.method === "HEAD" ? undefined : image);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Photograph not found");
    }
  };
}
