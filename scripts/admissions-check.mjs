// Interaction checks for /admissions (steps, FAQ, print checklist, sticky jump bar, the phone Enquire
// bar) and the EnquiryForm (validation, focused summary, demo notice) on the dev review page.
// Usage: npm run build && node scripts/admissions-check.mjs   (form checks also need `npm run dev` on :4321)
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts } from './lib/serve.mjs';

const DEV = process.env.DEV_BASE ?? 'http://localhost:4321';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const settle = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
const axe = async (page, label) => {
  await settle(page);
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const expanded = (page) => page.$$eval('[data-step-toggle]', (bs) => bs.map((b) => b.getAttribute('aria-expanded') === 'true'));

const server = await startPreview();
const browser = await chromium.launch();
try {
  /* ---------- desktop, JS on ---------- */
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(BASE + '/admissions', { waitUntil: 'load' });
  check(/Admissions \d{4}–\d\d · Closed/.test(await page.locator('.am-status-label').textContent()), 'the banner reads from the admissions setting (closed)');
  const enq = page.locator('.am-ctas .am-btn--primary');
  check((await enq.getAttribute('target')) === '_blank' && /new tab/.test(await enq.textContent()), 'Enquire online opens the external form in a new tab and says so');
  check((await expanded(page)).join() === 'true,false,false,false', 'step 1 starts open, the others closed');
  check(await page.locator('#stepPanel02').isHidden(), 'closed steps hide their details');
  await page.locator('[data-steps-all]').click();
  check((await expanded(page)).every(Boolean), '"Expand all steps" opens every step');
  check((await page.locator('[data-steps-all]').textContent()) === 'Collapse all steps', 'and becomes "Collapse all steps"');
  await page.locator('[data-steps-all]').click();
  check((await expanded(page)).every((x) => !x), '"Collapse all steps" closes them');
  await page.locator('[data-step-reveal="03"]').click();
  await page.waitForTimeout(600);
  check((await expanded(page))[2], 'the At-a-glance link opens step 03');
  const jumpTop = await page.locator('.am-jumps').evaluate((n) => n.getBoundingClientRect().top);
  check(Math.abs(jumpTop - 89) <= 1, `the jump bar sticks under the header (${jumpTop}px)`);
  const stepTop = await page.locator('#step-03').evaluate((n) => n.getBoundingClientRect().top);
  check(stepTop >= 149, `a jumped-to step is not hidden under the header and jump bar (${Math.round(stepTop)}px)`);
  const faqs = page.locator('[data-faq-toggle]');
  check((await faqs.first().getAttribute('aria-expanded')) === 'true' && (await faqs.nth(1).getAttribute('aria-expanded')) === 'false', 'FAQ: the first answer starts open');
  await faqs.nth(1).click();
  check(await page.locator('#faqA2').isVisible(), 'FAQ: a question opens its answer');
  check((await page.locator('#faqA2').getAttribute('role')) === 'region', 'FAQ: answers are labelled regions');
  await axe(page, '/admissions @1440');

  // Print only the checklist.
  await page.evaluate(() => document.documentElement.classList.add('printing-docs'));
  await page.emulateMedia({ media: 'print' });
  const vis = await page.evaluate(() => [getComputedStyle(document.querySelector('#docsPrint .am-docs-t')).visibility, getComputedStyle(document.querySelector('.am-h1')).visibility, getComputedStyle(document.querySelector('[data-print-docs]')).display]);
  check(vis[0] === 'visible' && vis[1] === 'hidden' && vis[2] === 'none', 'Print checklist prints only the checklist (and not its button)');
  await page.emulateMedia({ media: 'screen' });

  /* ---------- phone: the sticky Enquire bar ---------- */
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await m.goto(BASE + '/admissions', { waitUntil: 'load' });
  await m.evaluate(() => scrollTo(0, 1600));
  await m.waitForTimeout(200);
  const barMid = await m.locator('.am-bar').evaluate((n) => n.getBoundingClientRect().bottom);
  check(Math.abs(barMid - 844) <= 1, `phone: the Enquire bar rides at the bottom while reading (${barMid})`);
  await m.evaluate(() => document.getElementById('enquire').scrollIntoView({ block: 'center' }));
  await m.waitForTimeout(200);
  const [barBottom, enqTop] = await m.evaluate(() => [document.querySelector('.am-bar').getBoundingClientRect().bottom, document.getElementById('enquire').getBoundingClientRect().top]);
  check(barBottom <= enqTop + 1, `phone: the bar comes to rest above the enquiry section (${Math.round(barBottom)} ≤ ${Math.round(enqTop)})`);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `phone: no horizontal scroll (${overflow}px)`);
  await axe(m, '/admissions @390');
  const mid = await (await browser.newContext({ viewport: { width: 1024, height: 800 } })).newPage();
  await mid.goto(BASE + '/admissions', { waitUntil: 'load' });
  check((await mid.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, '1024: no horizontal scroll');

  /* ---------- JS off ---------- */
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/admissions');
  check((await nojs.$$eval('[data-step-panel]', (ps) => ps.every((p) => p.offsetParent !== null))), 'JS off: every step’s details show');
  check(!(await nojs.locator('[data-step-toggle]').first().isVisible()) && !(await nojs.locator('[data-steps-all]').isVisible()), 'JS off: step toggles are hidden');
  check((await nojs.$$eval('[data-faq-panel]', (ps) => ps.every((p) => p.offsetParent !== null))) && (await nojs.locator('.am-faq-static').first().isVisible()), 'JS off: every answer shows under its question');
  check(!(await nojs.locator('[data-print-docs]').first().isVisible()), 'JS off: the print button is hidden');
  for (const width of [1440, 390]) {
    const ax = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    await gotoWithoutScripts(ax, BASE + '/admissions');
    await axe(ax, `JS off /admissions @${width}`);
    await ax.context().close();
  }

  /* ---------- EnquiryForm (dev review page) ---------- */
  let devUp = false;
  try { devUp = (await fetch(DEV + '/dev/enquiry-states')).ok; } catch {}
  if (!devUp) console.log('… skipped EnquiryForm checks: start `npm run dev` for /dev/enquiry-states');
  else {
    const f = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await f.goto(DEV + '/dev/enquiry-states', { waitUntil: 'load' });
    const form = f.locator('form[data-enquiry]').first();
    await form.locator('[data-enquiry-submit]').click();
    check(await f.evaluate(() => document.activeElement.matches('[data-enquiry-summary]')), 'form: an empty submit focuses the error summary');
    check((await form.locator('[data-enquiry-summary-list] a').count()) === 4, 'form: the summary lists four problems');
    check((await form.locator('#s1Email').getAttribute('aria-invalid')) === 'true', 'form: invalid fields are marked aria-invalid');
    check(((await form.locator('#s1Email').getAttribute('aria-describedby')) ?? '').includes('s1Email-e') && (await f.locator('#s1Email-e').isVisible()), 'form: inline errors are tied with aria-describedby');
    await form.locator('[data-enquiry-summary-list] a').nth(1).click();
    check(await f.evaluate(() => document.activeElement.id === 's1Email'), 'form: a summary link moves focus to its field');
    await form.locator('#s1Name').fill('Priya Patil');
    await form.locator('#s1Email').fill('priya.patil@example.com');
    await form.locator('#s1Phone').fill('98450 12345');
    await form.locator('#s1Class').selectOption('Class I');
    await form.locator('[data-enquiry-submit]').click();
    check(await f.evaluate(() => document.activeElement.matches('[data-enquiry-demo]')), 'form (demo): a valid submit says plainly that nothing was sent');
    check(!(await form.locator('[data-enquiry-summary]').isVisible()) && (await form.locator('#s1Name').inputValue()) === 'Priya Patil', 'form: errors clear and values are kept');
    await axe(f, '/dev/enquiry-states (all states)');
    const fn = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
    await fn.goto(DEV + '/dev/enquiry-states');
    check(!(await fn.locator('[data-enquiry-submit]').first().isVisible()) && (await fn.locator('.enq-nojs').first().isVisible()), 'form JS off (demo): Send is replaced by a call-or-email note');
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll Admissions checks passed');
process.exit(failures ? 1 : 0);
