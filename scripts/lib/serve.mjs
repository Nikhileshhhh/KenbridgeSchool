// Shared helpers for the QA scripts: serve dist/ with `astro preview` and list the built routes.
import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../..', import.meta.url));
export const PORT = 4322;
export const BASE = `http://localhost:${PORT}`;

/** Every built page as a route ("/", "/about", "/404"). */
export function builtRoutes() {
  const dist = join(root, 'dist');
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (!['_astro', 'fonts', 'pagefind'].includes(name)) walk(p); }
      else if (name.endsWith('.html')) {
        const r = '/' + relative(dist, p).replace(/\\/g, '/').replace(/\.html$/, '').replace(/(^|\/)index$/, '');
        out.push(r === '/' ? '/' : r.replace(/\/$/, ''));
      }
    }
  };
  walk(dist);
  return out.sort();
}

export async function startPreview() {
  const astro = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const child = spawn(process.execPath, [astro, 'preview', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE); return child; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  child.kill();
  throw new Error('astro preview did not start');
}

export function stopPreview(child) {
  if (!child) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill();
}

/**
 * Opens `url` the way a browser with JavaScript switched off renders it (every <script> removed),
 * while leaving Playwright able to run axe in the page. Use for axe passes on the no-JS state.
 */
export async function gotoWithoutScripts(page, url) {
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (req.resourceType() === 'document') {
      const res = await route.fetch();
      const html = (await res.text()).replace(/<script\b[\s\S]*?<\/script>/gi, '');
      return route.fulfill({ response: res, body: html, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
    }
    if (req.resourceType() === 'script') return route.abort();
    return route.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
}
