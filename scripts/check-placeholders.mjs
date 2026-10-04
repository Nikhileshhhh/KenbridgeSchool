// Lists every [bracketed placeholder] in the built HTML and checks each one is tracked in
// website/PLACEHOLDERS.md (CLAUDE.md: "Track every one in website/PLACEHOLDERS.md").
// Usage: npm run build && node scripts/check-placeholders.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const tracked = readFileSync(join(root, 'PLACEHOLDERS.md'), 'utf8');
// A family of generated placeholders (one per album, photo or caption) is tracked with one rule:
// `pattern: ^Cover · .+$` in PLACEHOLDERS.md. Each rendered label must still match a rule.
const patterns = [...tracked.matchAll(/`pattern: (.+?)`/g)].map((m) => new RegExp(m[1]));

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}
const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, '’').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');

const found = new Map();
for (const file of htmlFiles(dist)) {
  if (file.includes(`${join('dist', 'dev')}`)) continue;
  const t = text(readFileSync(file, 'utf8'));
  for (const m of t.matchAll(/\[([^\[\]]{2,200})\]/g)) {
    const key = m[1].trim();
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add('/' + relative(dist, file).replace(/\\/g, '/').replace(/(index)?\.html$/, ''));
  }
}

let missing = 0;
for (const [label, pages] of [...found].sort()) {
  const ok = tracked.includes(label) || patterns.some((r) => r.test(label));
  if (!ok) missing++;
  console.log(`${ok ? '✓' : '✗'} [${label}]  ${[...pages].join(', ')}`);
}
console.log(`\n${found.size} distinct placeholders rendered; ${missing} not yet in PLACEHOLDERS.md.`);
if (missing) process.exit(1);
