"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";

export const DOCK_TABS = ["home", "connect", "connections", "me"] as const;
export type DockTab = (typeof DOCK_TABS)[number];

const TABS: Record<DockTab, { href: string; label: string; icon: IconName; color: string }> = {
  home: { href: "/home", label: "Inicio", icon: "home", color: "#DDF1FF" },
  connect: { href: "/connect", label: "Conectar", icon: "qr", color: "#DDF8EA" },
  connections: { href: "/connections", label: "Conexiones", icon: "people", color: "#FFE3EA" },
  me: { href: "/me", label: "Perfil", icon: "user", color: "#FFF3BF" },
};

const EASE = "cubic-bezier(.34,1.3,.5,1)";
const CLOSED = 50;
const OPEN = 150;
const STEP = 54;

// Closed items are 50 wide, the open one 150; items after the open one shift right to make room (DockV2.dc.html).
const offsetFor = (index: number, active: number): number => {
  if (index <= active) return index * STEP;
  return active * STEP + OPEN + 4 + (index - active - 1) * STEP;
};

export function activeTabFor(pathname: string): DockTab {
  const found = DOCK_TABS.find((tab) => pathname === TABS[tab].href || pathname.startsWith(`${TABS[tab].href}/`));
  return found ?? "home";
}

// The pill moves on tap, before the new route has rendered; the choice expires once the URL changes.
type Pending = { tab: DockTab; from: string };

type Props = { active?: DockTab; className?: string };

export function Dock({ active, className }: Props) {
  const pathname = usePathname();
  const [pending, setPending] = useState<Pending | null>(null);
  const current = active ?? (pending?.from === pathname ? pending.tab : activeTabFor(pathname));
  const activeIndex = DOCK_TABS.indexOf(current);
  return (
    <nav
      aria-label="Navegación principal"
      className={`box-border h-[66px] w-[327px] rounded-[33px] bg-white p-[5px] border-ink shadow-hard-4 ${className ?? ""}`}
    >
      <div className="relative h-[50px] w-[312px]">
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 box-border h-[50px] w-[150px] rounded-[25px] border-ink"
          style={{
            transform: `translateX(${offsetFor(activeIndex, activeIndex)}px)`,
            background: TABS[current].color,
            boxShadow: "inset 0 -4px 0 rgba(30,27,46,0.16), inset 0 3px 0 rgba(255,255,255,0.65)",
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
              onClick={() => setPending({ tab, from: pathname })}
              className={`absolute top-0 left-0 box-border flex h-[50px] items-center justify-center gap-2 rounded-[25px] font-display text-[15px] font-bold whitespace-nowrap hover:text-ink ${on ? "text-ink" : "text-muted"}`}
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
                {TABS[tab].label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Screens that show the dock (README: 03, 03b, 04, 07, 09). Sub-routes such as /connect/<handle> do not.
const DOCK_ROUTES = new Set(DOCK_TABS.map((tab) => TABS[tab].href));

// Lives in the (app) layout so the dock survives navigation and its pill can travel between tabs.
// On screens without a dock it slides out of view instead of unmounting.
export function DockHost() {
  const pathname = usePathname();
  const shown = DOCK_ROUTES.has(pathname);
  return (
    <div
      data-tour={shown ? "dock" : undefined}
      aria-hidden={!shown}
      inert={!shown}
      className="fixed bottom-5 left-1/2 z-10"
      style={{
        transform: shown ? "translate(-50%, 0)" : "translate(-50%, 120px)",
        opacity: shown ? 1 : 0,
        transition: `transform .45s ${EASE}, opacity .3s ease`,
      }}
    >
      <Dock />
    </div>
  );
}
