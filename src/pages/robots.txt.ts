// robots.txt. The design demo stays out of search engines until PUBLIC_INDEXING=true at launch.
import type { APIRoute } from 'astro';
import { indexingEnabled } from '../lib/site';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site).href;
  const body = indexingEnabled
    ? `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
    : `# Design preview: not for indexing yet.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
