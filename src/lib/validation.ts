import { z } from "zod";
import { isMonth } from "./month";
import { parseMoneyToCents } from "./money";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const credentialsSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"), // bcrypt ignores bytes past 72
});

/** Form string like "1,234.50" -> integer cents. */
const money = z.string().transform((s, ctx) => {
  const cents = parseMoneyToCents(s);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount (max 2 decimals)" });
    return z.NEVER;
  }
  return cents;
});

const name = z.string().trim().min(1, "Name is required").max(80, "Name is too long");

const date = z
  .string()
  .refine(
    (s) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s,
    "Enter a valid date",
  );

const month = z.string().refine(isMonth, "Enter a valid month");

const optionalId = z
  .string()
  .optional()
  .transform((s) => (s ? s : null));

export const accountSchema = z.object({
  name,
  type: z.enum(["cash", "bank", "card"]),
  openingBalanceCents: money,
});
export type AccountInput = z.infer<typeof accountSchema>;

export const categorySchema = z.object({
  name,
  kind: z.enum(["income", "expense"]),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    accountId: z.string().min(1, "Choose an account"),
    categoryId: optionalId,
    transferAccountId: optionalId,
    amountCents: money,
    date,
    note: z
      .string()
      .trim()
      .max(200, "Note is too long")
      .optional()
      .transform((s) => s || null),
  })
  .superRefine((t, ctx) => {
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (t.amountCents === 0) fail("amountCents", "Amount cannot be zero");
    // Only expenses may be negative (refunds).
    else if (t.type !== "expense" && t.amountCents < 0)
      fail("amountCents", "Amount must be positive");
    if (t.type === "transfer") {
      if (!t.transferAccountId) fail("transferAccountId", "Choose the destination account");
      else if (t.transferAccountId === t.accountId)
        fail("transferAccountId", "Accounts must differ");
    } else if (!t.categoryId) {
      fail("categoryId", "Choose a category");
    }
  });
export type TransactionInput = z.infer<typeof transactionSchema>;

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  month,
  limitCents: money.refine((c) => c >= 0, "Limit cannot be negative"),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

export const monthSchema = month;
