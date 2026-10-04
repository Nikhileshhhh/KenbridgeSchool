// Interaction checks for Home: emblem (3D, static, meaning, travel), journey, campus tabs,
// facilities preview and the virtual-tour dialog, with JS on, JS off and reduced motion.
// Usage: npm run build && node scripts/home-check.mjs
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts } from './lib/serve.mjs';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const focusText = (page) => page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+/g, ' ') ?? '');

const server = await startPreview();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// Headless Chromium renders WebGL in software, which the site deliberately skips for real visitors;
// force the 3D path here so it is still tested.
const newContext = browser.newContext.bind(browser);
browser.newContext = async (o) => { const c = await newContext(o); await c.addInitScript(() => { window.__kbEmblemForce3D = true; }); return c; };
try {
  /* ---------- desktop, JS on, motion allowed ---------- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const has3d = await page.locator('.hero [data-emblem-stage]').evaluate((s) => s.classList.contains('has-3d'));
  check(has3d, '3D emblem loads on Home (dynamic import, first frame shown)');
  check(await page.locator('.hero canvas').getAttribute('aria-hidden') === 'true', 'the canvas is aria-hidden; the stage keeps its descriptive label');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('[data-header-logo]')).opacity) === '0', 'header logo waits for the emblem at the top of the page');
  await axe(page, 'Home desktop, top');

  // Meaning panel
  await page.locator('.hero .emblem-toggle').click();
  const chip = page.locator('.hero [data-chip="book"]');
  await chip.focus();
  check(await page.locator('.hero [data-emblem-announce]').textContent() === '02 of 05, Book', 'focusing a part announces "02 of 05, Book"');
  await chip.press('Enter');
  check(await chip.getAttribute('aria-pressed') === 'true', 'Enter pins the part (aria-pressed=true)');
  check(await page.locator('.hero [data-card="book"]').isVisible(), 'the part label card appears');
  await axe(page, 'Home desktop, meaning open');
  await chip.press('Enter');
  await page.evaluate(() => scrollTo(0, 200));
  await page.waitForTimeout(300);
  check(!(await page.locator('.hero [data-emblem-stage]').getAttribute('style'))?.includes('scale(0'), 'while "What our logo means" is open the emblem stays put');
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('.hero .emblem-toggle').click();
  await page.waitForTimeout(200);

  // Travel
  await page.evaluate(() => scrollTo(0, 260));
  await page.waitForTimeout(300);
  const mid = await page.locator('.hero [data-emblem-stage]').evaluate((s) => s.style.transform);
  check(/translate\(-?\d/.test(mid) && mid.includes('scale(0.'), `emblem travels and shrinks while scrolling (${mid})`);
  await page.evaluate(() => scrollTo(0, 600));
  await page.waitForTimeout(300);
  check(await page.evaluate(() => getComputedStyle(document.querySelector('[data-header-logo]')).opacity) === '1', 'by p = 1 the header logo has taken over');
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(300);
  check((await page.locator('.hero [data-emblem-stage]').evaluate((s) => s.style.transform)).includes('scale(1)'), 'scrolling back returns the emblem');

  // Journey pinned
  check(await page.locator('.journey-pin').isVisible() && !(await page.locator('.journey-still').isVisible()), 'pinned journey shows (motion allowed); still grid hidden');
  await page.locator('[data-journey]').scrollIntoViewIfNeeded();
  await page.locator('[data-jp-node="2"]').click();
  await page.waitForTimeout(1500);
  check(await page.locator('[data-jp-count]').textContent() === '03', 'a stage node scrolls the scene to that stage (03 / 04)');
  const hiddenCount = await page.locator('[data-jp-chapter][aria-hidden="true"]').count();
  check(hiddenCount === 3, 'only the current chapter is exposed to assistive tech');
  await axe(page, 'Home desktop, journey pinned');

  // Campus tabs
  const tab0 = page.locator('#campusTab0');
  await tab0.focus();
  await page.keyboard.press('ArrowRight');
  check(await page.locator('#campusTab1').getAttribute('aria-selected') === 'true' && await page.locator('#campusPanel1').isVisible() && await page.locator('#campusPanel0').isHidden(), 'ArrowRight selects Play and shows only its panel');
  await page.keyboard.press('End');
  check(await page.locator('#campusTab3').getAttribute('aria-selected') === 'true', 'End selects Gather');

  // Facilities preview
  await page.locator('.fac-link').nth(3).focus();
  check((await page.locator('[data-fac-name]').textContent()) === 'Multipurpose Hall', 'focusing a facility updates the preview');
  check(await page.locator('[data-fac-slide]:not([hidden])').count() === 1 && /MPH\.jpg/.test(await page.locator('[data-fac-slide]:not([hidden])').innerHTML()), 'the preview shows only that facility’s photo (MPH.jpg) or its placeholder');

  // Tour dialog
  const tour = page.locator('.hero [data-tour-open]');
  await tour.focus();
  await page.keyboard.press('Enter');
  check(await page.locator('[data-tour-dialog]').isVisible(), 'Take the virtual tour opens the dialog');
  check((await focusText(page)).startsWith('Close'), 'focus moves to Close');
  // Let the 320 ms open fade finish, or axe measures a half-transparent dialog.
  await page.locator('[data-tour-dialog]').evaluate((d) => Promise.all(d.getAnimations({ subtree: true }).map((a) => a.finished)));
  await axe(page, 'Home desktop, tour dialog open');
  await page.keyboard.press('Escape');
  check(!(await page.locator('[data-tour-dialog]').isVisible()), 'Esc closes the dialog');
  check((await focusText(page)).includes('Take the virtual tour'), 'focus returns to the opener');

  /* ---------- reduced motion ---------- */
  const red = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await red.goto(BASE + '/', { waitUntil: 'load' });
  await red.waitForTimeout(2500);
  check(await red.locator('.hero canvas').count() === 0, 'reduced motion: three.js never loads; static official artwork');
  check(await red.evaluate(() => getComputedStyle(document.querySelector('[data-header-logo]')).opacity) === '1', 'reduced motion: header logo simply present');
  await red.evaluate(() => scrollTo(0, 400));
  await red.waitForTimeout(200);
  check(!(await red.locator('.hero [data-emblem-stage]').getAttribute('style'))?.includes('scale(0'), 'reduced motion: no travel');
  check(await red.locator('.journey-still').isVisible() && !(await red.locator('.journey-pin').isVisible()), 'reduced motion: still journey grid');
  await axe(red, 'Home desktop, reduced motion');

  /* ---------- no JavaScript ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/');
  check((await nojs.locator('.hero [data-tour-open]').getAttribute('href'))?.includes('youtube.com'), 'no JS: the virtual tour is a link to YouTube');
  check(await nojs.locator('.journey-still').isVisible(), 'no JS: still journey grid');
  check(await nojs.locator('[data-tab-panel]').evaluateAll((ps) => ps.every((p) => getComputedStyle(p).display !== 'none')), 'no JS: all four campus scenes are listed');
  check(!(await nojs.locator('.campus-tabs').isVisible()), 'no JS: the tab row is hidden');
  check(await nojs.locator('.hero .emblem-meaning').evaluate((d) => d.tagName === 'DETAILS'), 'no JS: "What our logo means" is a native disclosure');
  const nojsAxe = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await gotoWithoutScripts(nojsAxe, BASE + '/');
  await axe(nojsAxe, 'Home desktop, no JS');

  /* ---------- phone ---------- */
  const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await mob.goto(BASE + '/', { waitUntil: 'load' });
  await mob.waitForTimeout(1500);
  check(await mob.locator('.journey-v').isVisible() && !(await mob.locator('.journey-pin').isVisible()), 'phone: vertical journey chapters');
  await mob.locator('.fac-btn').nth(2).click();
  check(await mob.locator('.fac-btn').nth(2).getAttribute('aria-pressed') === 'true' && (await mob.locator('[data-fac-visit]').getAttribute('href')) === '/campus/playground', 'phone: tapping a facility sets the preview and its Visit link');
  check(await mob.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'phone: no horizontal scroll');
  await axe(mob, 'Home phone');
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll Home checks passed.');
process.exit(failures ? 1 : 0);
