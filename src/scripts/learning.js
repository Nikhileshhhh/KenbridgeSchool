// /learning stage index (LearningDesktop). Without JS the index is a list of anchors to stacked panels.
// With JS it becomes a vertical tablist: ↑ ↓ (and ← →) move and select, Home / End jump, Enter / Space
// select; the count ("02 / 04") is announced politely. The hero path's stage names pick a stage too.
const root = document.querySelector('[data-stage-tabs]');
if (root) {
  const index = root.querySelector('[data-stage-index]');
  const tabs = [...root.querySelectorAll('[data-stage-tab]')];
  const panels = [...root.querySelectorAll('[data-stage-panel]')];
  const count = document.querySelector('[data-stage-count]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;

  index.setAttribute('role', 'tablist');
  index.setAttribute('aria-orientation', 'vertical');
  tabs.forEach((t, i) => {
    t.removeAttribute('href');
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('tabindex', '0');
    panels[i].setAttribute('aria-labelledby', t.id);
  });

  function select(i, { focus = false, animate = true } = {}) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => {
      const on = k === current;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    const tab = tabs[current];
    if (count) {
      count.textContent = tab.querySelector('.lh-tab-num').textContent;
      count.style.color = getComputedStyle(tab).getPropertyValue('--tx');
    }
    const body = panels[current].querySelector('[data-stage-body]');
    if (animate && body && !reduce.matches) {
      body.classList.remove('panel-in');
      void body.offsetWidth; // restart the 320ms panel fade
      body.classList.add('panel-in');
    }
    if (focus) tab.focus();
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); select(current + 1, { focus: true }); }
      else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); select(current - 1, { focus: true }); }
      else if (k === 'Home') { e.preventDefault(); select(0, { focus: true }); }
      else if (k === 'End') { e.preventDefault(); select(tabs.length - 1, { focus: true }); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); select(i); }
    });
  });

  const fromHash = () => panels.findIndex((p) => '#' + p.id === location.hash);

  // Hero path: a stage name picks that stage and brings the index into view.
  document.querySelectorAll('[data-stage-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      select(Number(a.dataset.stageLink));
      // Focus first: focusing after a smooth scroll starts would cancel the scroll.
      tabs[current].focus({ preventScroll: true });
      document.getElementById('stages').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });
  addEventListener('hashchange', () => { const i = fromHash(); if (i >= 0) select(i); });

  select(Math.max(0, fromHash()), { animate: false });
}
