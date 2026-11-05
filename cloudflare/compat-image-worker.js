/**
 * Minimal legacy image URL compatibility for Cloudflare Pages advanced mode.
 * The regular static Pages build does not run Netlify's image resizing service.
 * Preserve old pages by serving the original local photograph instead.
 *
 * This worker only runs for /.netlify/images via _routes.json. The new
 * /concept presentation directly uses pre-built responsive WebP assets.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/.netlify/images") {
      return env.ASSETS.fetch(request);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    const original = url.searchParams.get("url");
    if (
      !original ||
      !original.startsWith("/") ||
      original.startsWith("//") ||
      original.includes("..") ||
      original.includes("\\") ||
      original.includes("%") ||
      original.includes("?") ||
      original.includes("#") ||
      /[\u0000-\u001f]/.test(original) ||
      !/^\/(?:images|gallery)\//.test(original) ||
      !/\.(?:jpe?g|png|webp|avif)$/i.test(original)
    ) {
      return new Response("Invalid local image", { status: 400 });
    }
    const assetUrl = new URL(original, url.origin);
    return env.ASSETS.fetch(new Request(assetUrl, {
      method: request.method,
      headers: request.headers,
    }));
  },
};
