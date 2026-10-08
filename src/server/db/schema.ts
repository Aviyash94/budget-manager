import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`);

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  /** ISO time of the last password reset. Sessions issued before it are rejected (see requireUser). */
  passwordChangedAt: text("password_changed_at"),
  createdAt: createdAt(),
});

/** Only the SHA-256 of the emailed token is stored, so a database leak can't be used to reset accounts. */
export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    /** ISO timestamps; compared as strings. */
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
  },
  (t) => [
    uniqueIndex("password_reset_tokens_hash_uq").on(t.tokenHash),
    index("password_reset_tokens_user_idx").on(t.userId),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    type: text("type", { enum: ["cash", "bank", "card"] }).notNull(),
    openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
    createdAt: createdAt(),
    deletedAt: text("deleted_at"),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["income", "expense"] }).notNull(),
    createdAt: createdAt(),
    deletedAt: text("deleted_at"),
  },
  (t) => [index("categories_user_idx").on(t.userId)],
);

/** amountCents is an integer. Refunds are expenses with a negative amount. */
export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    categoryId: text("category_id").references(() => categories.id),
    type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** Local calendar date, YYYY-MM-DD. */
    date: text("date").notNull(),
    note: text("note"),
    transferAccountId: text("transfer_account_id").references(() => accounts.id),
    createdAt: createdAt(),
    deletedAt: text("deleted_at"),
  },
  (t) => [index("transactions_user_date_idx").on(t.userId, t.date)],
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    /** YYYY-MM */
    month: text("month").notNull(),
    limitCents: integer("limit_cents").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("budgets_user_cat_month_uq").on(t.userId, t.categoryId, t.month)],
);
