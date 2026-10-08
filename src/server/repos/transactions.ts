import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { monthRange } from "@/lib/month";
import type { TransactionInput } from "@/lib/validation";
import type { Db } from "../db";
import { accounts, categories, transactions } from "../db/schema";
import { DomainError, NotFoundError } from "../errors";

const mine = (userId: string, id?: string) =>
  and(
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
    id ? eq(transactions.id, id) : undefined,
  );

/** Every referenced row must belong to the user and be live. Throws otherwise. */
async function checkReferences(db: Db, userId: string, input: TransactionInput) {
  const ownsAccount = async (id: string) => {
    const [a] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId), isNull(accounts.deletedAt)));
    return !!a;
  };

  if (!(await ownsAccount(input.accountId))) throw new NotFoundError("Account");

  if (input.type === "transfer") {
    if (!input.transferAccountId || !(await ownsAccount(input.transferAccountId))) {
      throw new NotFoundError("Destination account");
    }
    return;
  }

  const [cat] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(
      and(
        eq(categories.id, input.categoryId ?? ""),
        eq(categories.userId, userId),
        isNull(categories.deletedAt),
      ),
    );
  if (!cat) throw new NotFoundError("Category");
  if (cat.kind !== input.type) {
    throw new DomainError(`An ${input.type} needs an ${input.type} category`);
  }
}

/** Transfers carry no category; income/expense carry no destination account. */
function toRow(input: TransactionInput) {
  const isTransfer = input.type === "transfer";
  return {
    type: input.type,
    accountId: input.accountId,
    amountCents: input.amountCents,
    date: input.date,
    note: input.note,
    categoryId: isTransfer ? null : input.categoryId,
    transferAccountId: isTransfer ? input.transferAccountId : null,
  };
}

export async function listTransactions(db: Db, userId: string, month: string) {
  const { start, endExclusive } = monthRange(month);
  const dest = alias(accounts, "dest");
  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountCents: transactions.amountCents,
      date: transactions.date,
      note: transactions.note,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      transferAccountId: transactions.transferAccountId,
      transferAccountName: dest.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(dest, eq(dest.id, transactions.transferAccountId))
    .where(and(mine(userId), gte(transactions.date, start), lt(transactions.date, endExclusive)))
    .orderBy(desc(transactions.date), desc(transactions.createdAt));
}

export async function getTransaction(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(transactions).where(mine(userId, id));
  if (!row) throw new NotFoundError("Transaction");
  return row;
}

export async function createTransaction(db: Db, userId: string, input: TransactionInput) {
  await checkReferences(db, userId, input);
  const [row] = await db
    .insert(transactions)
    .values({ ...toRow(input), userId })
    .returning();
  return row;
}

export async function updateTransaction(
  db: Db,
  userId: string,
  id: string,
  input: TransactionInput,
) {
  await checkReferences(db, userId, input);
  const [row] = await db.update(transactions).set(toRow(input)).where(mine(userId, id)).returning();
  if (!row) throw new NotFoundError("Transaction");
  return row;
}

export async function deleteTransaction(db: Db, userId: string, id: string) {
  const [row] = await db
    .update(transactions)
    .set({ deletedAt: new Date().toISOString() })
    .where(mine(userId, id))
    .returning({ id: transactions.id });
  if (!row) throw new NotFoundError("Transaction");
}
