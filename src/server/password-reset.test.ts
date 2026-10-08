import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./db";
import { passwordResetTokens, users } from "./db/schema";
import type { Email } from "./email";
import { DomainError } from "./errors";
import { hashPassword, verifyPassword } from "./passwords";
import {
  INVALID_LINK,
  isResetTokenValid,
  REQUEST_COOLDOWN_MS,
  requestPasswordReset,
  resetPassword,
  TOKEN_TTL_MS,
} from "./password-reset";

const SITE = "https://app.example.test";
const T0 = new Date("2026-10-08T10:00:00.000Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

let db: Db;
let outbox: Email[];
const deps = (now = T0) => ({
  siteUrl: SITE,
  now,
  sendEmail: async (e: Email) => void outbox.push(e),
});
const tokenFrom = (e: Email) =>
  new URL(e.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

async function makeUser(email = "a@test.mu", password = "old-password") {
  const [u] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password) })
    .returning();
  return u;
}

beforeEach(async () => {
  db = createDb(":memory:");
  await migrate(db, { migrationsFolder: "./drizzle" });
  outbox = [];
});

describe("requestPasswordReset", () => {
  it("emails a link for a known account, and stores only a hash of the token", async () => {
    await makeUser();
    await requestPasswordReset(db, "  A@Test.MU ", deps());

    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe("a@test.mu");
    const token = tokenFrom(outbox[0]);
    expect(outbox[0].text).toContain(`${SITE}/reset-password?token=${token}`);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 random bytes

    const [row] = await db.select().from(passwordResetTokens);
    expect(row.tokenHash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.expiresAt).toBe(later(TOKEN_TTL_MS).toISOString());
  });

  it("does nothing, silently, for an unknown email", async () => {
    await requestPasswordReset(db, "nobody@test.mu", deps());
    expect(outbox).toHaveLength(0);
    expect(await db.select().from(passwordResetTokens)).toHaveLength(0);
  });

  it("sends at most one email per cooldown window", async () => {
    await makeUser();
    await requestPasswordReset(db, "a@test.mu", deps());
    await requestPasswordReset(db, "a@test.mu", deps(later(REQUEST_COOLDOWN_MS - 1)));
    expect(outbox).toHaveLength(1);
    await requestPasswordReset(db, "a@test.mu", deps(later(REQUEST_COOLDOWN_MS + 1)));
    expect(outbox).toHaveLength(2);
  });

  it("invalidates the previous link when a new one is requested", async () => {
    await makeUser();
    await requestPasswordReset(db, "a@test.mu", deps());
    await requestPasswordReset(db, "a@test.mu", deps(later(REQUEST_COOLDOWN_MS + 1)));
    const [first, second] = outbox.map(tokenFrom);

    const now = later(REQUEST_COOLDOWN_MS + 2);
    expect(await isResetTokenValid(db, first, now)).toBe(false);
    expect(await isResetTokenValid(db, second, now)).toBe(true);
  });

  it("does not leave a usable token behind if sending is not possible", async () => {
    await makeUser();
    const failing = { ...deps(), sendEmail: async () => Promise.reject(new Error("smtp down")) };
    await expect(requestPasswordReset(db, "a@test.mu", failing)).rejects.toThrow("smtp down");
    // the token exists but nobody has its plaintext; a later request after the cooldown replaces it
    await requestPasswordReset(db, "a@test.mu", deps(later(REQUEST_COOLDOWN_MS + 1)));
    expect(outbox).toHaveLength(1);
  });
});

describe("resetPassword", () => {
  async function issue(now = T0) {
    await requestPasswordReset(db, "a@test.mu", deps(now));
    return tokenFrom(outbox[outbox.length - 1]);
  }

  it("changes the password and records when", async () => {
    const u = await makeUser();
    const token = await issue();
    await resetPassword(db, token, "brand-new-password", later(1000));

    const [after] = await db.select().from(users).where(eq(users.id, u.id));
    expect(await verifyPassword("brand-new-password", after.passwordHash)).toBe(true);
    expect(await verifyPassword("old-password", after.passwordHash)).toBe(false);
    expect(after.passwordChangedAt).toBe(later(1000).toISOString());
  });

  it("works only once", async () => {
    await makeUser();
    const token = await issue();
    await resetPassword(db, token, "brand-new-password", later(1000));
    await expect(resetPassword(db, token, "another-password", later(2000))).rejects.toThrow(
      INVALID_LINK,
    );
  });

  it("two simultaneous attempts: exactly one wins", async () => {
    const u = await makeUser();
    const token = await issue();
    const results = await Promise.allSettled([
      resetPassword(db, token, "winner-password-1", later(1000)),
      resetPassword(db, token, "winner-password-2", later(1000)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const [after] = await db.select().from(users).where(eq(users.id, u.id));
    const first = await verifyPassword("winner-password-1", after.passwordHash);
    const second = await verifyPassword("winner-password-2", after.passwordHash);
    expect(first !== second).toBe(true);
  });

  it("rejects an expired link, and one that never existed", async () => {
    await makeUser();
    const token = await issue();
    expect(await isResetTokenValid(db, token, later(TOKEN_TTL_MS - 1))).toBe(true);
    expect(await isResetTokenValid(db, token, later(TOKEN_TTL_MS))).toBe(false);
    await expect(
      resetPassword(db, token, "brand-new-password", later(TOKEN_TTL_MS)),
    ).rejects.toThrow(DomainError);
    await expect(resetPassword(db, "made-up-token", "brand-new-password", T0)).rejects.toThrow(
      INVALID_LINK,
    );
    expect(await isResetTokenValid(db, "", T0)).toBe(false);
  });

  it("leaves the old password working when the link is bad", async () => {
    const u = await makeUser();
    await expect(resetPassword(db, "nope", "brand-new-password", T0)).rejects.toThrow();
    const [after] = await db.select().from(users).where(eq(users.id, u.id));
    expect(await verifyPassword("old-password", after.passwordHash)).toBe(true);
    expect(after.passwordChangedAt).toBeNull();
  });

  it("only changes the account the token belongs to", async () => {
    await makeUser("a@test.mu", "pw-of-a-aaaa");
    const b = await makeUser("b@test.mu", "pw-of-b-bbbb");
    const token = await issue();
    await resetPassword(db, token, "brand-new-password", later(1000));
    const [bAfter] = await db.select().from(users).where(eq(users.id, b.id));
    expect(await verifyPassword("pw-of-b-bbbb", bAfter.passwordHash)).toBe(true);
    expect(bAfter.passwordChangedAt).toBeNull();
  });

  it("clears every outstanding link for the account after a reset", async () => {
    await makeUser();
    const token = await issue();
    await resetPassword(db, token, "brand-new-password", later(1000));
    expect(await db.select().from(passwordResetTokens)).toHaveLength(0);
  });
});
