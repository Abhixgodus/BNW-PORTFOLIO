# Cloudflare Pages hosting

The Pages project is `abhimanyusharma`; its public domain is
`https://abhimanyuphoto.pages.dev`. Production builds from `main`; other branches
receive separate preview URLs. Both use the prerendered React/Tailwind build.

Build: `node cloudflare/pages-build.mjs`
Local preview: `npx --yes wrangler@4.154.0 pages dev .cloudflare-dist`

Use Node 24.22.1, pinned by `.nvmrc`. The wrapper uses
pnpm 11.25.0, installs the adapter's locked dependencies, and invokes the existing
`cloudflare/build.mjs`. Root application dependencies are installed by Pages'
normal dependency installation step.

The root `wrangler.jsonc` sets the output to `.cloudflare-dist`.
That artifact contains prerendered pages, original photographs, responsive WebP
variants, `_worker.js`, and the narrow `_routes.json` for `/.netlify/images`.
Contact keeps the existing direct-email fallback.

The shared dashboard build command selects `cloudflare/pages-build.mjs` only
when that file exists in the checked-out branch. Otherwise it runs the existing
legacy build command. Keep the dashboard output directory as `.` and the
production branch as `main`. Netlify builds remain skipped by `netlify.toml`.
