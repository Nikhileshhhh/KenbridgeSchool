// Album page (GalleryAlbum, GalleryLightbox ×4). Masonry spans are refined to the real column width,
// and the lightbox opens on a native <dialog>: "7 / 18" counter, caption, ← → and Esc, swipe, buttons
// that dim at the ends, neighbour preload, loading and failed + Try again states, focus back to the
// thumbnail on close. Photos without an imported file show their designed placeholder.
// Deep link: #photo-7 opens photo 7. (On the dev server, ?lbstate=loading|failed previews those states.)
const root = document.querySelector('[data-album]');
const dialog = document.querySelector('[data-lightbox]');

/* ---- masonry: spans from each photo's ratio at the current column width ---- */
const grid = root?.querySelector('[data-masonry]');
if (grid) {
  const fit = () => {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const colW = (grid.clientWidth - gap * (cols - 1)) / cols;
    grid.querySelectorAll('li').forEach((li) => {
      const h = Math.round(colW / Number(li.dataset.ratio));
      li.style.gridRowEnd = `span ${Math.ceil((h + gap) / 4)}`;
    });
  };
  fit();
  new ResizeObserver(fit).observe(grid);
}

if (root && dialog && typeof dialog.showModal === 'function') {
  const thumbs = [...root.querySelectorAll('[data-lb-open]')];
  const total = thumbs.length;
  const $ = (s) => dialog.querySelector(s);
  const $$ = (s) => [...dialog.querySelectorAll(s)];
  const img = $('[data-lb-img]');
  const loading = $('[data-lb-loading]');
  const failed = $('[data-lb-failed]');
  const live = $('[data-lb-live]');
  const isDesk = () => matchMedia('(min-width: 1024px)').matches;
  const forced = root.dataset.dev ? new URLSearchParams(location.search).get('lbstate') : null;
  let index = -1;

  function setState(state) {
    img.hidden = state !== 'loaded';
    loading.hidden = state !== 'loading';
    failed.hidden = state !== 'failed';
  }

  // The full-size photo (data-src on the thumbnail): "Loading" until it arrives, "failed" + Try again
  // if it cannot. The stage keeps its role="img" and aria-label (the photo's alt), so the <img> is alt="".
  const label = $('[data-lb-label]');
  function load(i, retry = false) {
    let pic = img.querySelector('img');
    // Not draggable: a native image drag would swallow the swipe between photos.
    if (!pic) { pic = document.createElement('img'); pic.alt = ''; pic.decoding = 'async'; pic.draggable = false; img.prepend(pic); }
    img.classList.add('has-photo');
    label.hidden = true;
    const src = thumbs[i].dataset.src;
    const ready = () => { if (index === i) setState('loaded'); };
    pic.onload = ready;
    pic.onerror = () => { if (index === i) setState('failed'); };
    if (retry || pic.getAttribute('src') !== src) {
      setState('loading');
      if (retry) pic.removeAttribute('src');
      pic.src = src;
    }
    if (pic.complete && pic.naturalWidth) ready();
  }
  function setLabelOnly() {
    img.querySelector('img')?.remove();
    img.classList.remove('has-photo');
    label.hidden = false;
  }

  function show(i) {
    if (i < 0 || i >= total) return;
    index = i;
    const t = thumbs[i].dataset;
    const ratio = Number(thumbs[i].closest('li').dataset.ratio);
    const fitW = isDesk() ? 1152 : 350;
    dialog.style.setProperty('--ratio', String(ratio));
    dialog.style.setProperty('--fit', `${Math.round(fitW / ratio)}px`);
    $$('[data-lb-n]').forEach((n) => (n.textContent = String(i + 1)));
    $('[data-lb-caption]').textContent = t.caption;
    $('[data-lb-label]').textContent = `[Photo ${String(i + 1).padStart(2, '0')} · ${t.file} · fitted to the screen]`;
    img.setAttribute('aria-label', t.alt);
    $$('[data-lb-prev]').forEach((b) => b.setAttribute('aria-disabled', String(i === 0)));
    $$('[data-lb-next]').forEach((b) => b.setAttribute('aria-disabled', String(i === total - 1)));
    live.textContent = `Photo ${i + 1} of ${total}`;
    if (forced === 'loading' || forced === 'failed') setState(forced);
    else if (t.src) load(i);
    else { setLabelOnly(); setState('loaded'); }
    img.classList.remove('is-in');
    void img.offsetWidth;
    img.classList.add('is-in');
    // Preload the neighbours once real photos are imported (data-src on the thumbnail).
    [i - 1, i + 1].forEach((k) => { const src = thumbs[k]?.dataset.src; if (src) new Image().src = src; });
  }

  function open(i) {
    show(i);
    dialog.showModal();
    $('[data-lb-close]').focus();
  }
  const step = (d) => { if (index + d >= 0 && index + d < total) show(index + d); };

  thumbs.forEach((b, i) => b.addEventListener('click', () => open(i)));
  $$('[data-lb-prev]').forEach((b) => b.addEventListener('click', () => step(-1)));
  $$('[data-lb-next]').forEach((b) => b.addEventListener('click', () => step(1)));
  $('[data-lb-close]').addEventListener('click', () => dialog.close());
  $('[data-lb-retry]').addEventListener('click', () => {
    if (thumbs[index]?.dataset.src) load(index, true);
    else { setState('loading'); setTimeout(() => setState('loaded'), 900); }
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  dialog.addEventListener('close', () => {
    thumbs[index]?.focus();
    if (location.hash.startsWith('#photo-')) history.replaceState(null, '', location.pathname + location.search);
  });

  // Swipe (horizontal only; vertical movement still scrolls).
  let sx = null, sy = null;
  const stage = $('[data-lb-stage]');
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });

  const m = location.hash.match(/^#photo-(\d+)$/);
  if (m) open(Number(m[1]) - 1);
}
