// Compatibility for existing responsive-photo URLs. Images are generated at
// build time; requests never resize photographs or call another hosting service.
const widths = [
  320, 480, 640, 720, 800, 960, 1200, 1280, 1440, 1600, 1920, 2560, 3840,
];
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/.netlify/images") return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405 });
    const source = url.searchParams.get("url");
    if (
      !source?.startsWith("/") ||
      source.startsWith("//") ||
      source.includes("..") ||
      !/\.(?:jpe?g|png|webp)$/i.test(source)
    )
      return new Response("Invalid image", { status: 400 });
    const requested = Number(url.searchParams.get("w") || 1600);
    const width = widths.find((value) => value >= requested) || widths.at(-1);
    const requestedHeight = Number(url.searchParams.get("h") || 0);
    const cover = url.searchParams.get("fit") === "cover";
    const shareCrop = cover && requestedHeight === 630 && width === 1200;
    // Match the existing portrait Hero's exact sources. Returning a landscape
    // derivative here would soften its 3:4 crop on high-density phones.
    const portraitCrop =
      source === "/images/hero-waterfall.jpg" &&
      cover &&
      [480, 720, 960, 1440, 1920].includes(requested) &&
      requestedHeight === (requested * 4) / 3;
    const variant = shareCrop
      ? "1200x630"
      : portraitCrop
        ? `${requested}x${requestedHeight}`
        : width;
    url.pathname = "/_responsive" + source + "/" + variant + ".webp";
    url.search = "";
    return env.ASSETS.fetch(
      new Request(url, { method: request.method, headers: request.headers }),
    );
  },
};
