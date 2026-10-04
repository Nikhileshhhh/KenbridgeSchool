// Screenshots of every built page at 1440 and 390, with JS on, JS off and reduced motion,
// saved to qa/shots/ for side-by-side comparison with design-handoff/reference-screens.
// Usage: npm run build && npm run qa [-- /route /route2]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { BASE, builtRoutes, root, startPreview, stopPreview } from './lib/serve.mjs';

const only = process.argv.slice(2);
const routes = only.length ? only : builtRoutes();
const out = join(root, 'qa', 'shots');
mkdirSync(out, { recursive: true });

const modes = [
  { name: 'js', js: true, motion: 'no-preference' },
  { name: 'nojs', js: false, motion: 'no-preference' },
  { name: 'reduced', js: true, motion: 'reduce' }
];

const server = await startPreview();
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    for (const mode of modes) {
      const ctx = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        javaScriptEnabled: mode.js,
        reducedMotion: mode.motion
      });
      const page = await ctx.newPage();
      for (const route of routes) {
        await page.goto(BASE + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        const slug = (route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')) || 'home';
        const file = join(out, `${slug}.${width}.${mode.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        console.log(`${overflow ? '✗ horizontal scroll' : '✓'} ${route} @${width} ${mode.name}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(`Screenshots in ${out}`);
