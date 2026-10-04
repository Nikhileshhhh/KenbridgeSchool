// Interaction checks for About, Founder and Principal: the static emblem's "What our logo means"
// chips (keyboard and pointer), no 3D on About, breadcrumbs and one h1, JS off and reduced motion.
// Usage: npm run build && node scripts/about-check.mjs
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts } from './lib/serve.mjs';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const axe = async (page, label) => {
  // Let one-off entrance fades finish, or axe samples half-transparent text.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const pages = ['/about', '/about/founder', '/about/principal'];

const server = await startPreview();
const browser = await chromium.launch();
try {
  /* ---------- About: the static emblem, JS on ---------- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const scripts = [];
  page.on('request', (r) => r.resourceType() === 'script' && scripts.push(r.url()));
  await page.goto(BASE + '/about', { waitUntil: 'load' });
  await page.locator('.ab-logo').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  check(!(await page.locator('.ab-logo canvas').count()), 'About uses the static artwork (no 3D canvas)');
  check(!scripts.some((u) => /three|engine/i.test(u)), 'three.js is not requested on About');
  check(await page.locator('.ab-logo details[data-emblem-meaning]').evaluate((d) => d.open), 'the meaning panel is open by default on About');
  check(await page.locator('.ab-logo .emblem-full').evaluate((i) => i.complete && i.naturalWidth > 0), 'the official logo artwork is shown at rest');

  // Keyboard: Tab to the first chip, Enter pins it.
  const chips = page.locator('.ab-logo [data-chip]');
  check((await chips.count()) === 5, 'five part chips are buttons');
  await chips.nth(1).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  check(await chips.nth(1).getAttribute('aria-pressed') === 'true', 'Enter pins a chip (aria-pressed=true)');
  const layerOps = await page.locator('.ab-logo .emblem-layer').evaluateAll((ls) => ls.map((l) => +getComputedStyle(l).opacity));
  check(layerOps.filter((o) => o > 0.9).length === 1 && layerOps.filter((o) => o < 0.5).length === 4, `the pinned part stays full and the others dim (${layerOps.join(', ')})`);
  check(/02 of 05/.test(await page.locator('.ab-logo [data-emblem-announce]').textContent()), 'the live region announces "02 of 05"');
  check(await page.locator('.ab-logo [data-card="book"]').isVisible(), 'the Book label card shows');
  await axe(page, 'About desktop, a part pinned');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  check(await chips.nth(1).getAttribute('aria-pressed') === 'false', 'Enter again unpins it');
  // Pointer: tap a part on the artwork itself (alpha hit-test).
  await page.locator('.ab-logo [data-chip]').nth(3).click();
  await page.waitForTimeout(300);
  check(await page.locator('.ab-logo [data-chip]').nth(3).getAttribute('aria-pressed') === 'true', 'clicking a chip pins that part');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  /* ---------- every page: structure + axe at both widths ---------- */
  for (const route of pages) {
    for (const width of [1440, 390]) {
      const p = await (await browser.newContext({ viewport: { width, height: width > 600 ? 900 : 844 } })).newPage();
      await p.goto(BASE + route, { waitUntil: 'load' });
      check((await p.locator('h1').count()) === 1, `${route} @${width}: exactly one h1`);
      check(await p.locator('nav[aria-label="Breadcrumb"]').count() === 1, `${route} @${width}: breadcrumbs present`);
      const crumbOk = await p.evaluate(() => {
        const back = document.querySelector('.crumb-back');
        const trail = document.querySelector('.crumbs');
        return (back && getComputedStyle(back).display !== 'none') || getComputedStyle(trail).display !== 'none';
      });
      check(crumbOk, `${route} @${width}: the trail or its back link is visible`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 0, `${route} @${width}: no horizontal scroll (${overflow}px)`);
      await axe(p, `${route} @${width}`);
      await p.context().close();
    }
  }

  /* ---------- reduced motion: the founder fade is off ---------- */
  const red = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await red.goto(BASE + '/about/founder', { waitUntil: 'load' });
  check(await red.locator('.fd-portrait').evaluate((e) => getComputedStyle(e).animationName) === 'none', 'Founder: no fade under reduced motion');
  await red.goto(BASE + '/about', { waitUntil: 'load' });
  await red.locator('.ab-logo [data-chip]').nth(0).click();
  check(await red.locator('.ab-logo [data-chip]').nth(0).getAttribute('aria-pressed') === 'true', 'About: chips still work under reduced motion');
  const dur = await red.locator('.ab-logo .emblem-layer').first().evaluate((e) => getComputedStyle(e).transitionDuration);
  check(/^0s|^0\.0+1s|1e-/.test(dur) || dur.split(',').every((d) => parseFloat(d) <= 0.01), `About: part highlight is instant under reduced motion (${dur})`);

  /* ---------- JS off ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/about');
  check(await nojs.locator('.ab-logo .emblem-chip--static').first().isVisible(), 'JS off: the five parts show as a plain labelled list');
  check(!(await nojs.locator('.ab-logo button.emblem-chip').first().isVisible()), 'JS off: chip buttons that need JS are hidden');
  check(await nojs.locator('.ab-logo .emblem-full').isVisible(), 'JS off: the static artwork is shown');
  for (const route of pages) {
    await nojs.goto(BASE + route);
    const hidden = await nojs.evaluate(() => [...document.querySelectorAll('main p, main h1, main h2')].filter((e) => e.textContent.trim() && +getComputedStyle(e).opacity < 0.5).length);
    check(hidden === 0, `JS off ${route}: no content left hidden (${hidden})`);
  }
  for (const route of pages) {
    const ax = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await gotoWithoutScripts(ax, BASE + route);
    await axe(ax, `JS off ${route} @390`);
    await ax.context().close();
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll About checks passed');
process.exit(failures ? 1 : 0);
