// Home page enhancements: facilities preview and the virtual-tour dialog.
import './tabs.js';
import './tour.js';

/* ---- "Ten places on campus": hover / focus (desktop) or tap (phones) swaps the preview ---- */
const fac = document.querySelector('[data-fac]');
if (fac) {
  const slides = [...fac.querySelectorAll('[data-fac-slide]')];
  const name = fac.querySelector('[data-fac-name]');
  const num = fac.querySelector('[data-fac-num]');
  const visit = fac.querySelector('[data-fac-visit]');
  const items = [...fac.querySelectorAll('[data-fac-item]')];
  let current = 0;
  function pick(i) {
    if (i === current) return;
    current = i;
    const d = items[i].dataset;
    slides.forEach((s, k) => { s.hidden = k !== i; });
    name.textContent = d.name;
    num.textContent = d.num;
    visit.href = d.href;
    items.forEach((li, k) => {
      const on = k === i;
      const link = li.querySelector('.fac-link');
      const btn = li.querySelector('.fac-btn');
      link.classList.toggle('is-current', on);
      btn.classList.toggle('is-current', on);
      if (on) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
      btn.setAttribute('aria-pressed', String(on));
    });
  }
  items.forEach((li, i) => {
    const link = li.querySelector('.fac-link');
    link.addEventListener('mouseenter', () => pick(i));
    link.addEventListener('focus', () => pick(i));
    li.querySelector('.fac-btn').addEventListener('click', () => pick(i));
  });
}
