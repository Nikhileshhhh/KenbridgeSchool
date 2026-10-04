// Launch check (PLAN §8 SEO, batch 12): reads every built page and checks the head and the page frame.
// Unique title and description, canonical = site + route (no trailing slash), Open Graph tags, the
// demo's robots noindex, valid JSON-LD (School everywhere, BreadcrumbList on deep pages), lang="en",
// a skip link to #main, one <main id="main">, one h1, no "best school" / "No. 1" claims; then the
// sitemap (every public page, nothing private) and robots.txt.
// Usage: npm run build && node scripts/seo-check.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { root, builtRoutes } from './lib/serve.mjs';

const SITE = 'https://kenbridgegulbarga.com';
const dist = join(root, 'dist');
let failures = 0;
const check = (ok, msg) => { if (!ok) { console.log(`✗ ${msg}`); failures++; } return ok; };
const pass = (msg) => console.log(`✓ ${msg}`);
const fileFor = (r) => join(dist, r === '/' ? 'index.html' : `${r.slice(1)}.html`);
const attr = (html, re) => html.match(re)?.[1];
const decode = (s) => s?.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

const routes = builtRoutes().filter((r) => !r.startsWith('/dev'));
const titles = new Map();
const descs = new Map();
const privateRoutes = ['/404', '/search', '/app'];
let n = 0;
for (const r of routes) {
  const html = readFileSync(fileFor(r), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const title = decode(attr(head, /<title>([^<]*)<\/title>/));
  const desc = decode(attr(head, /<meta name="description" content="([^"]*)"/));
  const canonical = attr(head, /<link rel="canonical" href="([^"]*)"/);
  const robots = attr(head, /<meta name="robots" content="([^"]*)"/);
  let ok = true;
  ok &= check(title && title.length <= 70, `${r}: title present and ≤ 70 characters (${title?.length})`);
  ok &= check(desc && desc.length >= 50 && desc.length <= 160, `${r}: description 50–160 characters (${desc?.length})`);
  if (title) { if (titles.has(title)) ok &= check(false, `${r}: title duplicates ${titles.get(title)}`); titles.set(title, r); }
  if (desc && r !== '/404') { if (descs.has(desc)) ok &= check(false, `${r}: description duplicates ${descs.get(desc)}`); descs.set(desc, r); }
  ok &= check(canonical === (r === '/' ? `${SITE}/` : `${SITE}${r}`), `${r}: canonical is ${SITE}${r === '/' ? '/' : r} (got ${canonical})`);
  for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name']) ok &= check(new RegExp(`<meta property="${p}" content="[^"]+"`).test(head), `${r}: ${p}`);
  ok &= check(/<meta name="twitter:card"/.test(head), `${r}: twitter:card`);
  ok &= check(robots === 'noindex, nofollow', `${r}: robots noindex while PUBLIC_INDEXING is off (got ${robots})`);
  ok &= check(/<html lang="en"/.test(html), `${r}: <html lang="en">`);
  ok &= check(/<a class="skip-link" href="#main"[^>]*>Skip to main content/.test(html), `${r}: skip link to #main`);
  ok &= check((html.match(/<main\b/g) ?? []).length === 1 && /<main id="main"/.test(html), `${r}: one <main id="main">`);
  ok &= check((html.match(/<h1\b/g) ?? []).length === 1, `${r}: one h1 (${(html.match(/<h1\b/g) ?? []).length})`);
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
  ok &= check(lds.length && lds.every(Boolean) && lds.some((l) => l['@type'] === 'School'), `${r}: valid JSON-LD with the School`);
  if (r.split('/').length > 2) ok &= check(lds.some((l) => l['@type'] === 'BreadcrumbList'), `${r}: BreadcrumbList JSON-LD on a deep page`);
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  ok &= check(!/\bbest school\b|\bno\.?\s*1\b|\bnumber one\b|\btop[- ]ranked\b/i.test(text), `${r}: no "best school" / "No. 1" claims`);
  if (ok) n++;
}
if (n === routes.length) pass(`every page (${routes.length}) has a unique title and description, canonical, Open Graph, noindex, JSON-LD, lang, skip link, one main and one h1`);

const smFiles = readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const sm = smFiles.map((f) => readFileSync(join(dist, f), 'utf8')).join('');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '') || '/');
const expected = routes.filter((r) => !privateRoutes.includes(r));
const missing = expected.filter((r) => !locs.includes(r));
const extra = locs.filter((l) => !expected.includes(l));
if (check(!missing.length && !extra.length && /<sitemapindex/.test(readFileSync(join(dist, 'sitemap-index.xml'), 'utf8')), `sitemap lists every public page and nothing else${missing.length ? ` (missing ${missing.join(', ')})` : ''}${extra.length ? ` (extra ${extra.join(', ')})` : ''}`)) pass(`sitemap: ${locs.length} public pages; 404, /search, /app and dev pages left out`);
const robotsTxt = readFileSync(join(dist, 'robots.txt'), 'utf8');
if (check(/Disallow: \//.test(robotsTxt), 'robots.txt disallows crawling while PUBLIC_INDEXING is off')) pass('robots.txt: Disallow / for the design demo');
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
if (check(vercel.headers.some((h) => h.headers.some((x) => x.key === 'X-Robots-Tag' && x.value === 'noindex')), 'vercel.json sends X-Robots-Tag: noindex')) pass('vercel.json: X-Robots-Tag noindex on every response');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll SEO and page-frame checks passed');
process.exit(failures ? 1 : 0);
