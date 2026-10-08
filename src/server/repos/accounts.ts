import { and, asc, eq, isNull } from "drizzle-orm";
import type { AccountInput } from "@/lib/validation";
import type { Db } from "../db";
import { accounts } from "../db/schema";
import { NotFoundError } from "../errors";

const mine = (userId: string, id?: string) =>
  and(
    eq(accounts.userId, userId),
    isNull(accounts.deletedAt),
    id ? eq(accounts.id, id) : undefined,
  );

export function listAccounts(db: Db, userId: string) {
  return db.select().from(accounts).where(mine(userId)).orderBy(asc(accounts.name));
}

export async function createAccount(db: Db, userId: string, input: AccountInput) {
  const [row] = await db
    .insert(accounts)
    .values({ ...input, userId })
    .returning();
  return row;
}

export async function updateAccount(db: Db, userId: string, id: string, input: AccountInput) {
  const [row] = await db.update(accounts).set(input).where(mine(userId, id)).returning();
  if (!row) throw new NotFoundError("Account");
  return row;
}

export async function deleteAccount(db: Db, userId: string, id: string) {
  const [row] = await db
    .update(accounts)
    .set({ deletedAt: new Date().toISOString() })
    .where(mine(userId, id))
    .returning({ id: accounts.id });
  if (!row) throw new NotFoundError("Account");
}
