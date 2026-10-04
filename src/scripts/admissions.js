// /admissions enhancements (AdmissionsDesktop). Without JS every step and answer is open and the
// toggles are hidden. With JS: step 1 and the first answer start open; "Expand all steps" toggles
// every step; the At-a-glance links open the step they point to; "Print checklist" prints only the
// documents checklist.
function disclosure(button, panel, open) {
  button.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
}

/* ---- procedure steps ---- */
const stepsRoot = document.querySelector('[data-steps]');
if (stepsRoot) {
  const toggles = [...stepsRoot.querySelectorAll('[data-step-toggle]')];
  const panelOf = (b) => document.getElementById(b.getAttribute('aria-controls'));
  const all = stepsRoot.querySelector('[data-steps-all]');
  const sync = () => {
    toggles.forEach((b) => { b.querySelector('[data-step-label]').textContent = b.getAttribute('aria-expanded') === 'true' ? 'Hide details' : 'Show details'; });
    if (all) all.textContent = toggles.every((b) => b.getAttribute('aria-expanded') === 'true') ? 'Collapse all steps' : 'Expand all steps';
  };
  toggles.forEach((b, i) => {
    disclosure(b, panelOf(b), i === 0);
    b.addEventListener('click', () => { disclosure(b, panelOf(b), b.getAttribute('aria-expanded') !== 'true'); sync(); });
  });
  all?.addEventListener('click', () => {
    const open = !toggles.every((b) => b.getAttribute('aria-expanded') === 'true');
    toggles.forEach((b) => disclosure(b, panelOf(b), open));
    sync();
  });
  document.querySelectorAll('[data-step-reveal]').forEach((a) => {
    a.addEventListener('click', () => {
      const b = toggles.find((t) => t.getAttribute('aria-controls') === `stepPanel${a.dataset.stepReveal}`);
      if (b) { disclosure(b, panelOf(b), true); sync(); }
    });
  });
  // A direct link to #step-03 opens that step.
  const fromHash = () => {
    const m = location.hash.match(/^#step-(\d\d)$/);
    const b = m && toggles.find((t) => t.getAttribute('aria-controls') === `stepPanel${m[1]}`);
    if (b) { disclosure(b, panelOf(b), true); sync(); }
  };
  addEventListener('hashchange', fromHash);
  fromHash();
  sync();
}

/* ---- FAQ ---- */
document.querySelectorAll('[data-faq]').forEach((root) => {
  root.querySelectorAll('[data-faq-toggle]').forEach((b, i) => {
    const panel = document.getElementById(b.getAttribute('aria-controls'));
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', b.id);
    disclosure(b, panel, i === 0);
    b.addEventListener('click', () => disclosure(b, panel, b.getAttribute('aria-expanded') !== 'true'));
  });
});

/* ---- print only the checklist ---- */
document.querySelectorAll('[data-print-docs]').forEach((b) => {
  b.addEventListener('click', () => {
    document.documentElement.classList.add('printing-docs');
    addEventListener('afterprint', () => document.documentElement.classList.remove('printing-docs'), { once: true });
    window.print();
  });
});
