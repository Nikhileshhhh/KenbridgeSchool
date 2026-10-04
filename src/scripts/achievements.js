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
      set('[data-banner-file]', b.dataset.file);
      set('[data-banner-file-sm]', b.dataset.file);
      dialog.querySelector('[data-banner-img]').setAttribute('aria-label', `Placeholder for the ${b.dataset.year} result banner at full size. The transcription on the page lists the same names and scores.`);
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
