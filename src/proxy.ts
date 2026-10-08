import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login", "/register"];

// Coarse gate only. Data access still goes through requireUser() and per-user queries.
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!req.auth && !isPublic) return NextResponse.redirect(new URL("/login", req.nextUrl));
  if (req.auth && isPublic) return NextResponse.redirect(new URL("/", req.nextUrl));
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
