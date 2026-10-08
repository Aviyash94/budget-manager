"use client";

import Link from "next/link";
import { useState } from "react";
import { centsToInput } from "@/lib/money";
import type { accounts, categories, transactions } from "@/server/db/schema";

type Account = typeof accounts.$inferSelect;
type Category = typeof categories.$inferSelect;
type Tx = typeof transactions.$inferSelect;
type TxType = "expense" | "income" | "transfer";

const TYPES: { value: TxType; label: string; icon: string; active: string }[] = [
  {
    value: "expense",
    label: "Expense",
    icon: "🛍️",
    active: "bg-pink text-pink-deep ring-pink-deep/30",
  },
  {
    value: "income",
    label: "Income",
    icon: "💰",
    active: "bg-mint text-mint-deep ring-mint-deep/30",
  },
  {
    value: "transfer",
    label: "Transfer",
    icon: "🔁",
    active: "bg-sky text-sky-deep ring-sky-deep/30",
  },
];

/**
 * Shows only the fields relevant to the chosen type and only categories of the matching kind.
 * The server still validates everything (kind, ownership), so this is a convenience, not a guard.
 */
export function TransactionForm({
  action,
  accounts,
  categories,
  month,
  today,
  tx,
  submitLabel,
  cancelHref,
}: {
  action: (fd: FormData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  month?: string;
  today: string;
  tx?: Tx;
  submitLabel: string;
  cancelHref?: string;
}) {
  const [type, setType] = useState<TxType>(tx?.type ?? "expense");
  const [accountId, setAccountId] = useState(tx?.accountId ?? accounts[0]?.id ?? "");
  const isTransfer = type === "transfer";
  const kindCategories = categories.filter((c) => c.kind === type);

  return (
    <form action={action} className="card mb-6 space-y-4">
      {tx && <input type="hidden" name="id" value={tx.id} />}
      {month && <input type="hidden" name="month" value={month} />}

      <fieldset>
        <legend className="label mb-1.5">What happened?</legend>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-sm font-extrabold ring-2 transition has-[:focus-visible]:ring-4 ${
                type === t.value
                  ? `${t.active} ring-2`
                  : "bg-white text-ink-soft ring-lav-soft hover:bg-lav-soft/50"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          Amount (MUR)
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-extrabold text-ink-soft"
            >
              Rs
            </span>
            <input
              name="amountCents"
              required
              inputMode="decimal"
              autoComplete="off"
              defaultValue={tx ? centsToInput(tx.amountCents) : ""}
              placeholder="0.00"
              className="input pl-10 text-base font-extrabold"
            />
          </div>
          {type === "expense" && (
            <span className="font-semibold">Use a negative amount for a refund.</span>
          )}
        </label>

        <label className="label">
          Date
          <input
            name="date"
            type="date"
            required
            defaultValue={tx?.date ?? today}
            className="input"
          />
        </label>

        <label className="label">
          {isTransfer ? "From account" : "Account"}
          <select
            name="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            className="input"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {isTransfer ? (
          <label className="label">
            To account
            <select
              name="transferAccountId"
              required
              defaultValue={tx?.transferAccountId ?? ""}
              className="input"
            >
              <option value="" disabled>
                Choose…
              </option>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
            <span className="font-semibold">
              Transfers move money and don&apos;t count as spending.
            </span>
          </label>
        ) : (
          <label className="label">
            Category
            <select
              key={type}
              name="categoryId"
              required
              defaultValue={tx?.categoryId && tx.type === type ? tx.categoryId : ""}
              className="input"
            >
              <option value="" disabled>
                Choose…
              </option>
              {kindCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {kindCategories.length === 0 && (
              <span className="font-semibold text-pink-deep">
                No {type} categories yet.{" "}
                <Link href="/categories" className="underline">
                  Create one
                </Link>
              </span>
            )}
          </label>
        )}

        <label className="label sm:col-span-2">
          Note (optional)
          <input
            name="note"
            maxLength={200}
            defaultValue={tx?.note ?? ""}
            placeholder="e.g. Lunch with Sam"
            className="input"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn">{submitLabel}</button>
        {cancelHref && (
          <Link href={cancelHref} className="btn-soft">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
