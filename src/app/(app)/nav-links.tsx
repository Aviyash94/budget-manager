"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/transactions", label: "Transactions", icon: "🧾" },
  { href: "/budgets", label: "Budgets", icon: "🎯" },
  { href: "/categories", label: "Categories", icon: "🏷️" },
  { href: "/accounts", label: "Accounts", icon: "🏦" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Pill navigation inside the header, wide screens only. */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden gap-1 md:flex">
      {LINKS.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
              active ? "bg-lav text-ink shadow-sm" : "text-ink-soft hover:bg-white/80"
            }`}
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Fixed bottom tab bar for phones. Render it OUTSIDE any element that has backdrop-filter,
 * filter or transform: those become the containing block for `fixed` and pin the bar to them.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 gap-1 border-t border-white bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(100,68,214,0.3)] md:hidden"
    >
      {LINKS.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition ${
              active ? "bg-lav text-ink" : "text-ink-soft"
            }`}
          >
            <span aria-hidden className="text-xl leading-none">
              {l.icon}
            </span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
