// Site search (SearchPage board). Runs the query against the Pagefind index written after the build
// (scripts/pagefind.mjs) and renders the board's states into [data-search-out]:
// empty → suggestions · loading → aria-busy skeletons (only if the search takes a moment) ·
// results → tag, trail, title, excerpt with bold + underlined matches · no results → "Did you mean"
// from the build-time vocabulary · error → "Try again". The query is kept in ?q= and the result
// count is announced politely. On localhost, ?state=loading|error shows those states for review.
const out = document.querySelector('[data-search-out]');
const form = document.querySelector('[data-search-form]');
const input = document.querySelector('[data-search-input]');
const live = document.querySelector('[data-search-live]');
const emptyState = out?.firstElementChild?.cloneNode(true);
const PAGE = 20;

let pagefind;
let vocab;
let run = 0;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Pagefind escapes page text and adds <mark>; keep only those tags.
const marksOnly = (html) => html.replace(/<(?!\/?mark>)[^>]*>/g, '');
const cleanUrl = (u) => u.replace(/\/index\.html(?=$|#)/, '/').replace(/\.html(?=$|#)/, '');
const extIcon = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3H13V11M13 3L3.5 12.5"/></svg>';
const errIcon = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="currentColor"/><path d="M10 5.5V11M10 14V14.1" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>';
const devState = ['localhost', '127.0.0.1'].includes(location.hostname) ? new URLSearchParams(location.search).get('state') : null;

async function load() {
  if (!pagefind) {
    const url = '/pagefind/pagefind.js';
    pagefind = await import(/* @vite-ignore */ url);
    await pagefind.options({ excerptLength: 26 });
  }
  return pagefind;
}

function setQuery(q) {
  const u = new URL(location.href);
  if (q) u.searchParams.set('q', q); else u.searchParams.delete('q');
  history.replaceState(null, '', u);
}

function show(html, busy = false) {
  out.innerHTML = html;
  out.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function showEmpty() {
  out.replaceChildren(emptyState.cloneNode(true));
  out.setAttribute('aria-busy', 'false');
  live.textContent = '';
}

function showLoading(q) {
  const skel = (w1, w2, w3) => `<div class="sr-skel" aria-hidden="true"><span></span><span style="width:${w1}"></span><span style="width:${w2}"></span><span style="width:${w3}"></span></div>`;
  show(`<section class="sr-loading" aria-busy="true" aria-label="Searching"><p class="sr-loading-p">Searching for “${esc(q)}”…</p>${skel('45%', '92%', '70%')}${skel('35%', '88%', '60%')}${skel('28%', '80%', '50%')}</section>`, true);
  live.textContent = 'Searching';
}

function showError(q) {
  show(`<section class="sr-panel sr-error" role="alert"><h2 class="sr-error-h">${errIcon}Search isn’t working right now</h2><p>Your search for “${esc(q)}” could not be completed. Try again in a moment, or browse <a class="sr-link" href="/information">School Information</a> instead.</p><button type="button" class="sr-sec" data-retry>Try again</button></section>`);
  out.querySelector('[data-retry]').addEventListener('click', () => search(q));
  live.textContent = 'Search failed';
}

function levenshtein(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return m[a.length][b.length];
}

async function didYouMean(q) {
  const t = q.toLowerCase().trim();
  if (t.length < 4 || t.includes(' ')) return '';
  try {
    vocab ??= await fetch('/pagefind/vocab.json').then((r) => r.json());
  } catch { return ''; }
  if (vocab.includes(t)) return '';
  let best = '';
  let bd = 3;
  for (const w of vocab) {
    if (Math.abs(w.length - t.length) >= bd || w === t) continue;
    const d = levenshtein(t, w);
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

async function showNone(q) {
  const dym = await didYouMean(q);
  show(`<section class="sr-panel" role="status" aria-labelledby="srNone"><h2 id="srNone" class="sr-panel-h">No results for “${esc(q)}”</h2>${dym ? `<p class="sr-dym">Did you mean <a class="sr-link" href="/search?q=${encodeURIComponent(dym)}" data-dym>${esc(dym)}</a>?</p>` : ''}<ul><li>Check the spelling, or try a shorter word.</li><li>Try a broader term, such as “admissions” or “timings”.</li></ul><p>Or go to <a class="sr-link" href="/information">School Information</a> or <a class="sr-link" href="/contact">Contact</a>.</p></section>`);
  out.querySelector('[data-dym]')?.addEventListener('click', (e) => { e.preventDefault(); input.value = dym; search(dym); });
  live.textContent = `No results for ${q}`;
}

function resultHtml(r, words) {
  const type = r.meta.type ?? 'Page';
  let url = cleanUrl(r.url);
  let trail = r.meta.trail ?? r.meta.title;
  let excerpt = r.excerpt;
  // When the page's own title matches, the page is the result. Otherwise a match inside a section
  // with its own anchor (a rule, a decorum point) links straight to that section.
  const titleWords = (r.meta.title ?? '').toLowerCase().split(/[^a-z0-9]+/);
  const titleHit = words.some((w) => titleWords.some((t) => t.startsWith(w)));
  const sub = [...(r.sub_results ?? [])].filter((s) => s.url.includes('#')).sort((a, b) => (b.locations?.length ?? 0) - (a.locations?.length ?? 0))[0];
  if (type === 'Page' && !titleHit && sub && sub.title && sub.title !== r.meta.title) {
    url = cleanUrl(sub.url);
    trail = `${trail} › ${sub.title}`;
    excerpt = sub.excerpt;
  }
  const newTab = type === 'External' || type === 'PDF';
  const note = type === 'External' ? ' (external site, opens in a new tab)' : type === 'PDF' ? ' (PDF, opens in a new tab)' : '';
  const title = r.meta.title ?? url;
  const cut = title.lastIndexOf(' ') + 1;
  return `<li class="sr-res"><p class="sr-meta"><span class="sr-tag sr-tag--${esc(type.toLowerCase())}">${esc(type)}</span><span>${esc(trail)}</span></p>`
    + `<a class="sr-title" href="${esc(url)}"${newTab ? ' target="_blank" rel="noopener"' : ''}><span class="sr-title-t">${esc(title.slice(0, cut))}<span style="white-space:nowrap">${esc(title.slice(cut))}${type === 'External' ? extIcon : ''}</span></span><span class="vh">${note}</span></a>`
    + `<p class="sr-ex">${marksOnly(excerpt)}</p></li>`;
}

async function showResults(q, results, token) {
  const total = results.length;
  const label = `${total} result${total === 1 ? '' : 's'} for “${esc(q)}”`;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const html = (rs) => rs.map((r) => resultHtml(r, words)).join('');
  const [first, dym] = await Promise.all([Promise.all(results.slice(0, PAGE).map((r) => r.data())), didYouMean(q)]);
  if (token !== run) return;
  // Pagefind matches loosely, so a misspelling can still find pages; offer the likely word as well.
  const dymHtml = dym ? `<p class="sr-dym sr-dym--above">Did you mean <a class="sr-link" href="/search?q=${encodeURIComponent(dym)}" data-dym>${esc(dym)}</a>?</p>` : '';
  show(`<section aria-labelledby="srCount">${dymHtml}<h2 id="srCount" class="sr-count">${label}</h2><ol class="sr-list" role="list">${html(first)}</ol>${total > PAGE ? '<button type="button" class="sr-sec sr-more" data-more>Show more results</button>' : ''}</section>`);
  live.textContent = `${total} result${total === 1 ? '' : 's'} for ${q}`;
  let shown = PAGE;
  out.querySelector('[data-dym]')?.addEventListener('click', (e) => { e.preventDefault(); input.value = dym; search(dym); });
  out.querySelector('[data-more]')?.addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const next = await Promise.all(results.slice(shown, shown + PAGE).map((r) => r.data()));
    const list = out.querySelector('.sr-list');
    const before = list.children.length;
    list.insertAdjacentHTML('beforeend', html(next));
    shown += next.length;
    list.children[before]?.querySelector('a')?.focus();
    if (shown >= total) button.remove();
  });
}

async function search(raw) {
  const q = raw.trim();
  const token = ++run;
  setQuery(q);
  if (!q) { showEmpty(); return; }
  if (devState === 'loading') { showLoading(q); return; }
  if (devState === 'error') { showError(q); return; }
  const slow = setTimeout(() => { if (token === run) showLoading(q); }, 150);
  try {
    const pf = await load();
    const res = await pf.search(q);
    if (token !== run) return;
    clearTimeout(slow);
    if (!res.results.length) await showNone(q);
    else await showResults(q, res.results, token);
  } catch {
    clearTimeout(slow);
    if (token === run) showError(q);
  }
}

if (out && form && input) {
  form.addEventListener('submit', (e) => { e.preventDefault(); search(input.value); });
  out.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-suggest]');
    if (!chip) return;
    e.preventDefault();
    input.value = chip.dataset.suggest;
    search(chip.dataset.suggest);
  });
  const q = new URLSearchParams(location.search).get('q') ?? '';
  input.value = q;
  if (q.trim()) search(q);
}
