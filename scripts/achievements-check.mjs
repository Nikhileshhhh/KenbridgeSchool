// Interaction checks for /achievements: year tabs, the result-banner dialog, data integrity against
// results.yaml, JS off and axe. Usage: npm run build && node scripts/achievements-check.mjs
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

const server = await startPreview();
const browser = await chromium.launch();
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/achievements', { waitUntil: 'load' });
  check((await page.locator('h1').count()) === 1, 'one h1');
  const bands = await page.$$eval('.ac-bar-val', (v) => v.map((n) => parseInt(n.textContent, 10)));
  check(bands.join() === '11,51,50,43,29', 'distribution bars come from results.yaml');
  check(/184/.test(await page.locator('.ac-dist-total').textContent()), 'the band total is computed (184)');
  const widths = await page.$$eval('.ac-bar-fill', (b) => b.map((n) => n.style.width));
  check(parseFloat(widths[0]) === 18.3 && parseFloat(widths[1]) === 85, `bars are drawn to scale (${widths.slice(0, 2).join(', ')})`);
  const cells = await page.$$eval('.ac-table .ac-pctcell', (c) => c.map((n) => n.textContent.trim()));
  check(cells.join() === '97.75%,100%,100%,100%', 'results table matches the disclosure');
  const desc = await page.locator('#lineD').textContent();
  check(/2016-17: 100%\. 2023: 100%\. 2024: 100%\. 2025: 97\.75%\. Pass percentages for 2018 to 2022 are not in the disclosure\./.test(desc), 'the chart has a full text description, gap included');

  const tabs = page.locator('.ac-years [role="tab"]');
  check((await tabs.count()) === 5 && (await tabs.last().getAttribute('aria-selected')) === 'true', 'five year tabs, the latest (2026) selected');
  const shown = () => page.$$eval('.ac-panel', (ps) => ps.filter((p) => !p.hidden).map((p) => p.id).join());
  check((await shown()) === 'yrPanel2026', 'only the 2026 banner shows');
  await tabs.last().focus();
  await page.keyboard.press('ArrowLeft');
  check((await shown()) === 'yrPanel2024' && /Transcription needed/.test(await page.locator('#yrPanel2024').textContent()), '← selects 2024, flagged as needing a transcription');
  await page.keyboard.press('Home');
  check((await shown()) === 'yrPanel2021', 'Home selects 2021');
  await page.keyboard.press('End');

  const open = page.locator('#yrPanel2026 [data-banner-open]');
  await open.click();
  await page.waitForTimeout(400);
  check(await page.locator('[data-banner-dialog]').evaluate((d) => d.open), 'View full size opens the banner dialog');
  check((await page.locator('[data-banner-year]').first().textContent()) === '2026', 'the dialog names the year');
  check(await page.evaluate(() => document.activeElement.matches('[data-banner-close]')), 'focus moves to Close');
  await axe(page, '/achievements banner dialog open');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.activeElement.matches('#yrPanel2026 [data-banner-open]')), 'Esc closes it and focus returns');
  await axe(page, '/achievements @1440');

  for (const width of [390, 1024]) {
    const m = await (await browser.newContext({ viewport: { width, height: 844 } })).newPage();
    await m.goto(BASE + '/achievements', { waitUntil: 'load' });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `@${width}: no horizontal scroll (${overflow}px)`);
    if (width === 390) {
      check(await m.locator('.ac-cards').isVisible() && !(await m.locator('.ac-table').isVisible()), '@390: results become labelled cards');
      await axe(m, '/achievements @390');
    }
    await m.context().close();
  }

  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/achievements');
  check((await nojs.$$eval('.ac-panel', (ps) => ps.filter((p) => p.offsetParent !== null).length)) === 5, 'JS off: every year is listed');
  check(!(await nojs.locator('.ac-years').isVisible()) && !(await nojs.locator('[data-banner-open]').first().isVisible()), 'JS off: tabs and View full size are hidden');
  for (const width of [1440, 390]) {
    const ax = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    await gotoWithoutScripts(ax, BASE + '/achievements');
    await axe(ax, `JS off /achievements @${width}`);
    await ax.context().close();
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Achievements checks passed');
process.exit(failures ? 1 : 0);
