import { and, eq, isNull } from "drizzle-orm";
import { addMonths } from "@/lib/month";
import type { BudgetInput } from "@/lib/validation";
import type { Db } from "../db";
import { budgets, categories } from "../db/schema";
import { NotFoundError } from "../errors";

async function requireLiveExpenseCategory(db: Db, userId: string, categoryId: string) {
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.userId, userId),
        eq(categories.kind, "expense"),
        isNull(categories.deletedAt),
      ),
    );
  if (!cat) throw new NotFoundError("Category");
}

export function listBudgets(db: Db, userId: string, month: string) {
  return db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
}

/** One limit per (category, month); setting it again replaces the previous limit. */
export async function setBudget(db: Db, userId: string, input: BudgetInput) {
  await requireLiveExpenseCategory(db, userId, input.categoryId);
  const [row] = await db
    .insert(budgets)
    .values({ ...input, userId })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: { limitCents: input.limitCents },
    })
    .returning();
  return row;
}

export async function removeBudget(db: Db, userId: string, categoryId: string, month: string) {
  const [row] = await db
    .delete(budgets)
    .where(
      and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId), eq(budgets.month, month)),
    )
    .returning({ id: budgets.id });
  if (!row) throw new NotFoundError("Budget");
}

/** Copies the previous month's limits into `month`. Existing limits are kept. Returns rows added. */
export async function copyBudgetsFromPreviousMonth(db: Db, userId: string, month: string) {
  const previous = await db
    .select({ categoryId: budgets.categoryId, limitCents: budgets.limitCents })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.month, addMonths(month, -1)),
        isNull(categories.deletedAt),
      ),
    );
  if (previous.length === 0) return 0;

  const added = await db
    .insert(budgets)
    .values(previous.map((p) => ({ ...p, userId, month })))
    .onConflictDoNothing()
    .returning({ id: budgets.id });
  return added.length;
}
