# Budget Manager – Research

> Note: written from domain knowledge, without live web searches. Verify library versions and third-party service availability before committing.

## 1. Goal

A web app to manage a personal monthly budget: record income and expenses, set limits per category, and see how much has been spent and what remains.

## 2. Domain specificities

| Specificity           | Why it matters                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Money precision**   | Never use floats. Store amounts as integer minor units (cents) or `DECIMAL`. `0.1 + 0.2 ≠ 0.3` corrupts totals.                                                         |
| **Currency**          | Single currency for v1. Multi-currency needs a currency code per transaction, FX rates and a base currency.                                                             |
| **Budget method**     | Category envelopes (fixed limit per category per month) is the simplest. Zero-based (YNAB style) is more complex. 50/30/20 is just a preset on top of envelopes.        |
| **Month boundaries**  | Budgets are per month, with a rollover decision (carry over unspent or reset). Time zones and a custom "month start day" (e.g. payday on the 25th) are common pitfalls. |
| **Recurring items**   | Rent, subscriptions and salary need a rule (frequency, next date) that generates transactions. Keep separate from one-off expenses.                                     |
| **Transaction model** | Income, expense and transfer between accounts. Transfers must not count as spending. Refunds are negative expenses.                                                     |
| **Edits and history** | Users fix mistakes. Prefer soft deletes and an audit trail so past months stay consistent.                                                                              |
| **Reporting**         | Spent vs. budgeted per category, remaining, monthly trend, top categories, month-end forecast.                                                                          |
| **Import**            | CSV import from the bank (with de-duplication) is the most valuable feature after the basics.                                                                           |

## 3. Recommended approach

Build in layers:

1. **v1 (core):** accounts, categories, transactions (income/expense), monthly budget per category, dashboard with spent / remaining / progress bars.
2. **v2:** recurring transactions, CSV import, charts (monthly trend, category breakdown), rollover.
3. **v3 (optional):** savings goals, multi-currency, shared budgets, bank sync.

**Architecture:** simple monolith, REST or typed API in front of a relational database. The data is relational (transactions → categories → budgets, with sums and group-bys), so use SQL. Microservices or NoSQL would be overkill.

## 4. Technology options

### Option A – Full-stack TypeScript (recommended)

- **Next.js** (React) for UI and API routes in one project
- **PostgreSQL** with **Prisma** or **Drizzle** (SQLite is fine for local or single-user)
- **Auth.js** (NextAuth) or Clerk for authentication
- **Tailwind + shadcn/ui** for UI, **Recharts** for charts
- **Zod** for validation, **Vitest** and **Playwright** for tests
- Deploy on Vercel with Neon or Supabase for Postgres

### Option B – Separate backend

- Python (FastAPI + SQLAlchemy) or .NET, with a React or Vue front end. Choose if you are stronger in that language. More setup for the same result.

### Option C – Simplest, single user

- SvelteKit or Next.js with SQLite, data kept on your machine or one small server. Fastest to ship, no hosting cost.

## 5. Limitations and risks

- **Security and privacy:** sensitive financial data. Needs hashed passwords or OAuth, HTTPS, per-user data isolation (check `userId` on every query) and backups. A local or self-hosted setup avoids most of this for personal use.
- **Bank sync:** needs an aggregator (Plaid, GoCardless/Nordigen, Tink). Coverage depends on country, has fees and compliance overhead. Not realistic for v1, so use CSV import.
- **CSV formats vary by bank:** needs column mapping, date and decimal-format handling, and duplicate detection.
- **Auto-categorization:** keyword rules work. ML categorization is inaccurate without much data.
- **Mobile:** responsive web or PWA covers quick entry. A native app is a separate effort.
- **Scope creep:** goals, debts, investments and shared budgets invite endless features. Fix v1 scope early.
- **Not financial or tax advice:** keep the app to tracking, not recommendations.

## 6. Open questions

1. Users: just one person, or multiple users and households?
2. Currency: single or several?
3. Budget style: category envelopes (suggested) or zero-based?
4. Data entry: manual only, or CSV import from the start?
5. Hosting: local or self-hosted, or cloud?
6. Language preference: TypeScript or another stack?

## 7. Next steps

1. Answer the open questions above.
2. Design the data model (users, accounts, categories, transactions, budgets, recurring rules).
3. Write the v1 feature backlog.
4. Scaffold the project and set up the database and auth.
