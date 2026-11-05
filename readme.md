# BNW PORTFOLIO

**Only the new black editorial portfolio lives here.** The old glass website, its pages, components, styles and experiments are preserved outside this folder in the recovery archive.

Active project: `/Users/abhix777/Movies/Abhimanyushamra`.

## Start

Node is pinned to 24.22.1; package engine accepts >=24.22.1. Use pnpm 11.25.0 and the existing lockfile.

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run preview -- --port 4173
```

Open **http://127.0.0.1:4173/** or **http://127.0.0.1:4173/concept** — both render the new portfolio. Gallery, Journal, About and Contact also have root and `/concept` entries. The journal starts at **http://127.0.0.1:4173/concept/journal**, with six individual post routes. For editing, use `pnpm run dev -- --port 4173` instead of preview.

## Organization

- `src/components/editorial/` — current pages, navigation, galleries and animations.
- `src/styles/` — current design system and page styles.
- `src/data/` — authored photo metadata, sequence and signature strokes.
- `src/pages/`, `src/layouts/` — current route entries and shared layout.
- `gallery/` — all 276 original album photographs.
- `images/` — six current personal portraits and sixteen selected photographs.
- `fonts/` — current fonts and licenses.
- `scripts/` — current build, image preparation, preview and verification.
- `cloudflare/`, `netlify.toml`, `wrangler.jsonc` — deployment support, preserved for later release review.
- `docs/` — concise context and handoff for future chats.

The normal build produces **22 editorial route entries and no old website pages**. It validates the album originals, current assets, all six journal posts, search behavior and image-worker behavior. Contact opens an email draft; it does not send through a backend. This unreleased site retains noindex metadata; no live deployment was changed.

Journal copy and photograph sequences are in `src/data/journal-posts.json`. The search and subject filters are local to the journal; posts have previous/next navigation and copy/email sharing. The existing site header, footer and restrained page transitions are shared. See `docs/JOURNAL_DESIGN.md` for the design choices and `docs/JOURNAL_IMPLEMENTATION.md` for verification.

## Git and recovery

The project is a linked Git worktree. Keep `/Users/abhix777/Documents/GitHub/abhimanyuphoto/.git`. Existing work and history were preserved, with no new commits or remote changes. Archived old tracked files appear as deliberate deletions; do not reset them.

Recovery archive: `/Users/abhix777/Movies/Portfolio-Archives/2026-11-05`.
Audit and exact recovery map: `/Users/abhix777/Movies/Portfolio-Workspace-Audit-2026-11-05/CLEANUP_REPORT.md`.

Read [project context](docs/PORTFOLIO_CONTEXT.md) and [workspace handoff](docs/WORKSPACE_HANDOFF.md) before continuing development. Open this folder as the Codex project to keep routine searches focused.
