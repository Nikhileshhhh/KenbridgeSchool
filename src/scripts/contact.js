// Contact page: the Google map loads only when asked for (ContactDesktop "Show interactive map").
// The drawing and its bar are replaced by a labelled region holding the embed; focus moves to it so
// keyboard users are not left on a removed button.
import './forms.js';

document.querySelectorAll('[data-map]').forEach((box) => {
  const button = box.querySelector('[data-map-load]');
  if (!button) return;
  button.addEventListener('click', () => {
    const region = document.createElement('div');
    region.className = 'ct-embed';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Google Map showing KenBridge School');
    region.tabIndex = -1;
    const frame = document.createElement('iframe');
    frame.src = box.dataset.embed;
    frame.title = box.dataset.title;
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    region.append(frame);
    box.replaceChildren(region);
    region.focus();
  });
});
