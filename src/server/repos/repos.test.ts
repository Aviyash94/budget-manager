import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { TransactionInput } from "@/lib/validation";
import { createDb, type Db } from "../db";
import { users } from "../db/schema";
import { DomainError, NotFoundError } from "../errors";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "./accounts";
import { copyBudgetsFromPreviousMonth, listBudgets, removeBudget, setBudget } from "./budgets";
import { createCategory, deleteCategory, listCategories, renameCategory } from "./categories";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "./transactions";

let db: Db;

async function seed(email: string) {
  const [u] = await db.insert(users).values({ email, passwordHash: "x" }).returning();
  const userId = u.id;
  const acc = await createAccount(db, userId, {
    name: "Main",
    type: "bank",
    openingBalanceCents: 0,
  });
  const acc2 = await createAccount(db, userId, {
    name: "Cash",
    type: "cash",
    openingBalanceCents: 0,
  });
  const food = await createCategory(db, userId, { name: "Food", kind: "expense" });
  const salary = await createCategory(db, userId, { name: "Salary", kind: "income" });
  return { userId, acc, acc2, food, salary };
}

const expense = (
  s: Awaited<ReturnType<typeof seed>>,
  over: Partial<TransactionInput> = {},
): TransactionInput => ({
  type: "expense",
  accountId: s.acc.id,
  categoryId: s.food.id,
  transferAccountId: null,
  amountCents: 1000,
  date: "2026-10-05",
  note: null,
  ...over,
});

