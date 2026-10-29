import type { ReactNode } from "react";

// "wide": dashboard screens that switch to two columns from 834 (home, connections, profiles, badges, ranking).
// "focus": one task in one column (register, request, confirmation, note, invite, onboarding), centered at reading width.
export type ScreenWidth = "wide" | "focus";

type Props = {
  children: ReactNode;
  // Screens with the dock leave room for it at the bottom (README: dock on 03, 03b, 04, 07, 09).
  // The dock itself is rendered once by the (app) layout (components/nav/Dock.tsx, DockHost); from 1024 it is a left rail.
  dock?: boolean;
  gap?: number;
  width?: ScreenWidth;
  className?: string;
};

// Phone: 390 max, 18 side padding (README). Tablet: 32 gutter. Desktop: 40 gutter, 1040 of content for wide screens.
const WIDTH_CLASS: Record<ScreenWidth, string> = {
  wide: "max-w-[390px] md:max-w-[834px] lg:max-w-[1120px]",
  focus: "max-w-[390px] md:max-w-[640px] lg:max-w-[680px]",
};

const BOTTOM_CLASS = {
  dock: "pb-[calc(104px+env(safe-area-inset-bottom))] lg:pb-12",
  plain: "pb-[calc(30px+env(safe-area-inset-bottom))] lg:pb-12",
} as const;

// One screen: paper with dots across the whole viewport, content centered in it, 48 top padding, 14 between blocks (README).
// `--rail` is set by the (app) layout from 1024 so content centers beside the rail; onboarding has no rail, so it is 0.
// `--gutter` is the side padding; StickyBar bleeds over it.
export function Screen({ children, dock = false, gap = 14, width = "wide", className }: Props) {
  return (
    <div className="paper-dots min-h-dvh lg:pl-(--rail)">
      <main
        className={`relative mx-auto flex min-h-dvh w-full flex-col px-(--gutter) pt-12 [--gutter:18px] md:[--gutter:32px] lg:[--gutter:40px] ${WIDTH_CLASS[width]} ${BOTTOM_CLASS[dock ? "dock" : "plain"]} ${className ?? ""}`}
        style={{ gap }}
      >
        {children}
      </main>
    </div>
  );
}
