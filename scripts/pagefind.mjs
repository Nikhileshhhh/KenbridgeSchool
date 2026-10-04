// Post-build search index (PLAN §6 Search). Indexes every page's <main data-pagefind-body>, adds the
// external services and PDFs from dist/search-records.json as custom records, and writes a small
// vocabulary for "Did you mean" (pagefind/vocab.json). Runs as part of `npm run build`.
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import * as pagefind from 'pagefind';
import { root } from './lib/serve.mjs';

const dist = join(root, 'dist');
const recordsFile = join(dist, 'search-records.json');
const records = JSON.parse(readFileSync(recordsFile, 'utf8'));

const { index, errors } = await pagefind.createIndex({ forceLanguage: 'en' });
if (errors?.length) throw new Error(errors.join('\n'));
// Pages are added one by one rather than with addDirectory: stacked spans ("School Timings" over "Two
// terms…") carry no whitespace in the HTML, so the indexed copy gets a space after each closing tag
// and excerpts don't run words together. The shipped HTML is unchanged. URLs are the clean ones.
const htmlFiles = [];
const collect = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) { if (name !== 'pagefind' && name !== '_astro') collect(p); continue; }
    if (name.endsWith('.html')) htmlFiles.push(p);
  }
};
collect(dist);
const dir = { page_count: 0 };
for (const p of htmlFiles) {
  const html = readFileSync(p, 'utf8');
  if (!html.includes('data-pagefind-body')) continue;
  const rel = '/' + relative(dist, p).split(sep).join('/');
  const url = rel === '/index.html' ? '/' : rel.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  const spaced = html.replace(/<\/(span|a|strong|em|b|small|dt|dd|li|p|div|h[1-6]|td|th|figcaption|button|label)>/g, '$& ');
  const res = await index.addHTMLFile({ url, content: spaced });
  if (res.errors?.length) throw new Error(`${rel}: ${res.errors.join('\n')}`);
  dir.page_count++;
}
for (const r of records) {
  const res = await index.addCustomRecord({ url: r.url, content: r.content, language: 'en', meta: { title: r.title, type: r.type, trail: r.trail } });
  if (res.errors?.length) throw new Error(res.errors.join('\n'));
}
const out = await index.writeFiles({ outputPath: join(dist, 'pagefind') });
if (out.errors?.length) throw new Error(out.errors.join('\n'));
await pagefind.close();

// Vocabulary: words of four letters or more from the indexed text, for the "Did you mean" suggestion.
const words = new Map();
const add = (text) => {
  for (const w of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) words.set(w, (words.get(w) ?? 0) + 1);
};
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) { if (name !== 'pagefind' && name !== '_astro' && name !== 'dev') walk(p); continue; }
    if (!name.endsWith('.html')) continue;
    const html = readFileSync(p, 'utf8');
    const m = html.match(/<main[^>]*data-pagefind-body[^>]*>([\s\S]*?)<\/main>/);
    if (m) add(m[1].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' '));
  }
};
walk(dist);
records.forEach((r) => add(`${r.title} ${r.content}`));
const vocab = [...words.entries()].filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1]).map(([w]) => w);
writeFileSync(join(dist, 'pagefind', 'vocab.json'), JSON.stringify(vocab));
rmSync(recordsFile);
console.log(`Pagefind: indexed ${dir.page_count} pages and ${records.length} custom records; vocabulary ${vocab.length} words.`);
