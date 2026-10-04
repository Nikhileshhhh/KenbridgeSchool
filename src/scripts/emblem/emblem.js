// Emblem island (Emblem, EmblemHero, EmblemMobile, EmblemSpec boards).
// 1. "What our logo means": chips preview on hover/focus, pin on press; a polite live region
//    announces "02 of 05, Book". Works on the static artwork everywhere and on the 3D emblem on Home.
// 2. 3D: only where data-live is set (Home). Loaded by dynamic import once the hero has painted,
//    and only with motion allowed, WebGL available and Save-Data off. The static artwork stays
//    until the first good frame, so nothing jumps; any failure keeps the static artwork.
// 3. Travel: the hero emblem follows the scroll into the header logo slot (no scroll-jacking).
const PARTS = {
  head: ['01', 'Head of Student'], book: ['02', 'Book'], nib: ['03', 'Pen Tip'],
  flame: ['04', 'Flame of Knowledge'], rays: ['05', 'Rays of Education']
};
const HIT_ORDER = ['rays', 'flame', 'nib', 'head', 'book'];
const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

// WebGL on a real GPU only: failIfMajorPerformanceCaveat refuses software rendering (SwiftShader,
// no GPU, blocklisted drivers), where the 3D scene would block the main thread for seconds. Those
// devices keep the static official artwork, as with reduced motion.
function webglOK() {
  // QA only: the check scripts set this so the 3D path is still tested in headless (software) Chromium.
  if (window.__kbEmblemForce3D) return true;
  try {
    const c = document.createElement('canvas');
    const o = { failIfMajorPerformanceCaveat: true };
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2', o) || c.getContext('webgl', o));
    if (!gl) return false;
    // Some browsers still hand out a software context; recognise the common software renderers.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch { return false; }
}
const saveData = () => !!(navigator.connection && navigator.connection.saveData);

let enginePromise = null;
function loadEngine() {
  enginePromise ??= Promise.all([
    import('./engine.js'),
    import('../../assets/emblem/emblem-geometry.json'),
    import('../../assets/brand/logo-official-transparent.png?url')
  ]).then(([eng, geo, logo]) => ({ createEmblem: eng.createEmblem, geo: geo.default ?? geo, logoUrl: logo.default }));
  return enginePromise;
}

function setupEmblem(root) {
  const stage = root.querySelector('[data-emblem-stage]');
  const staticLayer = root.querySelector('[data-emblem-static]');
  const details = root.querySelector('[data-emblem-meaning]');
  const announce = root.querySelector('[data-emblem-announce]');
  const chips = [...root.querySelectorAll('[data-chip]')];
  const cards = [...root.querySelectorAll('[data-card]')];
  const layers = [...root.querySelectorAll('[data-part]')];
  let hover = null, pinned = null, ctl = null, canvas = null;

  const isOpen = () => !details || details.open;
  function apply() {
    const hl = isOpen() ? hover || pinned : null;
    staticLayer?.classList.toggle('is-parts', !!hl);
    layers.forEach((l) => {
      l.classList.toggle('is-dim', !!hl && l.dataset.part !== hl);
      l.classList.toggle('is-lift', l.dataset.part === hl);
    });
    cards.forEach((c) => { c.hidden = c.dataset.card !== hl; });
    chips.forEach((c) => {
      c.classList.toggle('is-on', c.dataset.chip === hl);
      c.setAttribute('aria-pressed', String(c.dataset.chip === pinned));
    });
    ctl?.highlight(hl);
    if (announce) announce.textContent = hl ? `${PARTS[hl][0]} of 05, ${PARTS[hl][1]}` : '';
    if (stage) stage.style.cursor = details && isOpen() ? 'pointer' : '';
  }

  chips.forEach((c) => {
    const k = c.dataset.chip;
    c.addEventListener('mouseenter', () => { hover = k; apply(); });
    c.addEventListener('mouseleave', () => { if (hover === k) { hover = null; apply(); } });
    c.addEventListener('focus', () => { hover = k; apply(); });
    c.addEventListener('blur', () => { if (hover === k) { hover = null; apply(); } });
    c.addEventListener('click', () => { pinned = pinned === k ? null : k; apply(); });
  });
  details?.addEventListener('toggle', () => { if (!details.open) { hover = null; pinned = null; } apply(); });

  // Hover and tap on the static artwork: hit-test the part layers by their alpha.
  const hit = {};
  layers.forEach((img) => {
    const read = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, 512, 512);
        hit[img.dataset.part] = x.getImageData(0, 0, 512, 512).data;
      } catch { /* cross-origin or decode failure: chips still work */ }
    };
    if (details) { if (img.complete && img.naturalWidth) read(); else img.addEventListener('load', read, { once: true }); }
  });
  function hitTest(e) {
    const r = stage.getBoundingClientRect();
    const u = (((e.clientX - r.left) / r.width) - 0.09365) / 0.8127 * 512;
    const v = (((e.clientY - r.top) / r.height) - 0.09365) / 0.8127 * 512;
    if (u < 0 || v < 0 || u >= 512 || v >= 512) return null;
    const i = (Math.floor(v) * 512 + Math.floor(u)) * 4 + 3;
    return HIT_ORDER.find((k) => hit[k] && hit[k][i] > 60) ?? null;
  }
  if (details && stage) {
    stage.addEventListener('pointermove', (e) => {
      if (ctl || !isOpen() || e.pointerType === 'touch') return;
      const k = hitTest(e); if (k !== hover) { hover = k; apply(); }
    });
    stage.addEventListener('pointerleave', () => { if (!ctl && hover) { hover = null; apply(); } });
    stage.addEventListener('click', (e) => {
      if (ctl || !isOpen()) return;
      const k = hitTest(e); if (k) { pinned = pinned === k ? null : k; apply(); }
    });
  }

  function teardown3D() {
    ctl?.dispose(); ctl = null;
    canvas?.remove(); canvas = null;
    stage?.classList.remove('has-3d');
  }
  async function start3D() {
    if (ctl || !stage || reduceMQ.matches || saveData() || !webglOK()) return;
    try {
      const { createEmblem, geo, logoUrl } = await loadEngine();
      if (ctl || reduceMQ.matches) return;
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      stage.appendChild(canvas);
      ctl = createEmblem(canvas, geo, logoUrl, {
        onFirstFrame: () => { canvas?.classList.add('is-on'); stage.classList.add('has-3d'); },
        onError: () => teardown3D(),
        onPointerPart: (k) => { if (!isOpen()) return; if (k !== hover) { hover = k; apply(); } },
        onTapPart: (k) => { if (!isOpen() || !k) return; pinned = pinned === k ? null : k; apply(); }
      });
      apply();
    } catch { teardown3D(); }
  }

  apply();
  return { root, stage, details, start3D, teardown3D, get ctl() { return ctl; } };
}

