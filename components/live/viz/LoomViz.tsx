"use client";

import { useMemo } from "react";
import Loom from "../Loom";
import type { LoomData } from "../loom-scene";
import type { VizProps } from "./types";

type Props = VizProps & { onUnavailable: () => void };

// The loom behind the shared visualization contract; it reads reduced motion itself.
export default function LoomViz({ snapshot, label, selectedId, onSelect, onUnavailable }: Props) {
  const data: LoomData = useMemo(() => ({ people: snapshot.people, links: snapshot.connections }), [snapshot]);
  return (
    <div className="absolute inset-0" data-viz="loom">
      <Loom data={data} selectedId={selectedId} label={label} onSelect={onSelect} onUnavailable={onUnavailable} />
    </div>
  );
}
