# Deploying to Vercel + Turso

Everything here needs your own accounts, so it is a checklist, not something that has been run.
Free-tier limits and CLI syntax change: confirm them in the Turso and Vercel docs before you start.

What has already been verified locally: the production build passes, the migrations apply to a fresh
libSQL database, and the Playwright smoke test (`npm run test:e2e`) passes against a production server.
What has **not** been tested: a real Turso database and a real Vercel deployment.

## 1. Put the code in Git

The project is not a git repository yet.

```bash
git init
git add .
git commit -m "Initial commit"
```

Push it to GitHub (or GitLab/Bitbucket) so Vercel can import it. `.env.local`, `*.db` and the test
output folders are already git-ignored; check `git status` shows no secrets before the first push.

## 2. Create the Turso database

```bash
turso auth login
turso db create budget-manager          # pick a region close to your Vercel region
turso db show budget-manager --url      # -> libsql://budget-manager-<org>.turso.io
turso db tokens create budget-manager   # -> the auth token (keep it secret)
```

## 3. Apply the migrations to Turso

From your machine, with the two values from step 2:

```powershell
$env:DATABASE_URL = "libsql://budget-manager-<org>.turso.io"
$env:TURSO_AUTH_TOKEN = "<token>"
npm run db:migrate
```

Do this again whenever you change `src/server/db/schema.ts` (`npm run db:generate` first, commit the new
file in `drizzle/`, then migrate **before** deploying the code that needs it).

## 4. Create the Vercel project

Import the repository in Vercel (framework preset: Next.js, no custom build settings), then add these
environment variables for Production (and Preview if you use previews):

| Name               | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| `DATABASE_URL`     | the `libsql://...` URL                                                        |
| `TURSO_AUTH_TOKEN` | the token from step 2                                                         |
| `AUTH_SECRET`      | a fresh random string: `openssl rand -base64 32` (do not reuse the local one) |

`AUTH_TRUST_HOST` is set automatically on Vercel. Deploy.

## 5. Check the live site

- [ ] `/` redirects to `/login` when signed out
- [ ] Register a user, create an account, a category, a budget and a transaction; the dashboard
      numbers match what you entered
- [ ] Sign out and back in
- [ ] Open it on a phone: the bottom tab bar is visible and nothing scrolls sideways
- [ ] Register a second user: they see none of the first user's data
- [ ] Turso dashboard shows rows in `users` and `transactions`

## Notes

- **Backups:** Turso offers point-in-time restore and dumps (`turso db shell budget-manager .dump`).
  Check what your plan includes. Financial data is worth a periodic dump.
- **Passwords:** bcrypt (cost 12) via `bcryptjs`. There is no password reset or email verification yet;
  a forgotten password cannot be recovered. Add this before inviting people you cannot help in person.
- **Rate limiting:** there is none on login or sign-up. Fine for a private deployment; add it before
  making the site public.
- **Rotating `AUTH_SECRET`** signs everyone out (sessions are JWTs signed with it).
