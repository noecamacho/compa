"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/icons";
import { useCopy } from "@/components/LocaleProvider";

export const DOCK_TABS = ["home", "connect", "connections", "me"] as const;
export type DockTab = (typeof DOCK_TABS)[number];

const TABS: Record<DockTab, { href: string; icon: IconName; color: string }> = {
  home: { href: "/home", icon: "home", color: "#DDF1FF" },
  connect: { href: "/connect", icon: "qr", color: "#DDF8EA" },
  connections: { href: "/connections", icon: "people", color: "#FFE3EA" },
  me: { href: "/me", icon: "user", color: "#FFF3BF" },
};

const EASE = "cubic-bezier(.34,1.3,.5,1)";
const CLOSED = 50;
const OPEN = 150;
const STEP = 54;
// The pill's raised look, shared by the dock and the rail.
const PILL_SHADOW = "inset 0 -4px 0 rgba(30,27,46,0.16), inset 0 3px 0 rgba(255,255,255,0.65)";

// Closed items are 50 wide, the open one 150; items after the open one shift right to make room (DockV2.dc.html).
const offsetFor = (index: number, active: number): number => {
  if (index <= active) return index * STEP;
  return active * STEP + OPEN + 4 + (index - active - 1) * STEP;
};

// Sub-routes the rail keeps visible map to the tab they were reached from.
const RAIL_PARENT: Record<string, DockTab> = { "/people": "connections" };

export function activeTabFor(pathname: string): DockTab {
  const found = DOCK_TABS.find((tab) => pathname === TABS[tab].href || pathname.startsWith(`${TABS[tab].href}/`));
  const parent = Object.entries(RAIL_PARENT).find(([prefix]) => pathname.startsWith(`${prefix}/`))?.[1];
  return found ?? parent ?? "home";
}

// The pill moves on tap, before the new route has rendered; the choice expires once the URL changes.
type Pending = { tab: DockTab; from: string };

function useActiveTab(active?: DockTab) {
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const current = active ?? (pending?.from === pathname ? pending.tab : activeTabFor(pathname));
  const choose = (tab: DockTab) => setPending({ tab, from: pathname });
  return { current, choose };
}

type Props = { active?: DockTab; className?: string };

