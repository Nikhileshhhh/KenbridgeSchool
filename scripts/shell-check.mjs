// Keyboard and state checks for the global shell (ShellHeader › Behaviour, MobileShell 01–06),
// plus axe on each open state. Usage: npm run build && node scripts/shell-check.mjs [/route]
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview } from './lib/serve.mjs';

const route = process.argv[2] ?? '/404';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => v.id).join(', ') : ''}`);
};
const focused = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return { text: a?.textContent?.trim().replace(/\s+/g, ' ') ?? '', id: a?.id ?? '', tag: a?.tagName ?? '' };
});

const server = await startPreview();
const browser = await chromium.launch();
try {
  /* ---------- desktop ---------- */
  const desk = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await desk.goto(BASE + route);
  await desk.keyboard.press('Tab');
  check((await focused(desk)).text === 'Skip to main content', 'first Tab reaches the skip link');
  check(await desk.locator('.skip-link').evaluate((el) => el.getBoundingClientRect().top >= 0), 'skip link is visible when focused');
  await desk.keyboard.press('Enter');
  check((await focused(desk)).id === 'main', 'skip link moves focus to <main>');

  const campus = desk.locator('[data-mega-trigger="campus"]');
  await campus.focus();
  await desk.keyboard.press('Enter');
  check((await campus.getAttribute('aria-expanded')) === 'true', 'Enter opens the Campus mega menu (aria-expanded=true)');
  check(await desk.locator('#mega-campus').isVisible(), 'Campus panel is visible');
  check(await desk.locator('[data-site-header]').evaluate((h) => h.classList.contains('is-solid')), 'header is solid while a menu is open');
  await axe(desk, 'desktop, Campus mega menu open');
  await desk.keyboard.press('Tab');
  check((await focused(desk)).text.startsWith('Our campus'), 'Tab moves from the trigger into its open panel');
  await desk.keyboard.press('Escape');
  check(!(await desk.locator('#mega-campus').isVisible()), 'Esc closes the panel');
  check((await focused(desk)).text.startsWith('Campus'), 'Esc returns focus to the trigger');

  await desk.locator('[data-mega-trigger="about"]').click();
  await desk.locator('[data-mega-trigger="learning"]').click();
  check(await desk.locator('#mega-about').isHidden() && await desk.locator('#mega-learning').isVisible(), 'only one menu open at a time');
  await desk.locator('[data-page-dim]').click({ position: { x: 700, y: 850 } });
  check(await desk.locator('#mega-learning').isHidden(), 'a click on the dimmed page closes the menu');

  const search = desk.locator('[data-search-trigger]');
  await search.click();
  check((await focused(desk)).id === 'siteSearchField', 'Search opens with focus in the field');
  await axe(desk, 'desktop, search open');
  await desk.keyboard.press('Escape');
  check((await focused(desk)).tag === 'BUTTON' && (await search.getAttribute('aria-expanded')) === 'false', 'Esc closes search and returns focus');

  /* ---------- mobile ---------- */
  const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await mob.goto(BASE + route);
  const menu = mob.locator('[data-menu-trigger]');
  await menu.click();
  check(await mob.locator('#mobile-menu').isVisible(), 'Menu opens the sheet');
  check((await focused(mob)).text.startsWith('Close'), 'focus moves to Close');
  check(await mob.locator('main').evaluate((m) => m.inert), 'page behind the sheet is inert');
  await axe(mob, 'mobile, menu sheet open');
  // Cycle: logo (home) → Close → sections → rows → Admissions → logo. The board lists the cycle
  // from Close; the sheet's logo link stays in it so it is reachable by keyboard.
  await mob.keyboard.press('Shift+Tab');
  check((await mob.evaluate(() => document.activeElement.getAttribute('href'))) === '/', 'Shift+Tab from Close reaches the sheet logo');
  await mob.keyboard.press('Shift+Tab');
  check((await focused(mob)).text.startsWith('Admissions'), 'Shift+Tab from the first item wraps to the sticky Admissions button');
  await mob.keyboard.press('Tab');
  await mob.keyboard.press('Tab');
  check((await focused(mob)).text.startsWith('Close'), 'Tab from Admissions wraps round to Close');
  // Tap a section that is closed (the current page's own section opens automatically).
  const closed = mob.locator('[data-mm-toggle][aria-expanded="false"]').first();
  const panelId = await closed.getAttribute('aria-controls');
  await closed.click();
  check(await mob.locator(`#${panelId}`).isVisible(), 'a section opens on tap');
  await mob.keyboard.press('Escape');
  await mob.waitForTimeout(200);
  check(await mob.locator('#mobile-menu').isHidden(), 'Esc closes the sheet');
  check((await focused(mob)).tag === 'BUTTON' && (await menu.getAttribute('aria-expanded')) === 'false', 'focus returns to Menu');

  await menu.click();
  await mob.goBack();
  await mob.waitForTimeout(200);
  check(await mob.locator('#mobile-menu').isHidden() && mob.url().endsWith(route), 'the back gesture closes the sheet and stays on the page');

  await mob.locator('[data-search-trigger]').click();
  check((await focused(mob)).id === 'mobileSearchField', 'mobile Search shows the field with focus');
  await axe(mob, 'mobile, search open');
  await mob.locator('[data-msearch-cancel]').click();
  check((await focused(mob)).tag === 'BUTTON', 'Cancel returns focus to the Search button');

  /* ---------- no JavaScript ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + route);
  check(await nojs.locator('a.menu-btn').isVisible(), 'no JS: Menu is a link');
  await nojs.locator('a.menu-btn').click();
  check(await nojs.locator('#mobile-menu').isVisible(), 'no JS: the :target sheet opens');
  check(await nojs.locator('#mm-gallery').isVisible(), 'no JS: every section is expanded');
  await nojs.locator('a.mm-close').click();
  check(await nojs.locator('#mobile-menu').isHidden(), 'no JS: Close hides the sheet');
  const nojsDesk = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojsDesk.goto(BASE + route);
  check(await nojsDesk.locator('a.nav-item[href="/campus"]').isVisible(), 'no JS: nav items are links to the hub pages');
  check(await nojsDesk.locator('a.search-btn[href="/search"]').isVisible(), 'no JS: Search links to /search');
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll shell checks passed.');
process.exit(failures ? 1 : 0);
