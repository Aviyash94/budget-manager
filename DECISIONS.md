# Budget Manager – Decisions

Decided 2026-10-08, answering the open questions in RESEARCH.md.

| Topic           | Decision                                                                          |
| --------------- | --------------------------------------------------------------------------------- |
| Users           | Multiple users (accounts, per-user data isolation: check `userId` on every query) |
| Stack           | Next.js (TypeScript) + SQLite                                                     |
| Authentication  | Email + password (Auth.js credentials, hashed passwords)                          |
| Data entry (v1) | Manual only. CSV import is deferred to v2                                         |
| Currency        | MUR (Mauritian rupee), single currency, amounts stored as integer cents           |
| Budget style    | Category envelopes (monthly limit per category)                                   |
| Hosting         | Vercel + Turso (hosted SQLite/libSQL), Drizzle ORM                                |

## Hosting: decided (Vercel + Turso)

Options considered:

GitHub Pages only serves static files. It cannot run the Next.js server, authentication or a database, so it does not fit a multi-user app with logins.

Free options that do fit:

| Option                         | Database                                | Notes                                                                                                 |
| ------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Vercel + Turso** (suggested) | Turso (hosted SQLite/libSQL, free tier) | Keeps SQLite semantics. Vercel's disk is not persistent, so a plain SQLite file cannot be used there. |
| Cloudflare Pages/Workers + D1  | D1 (SQLite-compatible, free tier)       | Needs a Cloudflare-specific adapter.                                                                  |
| Render free web service        | SQLite file                             | Disk is wiped on redeploy and the service sleeps when idle, so data would be lost. Not suitable.      |
| Local or home server           | SQLite file                             | Free, simplest, but not reachable from outside without extra setup.                                   |

Free tiers change, so verify limits before committing. Using Drizzle as the ORM keeps the choice reversible (same code for local SQLite and Turso).

## Remaining to decide

- Next step: data model and v1 backlog, then scaffold.
