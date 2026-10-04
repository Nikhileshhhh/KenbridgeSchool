// Launch check (batch 12) on every built page:
//  · Keyboard (1440, JS on): the first Tab lands on the skip link, Enter moves focus into <main>;
//    then 40 Tab stops: every focused element shows a focus indicator, is on screen, and focus
//    never gets stuck.
//  · JS off (390 and 1440): no sideways scroll, the h1 shows, nothing that needs JS is visible,
//    every link has an href; axe at 390.
//  · Reduced motion (390): no running looping animations once the page settles.
// Usage: npm run build && node scripts/launch-check.mjs [route ...]
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, startPreview, stopPreview, gotoWithoutScripts, builtRoutes } from './lib/serve.mjs';

const only = process.argv.slice(2);
const routes = builtRoutes().filter((r) => !r.startsWith('/dev') && r !== '/app' && (!only.length || only.includes(r)));
let failures = 0;
const fail = (msg) => { console.log(`✗ ${msg}`); failures++; };

const server = await startPreview();
const browser = await chromium.launch();
try {
  const kb = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const nojs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const nojsWide = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  for (const route of routes) {
    let bad = 0;
    // ---- Keyboard ----
    const p = await kb.newPage();
    await p.goto(BASE + route, { waitUntil: 'load' });
    await p.keyboard.press('Tab');
    const first = await p.evaluate(() => document.activeElement?.className);
    if (!/skip-link/.test(first ?? '')) { fail(`${route}: first Tab lands on the skip link (got .${first})`); bad++; }
    await p.keyboard.press('Enter');
    await p.waitForTimeout(100);
    if (!(await p.evaluate(() => document.activeElement?.id === 'main' || !!document.activeElement?.closest('main')))) { fail(`${route}: the skip link moves focus into main`); bad++; }
    await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    let last = null; let repeats = 0;
    for (let i = 0; i < 40; i++) {
      await p.keyboard.press('Tab');
      const info = await p.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || /rgb/.test(s.boxShadow) && s.boxShadow !== 'none';
        const desc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ')[0]} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;
        return { desc, ring, onScreen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, key: desc + r.top };
      });
      if (!info) continue;
      if (!info.ring) { fail(`${route}: no visible focus ring on ${info.desc}`); bad++; }
      if (!info.onScreen) { fail(`${route}: focused element is off screen: ${info.desc}`); bad++; }
      repeats = info.key === last ? repeats + 1 : 0;
      last = info.key;
      if (repeats >= 2) { fail(`${route}: focus is stuck on ${info.desc}`); bad++; break; }
    }
    await p.close();

    // ---- JS off ----
    for (const ctx of [nojs, nojsWide]) {
      const q = await ctx.newPage();
      await q.goto(BASE + route, { waitUntil: 'load' });
      const w = ctx === nojs ? 390 : 1440;
      const r = await q.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        h1: (() => { const h = document.querySelector('h1'); const b = h?.getBoundingClientRect(); return !!h && b.width > 0 && b.height > 0 && getComputedStyle(h).visibility !== 'hidden' && getComputedStyle(h).opacity !== '0'; })(),
        jsOnly: [...document.querySelectorAll('.js-only')].filter((e) => e.getClientRects().length).length,
        hidden: [...document.querySelectorAll('main section, main h2')].filter((e) => getComputedStyle(e).opacity === '0' || getComputedStyle(e).visibility === 'hidden').length,
        noHref: [...document.querySelectorAll('a:not([href])')].filter((a) => a.getClientRects().length).length
      }));
      if (r.overflow > 0) { fail(`${route} JS off @${w}: sideways scroll (${r.overflow}px)`); bad++; }
      if (!r.h1) { fail(`${route} JS off @${w}: the h1 is not visible`); bad++; }
      if (r.jsOnly) { fail(`${route} JS off @${w}: ${r.jsOnly} JS-only control(s) visible`); bad++; }
      if (r.hidden) { fail(`${route} JS off @${w}: ${r.hidden} section(s) or heading(s) left invisible (reveal waiting for JS?)`); bad++; }
      if (r.noHref) { fail(`${route} JS off @${w}: ${r.noHref} link(s) without href`); bad++; }
      await q.close();
    }
    const ax = await nojs.newPage();
    await gotoWithoutScripts(ax, BASE + route);
    const res = await new AxeBuilder({ page: ax }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    if (res.violations.length) { fail(`${route} JS off @390 axe: ${res.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')}`).join('; ')}`); bad++; }
    await ax.close();

    // ---- Reduced motion ----
    const m = await rm.newPage();
    await m.goto(BASE + route, { waitUntil: 'load' });
    await m.waitForTimeout(400);
    const loops = await m.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).map((a) => a.effect?.target?.className?.toString().split(' ')[0] ?? '?'));
    if (loops.length) { fail(`${route} reduced motion: looping animation(s) still running (${loops.join(', ')})`); bad++; }
    await m.close();

    console.log(`${bad ? '✗' : '✓'} ${route}`);
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} problem(s)` : `\nKeyboard, JS-off and reduced-motion checks passed on ${routes.length} pages`);
process.exit(failures ? 1 : 0);
