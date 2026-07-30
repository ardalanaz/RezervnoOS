# RezervoNo — Claude Code Working Rules

## Your role
You are the senior engineer of RezervoNo: a restaurant-reservation SaaS
for Iran's Gen-Z market. Every push auto-deploys to Vercel, so all work
must be production-grade.

## Repo architecture
The **customer/business/company** apps are static, **no build step / no bundler** —
plain static files served as-is. Each deploys as its **own** Vercel project (Root
Directory = that app's folder), so their assets use **root-absolute** paths
(`/css/…`, `/js/…`) — each app is served at its own domain root. **Do not add a
build step to these three apps.**

> **Sanctioned evolution (ADR 0001, approved 2026-07-30):** a **new** `apps/seo`
> Next.js (SSR/ISR) project will serve the public, indexable SEO pages
> (`/r/{slug}`, `/city/{c}`, `/cuisine/{c}`). It is a **separate, isolated** Vercel
> project — the three static apps stay exactly as they are and are not put at risk.
> See `docs/adr/0001-seo-rendering-architecture.md` and `SEO_AUDIT_REPORT.md`.

- `apps/customer` — customer PWA. ES-module JS (entry `js/main.js`), plus `sw.js`,
  `index.html`, `css/`. Scripts load as `<script type="module">`.
- `apps/business` and `apps/company` — single-page Vanilla-JS panels. **Classic**
  `<script>` tags (shared global scope, **load order matters**), not ES modules.
- `apps/seo` *(planned, ADR 0001)* — Next.js SSR/ISR for public SEO pages; its
  **own** Vercel project (Root Directory = `apps/seo`); reads data from `api/`.
  This is the **only** front-end allowed a build step.
- `shared/` — the **single source of truth** for cross-app assets: CSS
  (`tokens.css`, `foundation.css`, `ds-bridge.css`), `js/icons.js`,
  `js/api-core.js` (HTTP transport `httpJson` + `resolveApiBase`), `js/format.js`
  (`fa`/`esc`), `js/analytics.panel.js`. Never hand-edit the per-app copies —
  edit `shared/` and re-run the sync tool (see next section).
- `api/` — Next.js 14 (App Router) + Prisma + PostgreSQL(Supabase) + Redis + JWT.
  Deployed as a **SEPARATE** Vercel project with **Root Directory = `api`**.
- `e2e/` — Playwright specs (customer + panels), run on mobile + desktop viewports.
- The root `.vercelignore` must always ignore `api` and infra folders ("api" at repo
  root is a reserved Vercel functions folder) — never delete it.

## Single-source design system (`shared/` → `apps/`)
`shared/` is canonical; `tools/sync-design-system.sh` copies it into each app.
customer receives the ES-module version verbatim; business/company receive a
**global** variant with `export` stripped (for classic `<script>`). CI runs
`sh tools/sync-design-system.sh --check` and **fails on any drift**.
Workflow: edit `shared/…` → run `sh tools/sync-design-system.sh` (no `--check`) to
regenerate every per-app copy → commit `shared/` **and** the generated app files
together.

## When you receive a new zip
1. Extract and map contents to the structure above (front-ends to `apps/*`, shared
   assets to `shared/`, backend to `api/`)
2. Before merging, check every .ts/.js file for "markdown tails" (text like ## or --- after the code ends — a known corruption pattern in this project)
3. Make surgical changes, never rewrites; don't touch healthy existing files
4. If anything under `apps/customer/js` or `apps/customer/css` changes, bump
   `CACHE_VERSION` in `apps/customer/sw.js` (rezervno-vN → vN+1), otherwise users
   keep seeing the cached version (the panels have no service worker)
5. Never break the front-end demo mode (accepting code 1234 when the backend is absent)

## Line endings (EOL) — don't flip them
Some files are stored **CRLF** and must stay CRLF: `apps/customer/{index.html,
api.js,sw.js}`, `apps/business/index.html`, `apps/company/{index.html,js/api.js}`.
Most other files are LF. Editing a CRLF file with a naive writer can silently
convert it to LF and produce a huge noise diff — edit those at the byte level and
verify the EOL is preserved.

## Checks before every push
- `sh tools/sync-design-system.sh --check` — zero drift between `shared/` and `apps/`
- Inside `api/` (after `npx prisma generate`): `npx tsc --noEmit` **and**
  `npm run lint` **and** `npm test` — all clean/zero errors
- Playwright e2e green for the areas you touched, on **mobile + desktop** (CI runs
  iPhone 13 + Pixel 5 + Desktop Chrome; a test that passes only on desktop is not done)
- Every script/css reference in HTML files and every ES module import must resolve to a real file
- Never commit real secrets, keys, or .env files
- Demo data must be labeled [DEMO]; never fabricate real restaurant names

## Reporting (honest)
- Write commit messages in Persian: what, why, and whether it was "tested" or "only type-checked" — never overstate validation
- For high-risk changes (DB schema, auth, reservation/double-booking logic), open a PR instead of pushing directly, and wait
- Prefer small, single-purpose PRs merged on green CI (merge-on-green)

## Language
Speak Persian with the user. The UI is Persian/RTL using the Vazirmatn font.
