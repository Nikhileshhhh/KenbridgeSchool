# KenBridge School Gulbarga website

Static Astro build of the design in `../design-handoff/`. The plan, decisions and build order are in [PLAN.md](PLAN.md); the rules are in `../CLAUDE.md`. Every missing item (photo, file, fact) is a visible `[placeholder]`, tracked in [PLACEHOLDERS.md](PLACEHOLDERS.md).

This is a **design demo**: the forms say plainly that nothing is sent, and the whole site is kept out of search engines until launch (see *Before launch*).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:4321. Dev-only review pages: `/dev/kit`, `/dev/shell-hero`, `/dev/enquiry-states`, `/dev/contact-states` |
| `npm run build` | `astro build`, then `scripts/pagefind.mjs` writes the search index into `dist/pagefind/` |
| `npm run preview` | Serves `dist/` at http://localhost:4321 (the QA scripts start their own on 4322) |

### Checks (run `npm run build` first; first run only: `npx playwright install chromium`)

| Command | What it checks |
|---|---|
| `npm run a11y` | axe (WCAG 2.2 AA) on every built page at 1440 and 390 |
| `node scripts/launch-check.mjs` | Every page: keyboard (skip link, focus ring on every stop, nothing off screen, no focus trap), JS off at 390 and 1440 (no sideways scroll, nothing waiting for JS, axe), reduced motion (no looping animation) |
| `node scripts/seo-check.mjs` | Every page: unique title and description, canonical, Open Graph, noindex in the demo, JSON-LD, lang, skip link, one main, one h1, no "best school" claims; sitemap and robots.txt |
| `node scripts/lighthouse.mjs` | Lighthouse on every page, mobile and desktop, against the 95+ and LCP / CLS / TBT budgets. Build with `PUBLIC_INDEXING=true` first, or SEO reports the demo's deliberate noindex |
| `npm run check:shell` · `check:home` · `check:about` · `check:learning` · `check:campus` · `check:admissions` · `check:achievements` · `check:gallery` · `check:information` · `check:contact` · `check:search` | Each section's interactions, JS on and off, phone, reduced motion and axe in every state |
| `npm run check:print` | The timings page prints on one A4 sheet; song and prayer print cleanly |
| `npm run check:placeholders` | Every rendered `[placeholder]` is listed in PLACEHOLDERS.md |
| `npm run check:redirects` | Every legacy URL in PAGE-MAP.md is a single 301 in `vercel.json`; pass a deployed URL to test it live: `node scripts/check-redirects.mjs https://<preview>.vercel.app` |
| `node scripts/compare-boards.mjs [name]` | Board reference (left) beside the built page (right) into `qa/compare/`. Needs `npm run dev`; the search entries (`a5`–`a8`) need the built site: `$env:BASE='http://localhost:4322'` with a preview on 4322 |
| `npm run qa` | Full-page screenshots of every page (1440 / 390 × JS on / off / reduced motion) into `qa/shots/` |

## Where things live

- **Content** (`src/data/*.yaml`, `src/content/**`): school facts and contacts, external services, navigation, settings, programmes, facilities, results, gallery, admissions, information pages, contact and services copy. Every file is validated at build time (`src/content.config.ts`), so a typo fails the build. Conflicts between sources are marked `TODO(content)` beside the value.
- **Settings** (`src/data/settings.yaml`): admissions status (closed / open / opening), form mode (demo / live), facility drafts, school song recording.
- **Tokens** (`src/styles/tokens.css`): colour, type, space, radius and motion from the design-system boards.
- **Search**: every page's `<main>` is indexed by Pagefind after the build; external services and PDFs come from `services.yaml` (`src/pages/search-records.json.ts`). A PDF without a file is left out of search until supplied.
- **Photos**: drop an original into `src/assets/photos/` with the file name its placeholder shows (for example `Library-2.jpg`) **and** add its alt text to `src/data/photos.yaml`. Placeholders drawn with `ui/Placeholder.astro` (programme and facility photos, the learning journey, result banners) then render the photo as AVIF / WebP / JPEG with srcset. The build stops if a photo has no alt text. The hero backgrounds, gallery album grid and lightbox, the campus atlas preview, the Home "life" collage and the contact photo are still drawn as placeholder frames: wire each to the same pipeline when its photos arrive.

## Deploying on Vercel

`vercel.json` already sets: framework Astro, build command `npm run build`, output `dist`, clean URLs without trailing slashes, every legacy 301 from PAGE-MAP.md (plus `/gallery?year=` → `/gallery/<year>`), security headers, long caching for fonts and hashed assets, and `X-Robots-Tag: noindex`.

1. Import the `website/` folder as a Vercel project (root directory `website`). Node 22.12 or newer (Astro 7 requires it; set it under Project Settings › Node.js Version).
2. Environment variable: `PUBLIC_INDEXING=false` (the default when unset).
3. After the first preview deploy: `node scripts/check-redirects.mjs https://<preview-url>` (each legacy URL must answer one 301), check that an unknown path returns 404, and that responses carry `X-Robots-Tag: noindex`.

## Before launch

- Set `PUBLIC_INDEXING=true` in Vercel **and** remove the `X-Robots-Tag: noindex` header from `vercel.json`. Both keep the demo out of search engines on purpose.
- Set `facilityDrafts: false` in `src/data/settings.yaml`.
- Choose a form service, set `forms.mode: live` and the form `action`; add the reCAPTCHA notice to the contact form only if that service uses reCAPTCHA.
- Put the brochure PDF at `public/wp-content/uploads/2023/01/KenBridge-School-Prospectus.pdf` and point `services.yaml › brochure.url` at the local path. Supply the Fee Structure and Academic Calendar PDFs.
- Replace the store badge placeholders with the official Google Play and App Store badges, unaltered.
- Scan-test the QR code on /services, and check the map pin on /contact.
- Add a yearly rebuild on 1 June (Vercel deploy hook + cron) so the academic year and the admissions pill roll over.
- Resolve or confirm every `TODO(content)` (search the code; the list is in `../design-handoff/OPEN-QUESTIONS.md`).
