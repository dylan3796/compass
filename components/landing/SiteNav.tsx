"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Marketing-surface nav (landing + company). The wordmark is the only route
 * home — the page never links to itself. Sticky so the mark stays the
 * largest persistent element on screen.
 */
export default function SiteNav({ onGetStatement }: { onGetStatement: () => void }) {
  const pathname = usePathname();

  const links = [
    { href: "/demo", label: "Product" },
    { href: "/company", label: "Company" },
  ];

  return (
    <header className="rule sticky top-0 z-40 border-b bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="wordmark text-3xl sm:text-4xl" aria-label="Causa — home">
          Causa.
        </Link>
        <nav className="flex items-center gap-4 sm:gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`flex min-h-[44px] items-center text-[15px] underline-offset-4 hover:underline ${
                pathname === l.href ? "underline" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button className="btn-ink max-sm:hidden" onClick={onGetStatement}>
            Get statement
          </button>
        </nav>
      </div>
    </header>
  );
}
