"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currentMonth, isMonth } from "@/lib/month";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  monthSchema,
  transactionSchema,
} from "@/lib/validation";
import { getDb } from "@/server/db";
import { DomainError, NotFoundError } from "@/server/errors";
import { createAccount, deleteAccount, updateAccount } from "@/server/repos/accounts";
import { copyBudgetsFromPreviousMonth, removeBudget, setBudget } from "@/server/repos/budgets";
import { createCategory, deleteCategory, renameCategory } from "@/server/repos/categories";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/server/repos/transactions";
import { requireUser } from "@/server/session";

const parse = <T extends z.ZodType>(schema: T, fd: FormData): z.output<T> =>
  schema.parse(Object.fromEntries(fd));

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

const monthOf = (fd: FormData) => {
  const m = text(fd, "month");
  return isMonth(m) ? m : currentMonth();
};

function withError(path: string, message: string) {
  const url = new URL(path, "http://x");
  url.searchParams.set("error", message);
  return url.pathname + url.search;
}

/**
 * Runs a mutation, then redirects. Expected failures (validation, ownership, business rules)
 * go back to the form with ?error=...; anything else is a real bug and propagates.
 */
async function guarded(back: string, fn: () => Promise<string | void>): Promise<never> {
  let target = back;
  try {
    target = (await fn()) ?? back;
  } catch (e) {
    if (e instanceof z.ZodError) target = withError(back, e.issues[0].message);
    else if (e instanceof DomainError || e instanceof NotFoundError)
      target = withError(back, e.message);
    else throw e;
  }
  redirect(target);
}

const ctx = async () => ({ db: getDb(), ...(await requireUser()) });

// Accounts
export async function addAccount(fd: FormData) {
  await guarded("/accounts", async () => {
    const { db, userId } = await ctx();
    await createAccount(db, userId, parse(accountSchema, fd));
  });
}
export async function editAccount(fd: FormData) {
  await guarded("/accounts", async () => {
    const { db, userId } = await ctx();
    await updateAccount(db, userId, text(fd, "id"), parse(accountSchema, fd));
  });
}
export async function removeAccount(fd: FormData) {
  await guarded("/accounts", async () => {
    const { db, userId } = await ctx();
    await deleteAccount(db, userId, text(fd, "id"));
  });
}

// Categories
export async function addCategory(fd: FormData) {
  await guarded("/categories", async () => {
    const { db, userId } = await ctx();
    await createCategory(db, userId, parse(categorySchema, fd));
  });
}
export async function editCategory(fd: FormData) {
  await guarded("/categories", async () => {
    const { db, userId } = await ctx();
    const { name } = parse(categorySchema.pick({ name: true }), fd);
    await renameCategory(db, userId, text(fd, "id"), name);
  });
}
export async function removeCategory(fd: FormData) {
  await guarded("/categories", async () => {
    const { db, userId } = await ctx();
    await deleteCategory(db, userId, text(fd, "id"));
  });
}

// Transactions
export async function addTransaction(fd: FormData) {
  await guarded(`/transactions?month=${monthOf(fd)}`, async () => {
    const { db, userId } = await ctx();
    const input = parse(transactionSchema, fd);
    await createTransaction(db, userId, input);
    return `/transactions?month=${input.date.slice(0, 7)}`;
  });
}
export async function editTransaction(fd: FormData) {
  const id = text(fd, "id");
  await guarded(`/transactions/${encodeURIComponent(id)}/edit`, async () => {
    const { db, userId } = await ctx();
    const input = parse(transactionSchema, fd);
    await updateTransaction(db, userId, id, input);
    return `/transactions?month=${input.date.slice(0, 7)}`;
  });
}
export async function removeTransaction(fd: FormData) {
  await guarded(`/transactions?month=${monthOf(fd)}`, async () => {
    const { db, userId } = await ctx();
    await deleteTransaction(db, userId, text(fd, "id"));
  });
}

// Budgets
export async function saveBudget(fd: FormData) {
  const month = monthOf(fd);
  await guarded(`/budgets?month=${month}`, async () => {
    const { db, userId } = await ctx();
    await setBudget(db, userId, parse(budgetSchema, fd));
  });
}
export async function clearBudget(fd: FormData) {
  const month = monthOf(fd);
  await guarded(`/budgets?month=${month}`, async () => {
    const { db, userId } = await ctx();
    await removeBudget(db, userId, text(fd, "categoryId"), monthSchema.parse(month));
  });
}
export async function copyBudgets(fd: FormData) {
  const month = monthOf(fd);
  await guarded(`/budgets?month=${month}`, async () => {
    const { db, userId } = await ctx();
    const added = await copyBudgetsFromPreviousMonth(db, userId, month);
    if (added === 0) throw new DomainError("Nothing to copy from the previous month");
  });
}
