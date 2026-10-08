import Link from "next/link";
import { addMonths, currentMonth, formatMonthLabel, isMonth } from "@/lib/month";

// Class-name shortcuts; the styles live in globals.css (@layer components).
export const inputCls = "input";
export const btnCls = "btn";
export const softBtnCls = "btn-soft";
export const dangerBtnCls = "btn-danger";

/** Pastel pairs used to colour categories. Text is always the dark -deep shade. */
const TONES = [
  { bg: "bg-lav-soft", dot: "bg-lav", text: "text-lav-deep" },
  { bg: "bg-pink-soft", dot: "bg-pink", text: "text-pink-deep" },
  { bg: "bg-mint-soft", dot: "bg-mint", text: "text-mint-deep" },
  { bg: "bg-peach-soft", dot: "bg-peach", text: "text-peach-deep" },
  { bg: "bg-sky-soft", dot: "bg-sky", text: "text-sky-deep" },
  { bg: "bg-butter-soft", dot: "bg-butter", text: "text-butter-deep" },
] as const;

/** Stable colour per id so a category looks the same on every page. */
export function toneFor(key: string | null | undefined) {
  if (!key) return TONES[0];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`label ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-2xl bg-pink-soft px-4 py-3 text-sm font-bold text-pink-deep ring-1 ring-pink"
    >
      <span aria-hidden>⚠️</span>
      {message}
    </p>
  );
}

export function PageTitle({
  icon,
  children,
  subtitle,
  actions,
}: {
  icon: string;
  children: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-lav-soft"
        >
          {icon}
        </span>
        <div>
          <h1 className="text-2xl leading-tight font-black">{children}</h1>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <span aria-hidden className="text-4xl">
        {icon}
      </span>
      <p className="font-extrabold">{title}</p>
      {children && <div className="text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

/** Reads ?month= defensively; falls back to the current month in the app time zone. */
export function monthFrom(raw: string | undefined) {
  return raw && isMonth(raw) ? raw : currentMonth();
}

export function MonthNav({ basePath, month }: { basePath: string; month: string }) {
  const isCurrent = month === currentMonth();
  return (
    <nav aria-label="Choose month" className="mb-5 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-lav-soft">
        <Link
          href={`${basePath}?month=${addMonths(month, -1)}`}
          aria-label="Previous month"
          className="grid size-9 place-items-center rounded-full text-lg font-black text-lav-deep transition hover:bg-lav-soft"
        >
          ‹
        </Link>
        <span className="min-w-36 px-2 text-center text-sm font-extrabold" aria-live="polite">
          {formatMonthLabel(month)}
        </span>
        <Link
          href={`${basePath}?month=${addMonths(month, 1)}`}
          aria-label="Next month"
          className="grid size-9 place-items-center rounded-full text-lg font-black text-lav-deep transition hover:bg-lav-soft"
        >
          ›
        </Link>
      </div>
      {!isCurrent && (
        <Link href={basePath} className="btn-soft">
          This month
        </Link>
      )}
    </nav>
  );
}
