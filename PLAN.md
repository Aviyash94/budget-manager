# Budget Manager – Implementation Plan (v1)

Follows [DECISIONS.md](DECISIONS.md). Scope: accounts, categories, income/expense transactions, monthly budget per category, dashboard.

## Data model (Drizzle, libSQL/SQLite)

Text IDs, `createdAt` everywhere, `deletedAt` on user-editable tables.

| Table          | Key columns                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`        | id, email (unique), passwordHash                                                                                                                             |
| `accounts`     | id, userId, name, type (cash/bank/card), openingBalanceCents, deletedAt                                                                                      |
| `categories`   | id, userId, name, kind (income/expense), deletedAt                                                                                                           |
| `transactions` | id, userId, accountId, categoryId (null for transfers), type (income/expense/transfer), amountCents, date (`YYYY-MM-DD`), note, transferAccountId, deletedAt |
| `budgets`      | id, userId, categoryId, month (`YYYY-MM`), limitCents; unique (userId, categoryId, month)                                                                    |

- Refunds are expenses with negative amounts; transfers are excluded from spending.
- Dates are local calendar-date strings (Mauritius, UTC+4, no DST). Month bucketing is string-range based, never Date conversion.

## Phases

1. **Scaffold**: Next.js + TS + Tailwind, Drizzle + libSQL client (`file:` URL locally, Turso in prod), Zod, Vitest, ESLint/Prettier. Update CLAUDE.md commands.
2. **Auth**: Auth.js credentials, password hashing, register/login, middleware, `requireUser()`.
3. **Data layer**: repositories (every function takes `userId`, excludes soft-deleted), money helpers (parse/format cents), `getMonthSummary(userId, month)`.
4. **CRUD UI**: accounts, categories, transactions (month-filtered), budgets (with copy-from-previous-month). Server actions + Zod.
5. **Dashboard**: month picker, per-category progress bars, income/spent/remaining totals, over-budget state.
6. **Hardening and deploy**: isolation tests, Turso DB + migrations, Vercel env vars, mobile check.

## Testing

- Vitest: money helpers, month boundaries, refund/transfer handling in summary.
- Cross-user isolation tests for every repository function.
- One Playwright smoke test of the main flow.

## Risks

- Verify Turso/Vercel free-tier limits and current library versions before pinning.
- Soft-deleted categories stay in past totals but can't be chosen for new transactions.
- Editing a transaction's date moves it between months; compute summaries from transactions, not cached totals.
