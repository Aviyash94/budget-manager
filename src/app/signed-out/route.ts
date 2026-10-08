import { signOut } from "@/auth";

/** Ends a session that is no longer valid (e.g. the password was reset) and shows the login page. */
export async function GET() {
  await signOut({ redirectTo: "/login?reason=session" }); // throws a redirect
  return new Response(null, { status: 204 });
}
