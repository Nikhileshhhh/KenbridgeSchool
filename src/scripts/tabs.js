// Tabs (Patterns board): role tablist / tab / tabpanel, ← → (and ↑ ↓) move and select,
// Home / End jump. Without JS the tab row is hidden (.js-only) and every panel shows.
document.querySelectorAll('[data-tabs]').forEach((root) => {
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  if (!tabs.length) return;
  let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));

  function select(i, focus) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => {
      const on = k === current;
      t.setAttribute('aria-selected', String(on));
      if (on) t.removeAttribute('tabindex'); else t.setAttribute('tabindex', '-1');
      if (panels[k]) panels[k].hidden = !on;
    });
    if (focus) tabs[current].focus();
    root.dispatchEvent(new CustomEvent('tabchange', { detail: { index: current } }));
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(current + 1, true); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(current - 1, true); }
      else if (k === 'Home') { e.preventDefault(); select(0, true); }
      else if (k === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
    });
  });
  select(current, false);
});
