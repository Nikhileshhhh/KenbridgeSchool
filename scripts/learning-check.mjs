// Interaction checks for /learning and the four programme pages: the stage index (tabs with JS,
// anchors without), the hero path, the programme template's TOC, strip and pager, JS off and reduced motion.
// Usage: npm run build && node scripts/learning-check.mjs
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
const stages = ['pre-primary', 'primary', 'middle-school', 'secondary-school'];
const visiblePanels = (page) => page.$$eval('[data-stage-panel]', (ps) => ps.filter((p) => p.offsetParent !== null).map((p) => p.id));

const server = await startPreview();
const browser = await chromium.launch();
try {
  /* ---------- /learning, desktop, JS on ---------- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/learning', { waitUntil: 'load' });
  const tabs = page.locator('[data-stage-tab]');
  check(await page.locator('[data-stage-index]').getAttribute('role') === 'tablist', 'the stage index becomes a tablist');
  check((await tabs.count()) === 4 && (await tabs.first().getAttribute('role')) === 'tab', 'four stage tabs');
  check(await tabs.first().getAttribute('aria-selected') === 'true', 'stage 01 is selected at first');
  check((await visiblePanels(page)).join() === 'stage-pre-primary', 'only the selected panel shows');
  await tabs.first().focus();
  await page.keyboard.press('ArrowDown');
  check(await tabs.nth(1).getAttribute('aria-selected') === 'true', '↓ selects the next stage');
  check(await page.evaluate(() => document.activeElement.id) === 'stageTab2', '↓ moves focus with the selection');
  check((await page.locator('[data-stage-count]').textContent()) === '02', 'the count reads 02');
  check((await visiblePanels(page)).join() === 'stage-primary', 'the Primary panel shows');
  await page.keyboard.press('End');
  check(await tabs.nth(3).getAttribute('aria-selected') === 'true', 'End selects stage 04');
  await page.keyboard.press('ArrowDown');
  check(await tabs.nth(0).getAttribute('aria-selected') === 'true', '↓ from the last stage wraps to the first');
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.activeElement.closest('[data-stage-panel]')?.id ?? document.activeElement.id) === 'stage-pre-primary', 'Tab from the tablist reaches the panel');
  const tabStops = await page.$$eval('[data-stage-tab]', (ts) => ts.map((t) => t.tabIndex));
  check(tabStops.filter((t) => t === 0).length === 1, 'roving tabindex: one tab in the Tab order');
  await page.locator('.lh-stop-name').nth(2).click();
  await page.waitForTimeout(900);
  check(await tabs.nth(2).getAttribute('aria-selected') === 'true', 'the hero path name "Middle School" picks stage 03');
  check(await page.evaluate(() => Math.abs(document.getElementById('stages').getBoundingClientRect().top) < 200), 'and brings the stage index into view');
  await axe(page, '/learning @1440, stage 03 selected');
  await page.goto(BASE + '/learning#stage-secondary-school', { waitUntil: 'load' });
  check(await page.locator('#stageTab4').getAttribute('aria-selected') === 'true', 'a #stage- hash opens that stage');

  /* ---------- /learning, JS off ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/learning');
  check((await visiblePanels(nojs)).length === 4, 'JS off: all four stage panels show');
  check((await nojs.locator('[data-stage-tab][href]').count()) === 4, 'JS off: the index items are anchors to the panels');
  check(!(await nojs.locator('[data-stage-count]').isVisible()) && !(await nojs.locator('.lh-hint').isVisible()), 'JS off: the count and the arrow-key hint are hidden');
  check(!(await nojs.locator('[role="tab"]').count()), 'JS off: no tab roles without the script that runs them');

  /* ---------- reduced motion ---------- */
  const red = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await red.goto(BASE + '/learning', { waitUntil: 'load' });
  check(await red.locator('.lh-path-cover').evaluate((e) => getComputedStyle(e).display) === 'none', 'reduced motion: the arc is drawn at once (no cover)');
  check(await red.locator('.lh-stop').first().evaluate((e) => getComputedStyle(e).opacity) === '1', 'reduced motion: the stage names show at once');
  await red.locator('[data-stage-tab]').nth(1).click();
  check(await red.locator('[data-stage-panel]:not([hidden]) [data-stage-body]').evaluate((e) => getComputedStyle(e).animationName) === 'none', 'reduced motion: the panel change is instant');

  /* ---------- programme pages ---------- */
  for (const slug of stages) {
    const route = `/learning/${slug}`;
    const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await p.goto(BASE + route, { waitUntil: 'load' });
    check((await p.locator('h1').count()) === 1, `${route}: one h1`);
    check(await p.locator('.pd-strip [aria-current="page"]').getAttribute('href') === route, `${route}: the stage strip marks this page`);
    const tocOk = await p.$$eval('.pd-toc a', (as) => as.every((a) => document.querySelector(a.getAttribute('href'))));
    check(tocOk, `${route}: every "On this page" link has a target`);
    const rels = await p.$$eval('.pd-pager a', (as) => as.map((a) => a.rel).join(','));
    const want = slug === 'pre-primary' ? 'next' : slug === 'secondary-school' ? 'prev' : 'prev,next';
    check(rels === want, `${route}: pager links (${rels})`);
    await axe(p, `${route} @1440`);
    await p.context().close();

    for (const width of [390, 1024]) {
      const m = await (await browser.newContext({ viewport: { width, height: 844 } })).newPage();
      await m.goto(BASE + route, { waitUntil: 'load' });
      const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 0, `${route} @${width}: no horizontal scroll (${overflow}px)`);
      if (width === 390) {
        const sum = m.locator('.pd-mtoc summary');
        await sum.click();
        check(await m.locator('.pd-mtoc details').evaluate((d) => d.open), `${route} @390: "On this page" opens`);
        check(await m.locator('.crumb-back').isVisible(), `${route} @390: breadcrumb collapses to ← Our School`);
        await axe(m, `${route} @390, contents open`);
      }
      await m.context().close();
    }
  }
  for (const width of [390, 1024]) {
    const m = await (await browser.newContext({ viewport: { width, height: 844 } })).newPage();
    await m.goto(BASE + '/learning', { waitUntil: 'load' });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `/learning @${width}: no horizontal scroll (${overflow}px)`);
    if (width === 390) {
      check(await m.locator('.crumb-back').isVisible(), '/learning @390: breadcrumb is ← Home (LearningMobile)');
      await axe(m, '/learning @390');
    }
    await m.context().close();
  }

  /* ---------- JS off axe ---------- */
  for (const route of ['/learning', '/learning/primary', '/learning/pre-primary']) {
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
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Learning checks passed');
process.exit(failures ? 1 : 0);
