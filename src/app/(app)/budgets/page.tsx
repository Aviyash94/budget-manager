import Link from "next/link";
import { centsToInput } from "@/lib/money";
import { addMonths, formatMonthLabel } from "@/lib/month";
import { getDb } from "@/server/db";
import { listBudgets } from "@/server/repos/budgets";
import { listCategories } from "@/server/repos/categories";
import { requireUser } from "@/server/session";
import { clearBudget, copyBudgets, saveBudget } from "../actions";
import { ConfirmForm } from "../confirm-form";
import { EmptyState, ErrorBanner, MonthNav, monthFrom, PageTitle, toneFor } from "../ui";

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const month = monthFrom(sp.month);
  const { userId } = await requireUser();
  const db = getDb();
  const [categories, budgets] = await Promise.all([
    listCategories(db, userId),
    listBudgets(db, userId, month),
  ]);
  const expense = categories.filter((c) => c.kind === "expense");
  const limitBy = new Map(budgets.map((b) => [b.categoryId, b.limitCents]));

  return (
    <>
      <PageTitle
        icon="🎯"
        subtitle="Set a spending limit for each category"
        actions={
          <form action={copyBudgets}>
            <input type="hidden" name="month" value={month} />
            <button className="btn-soft">
              📋 Copy from {formatMonthLabel(addMonths(month, -1))}
            </button>
          </form>
        }
      >
        Budgets
      </PageTitle>
      <MonthNav basePath="/budgets" month={month} />
      <ErrorBanner message={sp.error} />

      {expense.length === 0 ? (
        <EmptyState icon="🏷️" title="No expense categories yet">
          Budgets are set per category.{" "}
          <Link href="/categories" className="font-bold text-lav-deep underline">
            Create a category
          </Link>{" "}
          first.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {expense.map((c) => {
            const limit = limitBy.get(c.id);
            const tone = toneFor(c.id);
            return (
              <li key={c.id} className="card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-extrabold ${tone.bg} ${tone.text}`}
                  >
                    <span aria-hidden className={`size-2.5 rounded-full ${tone.dot}`} />
                    {c.name}
                  </span>
                  <span
                    className={`text-xs font-extrabold ${limit === undefined ? "text-ink-soft" : "text-mint-deep"}`}
                  >
                    {limit === undefined ? "No limit" : "✓ Limit set"}
                  </span>
                </div>

                <form action={saveBudget} className="flex items-end gap-2">
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="categoryId" value={c.id} />
                  <label className="label flex-1">
                    Monthly limit (MUR)
                    <input
                      name="limitCents"
                      defaultValue={limit === undefined ? "" : centsToInput(limit)}
                      placeholder="0.00"
                      inputMode="decimal"
                      required
                      className="input"
                    />
                  </label>
                  <button className="btn">Save</button>
                </form>

                {limit !== undefined && (
                  <ConfirmForm
                    action={clearBudget}
                    message={`Remove the ${c.name} limit for this month?`}
                    className="mt-2"
                  >
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="categoryId" value={c.id} />
                    <button className="btn-danger">Remove limit</button>
                  </ConfirmForm>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
