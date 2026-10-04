// Checks for the Information hub and its six pages: every link resolves, downloads say what they do,
// rule and decorum anchors, the phone contents disclosure, no audio without a recording, one h1,
// no horizontal scroll, axe with JS on and off. Print is covered by scripts/print-check.mjs.
// Usage: npm run build && node scripts/information-check.mjs
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts, builtRoutes } from './lib/serve.mjs';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const routes = ['/information', '/information/timings', '/information/rules', '/information/decorum', '/information/song', '/information/prayer', '/information/disclosure'];
const built = new Set(builtRoutes());

const server = await startPreview();
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/information', { waitUntil: 'load' });
  const internal = await page.$$eval('main a[href^="/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href').split('#')[0]))]);
  const broken = internal.filter((h) => !built.has(h));
  check(!broken.length, `hub: every internal link resolves${broken.length ? ` (missing ${broken.join(', ')})` : ''}`);
  const brochure = page.locator('.if-row--dl', { hasText: 'Brochure' });
  check((await brochure.getAttribute('target')) === '_blank' && /PDF/.test(await brochure.textContent()), 'hub: the brochure opens the PDF in a new tab and says PDF');
  check((await page.locator('div.if-row--off', { hasText: 'Fee Structure' }).count()) === 1, 'hub: a PDF with no file yet is not a link');
  const tc = page.locator('a.if-row--dl', { hasText: 'Transfer Certificate' });
  check((await tc.getAttribute('target')) === '_blank' && /opens in a new tab/.test(await tc.textContent()), 'hub: the TC service opens in a new tab and says so');

  await page.goto(BASE + '/information/rules#rule-vii', { waitUntil: 'load' });
  check(await page.locator('#rule-vii').evaluate((n) => n.matches(':target')), 'rules: #rule-vii links to that rule');
  check((await page.locator('.ru-rule').count()) === 15, 'rules: all 15 rules, numbered i–xv');

  await page.goto(BASE + '/information/decorum#a2', { waitUntil: 'load' });
  check(await page.locator('#a2').evaluate((n) => n.matches(':target')), 'decorum: #a2 links to that point');

  await page.goto(BASE + '/information/song', { waitUntil: 'load' });
  check(!(await page.locator('audio').count()), 'song: no audio player until a recording is supplied');
  check((await page.locator('.sh-line--refrain').count()) === 4, 'song: the refrain lines are marked');

  await page.goto(BASE + '/information/timings', { waitUntil: 'load' });
  check(await page.locator('[data-print]').isVisible(), 'timings: Print timings shows with JS');
  check((await page.locator('.tm-ptable tbody tr').count()) === 10, 'timings: ten rows in the period table');

  await page.goto(BASE + '/information/disclosure', { waitUntil: 'load' });
  const idx = await page.$$eval('.md-idx', (as) => as.every((a) => document.querySelector(a.getAttribute('href'))));
  check(idx, 'disclosure: every section index link has a target');

  for (const route of routes) {
    for (const width of [1440, 390, 1024]) {
      const p = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
      await p.goto(BASE + route, { waitUntil: 'load' });
      if (width === 1440) check((await p.locator('h1').count()) === 1, `${route}: one h1`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 0, `${route} @${width}: no horizontal scroll (${overflow}px)`);
      if (width !== 1024) await axe(p, `${route} @${width}`);
      await p.context().close();
    }
  }

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await m.goto(BASE + '/information/rules', { waitUntil: 'load' });
  await m.locator('.ru-mtoc summary').click();
  check(await m.locator('.ru-mtoc .ru-toc').first().isVisible(), 'rules @390: the Contents disclosure opens');
  check(await m.locator('.crumb-back').isVisible(), 'rules @390: breadcrumb collapses to ← School Information');
  await m.goto(BASE + '/information/timings', { waitUntil: 'load' });
  check(await m.locator('.tm-cards').isVisible() && !(await m.locator('.tm-classes').isVisible()), 'timings @390: class timings become labelled rows');

  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/information/timings');
  check(!(await nojs.locator('[data-print]').isVisible()), 'JS off: the Print button (needs JS) is hidden');
  for (const route of routes) {
    const ax = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
    await gotoWithoutScripts(ax, BASE + route);
    await axe(ax, `JS off ${route} @390`);
    await ax.context().close();
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Information checks passed');
process.exit(failures ? 1 : 0);
