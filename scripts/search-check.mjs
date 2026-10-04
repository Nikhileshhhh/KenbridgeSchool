// Checks for /search on the built site (needs the Pagefind index, so run after `npm run build`):
// ?q= runs a search, results carry a tag, trail and bold + underlined matches, external and PDF
// results open in a new tab and say so, "Did you mean" for a misspelling, the count is announced,
// suggestions work, the error and loading review states, no-JS form + note, axe in every state.
// Usage: npm run build && node scripts/search-check.mjs [--print]
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts } from './lib/serve.mjs';

const print = process.argv.includes('--print');
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const results = (page) => page.$$eval('[data-search-out] .sr-res', (rs) => rs.map((r) => ({
  tag: r.querySelector('.sr-tag')?.textContent, trail: r.querySelector('.sr-meta span:last-child')?.textContent,
  title: r.querySelector('.sr-title-t')?.textContent, href: r.querySelector('.sr-title')?.getAttribute('href'),
  target: r.querySelector('.sr-title')?.getAttribute('target'), note: r.querySelector('.sr-title .vh')?.textContent,
  marks: r.querySelectorAll('mark').length, ex: r.querySelector('.sr-ex')?.textContent
})));
const go = async (page, q) => {
  await page.goto(`${BASE}/search?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('[data-search-out]')?.getAttribute('aria-busy') === 'false' && !document.querySelector('[data-search-out] .sr-empty'), null, { timeout: 8000 }).catch(() => {});
};

const server = await startPreview();
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await go(page, 'timings');
  let rs = await results(page);
  if (print) console.log(JSON.stringify(rs.slice(0, 5), null, 1));
  check(rs.some((r) => r.href === '/information/timings' || r.href?.startsWith('/information/timings#')), 'timings: School Timings is a result');
  check(rs.length > 0 && rs.every((r) => r.tag && r.trail && r.title), 'timings: every result has a tag, a trail and a title');
  check(rs.some((r) => r.marks > 0), 'timings: matches are marked');
  const mark = await page.locator('[data-search-out] mark').first().evaluate((m) => { const s = getComputedStyle(m); return { w: s.fontWeight, u: s.boxShadow }; });
  check(Number(mark.w) >= 700 && /inset/.test(mark.u), 'matches are bold and underlined (not colour alone)');
  check(/result/.test(await page.locator('[data-search-live]').textContent()), 'the result count is announced in the polite live region');
  check((await page.inputValue('#srQ')) === 'timings', 'the field keeps the query from ?q=');
  check(!rs.some((r) => /\.html/.test(r.href)), 'result links use clean URLs');

  await go(page, 'transfer certificate');
  rs = await results(page);
  if (print) console.log(JSON.stringify(rs.slice(0, 3), null, 1));
  const tc = rs.find((r) => r.tag === 'External');
  check(tc && tc.target === '_blank' && /opens in a new tab/.test(tc.note), 'transfer certificate: the external TC service opens in a new tab and says so');

  await go(page, 'brochure');
  rs = await results(page);
  const pdf = rs.find((r) => r.tag === 'PDF');
  check(pdf && pdf.target === '_blank' && /PDF/.test(pdf.note), 'brochure: the PDF opens in a new tab and says PDF');

  await go(page, 'annual day');
  rs = await results(page);
  check(rs.some((r) => r.tag === 'Album' && r.href === '/gallery/2025-26/annual-day'), 'annual day: the Annual Day album is an Album result');

  await go(page, 'zzqxw');
  check(await page.locator('.sr-panel[role="status"]', { hasText: 'No results for “zzqxw”' }).isVisible(), 'zzqxw: the no-results panel with tips and links');
  check(/No results/.test(await page.locator('[data-search-live]').textContent()), 'zzqxw: "No results" is announced');
  await axe(page, 'no results @1440');

  // Pagefind matches loosely, so a misspelling may still find pages: "Did you mean" shows either way.
  await go(page, 'timeings');
  const dym = page.locator('[data-dym]');
  check(await dym.count() && /timing/.test(await dym.textContent()), `timeings: Did you mean ${await dym.count() ? await dym.textContent() : '(none)'}`);
  if (await dym.count()) {
    await dym.click();
    await page.waitForTimeout(800);
    check((await page.locator('.sr-res').count()) > 0 && new URL(page.url()).searchParams.get('q') === (await page.inputValue('#srQ')), 'Did you mean runs that search and updates ?q=');
  }
  await axe(page, 'results with Did you mean @1440');

  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  check(await page.locator('.sr-empty').isVisible(), 'empty: suggestions show');
  await page.locator('[data-suggest="timings"]').click();
  await page.waitForTimeout(800);
  check(new URL(page.url()).searchParams.get('q') === 'timings' && (await page.locator('.sr-res').count()) > 0, 'a suggestion runs its search and sets ?q=');
  await page.fill('#srQ', 'admissions');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  check(new URL(page.url()).searchParams.get('q') === 'admissions' && (await page.locator('.sr-res').count()) > 0, 'submitting the form searches without reloading and keeps ?q= in sync');
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle' });
  await axe(page, 'empty @1440');

  await page.goto(`${BASE}/search?q=timings&state=loading`, { waitUntil: 'networkidle' });
  check(await page.locator('.sr-loading[aria-busy="true"]').isVisible(), 'loading: aria-busy skeletons (review state)');
  await axe(page, 'loading @1440');
  await page.goto(`${BASE}/search?q=timings&state=error`, { waitUntil: 'networkidle' });
  check(await page.locator('.sr-error[role="alert"] [data-retry]').isVisible(), 'error: alert with Try again (review state)');
  await axe(page, 'error @1440');

  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await go(m, 'timings');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `@390: no horizontal scroll (${overflow}px)`);
  check((await m.locator('h1').count()) === 1, '@390: one h1');
  check(!(await m.locator('.sr-side').isVisible()), '@390: the tags key and browse aside are left out (SearchMobile)');
  check((await m.locator('.sr-btn').boundingBox()).width >= 44, '@390: the icon-only Search button is at least 44px');
  await axe(m, 'results @390');

  const nojs = await (await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(`${BASE}/search?q=timings`);
  check(await nojs.locator('form.sr-form[action="/search"][method="get"] input[name="q"]').isVisible(), 'JS off: a plain GET search form');
  check(await nojs.locator('.sr-nojs').isVisible(), 'JS off: the note says search needs JavaScript and offers browse links');
  check(!(await nojs.locator('.sr-empty').isVisible()), 'JS off: suggestions (which need JS) are hidden');
  const ax = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await gotoWithoutScripts(ax, BASE + '/search');
  await axe(ax, 'JS off /search @1440');
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll search checks passed');
process.exit(failures ? 1 : 0);