const emblems = [...document.querySelectorAll('[data-emblem]')].map(setupEmblem);
const live = emblems.filter((e) => e.root.dataset.live === 'true');

if (live.length) {
  const go = () => live.forEach((e) => e.start3D());
  // After the hero text has painted: on load, then when the browser is idle.
  const later = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 200));
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  reduceMQ.addEventListener('change', () => { if (reduceMQ.matches) live.forEach((e) => e.teardown3D()); else go(); });
}

/* ---------------- travel: hero emblem → header logo ---------------- */
const traveller = emblems.find((e) => e.root.dataset.travel === 'true');
const headerLogo = document.querySelector('[data-header-logo]');
if (traveller && headerLogo) {
  const stage = traveller.stage;
  const panel = traveller.details;
  const desktop = window.matchMedia('(min-width: 1024px)');
  let base = null; // untransformed stage centre in document coordinates
  let raf = 0;

  const measure = () => {
    stage.style.transform = '';
    const r = stage.getBoundingClientRect();
    base = { cx: r.left + r.width / 2 + window.scrollX, cy: r.top + r.height / 2 + window.scrollY, size: r.width };
  };
  const reset = () => {
    stage.style.transform = ''; stage.style.opacity = ''; stage.style.pointerEvents = '';
    if (panel) { panel.style.opacity = ''; panel.style.visibility = ''; }
    headerLogo.style.opacity = '';
    traveller.ctl?.setPaused(false);
  };
  function update() {
    raf = 0;
    // While "What our logo means" is open the emblem stays put (otherwise scrolling to reach the
    // part buttons would fade them away); travel resumes when the panel is closed.
    if (reduceMQ.matches || !base || (panel && panel.open)) { reset(); return; }
    const travel = desktop.matches ? 520 : 300;
    const p = Math.max(0, Math.min(1, window.scrollY / travel));
    const ex = 1 - Math.pow(1 - p, 2);
    const lr = headerLogo.getBoundingClientRect();
    const cx = base.cx - window.scrollX, cy = base.cy - window.scrollY;
    const dx = (lr.left + lr.width / 2 - cx) * ex;
    const dy = (lr.top + lr.height / 2 - cy) * p;
    const s = 1 - (1 - lr.width / (base.size * 0.8127)) * ex;
    const fade = p < 0.85 ? 0 : (p - 0.85) / 0.15;
    stage.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    stage.style.opacity = String(1 - fade);
    stage.style.pointerEvents = p > 0.05 ? 'none' : '';
    if (panel) {
      const po = Math.max(0, 1 - p / 0.08);
      panel.style.opacity = String(po);
      panel.style.visibility = po < 0.02 ? 'hidden' : '';
    }
    headerLogo.style.opacity = String(fade);
    traveller.ctl?.setPaused(p >= 1);
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const init = () => {
    if (reduceMQ.matches) { reset(); document.documentElement.classList.remove('emblem-travel'); return; }
    document.documentElement.classList.add('emblem-travel');
    measure(); update();
  };
  init();
  window.addEventListener('scroll', onScroll, { passive: true });
  panel?.addEventListener('toggle', () => { measure(); onScroll(); });
  window.addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
  window.addEventListener('load', () => { measure(); onScroll(); }, { once: true });
  reduceMQ.addEventListener('change', init);
}
