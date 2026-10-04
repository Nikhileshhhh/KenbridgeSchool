// Gallery year view enhancements (GalleryDesktop, GalleryMobile): type filter chips with a live count
// (aria-pressed; the grid re-lays out in list order), and the phone year chips scroll with the arrow
// buttons and start centred on the current year. Without JS every album shows and the chips scroll natively.
import { deskLayout, mobileLayout } from '../lib/gallery-layout.js';

const root = document.querySelector('[data-gallery]');
if (root) {
  const items = [...root.querySelectorAll('[data-albums] > li')];
  const chips = [...root.querySelectorAll('[data-filter]')];
  const count = root.querySelector('[data-count]');
  const empty = root.querySelector('[data-filter-empty]');
  const emptyTitle = root.querySelector('[data-filter-empty-title]');
  const year = root.querySelector('#yearTitle')?.textContent.trim();
  const total = Number(count?.dataset.total ?? items.length);
  const more = count?.dataset.more === 'true';

  function apply(cat) {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === cat)));
    const shown = items.filter((li) => cat === 'All' || li.dataset.cat === cat);
    items.forEach((li) => (li.hidden = !shown.includes(li)));
    const d = deskLayout(shown.length);
    const m = mobileLayout(shown.length);
    shown.forEach((li, i) => {
      li.style.setProperty('--dc', d[i].cols);
      li.style.setProperty('--dr', d[i].rows);
      li.style.setProperty('--mc', m[i].cols);
      li.style.setProperty('--mr', m[i].ratio);
      li.style.setProperty('--ds', `${i === 0 && d[i].cols >= 2 ? 40 : 26}px`);
      li.style.setProperty('--ms', `${i === 0 ? 30 : m[i].cols === 2 ? 24 : 21}px`);
      // "Featured" only on the lead album when it opens the grid.
      li.querySelector('.gl-featured')?.toggleAttribute('hidden', !(i === 0 && li.dataset.lead));
    });
    if (count) {
      count.textContent = shown.length
        ? `${shown.length}${cat === 'All' ? '' : ` of ${total}`} album${shown.length === 1 ? '' : 's'}${more && cat === 'All' ? ' shown' : ''}`
        : `No ${cat} albums in ${year}`;
    }
    if (empty) {
      empty.hidden = shown.length > 0;
      if (emptyTitle) emptyTitle.textContent = `No ${cat} albums in ${year}`;
    }
  }
  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filter)));
  root.querySelector('[data-filter-clear]')?.addEventListener('click', () => { apply('All'); chips[0]?.focus(); });
}

/* ---- phone year chips ---- */
const rail = document.querySelector('[data-years-rail]');
if (rail) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-years-scroll]').forEach((b) => {
    b.addEventListener('click', () => rail.scrollBy({ left: Number(b.dataset.yearsScroll) * 240, behavior: reduce ? 'auto' : 'smooth' }));
  });
  const cur = rail.querySelector('[aria-current="page"]');
  if (cur) rail.scrollLeft = cur.offsetLeft - (rail.clientWidth - cur.offsetWidth) / 2;
}
