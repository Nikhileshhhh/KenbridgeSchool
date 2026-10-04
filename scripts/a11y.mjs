// axe (WCAG 2.2 AA rules) on every built page at 1440 and 390, with JS on.
// Usage: npm run build && npm run a11y      (exit code 1 on any violation)
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { BASE, builtRoutes, startPreview, stopPreview } from './lib/serve.mjs';

const server = await startPreview();
const browser = await chromium.launch();
let total = 0;
try {
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    for (const route of builtRoutes()) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      // Let one-off entrance fades finish, or axe samples half-transparent text.
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      total += res.violations.length;
      const label = `${route} @${width}`;
      if (!res.violations.length) { console.log(`✓ ${label}`); continue; }
      console.log(`✗ ${label}`);
      for (const v of res.violations) {
        console.log(`   ${v.id} (${v.impact}): ${v.help}`);
        for (const n of v.nodes.slice(0, 5)) console.log(`     ${n.target.join(' ')}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(total ? `\n${total} violation group(s).` : '\nZero axe violations.');
process.exit(total ? 1 : 0);
