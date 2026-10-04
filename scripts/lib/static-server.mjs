// A small static server for dist/ that behaves like Vercel for measuring: clean URLs (/about →
// about.html), brotli or gzip by Accept-Encoding, long caching for hashed assets. `astro preview`
// sends everything uncompressed, which makes Lighthouse's slow-4G simulation unrealistically slow.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { root } from './serve.mjs';

const dist = join(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.wasm': 'application/wasm', '.pf_meta': 'application/octet-stream', '.pf_fragment': 'application/octet-stream', '.pf_index': 'application/octet-stream', '.pf_filter': 'application/octet-stream' };
const compressible = /^(text\/|application\/(json|xml|javascript)|image\/svg)/;

function resolve(url) {
  const path = normalize(decodeURIComponent(new URL(url, 'http://x').pathname)).replace(/\\/g, '/');
  const candidates = path === '/' ? ['index.html'] : [path.slice(1), `${path.slice(1)}.html`, `${path.slice(1)}/index.html`];
  for (const c of candidates) {
    const f = join(dist, c);
    if (f.startsWith(dist) && existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

export function startStatic(port) {
  const server = createServer((req, res) => {
    const file = resolve(req.url);
    const status = file ? 200 : 404;
    const target = file ?? join(dist, '404.html');
    let body = readFileSync(target);
    const type = types[extname(target)] ?? 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': /\/(_astro|fonts)\//.test(req.url) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate' };
    const enc = String(req.headers['accept-encoding'] ?? '');
    if (compressible.test(type)) {
      if (/\bbr\b/.test(enc)) { body = brotliCompressSync(body); headers['Content-Encoding'] = 'br'; }
      else if (/gzip/.test(enc)) { body = gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
    }
    res.writeHead(status, headers);
    res.end(body);
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}
