# Budget Manager

A personal monthly budget app: record income and expenses, set a spending limit per category, and see
what is spent and what is left. Single currency (MUR), multi-user (email + password).

Built with Next.js, TypeScript, Tailwind, Drizzle ORM and SQLite (libSQL / Turso in production).

## Run it locally

```bash
npm install
cp .env.example .env.local     # then set AUTH_SECRET to any long random string
npm run db:migrate             # creates local.db
npm run dev                    # http://localhost:3000
```

## Scripts

| Command                                 | What it does                                               |
| --------------------------------------- | ---------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js dev server, production build, production server    |
| `npm test`                              | Unit and integration tests (Vitest, in-memory database)    |
| `npm run test:e2e`                      | Browser smoke test (Playwright) on desktop and phone sizes |
| `npm run typecheck` / `lint` / `format` | Checks and formatting                                      |
| `npm run db:generate` / `db:migrate`    | Create / apply Drizzle migrations                          |

The e2e test builds and serves the app on port 3100 with its own throw-away database. It uses
Playwright's Chromium by default (`npx playwright install chromium` once); to use a browser you already
have, set `PW_CHANNEL=msedge` or `PW_CHANNEL=chrome`.

## More

- [PLAN.md](PLAN.md): the implementation plan and data model
- [DECISIONS.md](DECISIONS.md): stack and hosting decisions
- [DEPLOY.md](DEPLOY.md): deploying to Vercel + Turso
- [RESEARCH.md](RESEARCH.md): domain notes
- [CLAUDE.md](CLAUDE.md): guidance for Claude Code
