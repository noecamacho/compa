"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

type Props = { active?: DockTab; className?: string };

export function Dock({ active, className }: Props) {
  const pathname = usePathname();
  const current = active ?? activeTabFor(pathname);
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
          }}
        />
        {DOCK_TABS.map((tab, index) => {
          const on = index === activeIndex;
          return (
            <Link
              key={tab}
              href={TABS[tab].href}
              aria-current={on ? "page" : undefined}
              className={`absolute top-0 left-0 box-border flex h-[50px] items-center justify-center gap-2 rounded-[25px] font-display text-[15px] font-bold whitespace-nowrap ${on ? "text-ink" : "text-muted"}`}
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
