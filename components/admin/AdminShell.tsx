import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/icons";
import { Pill } from "@/components/ui/Pill";
import { formatCount } from "@/lib/admin/format";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { RowMenu, RowMenuItem } from "./RowMenu";

export type AdminSection = "events" | "people" | "testUsers";
export type ShellAdmin = { name: string; isTest: boolean };

const LINKS: { key: AdminSection; href: string; icon: IconName }[] = [
  { key: "events", href: "/admin", icon: "calendar" },
  { key: "people", href: "/admin/people", icon: "people" },
  { key: "testUsers", href: "/admin/test-users", icon: "flask" },
];

type Props = {
  copy: Dictionary["admin"];
  locale: Locale;
  active?: AdminSection;
  // From requireAdminPage() (a MeT fits). Only loading.tsx and error.tsx render without it.
  admin?: ShellAdmin;
  // The page's h1: in the phone top bar (one line, truncated) and in the content header from md.
  title?: string;
  // The page's main action: right of the phone top bar, right of the title from md.
  primary?: ReactNode;
  // Count badges on the sidebar items (≥1280).
  counts?: Partial<Record<AdminSection, number>>;
  // A coral dot on Events while any event is running.
  live?: boolean;
  // "data" caps content at 1680 (lists, detail), "form" at 1180 (forms do not benefit from width).
  width?: "data" | "form";
  children: ReactNode;
};

