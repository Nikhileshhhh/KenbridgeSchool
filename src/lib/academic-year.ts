// The academic year starts in June (HomeDesktop / AdmissionsDesktop board scripts).
// Computed at build time; a yearly rebuild on 1 June keeps it current (see PLAN.md §5).

/** First calendar year of the academic year that `date` falls in. */
export function academicYearStart(date: Date = new Date()): number {
  return date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
}

/** "2026–27" (en dash), as written on the boards. */
export function academicYearLabel(start: number): string {
  return `${start}–${String(start + 1).slice(2)}`;
}

/** "2026-27" (hyphen), as used in gallery URLs. */
export function academicYearSlug(start: number): string {
  return `${start}-${String(start + 1).slice(2)}`;
}

/** Every academic year since the school opened in 2011, newest first. */
export function academicYearsSince(firstStart = 2011, date: Date = new Date()) {
  const years: { start: number; label: string; slug: string }[] = [];
  for (let y = academicYearStart(date); y >= firstStart; y--) {
    years.push({ start: y, label: academicYearLabel(y), slug: academicYearSlug(y) });
  }
  return years;
}
