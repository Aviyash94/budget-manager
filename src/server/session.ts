import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the signed-in user's id or redirects to /login. Pass `userId` to every data query. */
export async function requireUser(): Promise<{ userId: string; email: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { userId: session.user.id, email: session.user.email ?? "" };
}