// The console frame (spec §4). <768: sticky 56 px top bar + fixed bottom tab bar. 768–1279: 80 px rail. ≥1280: 248 px
// sidebar. Content is fluid up to its cap and left-aligned beside the nav, so wide screens are used rather than centered.
export function AdminShell({ copy, locale, active, admin, title, primary, counts, live, width = "data", children }: Props) {
  return (
    <div className="paper-dots min-h-dvh md:grid md:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-[12px] focus:bg-sun focus:px-4 focus:py-3 focus:text-[15px] focus:font-extrabold focus:border-ink">
        {copy.ui.nav.skip}
      </a>
      <TopBar copy={copy} admin={admin} title={title} primary={primary} />
      <SideNav copy={copy} locale={locale} active={active} admin={admin} counts={counts} live={live} />
      <div className="flex min-w-0 flex-col">
        {admin?.isTest && <p className="m-0 border-b-[1.5px] border-ink/20 bg-gum-soft px-4 py-2 text-[13px] font-extrabold md:px-6 xl:px-8 2xl:px-12">{copy.ui.nav.testAdminBanner}</p>}
        <main
          id="admin-main"
          tabIndex={-1}
          className={`box-border flex w-full flex-1 flex-col gap-5 px-4 pt-5 pb-[calc(56px+env(safe-area-inset-bottom)+16px)] outline-none md:gap-6 md:px-6 md:py-6 xl:px-8 2xl:px-12 ${width === "form" ? "max-w-[1180px]" : "max-w-[1680px]"}`}
        >
          {(title || primary) && (
            <header className="hidden flex-wrap items-center justify-between gap-3 md:flex">
              {title && <h1 className="m-0 min-w-0 font-display text-[34px] leading-[1.1] font-bold [overflow-wrap:anywhere]">{title}</h1>}
              {primary}
            </header>
          )}
          {children}
        </main>
      </div>
      <BottomNav copy={copy} active={active} live={live} />
    </div>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

function TopBar({ copy, admin, title, primary }: Pick<Props, "copy" | "admin" | "title" | "primary">) {
  return (
    <header className="sticky top-0 z-30 box-border flex h-14 items-center gap-2 border-b-[2.5px] border-ink bg-paper pr-1 pl-2 md:hidden">
      <Link href="/admin" className="flex size-11 shrink-0 items-center justify-center [&_img]:h-8">
        <Logo variant="mark" />
      </Link>
      {title ? (
        <h1 title={title} className="m-0 min-w-0 flex-1 truncate font-display text-[19px] leading-none font-bold">
          {title}
        </h1>
      ) : (
        <span className="flex-1" />
      )}
      {primary && <div className="shrink-0">{primary}</div>}
      <RowMenu id="admin-shell-menu" label={copy.ui.nav.menu}>
        {admin && (
          <li className="flex items-center gap-3 px-3 pt-2 pb-3">
            <Avatar admin={admin} />
            <AdminName copy={copy} admin={admin} />
          </li>
        )}
        <RowMenuItem href="/me" icon="back">
          {copy.nav.app}
        </RowMenuItem>
      </RowMenu>
    </header>
  );
}

type SideProps = Pick<Props, "copy" | "locale" | "active" | "admin" | "counts" | "live">;

function SideNav({ copy, locale, active, admin, counts, live }: SideProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-4 overflow-y-auto border-r-[2.5px] border-ink bg-paper py-3 md:flex">
      <Link href="/admin" className="flex min-h-14 items-center justify-center gap-2 [&_img]:h-9 xl:justify-start xl:px-5">
        <Logo variant="mark" />
        <span className="hidden rounded-[9px] bg-ink px-2 py-[2px] font-display text-[12px] font-bold text-paper xl:inline">{copy.title}</span>
      </Link>
      <nav aria-label={copy.navLabel} className="flex flex-col gap-1 px-2 xl:px-3">
        {LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            aria-current={link.key === active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-center text-[12px] leading-tight font-extrabold xl:min-h-11 xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-left xl:font-display xl:text-[15px] xl:font-bold ${link.key === active ? "bg-sun shadow-[inset_0_0_0_2.5px_var(--color-ink)]" : "hover:bg-sun-soft"}`}
          >
            <NavIcon icon={link.icon} live={live && link.key === "events"} />
            <span className="min-w-0">{copy.nav[link.key]}</span>
            {counts?.[link.key] !== undefined && <span className="ml-auto hidden rounded-[8px] bg-ink/10 px-2 py-[1px] text-[12px] tabular-nums xl:inline">{formatCount(locale, counts[link.key])}</span>}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t-[1.5px] border-dashed border-ink/30 px-2 pt-3 xl:px-3">
        <Link href="/me" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-center text-[12px] leading-tight font-extrabold hover:bg-sun-soft xl:min-h-11 xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-[14px]">
          <Icon name="back" size={22} />
          {copy.nav.app}
        </Link>
        {admin && <AdminCard copy={copy} admin={admin} />}
      </div>
    </aside>
  );
}

function NavIcon({ icon, live }: { icon: IconName; live?: boolean }) {
  return (
    <span className="relative flex shrink-0">
      <Icon name={icon} size={24} />
      {live && <span aria-hidden className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-coral border-[1.5px] border-paper motion-safe:animate-pulse" />}
    </span>
  );
}

// Rail: the avatar alone (name in its title and for screen readers). Sidebar: name, TEST ADMIN pill and the scope note.
function AdminCard({ copy, admin }: { copy: Dictionary["admin"]; admin: ShellAdmin }) {
  return (
    <div title={admin.name} className="flex flex-col items-center gap-2 py-1 xl:flex-row xl:items-start xl:gap-3 xl:rounded-[16px] xl:bg-white xl:px-3 xl:py-3 xl:border-ink">
      <Avatar admin={admin} />
      <span className="sr-only xl:not-sr-only xl:min-w-0 xl:flex-1">
        <AdminName copy={copy} admin={admin} />
        {admin.isTest && <span className="mt-1 block text-[12px] leading-snug font-bold text-muted">{copy.ui.nav.testAdminBanner}</span>}
      </span>
    </div>
  );
}

function AdminName({ copy, admin }: { copy: Dictionary["admin"]; admin: ShellAdmin }) {
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <span className="block max-w-full truncate text-[14px] font-extrabold">{admin.name}</span>
      {admin.isTest && (
        <Pill tone="gum-soft" shadow={false} height={22} className="text-[11px]!">
          {copy.ui.nav.testAdmin}
        </Pill>
      )}
    </span>
  );
}

function Avatar({ admin }: { admin: ShellAdmin }) {
  return (
    <span aria-hidden className={`box-border flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold border-ink ${admin.isTest ? "bg-gum-soft" : "bg-sky-soft"}`}>
      {initials(admin.name)}
    </span>
  );
}

function BottomNav({ copy, active, live }: Pick<Props, "copy" | "active" | "live">) {
  return (
    <nav
      aria-label={copy.navLabel}
      className="fixed inset-x-0 bottom-0 z-30 box-border grid h-[calc(56px+env(safe-area-inset-bottom))] grid-cols-3 items-center gap-1 border-t-[2.5px] border-ink bg-paper px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {LINKS.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          aria-current={link.key === active ? "page" : undefined}
          className={`flex h-12 min-w-0 flex-col items-center justify-center gap-[2px] rounded-[12px] text-[12px] leading-none font-extrabold ${link.key === active ? "bg-sun shadow-[inset_0_0_0_2px_var(--color-ink)]" : ""}`}
        >
          <NavIcon icon={link.icon} live={live && link.key === "events"} />
          <span className="max-w-full truncate">{copy.nav[link.key]}</span>
        </Link>
      ))}
    </nav>
  );
}

// A page header with its own layout (detail pages). Prefer AdminShell's `title` + `primary` for plain pages.
export function AdminTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="m-0 min-w-0 font-display text-[28px] leading-[1.1] font-bold [overflow-wrap:anywhere] md:text-[34px]">{children}</h1>
      {right}
    </div>
  );
}
