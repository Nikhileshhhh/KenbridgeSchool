// Checks for /contact, /services and /app on the built site: the contact form (errors summary takes
// focus, inline errors linked with aria-describedby, values kept, demo notice says nothing was sent),
// the map loads nothing from Google until asked, every external link opens in a new tab and says so,
// no sign-in forms anywhere, /app sends phones to the right store, JS off, one h1, no sideways scroll, axe.
// Usage: npm run build && node scripts/contact-check.mjs
import { chromium, devices } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts } from './lib/serve.mjs';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const axe = async (page, label) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  check(r.violations.length === 0, `axe clean: ${label}${r.violations.length ? ' → ' + r.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`).join('; ') : ''}`);
};
const routes = ['/contact', '/services', '/app'];

const server = await startPreview();
const browser = await chromium.launch();
try {
  // ---- Contact form ----
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const google = [];
  ctx.on('request', (r) => { if (/google\.com\/maps|maps\.google|gstatic/.test(r.url())) google.push(r.url()); });
  const page = await ctx.newPage();
  await page.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  check(google.length === 0, 'map: nothing loads from Google before "Show interactive map"');
  const form = page.locator('form[data-form]');
  await page.fill('#ctName', 'Test Parent');
  await page.fill('#ctEmail', 'parent@');
  await form.locator('[data-enquiry-submit]').click();
  const summary = form.locator('[data-enquiry-summary]');
  check(await summary.isVisible() && await summary.evaluate((n) => n === document.activeElement), 'form: the error summary shows and takes focus');
  const items = await summary.locator('li a').allTextContents();
  check(items.length === 3 && items[0] === 'Enter an email address in the format name@example.com' && /Visiting the campus/.test(items[1]) && items[2] === 'Enter your message', `form: the board's messages, in field order (${items.join(' | ')})`);
  check((await page.getAttribute('#ctEmail', 'aria-describedby')).split(' ').includes('ctEmail-e') && (await page.getAttribute('#ctEmail', 'aria-invalid')) === 'true', 'form: the inline error is linked with aria-describedby and the field is aria-invalid');
  check(await page.locator('#ctEmail-e svg').count() === 1, 'form: errors carry an icon as well as words');
  check((await page.inputValue('#ctName')) === 'Test Parent' && (await page.inputValue('#ctEmail')) === 'parent@', 'form: values are kept');
  await summary.locator('li a').first().click();
  check(await page.evaluate(() => document.activeElement?.id) === 'ctEmail', 'form: a summary link moves focus to its field');
  await page.fill('#ctEmail', 'parent@example.com');
  await page.fill('#ctSubject', 'Visiting the campus');
  await page.fill('#ctMsg', 'Hello');
  await form.locator('[data-enquiry-submit]').click();
  const demo = form.locator('[data-enquiry-demo]');
  check(await demo.isVisible() && /nothing was sent/.test(await demo.textContent()) && !(await summary.isVisible()), 'form (demo): a valid send says plainly that nothing was sent');
  check((await page.inputValue('#ctMsg')) === 'Hello', 'form (demo): the message is still there');
  check(await form.evaluate((f) => f.noValidate), 'form: custom validation replaces the browser bubbles when JS runs');
  await axe(page, '/contact form with errors and demo notice @1440');

  // ---- Map on demand ----
  const tel = await page.$$eval('a[href^="tel:"]', (as) => as.length);
  check(tel >= 3, 'contact: the three phone numbers are tel: links');
  await page.locator('[data-map-load]').click();
  const frame = page.locator('[data-map] iframe');
  check(await frame.count() === 1 && /Map of KenBridge School/.test(await frame.getAttribute('title')), 'map: "Show interactive map" adds a titled Google iframe');
  check(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Google Map showing KenBridge School', 'map: focus moves to the map region, not lost on a removed button');

  // ---- Links: new tab and say so; no sign-in forms ----
  for (const route of ['/contact', '/services']) {
    await page.goto(BASE + route, { waitUntil: 'load' });
    const bad = await page.$$eval('main a[href^="http"]', (as) => as.filter((a) => a.target !== '_blank' || !/opens|WhatsApp/.test(a.textContent)).map((a) => a.textContent.trim().slice(0, 40)));
    check(!bad.length, `${route}: every external link opens in a new tab and says so${bad.length ? ` (${bad.join(', ')})` : ''}`);
    check(!(await page.locator('main input[type="password"]').count()), `${route}: no sign-in forms`);
  }
  check(await page.locator('.sv-row--off', { hasText: 'Fee Structure' }).count() === 1 && await page.locator('.sv-row--off', { hasText: '[File to be supplied]' }).count() === 2, 'services: PDFs with no file are not links and say [File to be supplied]');

  // ---- Every route: one h1, no sideways scroll, axe ----
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
  const sm = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await sm.goto(BASE + '/services', { waitUntil: 'load' });
  check(await sm.locator('.sv-most .sv-big').count() === 2 && !(await sm.locator('.sv-dup').first().isVisible()), 'services @390: Parent Login and Admission enquiry move up to "Most used"');
  const small = await sm.$$eval('main a, main button', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.height < 44 && !e.closest('p')); }).map((e) => e.textContent.trim().slice(0, 30)));
  check(!small.length, `services @390: touch targets at least 44px${small.length ? ` (${small.join(', ')})` : ''}`);

  // ---- /app ----
  const android = await browser.newContext({ ...devices['Pixel 7'] });
  const ap = await android.newPage();
  await ap.route(/play\.google\.com/, (r) => r.fulfill({ status: 200, body: 'store' }));
  await ap.goto(BASE + '/app');
  await ap.waitForURL(/play\.google\.com/, { timeout: 5000 }).catch(() => {});
  check(/play\.google\.com/.test(ap.url()), '/app on Android goes to Google Play');
  const ios = await browser.newContext({ ...devices['iPhone 13'] });
  const ip = await ios.newPage();
  await ip.route(/apps\.apple\.com/, (r) => r.fulfill({ status: 200, body: 'store' }));
  await ip.goto(BASE + '/app');
  await ip.waitForURL(/apps\.apple\.com/, { timeout: 5000 }).catch(() => {});
  check(/apps\.apple\.com/.test(ip.url()), '/app on iPhone goes to the App Store');
  const desk = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await desk.goto(BASE + '/app', { waitUntil: 'load' });
  check(new URL(desk.url()).pathname === '/app' && await desk.locator('.ap-badge').count() === 2, '/app on a desktop shows both store links');

  // ---- JS off ----
  const nojs = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })).newPage();
  await nojs.goto(BASE + '/contact');
  check(!(await nojs.locator('[data-map-load]').isVisible()) && await nojs.locator('.ct-map-btn.no-js-only').isVisible(), 'JS off: "Open in Google Maps" replaces the map button');
  check(!(await nojs.locator('form[data-form] [data-enquiry-submit]').isVisible()) && await nojs.locator('form[data-form] .enq-nojs').isVisible(), 'JS off (demo): a call-or-email note replaces Send');
  const droid = await browser.newContext({ ...devices['Pixel 7'], javaScriptEnabled: false });
  const dn = await droid.newPage();
  await dn.goto(BASE + '/app');
  check(new URL(dn.url()).pathname === '/app' && await dn.locator('.ap-badge').count() === 2, 'JS off: /app shows both store links');
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
console.log(failures ? `\n${failures} check(s) failed` : '\nAll contact, services and app checks passed');
process.exit(failures ? 1 : 0);
