/** All amounts are integer cents (MUR). Never use floats for money. */

const AMOUNT_RE = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** Parses user input like "1,234.5" or "-20" into integer cents. Returns null if invalid. */
export function parseMoneyToCents(input: string): number | null {
  const m = AMOUNT_RE.exec(input.trim().replace(/[\s,]/g, ""));
  if (!m) return null;
  const [, sign, whole, frac = ""] = m;
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return sign && cents !== 0 ? -cents : cents;
}

/** Formats cents as "Rs 1,234.50" (negative: "-Rs 20.00"). */
export function formatMUR(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Amount must be integer cents");
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${cents < 0 ? "-" : ""}Rs ${whole}.${frac}`;
}

/** Integer cents -> plain decimal for form inputs ("1250" -> "12.50"). */
export function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
