import Link from "next/link";
import type { ReactNode } from "react";
import { Dock } from "@/components/nav/Dock";

type Props = {
  children: ReactNode;
  // Screens with the dock leave room for it at the bottom (README: dock on 03, 03b, 04, 07, 09).
  dock?: boolean;
  gap?: number;
  className?: string;
  // Super admins only (API spec A11): a discreet "Admin" link at the top right on desktop.
  admin?: boolean;
};

// One phone screen: 390 wide, paper background with dots, 48 top / 18 side padding, 14 between blocks (README).
export function Screen({ children, dock = false, gap = 14, className, admin = false }: Props) {
  return (
    <main
      className={`paper-dots relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-[18px] pt-12 ${dock ? "pb-[104px]" : "pb-[30px]"} ${className ?? ""}`}
      style={{ gap }}
    >
      {children}
      {admin && (
        <Link
          href="/admin"
          className="fixed top-4 right-4 z-10 hidden h-9 items-center rounded-chip bg-ink px-3 font-display text-[13px] font-bold text-paper border-ink lg:flex"
        >
          Admin
        </Link>
      )}
      {dock && (
        <div data-tour="dock" className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2">
          <Dock />
        </div>
      )}
    </main>
  );
}
