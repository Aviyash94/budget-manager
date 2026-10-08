import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Signed-in users are sent away from these (nothing for them to do there).
const GUEST_ONLY_PATHS = ["/login", "/register"];
// Reachable whether or not you are signed in.
const OPEN_PATHS = ["/forgot-password", "/reset-password", "/signed-out"];

// Coarse gate only. Data access still goes through requireUser() and per-user queries.
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  if (OPEN_PATHS.includes(pathname)) return;

  const isGuestOnly = GUEST_ONLY_PATHS.includes(pathname);
  if (!req.auth && !isGuestOnly) return NextResponse.redirect(new URL("/login", req.nextUrl));
  if (req.auth && isGuestOnly) return NextResponse.redirect(new URL("/", req.nextUrl));
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
