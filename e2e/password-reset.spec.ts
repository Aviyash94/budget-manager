import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const OUTBOX = path.resolve("e2e-outbox");
const OLD = "old-password-123";
const NEW = "brand-new-password-456";

type Mail = { to: string; subject: string; text: string };

function mailsFor(email: string): Mail[] {
  try {
    return readdirSync(OUTBOX)
      .sort()
      .map((f) => JSON.parse(readFileSync(path.join(OUTBOX, f), "utf8")) as Mail)
      .filter((m) => m.to === email);
  } catch {
    return []; // outbox not created yet
  }
}

/** The email is sent after the response, so poll for it. */
async function waitForResetLink(email: string, count = 1): Promise<string> {
  await expect
    .poll(() => mailsFor(email).length, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(count);
  const mail = mailsFor(email)[count - 1];
  return mail.text.match(/https?:\/\/\S+/)![0];
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function requestReset(page: Page, email: string) {
  await page.goto("/forgot-password");
  await page.fill("input[name=email]", email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
}

test("password reset: request, link works once, old password and old sessions stop working", async ({
  page,
  browser,
}, testInfo) => {
  const email = `reset-${testInfo.project.name}-${Date.now()}@test.mu`;

  // An account, with one browser still signed in on it
  await page.goto("/register");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", OLD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const otherDevice = await browser.newContext();
  const other = await otherDevice.newPage();
  await signIn(other, email, OLD);
  await expect(other.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Forgot-password is reachable from the login page
  const fresh = await browser.newContext();
  const guest = await fresh.newPage();
  await guest.goto("/login");
  await guest.getByRole("link", { name: "Forgot password?" }).click();
  await expect(guest).toHaveURL(/\/forgot-password/);

  // Unknown email: the visitor sees exactly the same answer, and no email is sent
  const unknownEmail = `nobody-${Date.now()}@test.mu`;
  await requestReset(guest, unknownEmail);
  const unknownText = await guest.locator("main").innerText();

  // Known email: same answer, and an email with a link arrives
  await requestReset(guest, email);
  expect(await guest.locator("main").innerText()).toBe(unknownText);
  const link = await waitForResetLink(email);
  expect(link).toMatch(/\/reset-password\?token=[\w-]{40,}/);
  expect(mailsFor(unknownEmail)).toHaveLength(0);

  // Asking again straight away doesn't send a second email (cooldown)
  await requestReset(guest, email);
  await guest.waitForTimeout(1500);
  expect(mailsFor(email)).toHaveLength(1);

  // The link opens the form; bad input is rejected with a message
  await guest.goto(link);
  await expect(guest.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await guest.fill("input[name=password]", NEW);
  await guest.fill("input[name=confirm]", "something-else-789");
  await guest.getByRole("button", { name: "Change password" }).click();
  await expect(guest.getByText("The two passwords don't match")).toBeVisible();

  // Set the new password
  await guest.fill("input[name=password]", NEW);
  await guest.fill("input[name=confirm]", NEW);
  await guest.getByRole("button", { name: "Change password" }).click();
  await expect(guest).toHaveURL(/\/login\?reset=1/);
  await expect(guest.getByText("Your password was changed")).toBeVisible();

  // The same link can't be used again
  await guest.goto(link);
  await expect(guest.getByRole("heading", { name: "Link expired" })).toBeVisible();

  // Old password rejected, new one accepted
  await signIn(guest, email, OLD);
  await expect(guest.getByText("Invalid email or password")).toBeVisible();
  await guest.fill("input[name=password]", NEW);
  await guest.getByRole("button", { name: "Sign in" }).click();
  await expect(guest.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // The browser that was signed in before the reset is signed out, with an explanation
  await other.goto("/transactions");
  await expect(other).toHaveURL(/\/login\?reason=session/);
  await expect(other.getByText("You were signed out")).toBeVisible();
  await other.goto("/");
  await expect(other).toHaveURL(/\/login/); // and stays out: no redirect loop

  // The original browser (signed in with the old password) is signed out too
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/login/);

  await Promise.all([otherDevice.close(), fresh.close()]);
});

test("reset page without a valid token shows the expired message", async ({ page }) => {
  for (const url of ["/reset-password", "/reset-password?token=garbage"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Link expired" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
  }
});

test("the reset page is not indexed and doesn't leak its URL", async ({ page }) => {
  await page.goto("/reset-password?token=garbage");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
});
