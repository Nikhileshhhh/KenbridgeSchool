# KenBridge School Gulbarga website: build plan

## Context

The full redesign is in `design-handoff/`: 94 `.dc.html` boards (the source of truth), the official emblem artwork with a working three.js engine, verified content in `KENBRIDGE_SCREEN_PROMPTS_FROM_LIVE_SITE.md`, and the rules in `CLAUDE.md`. The goal is a static Astro site in `website/` that matches the boards at 1440px and 390px, works without JavaScript, meets WCAG 2.2 AA, keeps every unverified item as a visible `[placeholder]`, and deploys on Vercel as a **design demo** for the school.

**Status:** approved 2026-10-03. Batches run in order, one per session (§9).

### Decisions (from you)
| Topic | Decision | Consequence |
|---|---|---|
| Deploy | **Vercel** | `vercel.json` holds the 301s (`"statusCode": 301`, because Vercel's `permanent` gives a 308), the query-string redirect for `?year=`, headers and clean URLs. Astro `build.format: 'file'`, `cleanUrls: true`, `trailingSlash: false` |
| Forms | **Static demo, no backend** | Contact and Enquiry forms get full client-side validation, an error summary, inline errors and kept values. A valid submit shows an honest "Preview: not connected, nothing was sent. Call 98869 99660 or email kbsglb@…" notice. `settings.forms.mode = 'demo'`; the sending, success and failed states are built for when `mode: 'live'` is wired up later. The Admissions page keeps the external enquiry link (`enquiryOnPage: false`, the board default). |
| 3D emblem | **Home hero + closing scene** | One three.js load on Home only. About uses the static layered artwork with the same "What our logo means" interaction. |
| Media | **Placeholders until supplied** | The image pipeline is built, but the designed `[Photo · file]` frames render until originals are dropped into `src/assets/photos/`. PDFs show `[size]` and have no link until supplied. |
| Indexing | Demo is `noindex` | `PUBLIC_INDEXING=false` by default, giving `<meta name="robots" content="noindex">`, `robots.txt` Disallow, and `X-Robots-Tag` in `vercel.json`. Flip the setting at launch. |

### Design gaps found while planning (handled as stated unless you say otherwise)
1. **Hub pages aren't reachable from the JS mega menus.** No panel links to `/learning`, `/information` or `/gallery`. I'll make each panel's serif title a link to its hub (small, flagged deviation). Without JS, the nav items themselves are links to the hubs.
2. **Gallery URLs.** Each year becomes a real static page at `/gallery/2025-26`, which is also the album breadcrumb's "Back to 2025-26" target. `/gallery?year=2025-26` gets a 301 to it (Vercel `has: query`). `/gallery` shows the latest year.
3. **Albums with no imported photos** (every album except Annual Day 2025-26) render their tile without a link, so there are no empty album pages.
4. **Facility "drafts"** (dashed "To confirm" boxes) are on in the demo for school review and off at launch (`settings.facilityDrafts`).
5. **Unknown URLs** (Facebook/YouTube profile links in the header use `#` on the board; the disclosure "Inspection video") use the A4/A5 URLs where verified and a `[placeholder]` otherwise.
6. **Not built:** "Life at KenBridge" (not designed; ask first). Tablet (768–1279) interpolates between the two layouts; the header goes compact below 1280px, as specified in ShellHeader.

---

## 1. Stack and dependencies (approval of this plan approves this list)
- `astro` (current stable, static output), `sharp` (astro:assets images), `@astrojs/sitemap` (build-time only)
- `three@0.158.0` (the version the design engine was built and tested on; ESM named imports, never the UMD file)
- `pagefind` (post-build index plus a custom vanilla UI; PDFs and external services added as custom records)
- `@fontsource/cormorant-garamond` (400/500/600/700, italic 400/500) and `@fontsource/manrope` (400–800): self-hosted, latin plus latin-ext subsets only
- Dev only: `playwright`, `@axe-core/playwright`, `@lhci/cli`
- No UI framework and no CSS framework. Content lives in Astro content collections (YAML with Zod schemas, so `TODO(content)` comments fit inline).

## 2. File structure
```
website/
  PLAN.md  PLACEHOLDERS.md  README.md  astro.config.mjs  vercel.json  package.json  tsconfig.json
  scripts/      pagefind.mjs (index + custom records) · check-placeholders.mjs · qa-shots.mjs (Playwright 1440/390, JS on/off, reduced motion) · a11y.mjs (axe) · check-redirects.mjs · print-check.mjs
  public/       favicon/apple-touch (official logo) · og-default.png · wp-content/uploads/2023/01/ (brochure, when supplied) · media/ (song recording, when supplied)
  src/
    assets/brand/   logo-official-transparent.png, part-{head,book,nib,flame,rays}.png  (copied unaltered from design-handoff/assets)
    assets/photos/  empty; README lists every expected file name from PLACEHOLDERS / A7
    content.config.ts   collections + Zod schemas
    data/          settings · contacts · services · navigation · home · about · stats · results · documents · admissions · faqs · timings · rules · decorum · song · prayer · disclosure · campus-scenes   (YAML)
    content/       programmes/*.yaml · facilities/*.yaml · albums/<year>/*.yaml · prose/{founder,principal}.md
    lib/           academic-year.ts · admissions-status.ts · photos.ts (file → Picture or placeholder) · seo.ts · format.ts
    styles/        tokens.css · fonts.css · base.css · layout.css · utilities.css · motion.css · print.css
    layouts/       BaseLayout.astro (head/SEO, skip link, header variant, main#main, footer, islands)
    components/    shell/ · ui/ · emblem/ · home/ · about/ · learning/ · campus/ · admissions/ · achievements/ · gallery/ · information/ · contact/ · search/
    scripts/       client islands (see §5)
    pages/         index · about/{index,founder,principal} · learning/{index,[stage]} · campus/{index,[facility]} · admissions · achievements
                   gallery/{index,[year]/index,[year]/[album]} · information/{index,timings,rules,decorum,song,prayer,disclosure}
                   contact · services · search · app · 404 · robots.txt.ts
```

## 3. Layouts and components, mapped to boards
**Layout:** `BaseLayout` takes `title`, `description`, `header: 'hero' | 'solid'`, `current` (nav section), `breadcrumbs[]` and `ogImage`. It renders the skip link, header, `<main id="main">`, the footer, and JSON-LD (School org on every page, BreadcrumbList on deep pages). An inline `<html class="js">` flag gates every enhancement.

| Component | Boards | Notes |
|---|---|---|
| `shell/SiteHeader` + `UtilityBar` | SiteHeader, ShellHeader, MegaMenu | 44px utility bar plus an 88px header; `hero` and `solid` variants; current-section bar; Admissions CTA; compact below 1280 |
| `shell/MegaPanel` | MegaPanel, MegaMenusAll | 7 panels from `navigation.yaml`; Gallery shows a 16-year grid with a "Latest" tag; one 4:3 photo placeholder each |
| `shell/HeaderSearch` | ShellHeader (state D) | Field plus quick links; plain GET to `/search` |
| `shell/MobileHeader`, `shell/MobileMenu` | MobileHeader, MobileMenu, MobileShell | 64px + 1px header; full-height sheet with sections, logins & contact rows, and a sticky Admissions button |
| `shell/Footer` | Footer, MobileFooter | One component, two layouts; faint rays at 16% / 18% |
| `shell/Breadcrumbs`, `shell/SkipLink` | Patterns, MobileComponents | Below 640px the trail collapses to a back link to the parent |
| `ui/Button`, `ui/TextLink` | Components, MobileComponents | primary / secondary / accent-on-dark / outline-on-dark at L56 · M48 · S44; arrow, external (↗ + hidden "(opens in a new tab)"), PDF (size) |
| `ui/Field`, `ui/ErrorSummary`, `ui/Choice` | Components, EnquiryForm, ContactForm | All 8 field states; radio, checkbox, select |
| `ui/Chip`, `ui/Tag`, `ui/Tabs`, `ui/Accordion` | Components, Patterns, MobileComponents | Chips use `aria-pressed` plus a tick; tabs scroll sideways on mobile |
| `ui/Eyebrow` + `ui/FlameMark`, `ui/Rays`, `ui/BridgeArc`, `ui/ArcGlyph` | Content, MobileComponents, Learning boards | Arc goes vertical on mobile; stage glyph fills one more segment per stage |
| `ui/StatBlock`, `ui/Figure` / `ui/Photo` / `ui/Placeholder` | Content | `<dl>` stats; Photo resolves the file or renders the exact bracketed frame |
| `ui/StatusPill`, `ui/StatusBanner` | HomeDesktop, AdmissionsDesktop | Driven by `settings.admissions` |
| `ui/Dialog`, `ui/LinkRow`, `ui/DataTable` ↔ `ui/LabelValueRows` | Campus, Gallery, Information, Services, Disclosure, Timings | Native `<dialog>`; tables become labelled rows below 640 |
| `emblem/Emblem` | Emblem, EmblemHero, EmblemMobile, EmblemSpec | See §6 |
| `home/*` (13 sections + `VideoDialog`) | HomeDesktop 1–3, HomeMobile 1–3, *Reduced, Journey, HomeJourneyScroll | Journey (pinned) plus JourneyStill (reduced / no-JS) |
| `about/*`, prose pages | AboutDesktop 1–2, AboutMobile 1–2, Founder*, Principal* | VisionMission is shared with Home |
| `learning/StageIndex`, `learning/ProgramDetail` (5 chapter types) | LearningDesktop/Mobile, ProgramDetail/Mobile | One template, four stages |
| `campus/Scenes`, `campus/Atlas`, `campus/FacilityDetail` | CampusDesktop/Mobile, FacilityDetail(+3 wrappers) | Compact two-column mode for sparse copy; story grid for 2–4 photos |
| `admissions/*` | AdmissionsDesktop/Mobile/MobileScroll/FormStates, EnquiryForm | Mobile sticky Enquire bar ends above the enquiry section |
| `achievements/*` | AchievementsDesktop/Mobile | Distribution table-chart, pass-% line (90–100 scale, dashed gap), year tabs, banner lightbox |
| `gallery/YearRail`, `AlbumGrid`, `Masonry`, `Lightbox` | GalleryDesktop/Mobile/Empty, GalleryAlbum + 4 lightbox wrappers | Layout algorithm ported from the board (lead 2+1, then bands of 3 and wide+single) |
| `information/*` | Information, Timings (+Print), Rules, Decorum, Song, Prayer, Disclosure | Song and Prayer share a "programme sheet" reader |
| `contact/*`, `search/*`, 404 | Contact*, ContactForm, Services*, SearchPage + states, NotFound* | |

## 4. Design tokens (`styles/tokens.css`, taken from the boards)
**Colour (Main):** `--brand #7F0305` · `--brand-strong #5A0204` · `--brand-hover #6A0204` · `--brand-tint #F4E6E2` · `--accent #F89A1C` · `--accent-tint #FDEBD2` · `--accent-soft #F5C400` (rays only) · `--bg #FBF7F0` · `--surface #FFFFFF` · `--surface-raised #FFFDF8` · `--surface-dark #2A0A0B` · `--text #1F1A17` · `--text-muted #5C534D` · `--text-on-dark #FBF7F0` · `--text-on-dark-muted #CDBFB4` · `--border #E7DED2` · `--border-strong #857A71` · `--focus #005FCC` · `--focus-on-dark #7FB2FF` · `--success #1F7A3D` · `--warning #B25E00` · `--warning-text #A35500` · `--error #B3261E`.
Component values seen on the boards: pressed secondary `#EBD3CD`; disabled button `#E7DED2` with text `#6E655E`; disabled field `#F3ECE1`; disabled outline text `#8F857D`; link underline `rgba(127,3,5,.4)`; on-dark hairlines `rgba(251,247,240,.16/.22/.28)`; photo placeholder tones `#E9DFD0 #E3D6C5 #EDE4D8 #E6DACB`, dark `#3B1416`; emblem sides `#D8C6AD`.
Stage accents (mark / text / tint): 01 `#F89A1C/#A35500/#FDEBD2` · 02 `#7F0305/#7F0305/#F4E6E2` · 03 `#5A0204/#5A0204/#E7DED2` · 04 `#2A0A0B/#2A0A0B/#E7DED2`.
`.on-dark` sections swap `--focus-ring` to `#7FB2FF` and the text tokens to their on-dark values.

**Type (Type):** `--font-display 'Cormorant Garamond', Garamond, 'Times New Roman', serif` · `--font-body Manrope, 'Segoe UI', system-ui, -apple-system, sans-serif`
`--fs-display-xl clamp(3.5rem, 1.829rem + 6.857vw, 8rem)` (LH .95, −.02em) · `--fs-display-l clamp(2.75rem, 1.729rem + 4.190vw, 5.5rem)` (1.0, −.015em) · `--fs-h1 clamp(2.25rem, 1.6rem + 2.667vw, 4rem)` (1.05, −.01em) · `--fs-h2 clamp(1.75rem, 1.379rem + 1.524vw, 2.75rem)` (1.1) · `--fs-h3 clamp(1.375rem, 1.236rem + .571vw, 1.75rem)` (1.2, weight 600) · `--fs-body clamp(1.0625rem, 1.039rem + .095vw, 1.125rem)` (1.6, max 68ch) · `--fs-small clamp(.875rem, .852rem + .095vw, .9375rem)` (1.5, 500) · `--fs-eyebrow clamp(.75rem, .727rem + .095vw, .8125rem)` (700, uppercase, `--tracking-eyebrow .14em`) · `--fs-numeral clamp(4rem, 2.7rem + 5.333vw, 7.5rem)` (64→120, LH .9, lining tabular).
Rules: serif only at 22px and above; one maroon italic word per headline; serif never above 600; `.tnum` on all dates, times and results; wordmark is serif 600 small-caps +.04em.

**Space, grid, radius (Space, MobileFoundations):** `--space-0-5 4px` · `-1 8` · `-2 16` · `-3 24` · `-4 32` · `-6 48` · `-8 64` · `-12 96` · `-16 128` · `-20 160`. Section padding 128/96 desktop, 64 mobile. Opener to content 48–64; heading to body 16–24; field to field 24; touch targets 44 minimum, 8 apart.
Grid: ≥1024 12 columns / 64 margin / 32 gap · 640–1023 8 / 32 / 24 · <640 4 / 20 / 16 · max width 1440 (full-bleed photos may break out).
Radius: `--radius-none 0` (images, panels) · `--radius-sm 4` (fields, chips, tags) · `--radius-md 8` (buttons, menus, dialogs); board exceptions kept: gallery filter chips 999, achievement year tabs 6.
`--shadow-overlay: 0 1px 2px rgba(42,10,11,.06), 0 16px 40px -20px rgba(42,10,11,.28)` (menus and dialogs only). Rules are 1px: `--border` between items, ink under section titles.

**Motion:** `--dur-micro 160ms` · `--dur-component 320ms` · `--dur-scene 900ms` · `--ease-out cubic-bezier(.22,1,.36,1)` · `--ease-standard cubic-bezier(.2,0,0,1)`.
Moments: rays fan-in (scale .94→1 + fade, 1100ms) · section reveal (translateY 16px, 12px on mobile, 700ms, 80ms stagger) · hero photo (scale 1.04→1, 1200ms, once) · arc nodes (80ms stagger) · tabs/accordion panels (−4px + fade, 320ms) · link arrow (4px, 160ms) · mega panel (−8px + fade, 250ms) · dim overlay (220ms) · mobile sheet (16px + fade, 320ms; sections 250ms) · header going solid (opacity cross-fade, 220ms).
Every moment has a `prefers-reduced-motion` state (instant or static). Only `transform` and `opacity` animate.

## 5. Data model (`src/data`, `src/content`; Zod-validated at build)
- **settings**: `admissions { state: closed|open|opening, statusText?, enquiryOnPage: false }` · `forms.mode: demo|live` · `facilityDrafts` · `songRecording: null` · `indexing`. `lib/academic-year.ts` follows the boards (the year starts in June, e.g. "2026–27"); labels match the board text exactly (pill: "Admissions 2026–27: closed · Enquire for next year"; banner text for each of the three states). The year is computed at build time, with a yearly 1 June rebuild via a Vercel deploy hook and cron (TODO before launch).
- **contacts**: footer address and disclosure address · phones `{display, tel}` · WhatsApp · email (TODO(content) #3) · office hours · principal-meeting note · social · maps link (pin TODO).
- **services**: `{key, label, description, url, kind: external|pdf|video, domain, audience}` for Parent Login, Staff Login (TODO(content) #5; uses the Services board's `pro.myschoolerp.com`), Admission Enquiry, Careers, CBSE TC, Brochure, Virtual Tour, the Android and iOS apps, and Disclosure (all A5 URLs).
- **navigation**: 7 sections `{key, label, hubHref, panel {eyebrow, title, intro, lead?, groups[{label, links[{label, meta?, href, kind}]}], photo, caption}}`, plus footer groups. Campus links are derived from facilities (`group: learn|grow`, `num` order for mobile).
- **programmes** (4): `slug, num, name, range, classes[], accent, eyebrow, lead, overviewLead, focus[], next, cta, heroPhoto, facts[], admissionCta, related[facility slugs], journey{text, photo}`, `chapters[]` as a union: `subjects{items[{name, note?}], calloutKicker?, callout?}` | `activities{items[], facts[{label, value}]}` | `words{items[], after}` | `statement{statement}` | `age{ages[{label, years}], ageNote}`. Primary comes from the board; the other three come from P07/P09/P10, with TODO(content) for #1, #2 (ratios hidden), #9 and #10.
- **facilities** (10): `slug, num, name, alt?, short, group, scene, descriptor, atlasDesc, photos[], facts[{value, unit, label, source}], what[], how[], features[], pending{what, how, howItems[], features}, related[]` (taken verbatim from the FacilityDetail script).
- **campus-scenes**: Learn / Play / Create / Gather `{verb, places, photo, text, facilities[]}`, in Campus and Home variants.
- **albums**: `year, slug, name, category (proposed, TODO confirm), lead, count?, date ('[Date of the event]'), cover, photos[{file, ratio, alt, caption}]`. Annual Day 2025-26 has 18 photos with bracketed alt and caption text; years run 2011-12 to the current year (computed).
- **results**: `classX[{year, registered, passed, passPct, remarks, source}]` (2023–25) · `firstBatch 2016-17` · `distribution{year: 2026, bands[{band, students}]}` (TODO: total 184) · `achievers[{year, name, score, portrait: null}]` · `banners[{year, file, rows[]}]` (empty rows show "Transcription needed") · `beyond` album links.
- **stats**: Home "by the record" `{value, unit, label, detail, source}`, keeping the board's bracketed sources.
- **documents**: `{key, title, group: downloads|disclosure-docs|disclosure-academics, kind: pdf|external|na|unavailable, href: null, size: '[size]', updated, note}`.
- **admissions**: ages, age note, 4 steps `{title, summary, details[{lead?, text}]}`, notes, documents checklist, jump links. **faqs**: `{page, q, a}` (the 9 admissions questions verbatim).
- **timings**: `academicYear '[Academic year]'`, terms, morning bells, by-class rows, periods `{label, from, to, kind: period|break|lunch}`, office note (TODO: 08:30 vs 09:00 start).
- **rules**: groups Arrival / Uniform & Grooming / Food / Leave & Meetings, each `{num: 'i', id: 'rule-i', text}` with the original wording; a "For parents" callout for xiv and xv.
- **decorum**: sections A and B, the 75% stat, TODO(content) for Headmistress vs Vice Principal and for caution money.
- **song** / **prayer**: stanzas of lines with a `refrain` flag (maroon italic) and attribution.
- **disclosure**: general rows, document refs, results ref, staff rows, infrastructure rows, `lastUpdated '[date]'`.
- **home** / **about**: hero copy, values (bracketed lines), idea, vision, mission ×4, milestones ×6, beyond-classroom lists, leadership excerpts, quick-access tiles, life section. **prose**: founder and principal as Markdown.

## 6. JavaScript islands and no-JS fallbacks
The baseline has no JS: everything renders, collapsible content is expanded, and controls that need JS are hidden via `html:not(.js)`. Shared shell JS is ≤10 KB gzipped; each page island is ≤15 KB.

| Interaction | With JS | Without JS |
|---|---|---|
| Header hero → solid | IntersectionObserver sentinel 24px into the hero; 220ms cross-fade; no size change | Transparent header scrolls away with the hero; solid pages are sticky |
| Mega menus | Nav links become disclosure buttons (aria-expanded/controls); one open at a time; click, Enter or Space; Esc, outside click or focus-out closes; header turns solid first; page dims 28% | Nav items are links to the hub pages |
| Header / mobile search | Panel or field replaces the row; focus goes in; Esc or Cancel returns focus | Search button is a link to `/search` |
| Mobile menu sheet | Dialog with focus trap, inert page, scroll lock, Esc and back gesture (history state); current section opens automatically | Menu links to `#mobile-menu`; `:target` sheet with every section expanded and a Close link |
| Section reveals, rays fan-in | IntersectionObserver adds the class | Visible immediately (hiding only under `.js` and motion allowed) |
| Emblem: 3D, meaning, travel | §7 | Static official artwork; meaning in `<details>` as a plain labelled list |
| Virtual tour (Home, Campus) | `<dialog>`; youtube-nocookie iframe injected on open and removed on close | Link to YouTube that opens in a new tab and says so |
| Learning journey (Home desktop) | Sticky pinned scene (900 + 2100px), passive scroll plus rAF progress, arc clip, node buttons, prev/next; native scroll only | JourneyStill: the four chapters stacked (same as the reduced-motion board) |
| Tabs: campus scenes, Learning stage index, Achievements years | Tablist with arrows, Home and End; one panel shown | All panels stacked with their headings; index items are anchors |
| Facilities mosaic / campus atlas preview | Hover, focus or click swaps the large preview | Rows are real links; the first preview shows |
| Admissions steps, FAQ, "Expand all" | aria-expanded toggles (step 1 and FAQ 1 open) | All expanded; toggles hidden |
| Print buttons (checklist, timings) | `window.print()` | Hidden; print CSS still applies |
| Forms (Contact; Enquiry when enabled) | `novalidate`, custom validation, focused error summary, linked errors, kept values, demo notice | Native `required`/`type` validation; in demo mode a visible "call or email" note replaces Submit |
| Gallery filter chips, mobile year arrows | aria-pressed filter with a live count; arrows scroll the chip row | Chips hidden; all albums shown; year row scrolls natively; year links are real pages |
| Album and banner lightbox | `<dialog>` with counter, caption, ← → Esc, swipe, neighbour preload, loading and failed + retry, focus return | Thumbnails link to the image file |
| Contact map | "Show interactive map" injects the Google iframe | Light drawing plus "Get directions" link (new tab) |
| Search | Pagefind JS API with a custom renderer: tags, bold + underlined `<mark>`, `aria-busy`, polite live count, "Did you mean" from a build-time vocabulary, `?q=` kept in sync | GET form plus a `<noscript>` note and browse links |
| `/app` (QR target) | User-agent check sends the visitor to the right store | Both store links shown |

## 7. 3D emblem plan
- **Markup (`emblem/Emblem.astro`)**: the stage is `role="img"` with the board's descriptive label. On dark it has the ivory radial pool. The five official part PNGs (converted losslessly to WebP, pixels unchanged) are layered at a 9.365% inset and 81.27% size, the exact at-rest footprint. This static layer is the first paint, the reduced-motion state and the no-WebGL state. The canvas is `aria-hidden` and only ever added by JS.
- **Loading (Home only)**: `emblem-loader.js` checks reduced motion (and listens for changes), WebGL support, and `saveData`. After the hero text paints (`load` plus idle callback), it calls `import('./emblem-engine.js')`, which imports named classes from `three` and the geometry JSON as a split chunk. The hero and closing instances share that one module; the closing instance starts on its own IntersectionObserver and replays its arrival when it comes into view. The canvas fades in only after its first good frame, and then the static layer fades out, so nothing jumps. Any error, failed import or lost context keeps the static layer and disposes the renderer.
- **Engine**: ported from `emblem-build/kenbridge-emblem-engine.js` as an ES module. It keeps everything from the spec: unlit textured front faces, `#D8C6AD` sides at roughness .55, key and rim lights, arrival in 1.6s (head → book → nib → flame with glow → 16 rays 28ms apart), breathing idle, damped ±6°/±4° tilt, `touch-action: pan-y`, raycast picking, pixel ratio capped at 2, low-power hint, and paused rendering off-screen and in background tabs.
- **Travel (no scroll-jacking)**: a passive scroll listener with rAF computes `p = clamp(scrollY / 520)` (300 on mobile). The stage translates and scales toward the header logo slot, measured with `getBoundingClientRect` rather than hard-coded, to 56px (44px on mobile). It eases out on x and is linear on y. The meaning panel fades by p .08; pointer events stop after p .05; the header logo cross-fades in from p .85 to 1, when the 3D stops rendering. Travel runs with or without WebGL. Reduced motion and no-JS: no travel, and the header logo is simply visible.
- **Meaning**: closed by default in the hero and hidden in the closing scene. Chips are buttons with `aria-pressed`: focus previews, Enter or Space pins, and a polite live region announces "02 of 05, Book". The highlight lifts the part 22px and dims the others to 28%. On About (static), the same chips drive CSS on the layers (220ms), plus the board's alpha hit-test for hover and tap on the artwork.
- **Sizes**: hero 560 desktop / 300 mobile · closing 400 / 260 · About static 520 / 320 (the About board uses 520; the EmblemSpec table says 480, and the board wins).
- **Budget**: emblem chunk ≤170 KB gzipped, measured in batch 2. The LCP candidate is the static emblem layer (lossless WebP, `fetchpriority="high"`, about 100 KB total) or the H1, so the 3D load never delays LCP. The 512px logo texture is used until the 1920×825 or vector master is supplied (logged in PLACEHOLDERS).

## 8. Images, fonts, performance, SEO, redirects
- **Images**: `ui/Photo` takes `file`, `alt`, `ratio` (21:9 / 3:2 / 4:5 / 1:1) and `sizes`. If `src/assets/photos/<file>` exists it renders `<Picture>` as AVIF + WebP with a JPEG fallback, a width ladder of 390–2880, explicit width and height, and `loading="lazy"` below the fold (`fetchpriority="high"` for heroes). Otherwise it renders the exact board placeholder frame and label.
- **Fonts**: Fontsource latin and latin-ext woff2 with `font-display: swap`. Only Cormorant 500 and Manrope 400 latin are preloaded. Metric-matched fallbacks (`size-adjust`) keep CLS down.
- **Budgets**: LCP ≤2.5s · INP <200ms · CLS <0.1 · Lighthouse 95+ in every category. HTML ≤50 KB gz · CSS ≤35 KB gz · shell JS ≤10 KB gz · hero photo ≤200 KB AVIF at 1440 (≤90 KB at 390) · YouTube and Maps 0 bytes until asked for.
- **SEO**: a unique title and description per page, canonical `https://kenbridgegulbarga.com/...`, Open Graph and Twitter tags, sitemap, robots, accurate School JSON-LD (name, address, phone, email, foundingDate 2011, CBSE affiliation) and BreadcrumbList. No "best school" claims. A real 404 status (Vercel serves `404.html`).
- **Redirects (`vercel.json`, `statusCode: 301`)**: all 17 legacy URLs from PAGE-MAP, plus `/gallery?year=:y` → `/gallery/:y`. The brochure keeps its legacy path in `public/` once supplied. Each redirect is checked for a single 301 hop, with no trailing-slash 308 first.

## 9. Build order (one batch per session; each ends with the checks below)
**Standard checks for every batch:** screenshots at 1440 and 390 (Playwright `qa-shots` plus the in-app browser) side by side with the board markup and the reference screenshot (the board wins) · JS disabled · reduced motion emulated · axe with zero violations · keyboard walkthrough of that batch's interactions · `astro build` passes schema validation · `check-placeholders` diffs every rendered `[…]` against `website/PLACEHOLDERS.md` · `TODO(content)` added for any open question touched · a report of every difference from the design and why.

1. **Foundation & shell**: scaffold, tokens, fonts, base/layout/utilities/motion/print CSS, BaseLayout, skip link, breadcrumbs, SiteHeader with utility bar, all 7 mega panels and the search panel, MobileHeader with menu sheet, Footer (desktop and mobile), UI primitives page (`/dev/kit`, left out of production builds), 404, `vercel.json` redirects, robots and sitemap. *Check:* 404 and the shell against ShellHeader, MegaMenusAll, MobileShell, Footer and MobileFooter; the menu keyboard model; the `:target` sheet with JS off; `check-redirects` covers all 17.
2. **Signature emblem**: Emblem component (static, meaning), engine port, loader, travel, the About static variant, on a Home hero skeleton. *Check:* the arrival matches the EmblemSpec frames (render-f300…f1600); WebGL forced off; reduced motion; travel at p = 0, .5 and 1; chunk size; no CLS.
3. **Home**: all 13 sections, journey pinned and still, campus scenes, facilities mosaic, admissions pill from settings (all three states), video dialog, closing scene. *Check:* HomeDesktop 1–3, HomeMobile 1–3, *Reduced, HomeJourneyScroll; Lighthouse on `/`.
4. **About + Founder + Principal**.
5. **Learning + Program Detail ×4**: stage index tabs; chapter types; pager. *Check:* every stage renders without inventing layouts; conflicts flagged.
6. **Campus + Facility Detail ×10**: scenes, atlas, tour dialog; compact mode, story grids, drafts. *Check:* the three drawn instances match exactly; the other seven don't break.
7. **Admissions**: status banner (all three states and the override), age table, stepper, notes, checklist with print, FAQ, external enquiry card, mobile sticky bar; EnquiryForm behind the flag (all states). *Check:* AdmissionsMobileScroll behaviour; AdmissionsFormStates.
8. **Achievements**: achievers, distribution table-chart, results table, pass-% chart with a gap, year tabs and banner lightbox.
9. **Gallery + Album + Lightbox**: year pages, the empty-year state, filters, masonry, lightbox in all four states.
10. **Information + 6 sub-pages**. *Check:* `print-check` prints Timings to exactly one A4 page; Song and Prayer print cleanly.
11. **Contact + Services + Search + /app**: contact form (demo mode), map on demand, shortcuts, services rows and QR, Pagefind index with custom records, all six search states.
12. **Launch checks & deploy prep**: Lighthouse on every page (mobile and desktop), axe on all pages, full keyboard pass, every page with JS off, timings print, redirects on a Vercel preview (`curl -I`), sitemap, robots, canonical and OG; PLACEHOLDERS.md and OPEN-QUESTIONS updated; the Vercel project configured (build `npm run build` = `astro build && node scripts/pagefind.mjs`, output `dist`, `PUBLIC_INDEXING=false`).

## 10. Verification (end to end)
- `npm run dev`, then `.claude/launch.json` and the in-app browser at 1440×900 and 390×844 for interactive checks.
- `npm run build && npm run preview`, then `npm run qa` (Playwright screenshots, JS on and off, reduced motion), `npm run a11y` (axe on every route), `npm run lhci` (95+), `node scripts/print-check.mjs`, `node scripts/check-placeholders.mjs` and `node scripts/check-redirects.mjs`.
- After a Vercel preview deploy: `curl -sI` every legacy URL (one 301), a 404 status for an unknown path, and `X-Robots-Tag: noindex` present.
