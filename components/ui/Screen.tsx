import type { ReactNode } from "react";
import { Dock } from "@/components/nav/Dock";

type Props = {
  children: ReactNode;
  // Screens with the dock leave room for it at the bottom (README: dock on 03, 03b, 04, 07, 09).
  dock?: boolean;
  gap?: number;
  className?: string;
};

// One phone screen: 390 wide, paper background with dots, 48 top / 18 side padding, 14 between blocks (README).
export function Screen({ children, dock = false, gap = 14, className }: Props) {
  return (
    <main
      className={`paper-dots relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-[18px] pt-12 ${dock ? "pb-[104px]" : "pb-[30px]"} ${className ?? ""}`}
      style={{ gap }}
    >
      {children}
      {dock && (
        <div data-tour="dock" className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2">
          <Dock />
        </div>
      )}
    </main>
  );
}
