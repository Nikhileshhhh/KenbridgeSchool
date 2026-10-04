// Pinned learning journey (Journey + HomeJourneyScroll boards). Progress comes from the page's
// own scroll position (passive listener, one update per frame). Nothing pins the scroll or changes
// its speed; the frame is simply position: sticky. Only transform and opacity animate.
const section = document.querySelector('[data-journey]');
if (section) {
  const track = section.querySelector('[data-jp-track]');
  const chapters = [...section.querySelectorAll('[data-jp-chapter]')];
  const nodes = [...section.querySelectorAll('[data-jp-node]')];
  const clip = section.querySelector('[data-jp-clip]');
  const bar = section.querySelector('[data-jp-bar]');
  const count = section.querySelector('[data-jp-count]');
  const sticky = section.querySelector('.jp-sticky');
  const viewport = section.querySelector('.jp-viewport');
  const GAP = 64;
  let active = -1;
  let raf = 0;

  const isLive = () => getComputedStyle(section).display !== 'none';
  const range = () => {
    // The sticky frame is the section's first child; its offsetTop moves while stuck, so use the section's top.
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - sticky.offsetHeight;
    return { top: top, span: Math.max(1, span) };
  };
  // Card width follows the viewport so the scene works from 1024px up; 920px at 1440 (board).
  function cardWidth() {
    const w = Math.min(920, viewport.clientWidth - 96);
    section.style.setProperty('--jp-card', `${w}px`);
    return w;
  }

  function update() {
    raf = 0;
    if (!isLive()) return;
    const { top, span } = range();
    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
    const p = Math.max(0, Math.min(1, (window.scrollY + stickyTop - top) / span));
    const f = p * 3;
    const card = cardWidth();
    const offset = (viewport.clientWidth - card) / 2;
    track.style.transform = `translateX(${(offset - f * (card + GAP)).toFixed(1)}px)`;
    chapters.forEach((c, i) => { c.style.setProperty('--jp-dim', (1 - Math.max(0.35, 1 - Math.abs(f - i) * 0.65)).toFixed(3)); });
    clip.setAttribute('width', (40 + 1120 * Math.min(1, f / 3)).toFixed(1));
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    const now = Math.round(f);
    if (now !== active) {
      active = now;
      count.textContent = `0${now + 1}`;
      chapters.forEach((c, i) => {
        c.setAttribute('aria-hidden', String(i !== now));
        c.querySelector('a')?.setAttribute('tabindex', i === now ? '0' : '-1');
      });
      nodes.forEach((n, i) => {
        const li = n.closest('.jp-node');
        li.classList.toggle('is-done', i < now);
        li.classList.toggle('is-current', i === now);
        if (i === now) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
      });
    }
  }

  // Jumping to a stage scrolls the page to that point; the scene follows.
  function goTo(i) {
    const { top, span } = range();
    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
    const v = Math.max(0, Math.min(3, i)) / 3;
    window.scrollTo({ top: top - stickyTop + v * span + 1, behavior: 'smooth' });
  }
  nodes.forEach((n, i) => n.addEventListener('click', () => goTo(i)));
  section.querySelector('[data-jp-prev]')?.addEventListener('click', () => goTo(Math.max(0, active) - 1));
  section.querySelector('[data-jp-next]')?.addEventListener('click', () => goTo(Math.max(0, active) + 1));

  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', schedule);
  update();
}
