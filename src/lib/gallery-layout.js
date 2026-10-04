// Album grid layout from the GalleryDesktop / GalleryMobile board scripts. It keeps list (DOM)
// order, so reading and Tab order match what you see: no reordering and no holes.
// Shared by the server render and the client-side filter (scripts/gallery.js).

/** Desktop, 3 columns on 132px rows: the lead opens big, then bands of three, then wide + single. */
export function deskLayout(n) {
  const out = [];
  if (n === 0) return out;
  if (n === 1) return [{ cols: 3, rows: 4 }];
  out.push({ cols: 2, rows: 4 }, { cols: 1, rows: 4 });
  let left = n - 2, band = 0;
  while (left > 0) {
    if (band % 2 === 0) {
      if (left >= 3) { out.push({ cols: 1, rows: 3 }, { cols: 1, rows: 3 }, { cols: 1, rows: 3 }); left -= 3; }
      else if (left === 2) { out.push({ cols: 2, rows: 3 }, { cols: 1, rows: 3 }); left = 0; }
      else { out.push({ cols: 3, rows: 3 }); left = 0; }
    } else {
      if (left >= 2) { out.push({ cols: 1, rows: 3 }, { cols: 2, rows: 3 }); left -= 2; }
      else { out.push({ cols: 3, rows: 3 }); left = 0; }
    }
    band++;
  }
  return out;
}

/** Phones, 2 columns: the lead full width, then pairs, with a wide tile every third band. */
export function mobileLayout(n) {
  const out = [];
  if (n === 0) return out;
  out.push({ cols: 2, ratio: '4 / 3' });
  let left = n - 1, band = 0;
  while (left > 0) {
    if (band % 3 === 2 || left === 1) { out.push({ cols: 2, ratio: '16 / 9' }); left -= 1; }
    else { out.push({ cols: 1, ratio: '3 / 4' }, { cols: 1, ratio: '3 / 4' }); left -= 2; }
    band++;
  }
  return out;
}

/** CSS custom properties for tile i of n. */
export function tileVars(i, n) {
  const d = deskLayout(n)[i];
  const m = mobileLayout(n)[i];
  return `--dc:${d.cols};--dr:${d.rows};--mc:${m.cols};--mr:${m.ratio}`;
}

/** Name size: the big first tile 40px (desktop) / 30px (phone); wide phone tiles 24px; others 26 / 21. */
export function tileSizes(i, n) {
  const d = deskLayout(n)[i];
  const m = mobileLayout(n)[i];
  return { ds: i === 0 && d.cols >= 2 ? 40 : 26, ms: i === 0 ? 30 : m.cols === 2 ? 24 : 21 };
}
