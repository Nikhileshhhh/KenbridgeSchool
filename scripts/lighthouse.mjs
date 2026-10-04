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
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { BASE, root, startPreview, stopPreview, builtRoutes } from './lib/serve.mjs';

const only = process.argv.slice(2);
const routes = builtRoutes().filter((r) => !r.startsWith('/dev') && r !== '/app' && r !== '/404' && (!only.length || only.includes(r)));
const out = join(root, 'qa', 'lighthouse');
mkdirSync(out, { recursive: true });
const cats = ['performance', 'accessibility', 'best-practices', 'seo'];

const server = await startPreview();
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const summary = [];
let low = 0;
try {
  for (const route of routes) {
    for (const form of ['mobile', 'desktop']) {
      const config = form === 'desktop' ? desktopConfig : undefined;
      const res = await lighthouse(BASE + route, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: cats }, config);
      const lhr = res.lhr;
      const scores = Object.fromEntries(cats.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
      const metric = (id) => lhr.audits[id]?.numericValue;
      const row = { route, form, ...scores, lcp: Math.round(metric('largest-contentful-paint')), cls: +(metric('cumulative-layout-shift') ?? 0).toFixed(3), tbt: Math.round(metric('total-blocking-time')) };
      summary.push(row);
      const under = cats.filter((c) => scores[c] < 95);
      const budget = [row.lcp > 2500 && `LCP ${row.lcp}ms`, row.cls >= 0.1 && `CLS ${row.cls}`, row.tbt > 200 && `TBT ${row.tbt}ms`].filter(Boolean);
      const flag = under.length || budget.length;
      if (flag) low++;
      console.log(`${flag ? '✗' : '✓'} ${route} ${form}: ${cats.map((c) => `${c.slice(0, 4)} ${scores[c]}`).join(' · ')} · LCP ${row.lcp}ms · CLS ${row.cls} · TBT ${row.tbt}ms`);
      for (const c of under) {
        const failing = lhr.categories[c].auditRefs.filter((a) => a.weight > 0 && (lhr.audits[a.id].score ?? 1) < 0.9).map((a) => `${a.id} (${lhr.audits[a.id].displayValue ?? lhr.audits[a.id].score})`);
        console.log(`    ${c}: ${failing.join(', ')}`);
      }
    }
  }
} finally {
  await chrome.kill();
  stopPreview(server);
}
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));
const min = Object.fromEntries(cats.map((c) => [c, Math.min(...summary.map((s) => s[c]))]));
console.log(`\nLowest scores across ${summary.length} runs: ${cats.map((c) => `${c} ${min[c]}`).join(' · ')}`);
console.log(low ? `${low} run(s) under 95 or over budget` : 'Every run is 95+ in every category and within the LCP, CLS and TBT budgets');
process.exit(low ? 1 : 0);
