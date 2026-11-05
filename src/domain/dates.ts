// Dates are plain YYYY-MM-DD strings, so a value never shifts with the viewer's timezone.
// Plain strings of this shape also sort chronologically.

const DAY_MS = 86_400_000;
export const DAYS_PER_MONTH = 30.44;

function toUtc(iso: string): number {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Today's date as the user sees it locally. */
export function toLocalIso(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Adds calendar months, clamping to month end: Jan 31 + 1 month is Feb 28. */
export function addMonths(iso: string, months: number): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  const firstOfTarget = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = firstOfTarget.getUTCFullYear();
  const targetMonth = firstOfTarget.getUTCMonth();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clamped = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
  return clamped.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
