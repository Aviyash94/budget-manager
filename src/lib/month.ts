/** Months are "YYYY-MM"; dates are local calendar dates "YYYY-MM-DD". No Date math on stored values. */

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const APP_TIME_ZONE = "Indian/Mauritius";

export function isMonth(s: string): boolean {
  return MONTH_RE.test(s);
}

export function addMonths(month: string, delta: number): string {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Invalid month: ${month}`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Half-open range [start, endExclusive) of dates in the month, for string comparison on `date`. */
export function monthRange(month: string): { start: string; endExclusive: string } {
  return { start: `${month}-01`, endExclusive: `${addMonths(month, 1)}-01` };
}

/** Current month in the app time zone, not the server's. */
export function currentMonth(now: Date = new Date()): string {
  return todayLocal(now).slice(0, 7);
}

export function todayLocal(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

/** "2026-10" -> "October 2026". Formatted in UTC so the stored value is never shifted by a zone. */
export function formatMonthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** "2026-10-07" -> "Wed 7 Oct". */
export function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(",", "");
}
