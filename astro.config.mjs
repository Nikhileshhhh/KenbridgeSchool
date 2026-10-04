// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static build for Vercel. `build.format: 'file'` + vercel.json `cleanUrls` serves
// /about from about.html with no trailing slash (PAGE-MAP routes have none).
export default defineConfig({
  site: 'https://kenbridgegulbarga.com',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'auto'
  },
  integrations: [
    sitemap({
      // Development-only pages, the search page, the /app store redirect and the 404 never reach the sitemap.
      filter: (page) => !/\/(dev\/|search$|app$|404$)/.test(page.replace(/\/$/, ''))
    })
  ],
  devToolbar: { enabled: false }
});
