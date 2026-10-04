// KenBridge 3D emblem engine, ported from emblem-build/kenbridge-emblem-engine.js (EmblemSpec board).
// - Front caps are textured with the official logo (unlit, exact colours). Geometry is cut from the
//   artwork (emblem-geometry.json), never redrawn.
// - Sides: warm neutral #D8C6AD, roughness 0.55; key light upper-left + warm rim.
// - Arrival 1.6s: head → book → nib → flame (+ glow) → 16 rays, 28ms apart. Plays once when 30% visible.
// - Idle breathing float, damped pointer tilt (±6° yaw, ±4° pitch), part picking for "What our logo means".
// Loaded only on Home, by dynamic import, after the hero has painted.
import {
  WebGLRenderer, Scene, PerspectiveCamera, HemisphereLight, DirectionalLight, TextureLoader,
  SRGBColorSpace, NoToneMapping, Vector2, Shape, Path, ExtrudeGeometry, MeshBasicMaterial,
  MeshStandardMaterial, Mesh, Group, Color, CanvasTexture, PlaneGeometry, Raycaster, MathUtils
} from 'three';

export function createEmblem(canvas, geo, logoUrl, opts = {}) {
  const S = 1 / 100, HALF = geo.size[0] / 2;
  const DEPTH = 0.16, BEV = 0.01;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(22, 1, 1, 60);
  camera.position.set(0, 0, 16.5);

  scene.add(new HemisphereLight(0xfff6ea, 0x3a2420, 0.9));
  const key = new DirectionalLight(0xfff1e0, 2.4); key.position.set(-5, 6, 7); scene.add(key);
  const rim = new DirectionalLight(0xffa451, 2.2); rim.position.set(6, 1.5, -5); scene.add(rim);
  const fill = new DirectionalLight(0xffe2c2, 0.5); fill.position.set(3, -4, 6); scene.add(fill);

  let textureReady = false;
  const tex = new TextureLoader().load(logoUrl, () => { textureReady = true; }, undefined, () => opts.onError?.());
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const W = geo.size[0] * S;
  const uvGen = {
    generateTopUV(g, v, a, b, c) {
      return [a, b, c].map((i) => new Vector2(v[i * 3] / W + 0.5, v[i * 3 + 1] / W + 0.5));
    },
    generateSideWallUV() { return [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)]; }
  };
  const P = (pt) => new Vector2((pt[0] - HALF) * S, -(pt[1] - HALF) * S);
  const toShape = (s) => {
    const sh = new Shape(s.outer.map(P));
    s.holes.forEach((h) => sh.holes.push(new Path(h.map(P))));
    return sh;
  };

  const root = new Group(); scene.add(root);
  const tilt = new Group(); root.add(tilt);
  const groups = {};
  const parts = [];
  const sideColor = new Color(opts.sideColor || '#d8c6ad');
  let merged = null;

  geo.parts.forEach((p) => {
    const g = new ExtrudeGeometry(p.shapes.map(toShape), {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.02, bevelSize: BEV, bevelOffset: -BEV, bevelSegments: 2,
      UVGenerator: uvGen
    });
    g.translate(0, 0, -DEPTH);
    const caps = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const side = new MeshStandardMaterial({ color: sideColor, roughness: 0.55, metalness: 0, transparent: true, opacity: 1 });
    const mesh = new Mesh(g, [caps, side]);
    if (p.group === '_merged') {
      // One-piece page + left nib half, shown only at rest so the cut never reads.
      merged = { mesh, caps, side }; mesh.visible = false; tilt.add(mesh); return;
    }
    let pv;
    if (p.group === 'book') pv = [p.name === 'bookA' ? p.bbox[2] : geo.axisX, p.centroid[1]];
    else if (p.group === 'flame') pv = [p.bbox[0] + 0.62 * (p.bbox[2] - p.bbox[0]), p.bbox[3]];
    else if (p.group === 'rays') pv = geo.fanCentre;
    else pv = p.centroid;
    const pivot = new Group();
    const pvv = P(pv);
    pivot.position.set(pvv.x, pvv.y, 0);
    mesh.position.set(-pvv.x, -pvv.y, 0);
    pivot.add(mesh);
    const lift = new Group(); lift.add(pivot); tilt.add(lift);
    mesh.userData.group = p.group;
    const node = { name: p.name, group: p.group, pivot, lift, mesh, caps, side, op: 1 };
    parts.push(node);
    (groups[p.group] = groups[p.group] || { nodes: [], hl: 0, dim: 0 }).nodes.push(node);
  });
  const rays = parts.filter((n) => n.group === 'rays');

  // Soft warm glow behind the flame (normal blending, no bloom).
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gx = gc.getContext('2d'); const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,190,90,0.9)'); grd.addColorStop(0.45, 'rgba(248,154,28,0.35)'); grd.addColorStop(1, 'rgba(248,154,28,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128);
  const gtex = new CanvasTexture(gc); gtex.colorSpace = SRGBColorSpace;
  const glow = new Mesh(new PlaneGeometry(2.6, 3.4), new MeshBasicMaterial({ map: gtex, transparent: true, depthWrite: false, opacity: 0 }));
  const fl = geo.parts.find((p) => p.group === 'flame');
  const fc = P([fl.centroid[0], fl.centroid[1] + 20]);
  glow.position.set(fc.x, fc.y, -0.3);
  tilt.add(glow);

  /* ---- arrival timeline ---- */
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const eo = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const DUR = 1600;
  function pose(t) {
    parts.forEach((n) => {
      const pv = n.pivot; let o = 1;
      pv.position.z = 0; pv.rotation.set(0, 0, 0); pv.scale.set(1, 1, 1);
      const base = pv.userData.base || (pv.userData.base = pv.position.clone());
      pv.position.copy(base);
      if (n.group === 'head') {
        const k = eo(seg(t, 0, 450)); o = eo(seg(t, 0, 300));
        pv.position.y = base.y + (1 - k) * 0.14; const s = 0.94 + 0.06 * k; pv.scale.set(s, s, 1);
      } else if (n.group === 'book') {
        const a0 = n.name === 'bookA' ? 290 : 200, k2 = eo(seg(t, a0, a0 + 480));
        o = eo(seg(t, a0, a0 + 200));
        pv.rotation.y = -(1 - k2) * 1.45; pv.position.z = base.z - (1 - k2) * 0.25;
      } else if (n.group === 'nib') {
        const k3 = eo(seg(t, 520, 900)); o = eo(seg(t, 520, 700));
        pv.position.y = base.y - (1 - k3) * 0.55;
      } else if (n.group === 'flame') {
        const k4 = eo(seg(t, 820, 1180)); o = eo(seg(t, 820, 940));
        pv.scale.set(0.55 + 0.45 * k4, 0.04 + 0.96 * k4, 1);
      } else if (n.group === 'rays') {
        const i = rays.indexOf(n), st = 1000 + i * 28, k5 = eo(seg(t, st, st + 180));
        o = k5; const s5 = 0.5 + 0.5 * k5; pv.scale.set(s5, s5, 1);
      }
      n.op = o;
    });
    const gk = seg(t, 860, 1100), gd = seg(t, 1100, 1500);
    glow.userData.arrive = t >= DUR ? 0.3 : (t < 1100 ? 0.55 * eo(gk) : 0.55 - 0.25 * eo(gd));
  }

  /* ---- state ---- */
  let start = null, visible = true, paused = false, firstFrame = false;
  let tYaw = 0, tPitch = 0, yaw = 0, pitch = 0;
  let hl = null;
  let last = performance.now();
  let clock0 = performance.now();

  function size() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const fit = 6.3; // world units visible across the shorter side
    const tn = Math.tan(MathUtils.degToRad(11));
    camera.position.z = w >= h ? (fit / 2) / tn : (fit / 2) / (tn * camera.aspect);
    camera.updateProjectionMatrix();
  }
  size();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
  ro?.observe(canvas);

  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(64, now - last); last = now;
    if (!visible || paused || !textureReady) return;
    const t = start === null ? 0 : now - start;
    pose(t);
    const idle = start !== null && t > DUR ? (now - clock0) / 1000 : 0;
    root.position.y = idle ? Math.sin(idle * 2 * Math.PI / 6.5) * 0.045 : 0;
    root.rotation.z = idle ? Math.sin(idle * 2 * Math.PI / 9) * 0.004 : 0;
    const kf = 1 - Math.exp(-dt / 160);
    yaw += (tYaw - yaw) * kf; pitch += (tPitch - pitch) * kf;
    tilt.rotation.y = yaw; tilt.rotation.x = pitch;
    const kh = 1 - Math.exp(-dt / 110);
    Object.keys(groups).forEach((gname) => {
      const G = groups[gname], on = hl === gname, dim = hl && !on;
      G.hl += ((on ? 1 : 0) - G.hl) * kh; G.dim += ((dim ? 1 : 0) - G.dim) * kh;
      G.nodes.forEach((n) => {
        n.lift.position.z = G.hl * 0.22;
        const op = n.op * (1 - 0.72 * G.dim);
        n.caps.opacity = op; n.side.opacity = op;
        n.mesh.visible = op > 0.003;
      });
    });
    if (merged) {
      const B = groups.book, N = groups.nib;
      const rest = start !== null && t >= 900 && B.hl < 0.004 && N.hl < 0.004 && Math.abs(B.dim - N.dim) < 0.004;
      merged.mesh.visible = rest;
      const mop = 1 - 0.72 * B.dim; merged.caps.opacity = mop; merged.side.opacity = mop;
      parts.forEach((n) => { if (n.name === 'bookB' || n.name === 'nibL') n.mesh.visible = !rest && n.mesh.visible; });
    }
    const gb = glow.userData.arrive || 0;
    glow.material.opacity = (gb + (idle ? Math.sin(idle * 2 * Math.PI / 4.2) * 0.04 : 0)) * (1 - 0.72 * groups.flame.dim);
    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; opts.onFirstFrame?.(); }
  }
  raf = requestAnimationFrame(frame);

  /* ---- input ---- */
  const ray = new Raycaster(), ndc = new Vector2();
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(parts.map((n) => n.mesh), false)[0];
    return hit ? hit.object.userData.group : null;
  }
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    tYaw = MathUtils.degToRad(6) * nx; tPitch = MathUtils.degToRad(4) * ny;
    if (opts.onPointerPart && e.pointerType !== 'touch') opts.onPointerPart(pick(e.clientX, e.clientY));
  }
  function onLeave() { tYaw = 0; tPitch = 0; opts.onPointerPart?.(null); }
  function onUp(e) { if (e.pointerType === 'touch') { tYaw = 0; tPitch = 0; } }
  function onTap(e) { opts.onTapPart?.(pick(e.clientX, e.clientY)); }
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('click', onTap);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); opts.onError?.(); });

  // Arrival plays once per page view when 30% of the emblem is on screen; rendering pauses off screen.
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((es) => es.forEach((en) => {
        visible = en.isIntersecting;
        if (visible && start === null && en.intersectionRatio >= 0.3) { start = performance.now(); clock0 = start + DUR; }
      }), { threshold: [0, 0.3] })
    : null;
  if (io) io.observe(canvas); else { start = performance.now(); clock0 = start + DUR; }
  const onVis = () => { visible = !document.hidden; };
  document.addEventListener('visibilitychange', onVis);

  return {
    highlight(g) { hl = g || null; },
    /** Stop drawing (for example once the emblem has reached the header). */
    setPaused(v) { paused = !!v; },
    replay() { start = performance.now(); clock0 = start + DUR; },
    dispose() {
      cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('click', onTap);
      parts.forEach((n) => { n.mesh.geometry.dispose(); n.caps.dispose(); n.side.dispose(); });
      if (merged) { merged.mesh.geometry.dispose(); merged.caps.dispose(); merged.side.dispose(); }
      tex.dispose(); gtex.dispose(); renderer.dispose();
    }
  };
}
