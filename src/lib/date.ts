// Centralizes the app's date-display format (DD/MM/YYYY, zero-padded).
//
// A plain `date.toLocaleDateString()` uses the BROWSER's own locale, which is
// often en-US (M/D/YYYY, no zero-padding) — that's what super-admin/companies
// and super-admin/users were doing, rendering "9/14/2026" instead of the
// "14/09/2026" the rest of the app shows. Most other pages already worked
// around this with `toLocaleDateString("en-IN")`, but `en-IN` still doesn't
// zero-pad single-digit days/months by default (e.g. "14/9/2026" for
// September), which is short of a real "dd/mm/yyyy" format. The one place in
// the codebase that already got this fully right is AdminLayout.tsx's header
// clock: `en-GB` + explicit `{day:"2-digit", month:"2-digit"}` options — this
// helper just centralizes that exact technique so every page gets the same,
// genuinely zero-padded DD/MM/YYYY output instead of each page inventing its
// own slightly-different date call.
export function formatDate(
  date: string | Date | null | undefined,
  fallback = "-"
): string {
  if (!date) return fallback;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
