import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./db";
import { accounts, budgets, categories, transactions, users } from "./db/schema";
import { getMonthSummary } from "./summary";

let db: Db;

async function seedUser(email: string) {
  const [u] = await db.insert(users).values({ email, passwordHash: "x" }).returning();
  const [acc] = await db
    .insert(accounts)
    .values({ userId: u.id, name: "Main", type: "bank" })
    .returning();
  const [food] = await db
    .insert(categories)
    .values({ userId: u.id, name: "Food", kind: "expense" })
    .returning();
  const [salary] = await db
    .insert(categories)
    .values({ userId: u.id, name: "Salary", kind: "income" })
    .returning();
  return { userId: u.id, accountId: acc.id, foodId: food.id, salaryId: salary.id };
}

beforeEach(async () => {
  db = createDb(":memory:");
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("getMonthSummary", () => {
  it("computes spent and remaining; refunds reduce spending; transfers are ignored", async () => {
    const a = await seedUser("a@test.mu");
    const tx = (
      type: "income" | "expense" | "transfer",
      amountCents: number,
      date: string,
      categoryId: string | null,
    ) => ({ userId: a.userId, accountId: a.accountId, type, amountCents, date, categoryId });

    await db.insert(budgets).values({
      userId: a.userId,
      categoryId: a.foodId,
      month: "2026-10",
      limitCents: 500000,
    });
    await db.insert(transactions).values([
      tx("expense", 150000, "2026-10-01", a.foodId),
      tx("expense", 100000, "2026-10-31", a.foodId),
      tx("expense", -20000, "2026-10-15", a.foodId), // refund
      tx("expense", 999999, "2026-09-30", a.foodId), // previous month
      tx("expense", 999999, "2026-11-01", a.foodId), // next month
      tx("transfer", 300000, "2026-10-10", null),
      tx("income", 8000000, "2026-10-25", a.salaryId),
    ]);

    const s = await getMonthSummary(db, a.userId, "2026-10");
    expect(s.incomeCents).toBe(8000000);
    expect(s.spentCents).toBe(230000);
    expect(s.categories).toEqual([
      {
        categoryId: a.foodId,
        name: "Food",
        limitCents: 500000,
        spentCents: 230000,
        remainingCents: 270000,
      },
    ]);
  });

  it("excludes soft-deleted transactions", async () => {
    const a = await seedUser("a@test.mu");
    await db.insert(transactions).values({
      userId: a.userId,
      accountId: a.accountId,
      categoryId: a.foodId,
      type: "expense",
      amountCents: 1000,
      date: "2026-10-05",
      deletedAt: "2026-10-06",
    });
    const s = await getMonthSummary(db, a.userId, "2026-10");
    expect(s.spentCents).toBe(0);
  });

  it("reports over-budget as negative remaining and null when no budget", async () => {
    const a = await seedUser("a@test.mu");
    await db.insert(transactions).values({
      userId: a.userId,
      accountId: a.accountId,
      categoryId: a.foodId,
      type: "expense",
      amountCents: 1000,
      date: "2026-10-05",
    });
    expect(
      (await getMonthSummary(db, a.userId, "2026-10")).categories[0].remainingCents,
    ).toBeNull();

    await db
      .insert(budgets)
      .values({ userId: a.userId, categoryId: a.foodId, month: "2026-10", limitCents: 400 });
    expect((await getMonthSummary(db, a.userId, "2026-10")).categories[0].remainingCents).toBe(
      -600,
    );
  });

  it("keeps a soft-deleted category only in months where it has activity", async () => {
    const a = await seedUser("a@test.mu");
    await db.insert(transactions).values({
      userId: a.userId,
      accountId: a.accountId,
      categoryId: a.foodId,
      type: "expense",
      amountCents: 1000,
      date: "2026-09-05",
    });
    await db.update(categories).set({ deletedAt: "2026-10-01" });
    expect((await getMonthSummary(db, a.userId, "2026-09")).categories).toHaveLength(1);
    expect((await getMonthSummary(db, a.userId, "2026-10")).categories).toHaveLength(0);
  });

  it("isolates users", async () => {
    const a = await seedUser("a@test.mu");
    const b = await seedUser("b@test.mu");
    await db.insert(transactions).values({
      userId: a.userId,
      accountId: a.accountId,
      categoryId: a.foodId,
      type: "expense",
      amountCents: 5000,
      date: "2026-10-05",
    });
    const s = await getMonthSummary(db, b.userId, "2026-10");
    expect(s.spentCents).toBe(0);
    expect(s.categories.map((c) => c.categoryId)).toEqual([b.foodId]);
    expect(s.categories[0].spentCents).toBe(0);
  });
});
