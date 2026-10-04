// Supplied photographs (src/assets/photos/<file>) and the placeholder labels they fill.
// A label fills with a photo when it names the file ("[Photo · Drone-Front.jpg · full bleed]", or
// without the extension, "[Photo · DSC_9673 / drone front view]"), or when src/data/photos.yaml maps
// the label's wording to a file ("Pre-primary activity room" → Pre-Primary.jpg). The photo's alt text
// must be in src/data/photos.yaml; the build stops rather than invent one.
import type { ImageMetadata } from 'astro';
import { getEntry } from 'astro:content';

const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG}');
const keyOf = new Map(Object.keys(files).map((k) => [k.split('/').pop()!.toLowerCase(), k]));
const names = Object.keys(files).map((k) => k.split('/').pop()!);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest names first, so "Indoor-Sports-Room-1" is not taken for a shorter name it contains.
const byStem = names
  .map((n) => ({ name: n, re: new RegExp(`(^|[^\\w-])${esc(n.replace(/\.[^.]+$/, ''))}(\\.(?:jpe?g|png|webp))?(?![\\w-])`) }))
  .sort((a, b) => b.name.length - a.name.length);

export interface FoundPhoto { file: string; src: ImageMetadata; alt: string }

let data: { alt: Record<string, string>; labels: Record<string, string> } | undefined;
async function photoData() {
  if (!data) {
    const entry = await getEntry('photos', 'main');
    data = { alt: entry?.data.alt ?? {}, labels: entry?.data.labels ?? {} };
  }
  return data;
}

/** The supplied file a placeholder label stands for, if it has been supplied. */
export async function fileForLabel(label: string): Promise<string | undefined> {
  let best: { at: number; name: string } | undefined;
  for (const s of byStem) {
    const m = s.re.exec(label);
    if (m && (!best || m.index < best.at)) best = { at: m.index, name: s.name };
  }
  if (best) return best.name;
  const { labels } = await photoData();
  const lower = label.toLowerCase();
  for (const [words, file] of Object.entries(labels)) {
    if (lower.includes(words.toLowerCase()) && keyOf.has(file.toLowerCase())) return file;
  }
  return undefined;
}

/** The photo for a label (or a file named directly), with its alt text; undefined until supplied. */
export async function findPhoto({ label, file }: { label?: string; file?: string }): Promise<FoundPhoto | undefined> {
  const name = file ?? (label ? await fileForLabel(label) : undefined);
  const key = name && keyOf.get(name.toLowerCase());
  if (!key) return undefined;
  const src = (await files[key]()).default;
  const fileName = key.split('/').pop()!;
  const { alt } = await photoData();
  const found = alt[fileName];
  if (found === undefined) throw new Error(`Photo ${fileName} is supplied but has no alt text in src/data/photos.yaml (use "" only for a purely decorative image).`);
  return { file: fileName, src, alt: found };
}

/** Album cover file name: "cover-2025-26-annual-day.jpg" for Annual Day 2025-26 ("cover-ipl-kbs.jpg" with no year). */
export function coverFile(year: string, album: string) {
  const slug = album.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return /^\d{4}-\d{2}$/.test(year) ? `cover-${year}-${slug}.jpg` : `cover-${slug}.jpg`;
}
