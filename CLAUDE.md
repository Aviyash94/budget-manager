# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

All v1 phases in [PLAN.md](PLAN.md) are built and tested locally: scaffold, schema, auth, per-user repositories, CRUD screens, dashboard, Playwright smoke test (desktop + phone). Not yet done: creating the real Turso database and Vercel project; follow [DEPLOY.md](DEPLOY.md). v2 (CSV import, recurring transactions, charts, rollover) has not been started.

- Schema: `src/server/db/schema.ts` (migrations in `drizzle/`). Money helpers: `src/lib/money.ts`. Month/time zone helpers: `src/lib/month.ts`. Summary: `src/server/summary.ts`.
- Auth: `src/auth.ts`, gate in `src/proxy.ts`. Server code gets the user via `requireUser()` (`src/server/session.ts`).
- Data access: `src/server/repos/*` (every function takes `userId`; isolation tests in `repos.test.ts`). Pages and server actions live in `src/app/(app)/`; actions redirect back with `?error=` on expected failures (`guarded()` in `actions.ts`).
- UI: pastel theme as tokens in `src/app/globals.css` (`@theme` colours plus `.card`, `.btn`, `.input` classes). Fills are pastel; text is always `ink` or a `-deep` shade so contrast stays readable. Shared helpers in `src/app/(app)/ui.tsx`; deletes go through `ConfirmForm`. `MobileTabBar` must stay outside any element with `backdrop-filter` or `transform`, which would break its `position: fixed`.
- `cacheComponents` is deliberately off in `next.config.ts`: every page is per-user and dynamic, and it forces Suspense around all request-time reads.
- Self-hosting with `next start` needs `AUTH_TRUST_HOST=true` (Vercel sets it).
- Needs `.env.local` with `AUTH_SECRET` (see `.env.example`). Tests use in-memory libSQL with the `drizzle/` migrations.

## Commands

- `npm run dev`: dev server. `npm run build` / `npm start`: production build.
- `npm run lint`, `npm run typecheck`, `npm run format`.
- `npm test`: Vitest (single file: `npx vitest run path/to/file.test.ts`).
- `npm run test:e2e`: Playwright smoke test on desktop and phone sizes. It builds into `.next-e2e` and uses `e2e.db` on port 3100, so it can run while `next dev` is up. Set `PW_CHANNEL=msedge` (or `chrome`) to use an installed browser instead of downloading Chromium.
- `npm run db:generate` / `npm run db:migrate`: Drizzle migrations (`DATABASE_URL`, default `file:./local.db`). Copy `.env.example` to `.env.local`.
- If `LayoutProps`/`PageProps` types are missing, run `npx next typegen`.

## Docs

- [PLAN.md](PLAN.md): v1 data model, phases, testing.
- [RESEARCH.md](RESEARCH.md): domain notes, v1/v2/v3 layering, risks.
- [DECISIONS.md](DECISIONS.md): the choices below, with hosting alternatives considered. Keep it updated when a decision changes.

## Decided stack and constraints

- Personal monthly budget web app, multi-user (email + password via Auth.js credentials).
- Next.js (TypeScript) with Drizzle ORM. Local dev uses a SQLite file. Production is Vercel with Turso (hosted libSQL), because Vercel's disk is not persistent. Keep the Drizzle code portable between the two.
- Single currency: MUR. Store all amounts as integer cents, never floats.
- Budget style: category envelopes (a monthly limit per category).
- v1 scope: accounts, categories, income/expense transactions, monthly budget per category, dashboard (spent / remaining / progress). Manual entry only. CSV import, recurring transactions, charts and rollover are v2.

## Domain rules to preserve

- Every query must filter by `userId` (per-user data isolation).
- Transfers between accounts are not spending. Refunds are negative expenses.
- Prefer soft deletes so past months stay consistent.
- Watch month boundaries and time zones when computing monthly totals.
