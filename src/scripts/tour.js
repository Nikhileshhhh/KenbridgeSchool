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
  // "Play the tour": the video plays here, in YouTube's privacy-enhanced player, loaded only now.
  const frame = dialog.querySelector('[data-tour-frame]');
  const play = dialog.querySelector('[data-tour-play]');
  if (frame && play?.dataset.video) {
    play.removeAttribute('target');
    play.querySelector('[data-tour-note]')?.remove();
    play.addEventListener('click', (e) => {
      e.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${play.dataset.video}?autoplay=1&rel=0&cc_load_policy=1`;
      iframe.title = 'Virtual tour of the KenBridge campus (YouTube video)';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      play.hidden = true;
      frame.append(iframe);
      iframe.focus();
    });
  }
  const close = () => dialog.close();
  dialog.querySelector('[data-tour-close]')?.addEventListener('click', close);
  // Closing stops the video: the player is removed and the Play button comes back.
  dialog.addEventListener('close', () => { frame?.querySelector('iframe')?.remove(); if (play) play.hidden = false; });
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  dialog.addEventListener('close', () => { opener?.focus(); });
}
