// Checks that vercel.json has a 301 for every legacy URL in design-handoff/PAGE-MAP.md,
// with and without the trailing slash. Usage: node scripts/check-redirects.mjs
// With a deployed base URL it also requests each one: node scripts/check-redirects.mjs https://<preview>.vercel.app
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const pageMap = readFileSync(new URL('../design-handoff/PAGE-MAP.md', root), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'));

const section = pageMap.split('## Legacy URL redirects')[1].split('##')[0];
const pairs = [...section.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm)].map((m) => [m[1], m[2]]);
if (!pairs.length) { console.error('No redirects found in PAGE-MAP.md'); process.exit(1); }

let failed = 0;
for (const [from, to] of pairs) {
  for (const source of [from.replace(/\/$/, ''), from.endsWith('/') ? from : `${from}/`]) {
    const r = vercel.redirects.find((x) => x.source === source && !x.has);
    if (!r) { console.error(`✗ missing: ${source} → ${to}`); failed++; continue; }
    if (r.destination !== to) { console.error(`✗ wrong target: ${source} → ${r.destination} (expected ${to})`); failed++; }
    if (r.statusCode !== 301) { console.error(`✗ not 301: ${source} (${r.statusCode ?? (r.permanent ? 308 : 307)})`); failed++; }
  }
}
console.log(`${pairs.length} legacy URLs checked in vercel.json (${pairs.length * 2} sources).`);

const base = process.argv[2];
if (base) {
  for (const [from, to] of pairs) {
    const res = await fetch(new URL(from, base), { redirect: 'manual' });
    const loc = res.headers.get('location') ?? '';
    const ok = res.status === 301 && new URL(loc, base).pathname === to;
    if (!ok) { console.error(`✗ live: ${from} → ${res.status} ${loc}`); failed++; }
  }
  console.log(`Live check against ${base} done.`);
}
if (failed) { console.error(`${failed} problem(s).`); process.exit(1); }
console.log('All legacy redirects are single 301s.');
