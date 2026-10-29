import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import type { Dictionary } from "@/lib/copy";

export type AdminSection = "events" | "people" | "testUsers";

const LINKS: { key: AdminSection; href: string }[] = [
  { key: "events", href: "/admin" },
  { key: "people", href: "/admin/people" },
  { key: "testUsers", href: "/admin/test-users" },
];

type Props = { copy: Dictionary["admin"]; active: AdminSection; children: ReactNode };

// The console frame: fluid from 390 to 1440, content capped at 1200 and centered (DESIGN.md "Responsive breakpoints").
export function AdminShell({ copy, active, children }: Props) {
  return (
    <div className="paper-dots min-h-dvh w-full">
      <header className="sticky top-0 z-10 border-b-[2.5px] border-ink bg-paper">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-3 px-4 py-3 md:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="rounded-[9px] bg-ink px-2 py-[2px] font-display text-[12px] font-bold text-paper">{copy.title}</span>
          </Link>
          <nav aria-label={copy.navLabel} className="order-3 flex w-full gap-2 overflow-x-auto md:order-none md:w-auto md:flex-1">
            {LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-current={link.key === active ? "page" : undefined}
                className={`box-border flex h-11 items-center rounded-chip px-4 font-display text-[15px] font-bold whitespace-nowrap border-ink ${link.key === active ? "bg-sun shadow-hard-2" : "bg-white"}`}
              >
                {copy.nav[link.key]}
              </Link>
            ))}
          </nav>
          <Link href="/me" className="ml-auto text-[13px] font-extrabold underline md:ml-0">
            {copy.nav.app}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

export function AdminTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="m-0 font-display text-[28px] leading-[1.1] font-bold md:text-[34px]">{children}</h1>
      {right}
    </div>
  );
}
