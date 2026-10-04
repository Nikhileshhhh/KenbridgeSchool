// Virtual tour (HomeDesktop, CampusDesktop): without JS the tour controls are links to YouTube (new tab).
// With JS they open the native <dialog>: focus goes to Close, Esc and the backdrop close it, focus returns.
const dialog = document.querySelector('[data-tour-dialog]');
if (dialog && typeof dialog.showModal === 'function') {
  let opener = null;
  document.querySelectorAll('[data-tour-open]').forEach((a) => {
    a.setAttribute('role', 'button');
    a.setAttribute('aria-haspopup', 'dialog');
    a.removeAttribute('target');
    a.querySelector('[data-tour-note]')?.remove();
    a.addEventListener('click', (e) => {
      e.preventDefault();
      opener = a;
      dialog.showModal();
    });
    a.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); a.click(); } });
  });
  const close = () => dialog.close();
  dialog.querySelector('[data-tour-close]')?.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  dialog.addEventListener('close', () => { opener?.focus(); });
}
