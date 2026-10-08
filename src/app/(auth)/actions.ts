"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { credentialsSchema, registerSchema } from "@/lib/validation";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";

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

  const passwordHash = await bcrypt.hash(password, 12);
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