// Phones and tablets: the 327×66 pill at the bottom; the color drop travels to the active tab (DockV2).
export function Dock({ active, className }: Props) {
  const copy = useCopy().dock;
  const { current, choose } = useActiveTab(active);
  const activeIndex = DOCK_TABS.indexOf(current);
  return (
    <nav aria-label={copy.label} className={`box-border h-[66px] w-[327px] rounded-[33px] bg-white p-[5px] border-ink shadow-hard-4 ${className ?? ""}`}>
      <div className="relative h-[50px] w-[312px]">
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 box-border h-[50px] w-[150px] rounded-[25px] border-ink"
          style={{
            transform: `translateX(${offsetFor(activeIndex, activeIndex)}px)`,
            background: TABS[current].color,
            boxShadow: PILL_SHADOW,
            transition: `transform .8s ${EASE}, background-color .8s`,
            willChange: "transform",
          }}
        />
        {DOCK_TABS.map((tab, index) => {
          const on = index === activeIndex;
          return (
            <Link
              key={tab}
              href={TABS[tab].href}
              aria-current={on ? "page" : undefined}
              onClick={() => choose(tab)}
              className={`absolute top-0 left-0 box-border flex h-[50px] items-center justify-center gap-2 rounded-[25px] font-display text-[15px] font-bold whitespace-nowrap select-none hover:text-ink ${on ? "text-ink" : "text-muted"}`}
              style={{
                width: on ? OPEN : CLOSED,
                transform: `translateX(${offsetFor(index, activeIndex)}px)`,
                transition: `transform .8s ${EASE}, width .8s ${EASE}, color .4s`,
              }}
            >
              <Icon name={TABS[tab].icon} size={22} strokeWidth={2.6} />
              <span
                className="overflow-hidden"
                style={{
                  opacity: on ? 1 : 0,
                  maxWidth: on ? 110 : 0,
                  transition: on ? `opacity .4s .35s, max-width .8s ${EASE}` : `opacity .4s, max-width .8s ${EASE}`,
                }}
              >
                {copy.tabs[tab]}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const RAIL_ROW = 52;
const RAIL_GAP = 6;

// Desktop (1024+): the same four tabs as a card pinned to the top left (Figma "Dock layout=rail").
// It stays on every attendee screen so the way back is always one click away; super admins also get the console link.
export function DockRail({ admin = false }: { admin?: boolean }) {
  const copy = useCopy().dock;
  const { current, choose } = useActiveTab();
  const activeIndex = DOCK_TABS.indexOf(current);
  return (
    <nav
      aria-label={copy.label}
      data-tour="dock"
      className="fixed top-8 left-8 z-30 hidden w-[232px] flex-col gap-4 rounded-card bg-white px-[14px] pt-4 pb-[14px] border-ink shadow-hard-4 lg:flex"
    >
      <Link href="/home" aria-label={copy.home} className="self-start rounded-[12px] px-[6px] py-[2px] tappable">
        <Logo />
      </Link>
      <div className="relative flex flex-col" style={{ gap: RAIL_GAP }}>
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 left-0 box-border rounded-[18px] border-ink"
          style={{
            height: RAIL_ROW,
            transform: `translateY(${activeIndex * (RAIL_ROW + RAIL_GAP)}px)`,
            background: TABS[current].color,
            boxShadow: PILL_SHADOW,
            transition: `transform .6s ${EASE}, background-color .6s`,
          }}
        />
        {DOCK_TABS.map((tab, index) => {
          const on = index === activeIndex;
          return (
            <Link
              key={tab}
              href={TABS[tab].href}
              aria-current={on ? "page" : undefined}
              onClick={() => choose(tab)}
              className={`relative flex items-center gap-3 rounded-[18px] px-4 font-display text-[16px] font-bold transition-colors duration-300 select-none hover:text-ink ${on ? "text-ink" : "text-muted"}`}
              style={{ height: RAIL_ROW }}
            >
              <Icon name={TABS[tab].icon} size={22} strokeWidth={2.6} />
              {copy.tabs[tab]}
            </Link>
          );
        })}
      </div>
      {admin && (
        <Link
          href="/admin"
          className="dashed-ink flex h-12 items-center gap-3 px-4 pt-[14px] font-display text-[15px] font-bold text-muted transition-colors duration-300 hover:text-ink"
        >
          <span className="inline-flex h-7 items-center rounded-chip bg-ink px-[10px] text-[13px] text-paper">{copy.admin}</span>
          <span className="text-[13px]">{copy.adminHint}</span>
        </Link>
      )}
    </nav>
  );
}

// Screens that show the dock (README: 03, 03b, 04, 07, 09). Sub-routes such as /connect/<handle> do not.
const DOCK_ROUTES = new Set(DOCK_TABS.map((tab) => TABS[tab].href));

// Lives in the (app) layout so the dock survives navigation and its pill can travel between tabs.
// On screens without a dock it slides out of view instead of unmounting. From 1024 the rail replaces it.
export function DockHost({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const shown = DOCK_ROUTES.has(pathname);
  return (
    <>
      <div
        data-tour={shown ? "dock" : undefined}
        aria-hidden={!shown}
        inert={!shown}
        className="fixed left-1/2 z-30 lg:hidden"
        style={{
          // Clear the iPhone home indicator; 20 px elsewhere.
          bottom: "max(20px, calc(env(safe-area-inset-bottom) + 8px))",
          transform: shown ? "translate(-50%, 0)" : "translate(-50%, 120px)",
          opacity: shown ? 1 : 0,
          transition: `transform .45s ${EASE}, opacity .3s ease`,
        }}
      >
        <Dock />
      </div>
      <DockRail admin={admin} />
    </>
  );
}