beforeEach(async () => {
  db = createDb(":memory:");
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("user isolation", () => {
  it("lists only the caller's rows", async () => {
    const a = await seed("a@test.mu");
    const b = await seed("b@test.mu");
    await createTransaction(db, a.userId, expense(a));

    expect((await listAccounts(db, b.userId)).every((x) => x.userId === b.userId)).toBe(true);
    expect((await listCategories(db, b.userId)).every((x) => x.userId === b.userId)).toBe(true);
    expect(await listTransactions(db, b.userId, "2026-10")).toHaveLength(0);
    expect(await listTransactions(db, a.userId, "2026-10")).toHaveLength(1);
  });

  it("cannot update or delete another user's rows", async () => {
    const a = await seed("a@test.mu");
    const b = await seed("b@test.mu");
    const tx = await createTransaction(db, a.userId, expense(a));

    const bInput = { name: "x", type: "cash" as const, openingBalanceCents: 0 };
    await expect(updateAccount(db, b.userId, a.acc.id, bInput)).rejects.toThrow(NotFoundError);
    await expect(deleteAccount(db, b.userId, a.acc.id)).rejects.toThrow(NotFoundError);
    await expect(renameCategory(db, b.userId, a.food.id, "x")).rejects.toThrow(NotFoundError);
    await expect(deleteCategory(db, b.userId, a.food.id)).rejects.toThrow(NotFoundError);
    await expect(getTransaction(db, b.userId, tx.id)).rejects.toThrow(NotFoundError);
    await expect(deleteTransaction(db, b.userId, tx.id)).rejects.toThrow(NotFoundError);
    await expect(
      updateTransaction(db, b.userId, tx.id, expense(b, { amountCents: 1 })),
    ).rejects.toThrow(NotFoundError);

    // Still intact for the owner
    expect((await getTransaction(db, a.userId, tx.id)).amountCents).toBe(1000);
  });

  it("cannot attach another user's account or category to a transaction", async () => {
    const a = await seed("a@test.mu");
    const b = await seed("b@test.mu");
    await expect(
      createTransaction(db, b.userId, expense(b, { accountId: a.acc.id })),
    ).rejects.toThrow(NotFoundError);
    await expect(
      createTransaction(db, b.userId, expense(b, { categoryId: a.food.id })),
    ).rejects.toThrow(NotFoundError);
    await expect(
      createTransaction(
        db,
        b.userId,
        expense(b, { type: "transfer", categoryId: null, transferAccountId: a.acc.id }),
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("cannot set or read budgets across users", async () => {
    const a = await seed("a@test.mu");
    const b = await seed("b@test.mu");
    await setBudget(db, a.userId, { categoryId: a.food.id, month: "2026-10", limitCents: 5000 });

    await expect(
      setBudget(db, b.userId, { categoryId: a.food.id, month: "2026-10", limitCents: 1 }),
    ).rejects.toThrow(NotFoundError);
    await expect(removeBudget(db, b.userId, a.food.id, "2026-10")).rejects.toThrow(NotFoundError);
    expect(await listBudgets(db, b.userId, "2026-10")).toHaveLength(0);
    expect(await copyBudgetsFromPreviousMonth(db, b.userId, "2026-11")).toBe(0);
  });
});

describe("transactions", () => {
  it("rejects a kind mismatch between type and category", async () => {
    const s = await seed("a@test.mu");
    await expect(
      createTransaction(db, s.userId, expense(s, { categoryId: s.salary.id })),
    ).rejects.toThrow(DomainError);
    await expect(createTransaction(db, s.userId, expense(s, { type: "income" }))).rejects.toThrow(
      DomainError,
    );
  });

  it("stores transfers without a category and clears stray fields", async () => {
    const s = await seed("a@test.mu");
    const tx = await createTransaction(
      db,
      s.userId,
      expense(s, { type: "transfer", transferAccountId: s.acc2.id }),
    );
    expect(tx.categoryId).toBeNull();
    expect(tx.transferAccountId).toBe(s.acc2.id);

    const plain = await createTransaction(
      db,
      s.userId,
      expense(s, { transferAccountId: s.acc2.id }),
    );
    expect(plain.transferAccountId).toBeNull();
  });

  it("hides soft-deleted rows and refuses deleted references", async () => {
    const s = await seed("a@test.mu");
    const tx = await createTransaction(db, s.userId, expense(s));
    await deleteTransaction(db, s.userId, tx.id);
    expect(await listTransactions(db, s.userId, "2026-10")).toHaveLength(0);
    await expect(deleteTransaction(db, s.userId, tx.id)).rejects.toThrow(NotFoundError);

    await deleteCategory(db, s.userId, s.food.id);
    await expect(createTransaction(db, s.userId, expense(s))).rejects.toThrow(NotFoundError);
    await deleteAccount(db, s.userId, s.acc.id);
    await expect(
      createTransaction(db, s.userId, expense(s, { categoryId: s.food.id })),
    ).rejects.toThrow(NotFoundError);
  });

  it("lists by month with names, newest first", async () => {
    const s = await seed("a@test.mu");
    await createTransaction(db, s.userId, expense(s, { date: "2026-10-01" }));
    await createTransaction(db, s.userId, expense(s, { date: "2026-10-31" }));
    await createTransaction(db, s.userId, expense(s, { date: "2026-11-01" }));
    const rows = await listTransactions(db, s.userId, "2026-10");
    expect(rows.map((r) => r.date)).toEqual(["2026-10-31", "2026-10-01"]);
    expect(rows[0]).toMatchObject({ accountName: "Main", categoryName: "Food" });
  });
});

describe("budgets", () => {
  it("upserts one limit per category and month", async () => {
    const s = await seed("a@test.mu");
    await setBudget(db, s.userId, { categoryId: s.food.id, month: "2026-10", limitCents: 1000 });
    await setBudget(db, s.userId, { categoryId: s.food.id, month: "2026-10", limitCents: 2500 });
    const rows = await listBudgets(db, s.userId, "2026-10");
    expect(rows).toHaveLength(1);
    expect(rows[0].limitCents).toBe(2500);
  });

  it("only allows live expense categories", async () => {
    const s = await seed("a@test.mu");
    await expect(
      setBudget(db, s.userId, { categoryId: s.salary.id, month: "2026-10", limitCents: 1 }),
    ).rejects.toThrow(NotFoundError);
  });

  it("copies the previous month without overwriting existing limits", async () => {
    const s = await seed("a@test.mu");
    const rent = await createCategory(db, s.userId, { name: "Rent", kind: "expense" });
    await setBudget(db, s.userId, { categoryId: s.food.id, month: "2026-09", limitCents: 1000 });
    await setBudget(db, s.userId, { categoryId: rent.id, month: "2026-09", limitCents: 9000 });
    await setBudget(db, s.userId, { categoryId: s.food.id, month: "2026-10", limitCents: 4242 });

    expect(await copyBudgetsFromPreviousMonth(db, s.userId, "2026-10")).toBe(1);
    const byCat = new Map(
      (await listBudgets(db, s.userId, "2026-10")).map((b) => [b.categoryId, b.limitCents]),
    );
    expect(byCat.get(s.food.id)).toBe(4242);
    expect(byCat.get(rent.id)).toBe(9000);
  });

  it("copies across a year boundary and skips deleted categories", async () => {
    const s = await seed("a@test.mu");
    const old = await createCategory(db, s.userId, { name: "Old", kind: "expense" });
    await setBudget(db, s.userId, { categoryId: s.food.id, month: "2026-12", limitCents: 100 });
    await setBudget(db, s.userId, { categoryId: old.id, month: "2026-12", limitCents: 200 });
    await deleteCategory(db, s.userId, old.id);
    expect(await copyBudgetsFromPreviousMonth(db, s.userId, "2027-01")).toBe(1);
  });
});
