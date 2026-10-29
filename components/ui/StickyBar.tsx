import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string };

// Keeps a screen's top row (avatar + greeting + bell, or back + title) pinned while the content scrolls under it.
// It bleeds over the screen's side padding (`--gutter`, set by Screen) so scrolled content never peeks out at the edges;
// the -10 px top margin cancels its own top padding so the row starts exactly where it did before it became sticky.
// It is translucent paper over Screen's fixed dot layer, so the dots run unbroken behind it at every width and on iPad Safari.
export function StickyBar({ children, className }: Props) {
  return (
    <div
      className={`sticky top-0 z-20 -mx-(--gutter) -mt-[10px] bg-paper/80 px-(--gutter) pb-[10px] backdrop-blur-md ${className ?? ""}`}
      style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
    >
      {children}
    </div>
  );
}
