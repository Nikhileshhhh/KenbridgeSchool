// Typed access to the site-wide data files and link resolution.
import { getCollection, getEntry } from 'astro:content';

export async function getSettings() {
  const e = await getEntry('settings', 'main');
  if (!e) throw new Error('src/data/settings.yaml is missing its "main" entry');
  return e.data;
}

export async function getSchool() {
  const e = await getEntry('school', 'main');
  if (!e) throw new Error('src/data/school.yaml is missing its "main" entry');
  return e.data;
}

export async function getNavigation() {
  const e = await getEntry('navigation', 'main');
  if (!e) throw new Error('src/data/navigation.yaml is missing its "main" entry');
  return e.data;
}

export async function getHome() {
  const e = await getEntry('home', 'main');
  if (!e) throw new Error('src/data/home.yaml is missing its "main" entry');
  return e.data;
}

export async function getResults() {
  const e = await getEntry('results', 'main');
  if (!e) throw new Error('src/data/results.yaml is missing its "main" entry');
  return e.data;
}

/** Single-entry data files (src/data/<name>.yaml with one "main" entry). */
export async function getMain<C extends 'about' | 'founder' | 'principal' | 'learning' | 'campus' | 'admissions' | 'achievements' | 'gallery' | 'info' | 'contact'>(name: C) {
  const e = await getEntry(name, 'main');
  if (!e) throw new Error(`src/data/${name}.yaml is missing its "main" entry`);
  return e.data;
}

export async function getServices() {
  const all = await getCollection('services');
  return Object.fromEntries(all.map((s) => [s.id, s.data]));
}

export async function getFacilities() {
  const all = await getCollection('facilities');
  return all.sort((a, b) => a.data.num.localeCompare(b.data.num));
}

/** The four learning stages, in journey order (Pre-Primary → Secondary School). */
export async function getProgrammes() {
  const all = await getCollection('programmes');
  return all.sort((a, b) => a.data.stage - b.data.stage);
}

export type LinkKind = 'internal' | 'ext' | 'pdf' | 'video';
export interface NavLinkInput {
  label: string;
  meta?: string;
  href?: string;
  service?: string;
  kind?: LinkKind;
}
export interface ResolvedLink {
  label: string;
  meta: string;
  href: string;
  kind: LinkKind;
  /** Opens in a new tab (external sites and PDFs). */
  newTab: boolean;
  /** Visually hidden suffix that tells screen-reader users what happens. */
  srNote: string;
}

type Services = Awaited<ReturnType<typeof getServices>>;

export function resolveLink(link: NavLinkInput, services: Services): ResolvedLink {
  const kind = link.kind ?? 'internal';
  let href = link.href;
  if (!href && link.service) {
    const s = services[link.service];
    if (!s) throw new Error(`Unknown service "${link.service}" in navigation data`);
    href = s.url;
  }
  if (!href) throw new Error(`Link "${link.label}" has no href or service`);
  const newTab = kind === 'ext' || kind === 'pdf';
  const srNote = kind === 'ext' ? ' (opens in a new tab)' : kind === 'pdf' ? ' (PDF, opens in a new tab)' : '';
  return { label: link.label, meta: link.meta ?? '', href, kind, newTab, srNote };
}

/** A meta description of at most `max` characters, cut at a word boundary with an ellipsis. */
export function metaDescription(text: string, max = 160) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:·–-]$/, '')}…`;
}

/** tel: href from a displayed number such as "98869 99660". */
export function telHref(tel: string) {
  return `tel:${tel}`;
}

/** Indexing stays off for the design demo; set PUBLIC_INDEXING=true at launch. */
export const indexingEnabled = import.meta.env.PUBLIC_INDEXING === 'true';
