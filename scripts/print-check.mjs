// Prints pages to A4 PDFs and counts the pages (CLAUDE.md: "The timings page prints on one A4 sheet").
// Song and Prayer should also print cleanly (no header, footer or menu; at most one sheet each).
// Usage: npm run build && node scripts/print-check.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, root, startPreview, stopPreview } from './lib/serve.mjs';

const pages = [
  { route: '/information/timings', max: 1 },
  { route: '/information/song', max: 2 },
  { route: '/information/prayer', max: 1 }
];
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const out = join(root, 'qa', 'print');
mkdirSync(out, { recursive: true });

const server = await startPreview();
const browser = await chromium.launch();
try {
  for (const p of pages) {
    const page = await (await browser.newContext()).newPage();
    await page.goto(BASE + p.route, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    const chrome = await page.evaluate(() => ['.site-header', '.site-footer', '.utility', '#mobile-menu'].filter((s) => { const n = document.querySelector(s); return n && getComputedStyle(n).display !== 'none'; }));
    check(chrome.length === 0, `${p.route}: header, footer and menu are hidden in print${chrome.length ? ` (${chrome.join(', ')})` : ''}`);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const file = join(out, p.route.split('/').pop() + '.pdf');
    writeFileSync(file, pdf);
    const count = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    check(count >= 1 && count <= p.max, `${p.route}: prints on ${count} A4 page${count === 1 ? '' : 's'} (max ${p.max}) → qa/print/${p.route.split('/').pop()}.pdf`);
    await page.context().close();
  }
} finally {
  await browser.close();
  stopPreview(server);
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll print checks passed');
process.exit(failures ? 1 : 0);
