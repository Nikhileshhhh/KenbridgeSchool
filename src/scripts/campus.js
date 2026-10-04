// /campus enhancements: scene tabs, the facility atlas preview (desktop) and the virtual-tour dialog.
// Atlas (CampusDesktop): pointing at, tapping or tabbing to a facility shows it in the sticky preview;
// a scene's facility links pick that facility too. Without JS the atlas is a plain list of links.
import './tabs.js';
import './tour.js';

// Scene change: the new photo and text fade in (280ms), as on the board; instant under reduced motion.
document.querySelectorAll('.cp-scn [data-tabs]').forEach((root) => {
  root.addEventListener('tabchange', (e) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.querySelectorAll('[role="tabpanel"]')[e.detail.index]?.querySelectorAll('.swap').forEach((el) => {
      el.classList.remove('swap-in');
      void el.offsetWidth;
      el.classList.add('swap-in');
    });
  });
});

const atlas = document.querySelector('[data-atlas]');
if (atlas) {
  const rows = [...atlas.querySelectorAll('[data-atlas-row]')];
  const photo = atlas.querySelector('[data-atlas-photo]');
  const label = atlas.querySelector('[data-atlas-label]');
  const bignum = atlas.querySelector('[data-atlas-bignum]');
  const num = atlas.querySelector('[data-atlas-num]');
  const name = atlas.querySelector('[data-atlas-name]');
  const explore = atlas.querySelector('[data-atlas-explore]');
  const vh = atlas.querySelector('[data-atlas-vh]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;

  function pick(i) {
    if (i < 0 || i === current) return;
    current = i;
    const d = rows[i].dataset;
    label.textContent = d.label;
    photo.setAttribute('aria-label', `Placeholder for a photograph: ${d.label.slice(1, -1)}`);
    bignum.textContent = d.num;
    num.textContent = d.num;
    name.textContent = d.name;
    explore.href = d.href;
    vh.textContent = ` ${d.name}`;
    rows.forEach((r, k) => {
      r.classList.toggle('is-on', k === i);
      r.querySelector('[data-atlas-pick]')?.setAttribute('aria-pressed', String(k === i));
    });
    if (!reduce.matches) {
      photo.classList.remove('swap-in');
      void photo.offsetWidth; // restart the 280ms fade
      photo.classList.add('swap-in');
    }
  }

  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => pick(i));
    r.querySelector('[data-atlas-pick]')?.addEventListener('click', () => pick(i));
    r.querySelectorAll('button, a').forEach((el) => el.addEventListener('focus', () => pick(i)));
  });
  document.querySelectorAll('[data-atlas-goto]').forEach((a) => {
    a.addEventListener('click', () => pick(rows.findIndex((r) => r.dataset.slug === a.dataset.atlasGoto)));
  });
  const fromHash = () => rows.findIndex((r) => '#' + r.id === location.hash);
  addEventListener('hashchange', () => pick(fromHash()));
  pick(fromHash());
}
