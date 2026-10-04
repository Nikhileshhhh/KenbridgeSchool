// Global shell behaviour (ShellHeader › Behaviour, MobileShell 01–06).
// Everything here enhances markup that already works without JavaScript.

const desktop = window.matchMedia('(min-width: 1280px)');
const header = document.querySelector('[data-site-header]');
const dim = document.querySelector('[data-page-dim]');

/* ---------------- header: transparent over the hero → solid ---------------- */
let scrolledPastHero = false;
let forcedSolid = false;
function paintHeader() {
  if (!header) return;
  header.classList.toggle('is-solid', header.dataset.variant !== 'hero' || scrolledPastHero || forcedSolid);
}
if (header && header.dataset.variant === 'hero') {
  // A sentinel 24px below the top of the hero; once it scrolls under the header, go solid.
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;left:0;width:1px;height:1px;pointer-events:none;';
  const place = () => { sentinel.style.top = `${header.offsetTop + 24}px`; };
  document.body.prepend(sentinel);
  place();
  window.addEventListener('resize', place, { passive: true });
  new IntersectionObserver(([entry]) => {
    scrolledPastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    paintHeader();
  }).observe(sentinel);
}
paintHeader();

/* ---------------- mega menus and search (one open at a time) ---------------- */
const megaTriggers = [...document.querySelectorAll('[data-mega-trigger]')];
const searchTrigger = document.querySelector('[data-search-trigger]');
const deskSearch = document.getElementById('site-search');
const mobSearch = document.getElementById('mobile-search');
let open = null; // { trigger, panel, kind: 'mega' | 'search' }

function setDim(on) { if (dim) dim.hidden = !on; }

function closeOpen({ focusTrigger = false } = {}) {
  if (!open) return;
  const { trigger, panel } = open;
  trigger.setAttribute('aria-expanded', 'false');
  panel.hidden = true;
  open = null;
  forcedSolid = false;
  setDim(false);
  paintHeader();
  if (focusTrigger) trigger.focus();
}

function openPanel(trigger, panel, kind) {
  closeOpen();
  closeMenu();
  trigger.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
  open = { trigger, panel, kind };
  const isMobileSearch = panel === mobSearch;
  // Over the hero, opening a menu switches the header to solid first; the page dims.
  forcedSolid = !isMobileSearch;
  paintHeader();
  setDim(!isMobileSearch);
  if (kind === 'search') panel.querySelector('input[type="search"]')?.focus();
}

megaTriggers.forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.addEventListener('click', () => {
    if (open && open.trigger === btn) closeOpen();
    else openPanel(btn, panel, 'mega');
  });
});

function currentSearchPanel() { return desktop.matches ? deskSearch : mobSearch; }
if (searchTrigger) {
  const sync = () => searchTrigger.setAttribute('aria-controls', currentSearchPanel()?.id ?? 'site-search');
  sync();
  desktop.addEventListener('change', () => { closeOpen(); sync(); });
  searchTrigger.addEventListener('click', () => {
    const panel = currentSearchPanel();
    if (!panel) return;
    if (open && open.trigger === searchTrigger) closeOpen();
    else openPanel(searchTrigger, panel, 'search');
  });
}
document.querySelector('[data-msearch-cancel]')?.addEventListener('click', () => closeOpen({ focusTrigger: true }));

dim?.addEventListener('click', () => closeOpen());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && open) { e.preventDefault(); closeOpen({ focusTrigger: true }); }
});
// Tab moving focus out of the trigger and its panel closes it.
header?.addEventListener('focusout', (e) => {
  if (!open) return;
  const next = e.relatedTarget;
  if (!next) return; // clicks on the dimmed page are handled by the dim layer
  if (!open.panel.contains(next) && next !== open.trigger) closeOpen();
});

/* ---------------- mobile menu sheet ---------------- */
const sheet = document.querySelector('[data-mobile-menu]');
const menuTrigger = document.querySelector('[data-menu-trigger]');
let menuOpen = false;
let pushed = false;

if (sheet) {
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');

  // Sections: several can be open; the current page's section opens by itself.
  const current = sheet.dataset.current;
  sheet.querySelectorAll('[data-mm-section]').forEach((sec) => {
    const btn = sec.querySelector('[data-mm-toggle]');
    const panel = sec.querySelector('[data-mm-panel]');
    const isOpen = sec.dataset.mmSection === current;
    btn.setAttribute('aria-expanded', String(isOpen));
    panel.hidden = !isOpen;
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(next));
      panel.hidden = !next;
    });
  });
}

function pageSiblings() {
  return [...document.body.children].filter((el) => el !== sheet && el.tagName !== 'SCRIPT');
}

function openMenu() {
  if (!sheet || menuOpen) return;
  closeOpen();
  menuOpen = true;
  sheet.classList.add('is-open');
  menuTrigger?.setAttribute('aria-expanded', 'true');
  pageSiblings().forEach((el) => el.setAttribute('inert', ''));
  document.documentElement.style.overflow = 'hidden';
  sheet.querySelector('[data-menu-close]')?.focus();
  try { history.pushState({ kbMenu: true }, ''); pushed = true; } catch { pushed = false; }
}

function finishClose() {
  if (!menuOpen) return;
  menuOpen = false;
  sheet.classList.remove('is-open');
  menuTrigger?.setAttribute('aria-expanded', 'false');
  pageSiblings().forEach((el) => el.removeAttribute('inert'));
  document.documentElement.style.overflow = '';
  menuTrigger?.focus();
}

function closeMenu() {
  if (!menuOpen) return;
  // Leave the history entry we added so the phone's back gesture and Close behave the same.
  if (pushed && history.state && history.state.kbMenu) { pushed = false; history.back(); }
  else finishClose();
}

menuTrigger?.addEventListener('click', openMenu);
sheet?.querySelector('[data-menu-close]')?.addEventListener('click', closeMenu);
window.addEventListener('popstate', () => { if (menuOpen) { pushed = false; finishClose(); } });
desktop.addEventListener('change', (e) => { if (e.matches) closeMenu(); });

// Following a link inside the sheet (for example a #section on the same page) closes it.
sheet?.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (a && a.target !== '_blank') finishClose();
});

sheet?.addEventListener('keydown', (e) => {
  if (!menuOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
  if (e.key !== 'Tab') return;
  // Keep Tab inside the sheet: Close → sections → rows → Admissions → Close.
  const focusables = [...sheet.querySelectorAll('a[href], button:not([disabled])')].filter(
    (el) => el.offsetParent !== null && !el.closest('[hidden]')
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
