// The contract every live visualization honours, so the stage can rotate between them (docs/research/live-dataviz-decision.md).
import type { LiveSnapshotT } from "@/lib/api/schemas";

export type VizProps = {
  snapshot: LiveSnapshotT;
  // Calmer variant: no particles or ambient drift; redraw only when the data changes.
  reducedMotion: boolean;
  label: string;
  selectedId: string | null;
  // A person's id, or null for empty space (A5: empty space opens the leaderboard).
  onSelect: (id: string | null) => void;
};

export const PALETTE = {
  ink: "#1E1B2E",
  paper: "#FFF6E5",
  white: "#FFFFFF",
  muted: "#6F6A7E",
  new: "#6BE4A3",
  reconnection: "#FF8FAB",
  sun: "#FFD93D",
  sky: "#6CC4FF",
  coral: "#FF6B4A",
  silver: "#D5DCE6",
  bronze: "#F2A766",
} as const;

export const KIND_COLOR = { new: PALETTE.new, reconnection: PALETTE.reconnection } as const;
