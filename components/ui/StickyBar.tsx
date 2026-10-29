import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string };

// Keeps a screen's top row (avatar + greeting + bell, or back + title) pinned while the content scrolls under it.
// It bleeds over the screen's 18 px side padding so scrolled content never peeks out at the edges; the -10 px top
// margin cancels its own top padding so the row starts exactly where it did before it became sticky.
export function StickyBar({ children, className }: Props) {
  return (
    <div
      className={`paper-dots sticky top-0 z-20 -mx-[18px] -mt-[10px] px-[18px] pb-[10px] ${className ?? ""}`}
      style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
    >
      {children}
    </div>
  );
}
