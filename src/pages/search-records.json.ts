// Records for site search that are not pages on this site: the school's external services and the
// PDFs that have a file (services.yaml). scripts/pagefind.mjs adds them to the Pagefind index after the
// build and then removes this file from dist. A PDF with no file yet is left out until it is supplied.
import type { APIRoute } from 'astro';
import { getServices } from '../lib/site';

export const GET: APIRoute = async () => {
  const services = await getServices();
  const records = Object.values(services).map((s) => ({
    url: s.url,
    title: s.label,
    type: s.kind === 'pdf' ? 'PDF' : 'External',
    trail: s.kind === 'pdf' ? `School Information › Downloads · PDF, ${s.size ?? '[size]'}` : s.domain,
    content: `${s.label}. ${s.description}`
  }));
  return new Response(JSON.stringify(records, null, 2), { headers: { 'Content-Type': 'application/json' } });
};
