import Link from "next/link";
import { formatMUR } from "@/lib/money";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { getMonthSummary, type CategorySummary } from "@/server/summary";
import { EmptyState, MonthNav, monthFrom, PageTitle, toneFor } from "./ui";

function Stat({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  className: string;
}) {
  return (
    <div className={`rounded-3xl p-4 ring-1 ring-white ${className}`}>
      <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase opacity-80">
        <span aria-hidden className="text-base">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-1 text-xl font-black sm:text-2xl">{value}</div>
      {hint && <div className="mt-0.5 text-xs font-bold opacity-80">{hint}</div>}
    </div>
  );
}

type Level = "none" | "ok" | "warn" | "over";

function levelOf(c: CategorySummary): Level {
  if (c.limitCents === null) return "none";
  if (c.spentCents > c.limitCents) return "over";
  // integer math: spent/limit >= 80%
  if (c.limitCents > 0 && c.spentCents * 5 >= c.limitCents * 4) return "warn";
  return "ok";
}

const LEVEL_STYLE: Record<Level, { bar: string; note: string }> = {
  none: { bar: "bg-lav", note: "text-ink-soft" },
  ok: { bar: "bg-ok", note: "text-mint-deep" },
  warn: { bar: "bg-warn", note: "text-butter-deep" },
  over: { bar: "bg-over", note: "text-over-deep" },
};

function CategoryCard({ c }: { c: CategorySummary }) {
  const level = levelOf(c);
  const tone = toneFor(c.categoryId);
  // Display-only ratio; every total is integer cents.
  const pct = c.limitCents ? Math.min(100, Math.max(0, (c.spentCents / c.limitCents) * 100)) : 0;

  const note =
    level === "none"
      ? "No budget set"
      : level === "over"
        ? `Over by ${formatMUR(c.spentCents - (c.limitCents ?? 0))}`
        : `${formatMUR(c.remainingCents ?? 0)} left · ${Math.round(pct)}% used`;

  return (
    <li className="card">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-extrabold ${tone.bg} ${tone.text}`}
        >
          <span aria-hidden className={`size-2.5 rounded-full ${tone.dot}`} />
          {c.name}
        </span>
        <span className="text-sm font-bold">
          {formatMUR(c.spentCents)}
          {c.limitCents !== null && (
            <span className="text-ink-soft"> / {formatMUR(c.limitCents)}</span>
          )}
        </span>
      </div>

      {c.limitCents !== null && (
        <div
          role="progressbar"
          aria-label={`${c.name} budget used`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="mt-3 h-3.5 overflow-hidden rounded-full bg-lav-soft"
        >
          <div
            className={`h-full rounded-full transition-[width] ${LEVEL_STYLE[level].bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className={`mt-2 text-xs font-extrabold ${LEVEL_STYLE[level].note}`}>
        {level === "over" && <span aria-hidden>⚠️ </span>}
        {note}
      </p>
    </li>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const month = monthFrom((await searchParams).month);
  const { userId } = await requireUser();
  const s = await getMonthSummary(getDb(), userId, month);

  const budgeted = s.categories.reduce((sum, c) => sum + (c.limitCents ?? 0), 0);
  const budgetedSpent = s.categories.reduce(
    (sum, c) => sum + (c.limitCents === null ? 0 : c.spentCents),
    0,
  );
  const remaining = budgeted - budgetedSpent;
  const net = s.incomeCents - s.spentCents;

  return (
    <>
      <PageTitle
        icon="🏠"
        subtitle="Your month at a glance"
        actions={
          <Link href="/transactions" className="btn">
            ＋ Add transaction
          </Link>
        }
      >
        Dashboard
      </PageTitle>
      <MonthNav basePath="/" month={month} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon="💰"
          label="Income"
          value={formatMUR(s.incomeCents)}
          className="bg-mint-soft text-mint-deep"
        />
        <Stat
          icon="🛍️"
          label="Spent"
          value={formatMUR(s.spentCents)}
          hint={net >= 0 ? `${formatMUR(net)} saved` : `${formatMUR(-net)} more than income`}
          className="bg-pink-soft text-pink-deep"
        />
        <Stat
          icon="🎯"
          label="Budgeted"
          value={formatMUR(budgeted)}
          className="bg-sky-soft text-sky-deep"
        />
        <Stat
          icon={remaining < 0 ? "⚠️" : "🌤️"}
          label="Budget left"
          value={formatMUR(remaining)}
          hint={remaining < 0 ? "Over your limits" : undefined}
          className={
            remaining < 0 ? "bg-peach-soft text-peach-deep" : "bg-butter-soft text-butter-deep"
          }
        />
      </div>

      <h2 className="section-title mt-8">Spending by category</h2>
      {s.categories.length === 0 ? (
        <EmptyState icon="🏷️" title="No expense categories yet">
          Create some on the{" "}
          <Link href="/categories" className="font-bold text-lav-deep underline">
            Categories
          </Link>{" "}
          page, then set monthly limits under{" "}
          <Link href="/budgets" className="font-bold text-lav-deep underline">
            Budgets
          </Link>
          .
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {s.categories.map((c) => (
            <CategoryCard key={c.categoryId} c={c} />
          ))}
        </ul>
      )}
    </>
  );
}
