import type { ReactNode } from "react";

// Remounts on every navigation, so each screen slides in (globals.css `screen-in`).
export default function ScreenTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-screen-in">{children}</div>;
}
