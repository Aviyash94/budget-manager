import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { requireUser } from "@/server/session";
import { DesktopNav, MobileTabBar } from "./nav-links";

// Private, per-user pages: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireUser();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:pb-10">
      <header className="mb-6 flex items-center justify-between gap-3 rounded-full bg-white/80 py-2 pr-2 pl-4 shadow-sm ring-1 ring-white backdrop-blur">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-black whitespace-nowrap"
        >
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-pink text-lg">
            💸
          </span>
          <span className="hidden lg:inline">Budget Manager</span>
        </Link>

        <DesktopNav />

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="flex items-center gap-2"
        >
          <span className="hidden max-w-40 truncate text-xs text-ink-soft xl:inline" title={email}>
            {email}
          </span>
          <button className="btn-soft">Sign out</button>
        </form>
      </header>
      <main>{children}</main>
      <MobileTabBar />
    </div>
  );
}
