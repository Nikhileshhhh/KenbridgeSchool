// Interaction checks for the gallery: year pages, type filters, the empty year, the album masonry
// and the lightbox (keyboard, ends, swipe, focus return, deep link), JS off and axe.
// Usage: npm run build && node scripts/gallery-check.mjs
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts } from './lib/serve.mjs';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
const axe = async (page, label) => {
  await settle(page);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const visible = (page) => page.$$eval('[data-albums] > li', (ls) => ls.filter((l) => !l.hidden).map((l) => l.querySelector('.gl-tile-name').textContent));

const server = await startPreview();
const browser = await chromium.launch();
try {
  /* ---------- year page ---------- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/gallery/2025-26', { waitUntil: 'load' });
  check((await page.locator('.gl-rail [aria-current="page"]').textContent()).includes('2025-26'), 'the year rail marks 2025-26 as the current page');
  check((await page.locator('.gl-rail-link').count()) === 16, 'sixteen academic years, 2011-12 to today');
  check((await visible(page))[0] === 'Annual Day' && (await page.locator('.gl-featured').count()) === 1, 'the lead album opens the grid, Featured');
  check((await page.locator('a.gl-tile').count()) === 1, 'only albums with imported photos are links (Annual Day)');
  await page.locator('[data-filter="Sports"]').click();
  check((await visible(page)).join() === 'Yoga Day,Inauguration of Sports Week', 'Sports shows only sports albums, in list order');
  check((await page.locator('[data-count]').textContent()) === '2 of 10 albums', 'the count reads "2 of 10 albums"');
  check((await page.locator('[data-filter="Sports"]').getAttribute('aria-pressed')) === 'true' && (await page.locator('[data-filter="All"]').getAttribute('aria-pressed')) === 'false', 'chips use aria-pressed');
  const firstSpan = await page.locator('[data-albums] > li:not([hidden])').first().evaluate((l) => getComputedStyle(l).gridColumnStart);
  check(firstSpan === 'span 2', `the filtered grid re-lays out (first tile ${firstSpan})`);
  await page.locator('[data-filter="Arts"]').click();
  check(await page.locator('[data-filter-empty]').isVisible() && /No Arts albums in 2025-26/.test(await page.locator('[data-filter-empty]').textContent()), 'an empty filter says so');
  await page.locator('[data-filter-clear]').click();
  check((await visible(page)).length === 10, '"Show all" brings every album back');
  await axe(page, '/gallery/2025-26 @1440');

  await page.goto(BASE + '/gallery/2015-16', { waitUntil: 'load' });
  check(/No albums for this year yet/.test(await page.locator('.gl-year').textContent()), 'an empty year shows the empty state');
  check(!(await page.locator('[data-filter]').count()), 'an empty year has no filters');
  await axe(page, '/gallery/2015-16 (empty)');

  const latest = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await latest.goto(BASE + '/gallery', { waitUntil: 'load' });
  check((await latest.locator('#yearTitle').textContent()).trim() === (await latest.locator('.gl-rail-link').first().textContent()).trim().slice(0, 7), '/gallery shows the latest year');

  /* ---------- phones ---------- */
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await m.goto(BASE + '/gallery/2016-17', { waitUntil: 'load' });
  const cur = await m.locator('[data-years-rail] [aria-current="page"]').evaluate((a) => { const r = a.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
  check(cur, 'phones: the current year chip starts in view');
  const before = await m.locator('[data-years-rail]').evaluate((r) => r.scrollLeft);
  await m.locator('[data-years-scroll="1"]').click();
  await m.waitForTimeout(600);
  check((await m.locator('[data-years-rail]').evaluate((r) => r.scrollLeft)) > before, 'phones: the arrow scrolls to earlier years');
  check((await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, 'phones: no horizontal page scroll');
  await axe(m, '/gallery/2016-17 @390');

  /* ---------- album + lightbox ---------- */
  const al = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await al.goto(BASE + '/gallery/2025-26/annual-day', { waitUntil: 'load' });
  const thumbs = al.locator('[data-lb-open]');
  check((await thumbs.count()) === 18, '18 photos, each a button that opens the lightbox');
  const order = await al.$$eval('[data-lb-open]', (b) => b.map((x) => x.getBoundingClientRect().top));
  check(order[0] <= order[4] && order[1] <= order[5], 'masonry keeps list order (row by row, no column flow)');
  await thumbs.nth(6).click();
  await al.waitForTimeout(300);
  const dlg = al.locator('[data-lightbox]');
  check(await dlg.evaluate((d) => d.open), 'a thumbnail opens the lightbox');
  check(/7\s*\/\s*18/.test(await al.locator('#lbCounter').textContent()), 'the counter reads 7 / 18');
  check(await al.evaluate(() => document.activeElement.matches('[data-lb-close]')), 'focus moves to Close');
  await al.keyboard.press('ArrowRight');
  check(/8\s*\/\s*18/.test(await al.locator('#lbCounter').textContent()), '→ moves to the next photo');
  check((await al.locator('[data-lb-live]').textContent()) === 'Photo 8 of 18', 'the change is announced');
  await al.keyboard.press('ArrowLeft');
  await al.keyboard.press('ArrowLeft');
  check(/6\s*\/\s*18/.test(await al.locator('#lbCounter').textContent()), '← moves back');
  await axe(al, 'lightbox open');
  for (let i = 0; i < 8; i++) await al.keyboard.press('ArrowLeft');
  check((await al.locator('.lb-prev').getAttribute('aria-disabled')) === 'true' && /1\s*\/\s*18/.test(await al.locator('#lbCounter').textContent()), 'at photo 1, Previous is dimmed and stops');
  await al.keyboard.press('Escape');
  await al.waitForTimeout(200);
  check(await al.evaluate(() => document.activeElement === document.querySelectorAll('[data-lb-open]')[0]), 'Esc closes and focus returns to that photo’s thumbnail');
  await axe(al, '/gallery/2025-26/annual-day @1440');

  const sw = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  await sw.goto(BASE + '/gallery/2025-26/annual-day#photo-7', { waitUntil: 'load' });
  await sw.waitForTimeout(300);
  check(await sw.locator('[data-lightbox]').evaluate((d) => d.open) && /7\s*\/\s*18/.test(await sw.locator('#lbCounter').textContent()), '#photo-7 opens photo 7 directly');
  const box = await sw.locator('[data-lb-stage]').boundingBox();
  await sw.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await sw.mouse.down();
  await sw.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 5 });
  await sw.mouse.up();
  check(/8\s*\/\s*18/.test(await sw.locator('#lbCounter').textContent()), 'a left swipe moves to the next photo');
  await sw.locator('.lb-mnav [data-lb-prev]').click();
  check(/7\s*\/\s*18/.test(await sw.locator('#lbCounter').textContent()), 'phones: the Previous button works');
  check((await sw.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, 'phones: no horizontal scroll');

  /* ---------- JS off ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/gallery/2025-26');
  check((await nojs.$$eval('[data-albums] > li', (l) => l.filter((x) => x.offsetParent !== null).length)) === 10 && !(await nojs.locator('[data-filter]').first().isVisible()), 'JS off: every album shows and the filters are hidden');
  await nojs.goto(BASE + '/gallery/2025-26/annual-day');
  check(!(await nojs.locator('[data-lb-open]').first().isVisible()) && (await nojs.locator('.al-thumb--static').first().isVisible()), 'JS off: photos are a plain grid (no buttons that do nothing)');
  for (const route of ['/gallery/2025-26', '/gallery/2025-26/annual-day']) {
    for (const width of [1440, 390]) {
      const ax = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
      await gotoWithoutScripts(ax, BASE + route);
      await axe(ax, `JS off ${route} @${width}`);
      await ax.context().close();
    }
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Gallery checks passed');
process.exit(failures ? 1 : 0);
