import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "./db";
import { passwordResetTokens, users } from "./db/schema";
import type { SendEmail } from "./email";
import { DomainError } from "./errors";
import { hashPassword } from "./passwords";

export const TOKEN_TTL_MS = 60 * 60 * 1000; // links work for 1 hour
export const REQUEST_COOLDOWN_MS = 60 * 1000; // at most one email per minute per account

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const INVALID_LINK = "This reset link is invalid or has expired. Please request a new one.";

/**
 * Emails a reset link if `email` belongs to an account. Silent otherwise: the caller shows the same
 * message either way so the form can't be used to discover which emails are registered.
 */
export async function requestPasswordReset(
  db: Db,
  rawEmail: string,
  deps: { sendEmail: SendEmail; siteUrl: string; now?: Date },
): Promise<void> {
  const now = deps.now ?? new Date();
  const email = rawEmail.trim().toLowerCase();

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!user) return;

  // Cooldown: stops the form being used to flood someone's inbox.
  const since = new Date(now.getTime() - REQUEST_COOLDOWN_MS).toISOString();
  const [recent] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, user.id), gt(passwordResetTokens.createdAt, since)));
  if (recent) return;

  // Only the newest link works.
  await db
    .delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: sha256(token),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
  });

  const link = `${deps.siteUrl}/reset-password?token=${token}`;
  await deps.sendEmail({
    to: email,
    subject: "Reset your Budget Manager password",
    text: [
      "Someone asked to reset the password for your Budget Manager account.",
      "",
      `Choose a new password here (the link works once and expires in 1 hour):`,
      link,
      "",
      "If this wasn't you, ignore this email. Your password stays the same.",
    ].join("\n"),
    html: `<p>Someone asked to reset the password for your Budget Manager account.</p>
<p><a href="${link}">Choose a new password</a><br>The link works once and expires in 1 hour.</p>
<p>If this wasn't you, ignore this email. Your password stays the same.</p>`,
  });
}

/** Read-only: lets the page say "expired" up front instead of after the user types a password. */
export async function isResetTokenValid(db: Db, token: string, now = new Date()): Promise<boolean> {
  if (!token) return false;
  const [row] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, sha256(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now.toISOString()),
      ),
    );
  return !!row;
}

/** Sets a new password. The token is claimed atomically first, so it can only ever be used once. */
export async function resetPassword(
  db: Db,
  token: string,
  newPassword: string,
  now = new Date(),
): Promise<void> {
  const nowIso = now.toISOString();
  const [claimed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: nowIso })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, sha256(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, nowIso),
      ),
    )
    .returning({ userId: passwordResetTokens.userId });
  if (!claimed) throw new DomainError(INVALID_LINK);

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), passwordChangedAt: nowIso })
    .where(eq(users.id, claimed.userId));

  // Any other outstanding links for this account are now meaningless.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, claimed.userId));
}
