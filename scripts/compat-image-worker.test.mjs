import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../cloudflare/compat-image-worker.js";

function simulate(url, method = "GET") {
  const requested = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        requested.push({ url: new URL(request.url), method: request.method });
        return new Response("image", { status: 200 });
      },
    },
  };
  return { requested, response: worker.fetch(new Request(url, { method }), env) };
}
test("legacy JPEG image URL resolves to a same-origin static image", async () => {
  const t = simulate("https://example.pages.dev/.netlify/images?url=%2Fimages%2Fportfolio%2Fstreet-color-02.jpg&w=800");
  assert.equal((await t.response).status, 200);
  assert.equal(t.requested.length, 1);
  assert.equal(t.requested[0].url.pathname, "/images/portfolio/street-color-02.jpg");
});
test("legacy paths with spaces and uppercase extensions remain accessible", async () => {
  const source = "/gallery/KUMARTULI/KUMARTULI COLOUR - 28.JPG";
  const t = simulate("https://example.pages.dev/.netlify/images?url=" + encodeURIComponent(source));
  assert.equal((await t.response).status, 200);
  assert.equal(decodeURIComponent(t.requested[0].url.pathname), source);
});
test("unsafe image paths are rejected before asset lookup", async () => {
  const bad = ["//other-host/photo.jpg", "/images/../secret.jpg", "/images/%2e%2e/secret.jpg", "/images/stuff.svg", "https://other-host/photo.jpg"];
  for (const source of bad) {
    const t = simulate("https://example.pages.dev/.netlify/images?url=" + encodeURIComponent(source));
    const response = await t.response;
    assert.equal(response.status, 400, "Path should be rejected: " + source);
    assert.equal(t.requested.length, 0);
  }
});
test("non-image routes pass through to static Pages assets", async () => {
  const t = simulate("https://example.pages.dev/concept");
  assert.equal((await t.response).status, 200);
  assert.equal(t.requested[0].url.pathname, "/concept");
});
test("worker does not accept mutating methods", async () => {
  const t = simulate("https://example.pages.dev/.netlify/images?url=%2Fimages%2Fportfolio%2Fstreet-color-02.jpg", "POST");
  assert.equal((await t.response).status, 405);
});
