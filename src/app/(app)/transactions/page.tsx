import Link from "next/link";
import { formatMUR } from "@/lib/money";
import { formatDayLabel, todayLocal } from "@/lib/month";
import { getDb } from "@/server/db";
import { listAccounts } from "@/server/repos/accounts";
import { listCategories } from "@/server/repos/categories";
import { listTransactions } from "@/server/repos/transactions";
import { requireUser } from "@/server/session";
import { addTransaction, removeTransaction } from "../actions";
import { ConfirmForm } from "../confirm-form";
import { EmptyState, ErrorBanner, MonthNav, monthFrom, PageTitle, toneFor } from "../ui";
import { TransactionForm } from "./transaction-form";

export const metadata = { title: "Transactions" };

type Row = Awaited<ReturnType<typeof listTransactions>>[number];

const KIND_STYLE = {
  expense: { amount: "text-pink-deep", sign: "−" },
  income: { amount: "text-mint-deep", sign: "+" },
  transfer: { amount: "text-sky-deep", sign: "" },
} as const;

function amountText(t: Row) {
  const style = KIND_STYLE[t.type];
  // A negative expense is a refund: money back, so show it as a plus.
  if (t.type === "expense" && t.amountCents < 0) return `+${formatMUR(-t.amountCents)}`;
  return `${style.sign}${formatMUR(t.amountCents)}`;
}

function TransactionRow({ t, month }: { t: Row; month: string }) {
  const isTransfer = t.type === "transfer";
  const refund = t.type === "expense" && t.amountCents < 0;
  const tone = toneFor(t.categoryId ?? t.type);
  const title = isTransfer
    ? `${t.accountName} → ${t.transferAccountName}`
    : (t.categoryName ?? "Uncategorised");

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span
        aria-hidden
        className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl ${isTransfer ? "bg-sky-soft" : tone.bg}`}
      >
        {isTransfer ? "🔁" : t.type === "income" ? "💰" : refund ? "↩️" : "🛍️"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{title}</p>
        <p className="truncate text-xs text-ink-soft">
          {[isTransfer ? "Transfer" : t.accountName, refund ? "Refund" : null, t.note]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-black ${refund ? KIND_STYLE.income.amount : KIND_STYLE[t.type].amount}`}
      >
        {amountText(t)}
      </span>

      {/* On phones the actions drop to their own line so the title keeps its width. */}
      <div className="flex w-full shrink-0 justify-end gap-1.5 sm:w-auto">
        <Link href={`/transactions/${t.id}/edit`} className="btn-soft" aria-label={`Edit ${title}`}>
          Edit
        </Link>
        <ConfirmForm action={removeTransaction} message={`Delete this transaction (${title})?`}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="month" value={month} />
          <button className="btn-danger" aria-label={`Delete ${title}`}>
            Delete
          </button>
        </ConfirmForm>
      </div>
    </li>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const month = monthFrom(sp.month);
  const { userId } = await requireUser();
  const db = getDb();
  const [accounts, categories, rows] = await Promise.all([
    listAccounts(db, userId),
    listCategories(db, userId),
    listTransactions(db, userId, month),
  ]);

  // Rows arrive newest first; group them by day.
  const days: { date: string; rows: Row[] }[] = [];
  for (const r of rows) {
    const last = days[days.length - 1];
    if (last?.date === r.date) last.rows.push(r);
    else days.push({ date: r.date, rows: [r] });
  }

  return (
    <>
      <PageTitle icon="🧾" subtitle="Record what comes in and goes out">
        Transactions
      </PageTitle>
      <ErrorBanner message={sp.error} />

      {accounts.length === 0 ? (
        <div className="mb-6">
          <EmptyState icon="🏦" title="Add an account first">
            Transactions belong to an account, like your bank or wallet.{" "}
            <Link href="/accounts" className="font-bold text-lav-deep underline">
              Create an account
            </Link>
          </EmptyState>
        </div>
      ) : (
        <TransactionForm
          action={addTransaction}
          accounts={accounts}
          categories={categories}
          month={month}
          today={todayLocal()}
          submitLabel="＋ Add transaction"
        />
      )}

      <MonthNav basePath="/transactions" month={month} />

      {days.length === 0 ? (
        <EmptyState icon="🌱" title="Nothing here yet">
          No transactions in this month.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <section key={d.date} className="card py-3">
              <h2 className="section-title mb-0">{formatDayLabel(d.date)}</h2>
              <ul className="divide-y divide-lav-soft">
                {d.rows.map((t) => (
                  <TransactionRow key={t.id} t={t} month={month} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
