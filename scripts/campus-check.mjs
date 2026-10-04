// Interaction checks for /campus and the ten facility pages: scene tabs, the atlas preview, the
// virtual-tour dialog, draft boxes, JS off and reduced motion.
// Usage: npm run build && node scripts/campus-check.mjs
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
const facilities = ['school-campus', 'classrooms', 'playground', 'multipurpose-hall', 'science-lab', 'language-lab', 'maths-lab', 'indoor-sports-room', 'dance-music-room', 'library'];

const server = await startPreview();
const browser = await chromium.launch();
try {
  /* ---------- /campus desktop, JS on ---------- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/campus', { waitUntil: 'load' });
  const tabs = page.locator('.cp-tabs [role="tab"]');
  check((await tabs.count()) === 4, 'four scene tabs (Learn, Play, Create, Gather)');
  const shown = () => page.$$eval('.cp-scn-panel', (ps) => ps.filter((p) => !p.hidden).map((p) => p.id).join());
  check((await shown()) === 'scnPanel0', 'only the Learn scene shows');
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  check((await shown()) === 'scnPanel1' && (await page.evaluate(() => document.activeElement.id)) === 'scnTab1', '→ selects and focuses Play');
  await page.keyboard.press('End');
  check((await shown()) === 'scnPanel3', 'End selects Gather');
  await page.keyboard.press('Home');

  const previewName = () => page.locator('[data-atlas-name]').textContent();
  check((await previewName()) === 'School Campus', 'the atlas preview starts on 01 School Campus');
  await page.locator('#fac-library').hover();
  check((await previewName()) === 'Library', 'pointing at a row shows it in the preview');
  check(await page.locator('#fac-library [data-atlas-pick]').getAttribute('aria-pressed') === 'true', 'the row is marked pressed');
  check((await page.locator('[data-atlas-explore]').getAttribute('href')) === '/campus/library', 'the preview "Explore" goes to that facility');
  await page.locator('#fac-classrooms .cp-row-link').focus();
  check((await previewName()) === 'Classrooms', 'tabbing to a row’s link shows it too');
  await page.locator('.cp-scn-panel:not([hidden]) [data-atlas-goto="maths-lab"]').click();
  check((await previewName()) === 'Maths Lab', 'a scene’s facility link picks that facility');
  await page.mouse.move(5, 5);
  await axe(page, '/campus @1440, Maths Lab in preview');

  // Virtual tour dialog
  const opener = page.locator('.cp-hero [data-tour-open]');
  check((await opener.getAttribute('role')) === 'button' && !(await opener.getAttribute('target')), 'the tour link becomes a dialog button with JS');
  await opener.click();
  await page.waitForTimeout(400);
  check(await page.locator('[data-tour-dialog]').evaluate((d) => d.open), 'the tour dialog opens');
  check(await page.evaluate(() => document.activeElement.matches('[data-tour-close]')), 'focus moves to Close');
  await axe(page, '/campus tour dialog open');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(!(await page.locator('[data-tour-dialog]').evaluate((d) => d.open)), 'Esc closes the dialog');
  check(await page.evaluate(() => document.activeElement.matches('.cp-hero [data-tour-open]')), 'focus returns to the opener');

  /* ---------- /campus JS off ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/campus');
  check((await nojs.$$eval('.cp-scn-panel', (ps) => ps.filter((p) => p.offsetParent !== null).length)) === 4, 'JS off: all four scenes are listed');
  check(!(await nojs.locator('.cp-tabs').isVisible()), 'JS off: the tab row is hidden');
  check(!(await nojs.locator('[data-atlas-pick]').first().isVisible()) && (await nojs.locator('.cp-row-title--static').first().isVisible()), 'JS off: atlas rows are plain names with Explore links');
  check((await nojs.locator('.cp-hero [data-tour-open]').getAttribute('target')) === '_blank', 'JS off: the tour opens YouTube in a new tab');

  /* ---------- reduced motion ---------- */
  const red = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await red.goto(BASE + '/campus', { waitUntil: 'load' });
  await red.locator('#fac-library').hover();
  check(await red.locator('[data-atlas-photo]').evaluate((e) => getComputedStyle(e).animationName) === 'none', 'reduced motion: the preview swaps instantly');
  await red.locator('.cp-tabs [role="tab"]').nth(2).click();
  check(await red.locator('#scnPanel2 .cp-scn-photo').evaluate((e) => getComputedStyle(e).animationName) === 'none', 'reduced motion: scenes swap instantly');

  /* ---------- widths ---------- */
  for (const width of [390, 1024]) {
    const m = await (await browser.newContext({ viewport: { width, height: 844 } })).newPage();
    await m.goto(BASE + '/campus', { waitUntil: 'load' });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, `/campus @${width}: no horizontal scroll (${overflow}px)`);
    if (width === 390) {
      check(await m.locator('.cp-hero .crumb-back').isVisible(), '/campus @390: breadcrumb is ← Home (CampusMobile)');
      check(await m.locator('#fac-library .cp-row-thumb').isVisible(), '/campus @390: atlas rows carry thumbnails');
      await axe(m, '/campus @390');
    }
    await m.context().close();
  }

  /* ---------- facility pages ---------- */
  for (const slug of facilities) {
    const route = `/campus/${slug}`;
    for (const width of [1440, 390]) {
      const p = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
      await p.goto(BASE + route, { waitUntil: 'load' });
      if (width === 1440) {
        check((await p.locator('h1').count()) === 1, `${route}: one h1`);
        const related = await p.$$eval('.fd-rel', (as) => as.map((a) => a.getAttribute('href')));
        check(related.every((h) => /^\/campus\/[a-z-]+$/.test(h)), `${route}: related links (${related.length})`);
      }
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(overflow <= 0, `${route} @${width}: no horizontal scroll (${overflow}px)`);
      await axe(p, `${route} @${width}`);
      await p.context().close();
    }
  }
  const draft = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await draft.goto(BASE + '/campus/indoor-sports-room');
  check((await draft.locator('.fd-draft').count()) === 3, 'drafts on (demo): Indoor Sports Room shows three draft boxes');
  await draft.goto(BASE + '/campus/multipurpose-hall');
  check((await draft.locator('.fd-compact-block').count()) === 2 && !(await draft.locator('.fd-draft').count()), 'Multipurpose Hall: compact two-column row, no drafts');

  for (const route of ['/campus', '/campus/indoor-sports-room']) {
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
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Campus checks passed');
process.exit(failures ? 1 : 0);
