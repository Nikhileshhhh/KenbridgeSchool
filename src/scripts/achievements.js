// /achievements enhancements: Toppers archive year tabs (shared tabs.js) and the result-banner dialog
// (AchievementsDesktop lightbox): focus goes to Close, Esc or the backdrop closes it, focus returns.
import './tabs.js';

const dialog = document.querySelector('[data-banner-dialog]');
if (dialog && typeof dialog.showModal === 'function') {
  let opener = null;
  const set = (sel, text) => dialog.querySelectorAll(sel).forEach((n) => (n.textContent = text));
  document.querySelectorAll('[data-banner-open]').forEach((b) => {
    b.addEventListener('click', () => {
      opener = b;
      set('[data-banner-year]', b.dataset.year);
      dialog.querySelectorAll('[data-banner-img]').forEach((el) => { el.hidden = el.dataset.bannerImg !== b.dataset.year; });
      dialog.showModal();
    });
  });
  dialog.querySelector('[data-banner-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());
}
