import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@tailwindcss/vite";
import { publicDir, outDir, projectRoot } from "./scripts/build-paths.mjs";
import { localImages } from "./scripts/local-images.mjs";
import { siteOrigin } from "./src/data/site.js";

export default defineConfig({
  site: siteOrigin,
  output: "static",
  publicDir,
  outDir,
  build: { format: "file" },
  integrations: [
    react(),
    {
      name: "portfolio-local-images",
      hooks: {
        "astro:server:setup": ({ server }) => {
          server.middlewares.use(localImages(projectRoot));
        },
      },
    },
  ],
  vite: { plugins: [tailwind()] },
  devToolbar: { enabled: false },
});
