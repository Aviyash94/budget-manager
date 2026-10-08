import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { monthRange } from "@/lib/month";
import type { Db } from "./db";
import { budgets, categories, transactions } from "./db/schema";

export type CategorySummary = {
  categoryId: string;
  name: string;
  limitCents: number | null;
  spentCents: number;
  /** limit - spent; null when no budget is set. Negative means over budget. */
  remainingCents: number | null;
};

export type MonthSummary = {
  month: string;
  incomeCents: number;
  spentCents: number;
  categories: CategorySummary[];
};

/**
 * Spending = expense transactions (refunds are negative expenses). Transfers are ignored.
 * Always computed from transactions; nothing is cached.
 */
export async function getMonthSummary(
  db: Db,
  userId: string,
  month: string,
): Promise<MonthSummary> {
  const { start, endExclusive } = monthRange(month);

  const totals = await db
    .select({
      type: transactions.type,
      categoryId: transactions.categoryId,
      total: sql<number>`sum(${transactions.amountCents})`.mapWith(Number),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        gte(transactions.date, start),
        lt(transactions.date, endExclusive),
      ),
    )
    .groupBy(transactions.type, transactions.categoryId);

  const limits = await db
    .select({ categoryId: budgets.categoryId, limitCents: budgets.limitCents })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));

  const expenseCategories = await db
    .select({ id: categories.id, name: categories.name, deletedAt: categories.deletedAt })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.kind, "expense")))
    .orderBy(categories.name);

  const spentBy = new Map<string, number>();
  let incomeCents = 0;
  let spentCents = 0;
  for (const row of totals) {
    if (row.type === "income") incomeCents += row.total;
    else if (row.type === "expense") {
      spentCents += row.total;
      if (row.categoryId) spentBy.set(row.categoryId, row.total);
    }
  }
  const limitBy = new Map(limits.map((l) => [l.categoryId, l.limitCents]));

  const rows: CategorySummary[] = [];
  for (const c of expenseCategories) {
    const spent = spentBy.get(c.id) ?? 0;
    const limit = limitBy.get(c.id) ?? null;
    // Soft-deleted categories stay visible only where they have activity in this month.
    if (c.deletedAt && spent === 0 && limit === null) continue;
    rows.push({
      categoryId: c.id,
      name: c.name,
      limitCents: limit,
      spentCents: spent,
      remainingCents: limit === null ? null : limit - spent,
    });
  }

  return { month, incomeCents, spentCents, categories: rows };
}
