"use server";

import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { signIn } from "@/auth";
import { getSiteUrl } from "@/lib/site-url";
import {
  credentialsSchema,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { sendEmail } from "@/server/email";
import { DomainError } from "@/server/errors";
import { hashPassword } from "@/server/passwords";
import { requestPasswordReset, resetPassword } from "@/server/password-reset";

/** `email` is echoed back on errors: React resets the form after an action, which would wipe it. */
export type FormState = { error?: string; email?: string } | undefined;

const submittedEmail = (formData: FormData) => String(formData.get("email") ?? "").trim();

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = submittedEmail(formData);
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password", email };
    throw e; // includes the redirect thrown on success
  }
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const submitted = submittedEmail(formData);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: submitted };
  const { email, password } = parsed.data;

  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return { error: "An account with this email already exists", email };

  const passwordHash = await hashPassword(password);
  try {
    await db.insert(users).values({ email, passwordHash });
  } catch {
    // Lost a race with a concurrent registration (unique constraint on email)
    return { error: "An account with this email already exists", email };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Account created, please sign in", email };
    throw e;
  }
}

export type ForgotState = { error?: string; sent?: boolean; email?: string } | undefined;

/**
 * Always answers the same way for valid input, whether or not the email has an account.
 * The lookup and the email happen after the response (`after`), so response time doesn't leak it
 * either, and a mail-provider failure can't change what the visitor sees.
 */
export async function forgotPassword(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email: submittedEmail(formData) };
  }
  const { email } = parsed.data;

  after(async () => {
    try {
      await requestPasswordReset(getDb(), email, { sendEmail, siteUrl: getSiteUrl() });
    } catch (e) {
      // No email address or token in the log line.
      console.error("password reset email failed:", e instanceof Error ? e.message : "unknown");
    }
  });

  return { sent: true };
}

export type ResetState = { error?: string } | undefined;

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await resetPassword(getDb(), parsed.data.token, parsed.data.password);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  redirect("/login?reset=1");
}
