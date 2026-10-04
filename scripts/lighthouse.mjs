// Lighthouse on every built page, mobile and desktop (CLAUDE.md budget: 95+ in every category;
// LCP ≤ 2.5 s, CLS < 0.1, TBT as the lab stand-in for INP). Uses Playwright's Chromium.
// Run it against a build made with PUBLIC_INDEXING=true, or the SEO category reports the demo's
// deliberate noindex:  $env:PUBLIC_INDEXING='true'; npm run build; node scripts/lighthouse.mjs
// Writes qa/lighthouse/summary.json and prints every score under 95 with its failing audits.
// Usage: node scripts/lighthouse.mjs [route ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from 'playwright';
import { root, builtRoutes } from './lib/serve.mjs';
import { startStatic } from './lib/static-server.mjs';

const BASE = 'http://localhost:4323';

const only = process.argv.slice(2);
const routes = builtRoutes().filter((r) => !r.startsWith('/dev') && r !== '/app' && r !== '/404' && (!only.length || only.includes(r)));
const out = join(root, 'qa', 'lighthouse');
mkdirSync(out, { recursive: true });
const cats = ['performance', 'accessibility', 'best-practices', 'seo'];

// Served with brotli / gzip and clean URLs, as Vercel serves it (astro preview does not compress).
const server = await startStatic(4323);
// Playwright launches the browser (chrome-launcher's own spawn fails on some Windows setups);
// Lighthouse drives it over the remote-debugging port.
const PORT_DEBUG = 9333;
const chrome = await chromium.launch({ args: [`--remote-debugging-port=${PORT_DEBUG}`] });
const summary = [];
let low = 0;
try {
  for (const route of routes) {
    for (const form of ['mobile', 'desktop']) {
      const config = form === 'desktop' ? desktopConfig : undefined;
      const res = await lighthouse(BASE + route, { port: PORT_DEBUG, output: 'json', logLevel: 'error', onlyCategories: cats }, config);
      const lhr = res.lhr;
      if (process.env.LH_SAVE) writeFileSync(join(out, `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}-${form}.json`), JSON.stringify(lhr));
      const scores = Object.fromEntries(cats.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
      const metric = (id) => lhr.audits[id]?.numericValue;
      const row = { route, form, ...scores, lcp: Math.round(metric('largest-contentful-paint')), cls: +(metric('cumulative-layout-shift') ?? 0).toFixed(3), tbt: Math.round(metric('total-blocking-time')) };
      summary.push(row);
      // /search is noindex by design (a results page), so its only SEO miss, is-crawlable, is expected.
      const expectedSeo = route === '/search' && lhr.categories.seo.auditRefs.every((a) => a.id === 'is-crawlable' || (lhr.audits[a.id].score ?? 1) >= 0.9);
      const under = cats.filter((c) => scores[c] < 95 && !(c === 'seo' && expectedSeo));
      const budget = [row.lcp > 2500 && `LCP ${row.lcp}ms`, row.cls >= 0.1 && `CLS ${row.cls}`, row.tbt > 200 && `TBT ${row.tbt}ms`].filter(Boolean);
      const flag = under.length || budget.length;
      if (flag) low++;
      console.log(`${flag ? '✗' : '✓'} ${route} ${form}: ${cats.map((c) => `${c.slice(0, 4)} ${scores[c]}`).join(' · ')} · LCP ${row.lcp}ms · CLS ${row.cls} · TBT ${row.tbt}ms`);
      for (const c of under) {
        const failing = lhr.categories[c].auditRefs.filter((a) => a.weight > 0 && (lhr.audits[a.id].score ?? 1) < 0.9).map((a) => `${a.id} (${lhr.audits[a.id].displayValue ?? lhr.audits[a.id].score})`);
        console.log(`    ${c}: ${failing.join(', ')}`);
        for (const a of lhr.categories[c].auditRefs.filter((x) => x.weight > 0 && (lhr.audits[x.id].score ?? 1) < 0.9 && c !== 'performance')) {
          for (const it of (lhr.audits[a.id].details?.items ?? []).slice(0, 5)) console.log(`      · ${a.id}: ${JSON.stringify(it.node?.snippet ?? it.text ?? it.href ?? it).slice(0, 160)}`);
        }
      }
    }
  }
} finally {
  await chrome.close();
  server.close();
}
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
const min = Object.fromEntries(cats.map((c) => [c, Math.min(...summary.map((s) => s[c]))]));
console.log(`\nLowest scores across ${summary.length} runs: ${cats.map((c) => `${c} ${min[c]}`).join(' · ')}`);
console.log(low ? `${low} run(s) under 95 or over budget` : 'Every run is 95+ in every category and within the LCP, CLS and TBT budgets');
process.exit(low ? 1 : 0);
