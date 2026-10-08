import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "correct-horse-battery";

async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function addTransaction(
  page: Page,
  opts: {
    type: "expense" | "income" | "transfer";
    amount: string;
    category?: string;
    toAccount?: string;
    note?: string;
  },
) {
  await page.goto("/transactions");
  await page.locator(`label:has(input[value=${opts.type}])`).click();
  await page.fill("input[name=amountCents]", opts.amount);
  if (opts.category) await page.selectOption("select[name=categoryId]", { label: opts.category });
  if (opts.toAccount) {
    await page.selectOption("select[name=transferAccountId]", { label: opts.toAccount });
  }
  if (opts.note) await page.fill("input[name=note]", opts.note);
  await page.getByRole("button", { name: /Add transaction/ }).click();
  // The form resets after a successful add; the note (or amount) shows up in the list.
  await expect(page.locator("main li").first()).toBeVisible();
}

test("budget journey: set up, record, track, isolate", async ({ page, browser }, testInfo) => {
  const stamp = `${testInfo.project.name}-${Date.now()}`;
  const email = `e2e-${stamp}@test.mu`;

  // 1. Sign up lands on an empty dashboard
  await register(page, email);
  await expect(page.getByText("No expense categories yet")).toBeVisible();

  // 2. Accounts
  await page.goto("/accounts");
  for (const [name, type] of [
    ["Main", "bank"],
    ["Wallet", "cash"],
  ]) {
    await page.fill("input[name=name]", name);
    await page.selectOption("select[name=type]", type);
    await page.getByRole("button", { name: /Add/ }).first().click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }

  // 3. Categories
  await page.goto("/categories");
  for (const [name, kind] of [
    ["Groceries", "expense"],
    ["Salary", "income"],
  ]) {
    await page.fill("form >> input[name=name] >> nth=0", name);
    await page.selectOption("select[name=kind]", kind);
    await page.getByRole("button", { name: /Add/ }).first().click();
    await expect(page.locator(`input[name=name][value="${name}"]`)).toBeVisible();
  }

  // 4. Budget: Rs 100 for Groceries this month
  await page.goto("/budgets");
  await page.fill("input[name=limitCents]", "100");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("✓ Limit set")).toBeVisible();

  // 5. Record an expense, an income and a transfer
  await addTransaction(page, {
    type: "expense",
    amount: "120.50",
    category: "Groceries",
    note: "Weekly shop",
  });
  await expect(page.getByText("Weekly shop")).toBeVisible();
  await addTransaction(page, { type: "income", amount: "1,000", category: "Salary", note: "Pay" });
  await addTransaction(page, {
    type: "transfer",
    amount: "50",
    toAccount: "Wallet",
    note: "Pocket money",
  });
  await expect(page.getByText("Main → Wallet")).toBeVisible();

  // 6. Dashboard: transfer is not spending; Groceries is over its limit by Rs 20.50
  await page.goto("/");
  await expect(page.getByText("Rs 1,000.00").first()).toBeVisible(); // income
  await expect(page.getByText("Rs 120.50 / Rs 100.00")).toBeVisible();
  await expect(page.getByText("Over by Rs 20.50")).toBeVisible();
  await expect(page.getByText("Rs 50.00")).toHaveCount(0); // the transfer appears nowhere on the dashboard

  // 7. A refund brings spending back to the limit
  await addTransaction(page, {
    type: "expense",
    amount: "-20.50",
    category: "Groceries",
    note: "Refund",
  });
  await page.goto("/");
  await expect(page.getByText("Rs 100.00 / Rs 100.00")).toBeVisible();
  await expect(page.getByText("Over by")).toHaveCount(0);
  await expect(page.getByRole("progressbar", { name: /Groceries/ })).toHaveAttribute(
    "aria-valuenow",
    "100",
  );

  // 8. Delete asks for confirmation
  await page.goto("/transactions");
  const shop = page.locator("li", { hasText: "Weekly shop" });
  page.once("dialog", (d) => d.dismiss());
  await shop.getByRole("button", { name: /Delete/ }).click();
  await expect(shop).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await shop.getByRole("button", { name: /Delete/ }).click();
  await expect(page.getByText("Weekly shop")).toHaveCount(0);

  // 9. Layout checks
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow, "no horizontal scroll").toBe(false);
  if (testInfo.project.name === "mobile") {
    const bar = page.locator("nav[aria-label=Main]:visible");
    const box = await bar.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.y + box!.height).toBeCloseTo(viewport.height, 0); // pinned to the bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const after = await bar.boundingBox();
    expect(after!.y).toBeCloseTo(box!.y, 0); // and stays there while scrolling
  } else {
    await expect(page.locator("nav[aria-label=Main]:visible")).toBeVisible();
  }

  // 10. Sign out, protected pages bounce to login, wrong password is rejected, right one works
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login/);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await page.fill("input[name=password]", PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // 11. Another user sees none of this data
  const other = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const otherPage = await other.newPage();
  await register(otherPage, `e2e-other-${stamp}@test.mu`);
  await expect(otherPage.getByText("No expense categories yet")).toBeVisible();
  await otherPage.goto("/transactions");
  await expect(otherPage.getByText("Add an account first")).toBeVisible();
  await expect(otherPage.getByText("Pocket money")).toHaveCount(0);
  await other.close();
});
