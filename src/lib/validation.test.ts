import { describe, expect, it } from "vitest";
import { budgetSchema, transactionSchema } from "./validation";

const base = {
  type: "expense",
  accountId: "a1",
  categoryId: "c1",
  amountCents: "12.50",
  date: "2026-10-05",
};

describe("transactionSchema", () => {
  it("converts amounts to cents and empty optionals to null", () => {
    const r = transactionSchema.parse({ ...base, transferAccountId: "", note: "" });
    expect(r.amountCents).toBe(1250);
    expect(r.transferAccountId).toBeNull();
    expect(r.note).toBeNull();
  });

  it("allows negative expenses (refunds) but not negative income", () => {
    expect(transactionSchema.safeParse({ ...base, amountCents: "-5" }).success).toBe(true);
    expect(
      transactionSchema.safeParse({ ...base, type: "income", amountCents: "-5" }).success,
    ).toBe(false);
  });

  it("rejects zero and malformed amounts", () => {
    expect(transactionSchema.safeParse({ ...base, amountCents: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, amountCents: "1.234" }).success).toBe(false);
  });

  it("rejects impossible dates", () => {
    expect(transactionSchema.safeParse({ ...base, date: "2026-02-30" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, date: "2026-2-3" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, date: "2028-02-29" }).success).toBe(true);
  });

  it("requires a category for income/expense and a different destination for transfers", () => {
    expect(transactionSchema.safeParse({ ...base, categoryId: "" }).success).toBe(false);
    const transfer = { ...base, type: "transfer", categoryId: "" };
    expect(transactionSchema.safeParse(transfer).success).toBe(false);
    expect(transactionSchema.safeParse({ ...transfer, transferAccountId: "a1" }).success).toBe(
      false,
    );
    expect(transactionSchema.safeParse({ ...transfer, transferAccountId: "a2" }).success).toBe(
      true,
    );
  });
});

describe("budgetSchema", () => {
  it("parses limit and validates month", () => {
    expect(
      budgetSchema.parse({ categoryId: "c", month: "2026-10", limitCents: "5000" }).limitCents,
    ).toBe(500000);
    expect(
      budgetSchema.safeParse({ categoryId: "c", month: "2026-13", limitCents: "1" }).success,
    ).toBe(false);
    expect(
      budgetSchema.safeParse({ categoryId: "c", month: "2026-10", limitCents: "-1" }).success,
    ).toBe(false);
  });
});
