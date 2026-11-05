import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat, realpath } from "node:fs/promises";
import path from "node:path";
import { outDir } from "./build-paths.mjs";
import { localImages } from "./local-images.mjs";
const root = await realpath(outDir).catch(() => {
  throw new Error("Run pnpm build before preview.");
});
const images = localImages(root),
  port = Number(
    process.argv.includes("--port")
      ? process.argv[process.argv.indexOf("--port") + 1]
      : 4283,
  );
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".ico": "image/x-icon",
};
const server = createServer((request, response) =>
  images(request, response, async () => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { "Content-Type": "text/plain" });
      response.end("Local preview does not deliver messages.");
      return;
    }
    try {
      const url = new URL(request.url, "http://127.0.0.1"),
        pathname = decodeURIComponent(url.pathname);
      const relative = pathname.endsWith("/")
        ? pathname + "index.html"
        : pathname;
      let file, details;
      for (const candidate of [
        relative,
        relative + ".html",
        relative + "/index.html",
      ]) {
        const absolute = path.resolve(root, "." + candidate);
        if (!absolute.startsWith(root + path.sep)) continue;
        try {
          const actual = await realpath(absolute);
          if (!actual.startsWith(root + path.sep)) continue;
          const value = await stat(actual);
          if (value.isFile()) {
            file = actual;
            details = value;
            break;
          }
        } catch {}
      }
      if (!file) throw new Error("Not found");
      const ext = path.extname(file).toLowerCase();
      response.writeHead(200, {
        "Content-Type": mime[ext] || "application/octet-stream",
        "Content-Length": details.size,
        "Cache-Control": [".html", ".js", ".css"].includes(ext)
          ? "no-cache"
          : "public, max-age=3600",
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      createReadStream(file)
        .on("error", () => response.destroy())
        .pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
    }
  }),
);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `React portfolio preview: http://127.0.0.1:${port}\nStatic output: ${root}`,
  ),
);
