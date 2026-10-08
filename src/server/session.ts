import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { getDb } from "./db";
import { users } from "./db/schema";

/** One lookup per request even though the layout and the page both call requireUser(). */
const passwordChangedAtOf = cache(async (userId: string) => {
  const [row] = await getDb()
    .select({ at: users.passwordChangedAt })
    .from(users)
    .where(eq(users.id, userId));
  return row ? (row.at ?? "") : undefined; // undefined: the account no longer exists
});

/**
 * Returns the signed-in user's id or redirects. Pass `userId` to every data query.
 *
 * Sessions are signed JWTs and can't be revoked by themselves, so each one carries the user's
 * `passwordChangedAt` from sign-in. After a password reset it no longer matches, and the session
 * is dropped via /signed-out (which clears the cookie; a plain redirect to /login would loop).
 */
export async function requireUser(): Promise<{ userId: string; email: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const current = await passwordChangedAtOf(userId);
  if (current === undefined || current !== (session.user.pwdAt ?? "")) redirect("/signed-out");

  return { userId, email: session.user.email ?? "" };
}
