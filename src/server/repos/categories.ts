import { and, asc, eq, isNull } from "drizzle-orm";
import type { CategoryInput } from "@/lib/validation";
import type { Db } from "../db";
import { categories } from "../db/schema";
import { NotFoundError } from "../errors";

const mine = (userId: string, id?: string) =>
  and(
    eq(categories.userId, userId),
    isNull(categories.deletedAt),
    id ? eq(categories.id, id) : undefined,
  );

export function listCategories(db: Db, userId: string) {
  return db
    .select()
    .from(categories)
    .where(mine(userId))
    .orderBy(asc(categories.kind), asc(categories.name));
}

export async function createCategory(db: Db, userId: string, input: CategoryInput) {
  const [row] = await db
    .insert(categories)
    .values({ ...input, userId })
    .returning();
  return row;
}

/** Kind is fixed after creation: changing it would reclassify past transactions. */
export async function renameCategory(db: Db, userId: string, id: string, name: string) {
  const [row] = await db.update(categories).set({ name }).where(mine(userId, id)).returning();
  if (!row) throw new NotFoundError("Category");
  return row;
}

/** Soft delete: past months keep their numbers, but the category can't be used for new entries. */
export async function deleteCategory(db: Db, userId: string, id: string) {
  const [row] = await db
    .update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(mine(userId, id))
    .returning({ id: categories.id });
  if (!row) throw new NotFoundError("Category");
}
