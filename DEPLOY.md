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

| Name                   | Value                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | the `libsql://...` URL                                                                 |
| `TURSO_AUTH_TOKEN`     | the token from step 2                                                                  |
| `AUTH_SECRET`          | a fresh random string: `openssl rand -base64 32` (do not reuse the local one)          |
| `NEXT_PUBLIC_SITE_URL` | your public URL, no trailing slash, e.g. `https://budget-manager-ten-omega.vercel.app` |
| `RESEND_API_KEY`       | API key for password-reset emails (see "Password-reset emails" below)                  |
| `EMAIL_FROM`           | sender, e.g. `Budget Manager <noreply@your-domain.example>`                            |

`AUTH_TRUST_HOST` is set automatically on Vercel. `NEXT_PUBLIC_SITE_URL` is baked in at build time, so
**redeploy after changing it**. Deploy.

## Password-reset emails

Forgot-password emails a one-hour, single-use link. It needs an email provider; the code uses
[Resend](https://resend.com) through its HTTP API (no extra dependency). Setup:

1. Create a Resend account and an API key.
2. **Verify a sending domain** in Resend and use an address on it for `EMAIL_FROM`. Resend's shared test
   sender (`onboarding@resend.dev`) can normally only deliver to your own account email, so it will not
   reach other users. Check Resend's current rules for your plan.
3. Set `RESEND_API_KEY`, `EMAIL_FROM` and `NEXT_PUBLIC_SITE_URL` in Vercel and redeploy.

Without a provider the app still answers the form normally, but **no email is sent** and the server log
shows `password reset email failed`. Check Vercel's function logs if users say nothing arrives.
Using another provider means replacing the `fetch` call in `src/server/email.ts`.

**Order matters when upgrading an existing deployment:** run `npm run db:migrate` against Turso first
(the migration only adds a table and a nullable column, so the old code keeps working), then deploy.

## 5. Check the live site

- [ ] `/` redirects to `/login` when signed out
- [ ] Register a user, create an account, a category, a budget and a transaction; the dashboard
      numbers match what you entered
- [ ] Sign out and back in
- [ ] Open it on a phone: the bottom tab bar is visible and nothing scrolls sideways
- [ ] Register a second user: they see none of the first user's data
- [ ] Turso dashboard shows rows in `users` and `transactions`
- [ ] "Forgot password?" on the login page: you receive the email, the link opens a form, the new
      password works, the old one does not, and the link cannot be used a second time
- [ ] The link in the email starts with your real URL, not `localhost`

## Notes

- **Backups:** Turso offers point-in-time restore and dumps (`turso db shell budget-manager .dump`).
  Check what your plan includes. Financial data is worth a periodic dump.
- **Passwords:** bcrypt (cost 12) via `bcryptjs`. Resetting a password signs out every other session
  (sessions carry the time of the last password change and are rejected once it differs). There is no
  email verification at sign-up: anyone can register an address they don't own, and a reset email
  only proves control of the address it is sent to.
- **Rate limiting:** there is none on login or sign-up. Fine for a private deployment; add it before
  making the site public.
- **Rotating `AUTH_SECRET`** signs everyone out (sessions are JWTs signed with it).
