"use client";

import { useEffect, useRef } from "react";
import { Caption } from "./Caption";
import { CosmosScene } from "./cosmos-scene";
import type { VizProps } from "./types";
import { useAnnouncer, useLiveEvents } from "./useLiveEvents";

function createScene(host: HTMLElement, animate: boolean): CosmosScene | null {
  try {
    return new CosmosScene(host, animate);
  } catch {
    return null;
  }
}

// Loaded with next/dynamic and ssr: false. No WebGL here: the stage drops the view from the rotation.
export default function Cosmos({ snapshot, reducedMotion, label, onSelect, onUnavailable }: VizProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CosmosScene | null>(null);
  const batch = useLiveEvents(snapshot);
  const announced = useAnnouncer(batch, reducedMotion);
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = createScene(host, !reducedMotion);
    if (!scene) {
      unavailable.current?.();
      return;
    }
    sceneRef.current = scene;
    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(host);
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => sceneRef.current?.update(snapshot, batch.fresh), [snapshot, batch.fresh]);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px] border-ink" data-viz="cosmos" style={{ background: "radial-gradient(ellipse at 50% 60%, #2A2450, #0F0D1A 70%)" }} onClick={() => onSelect(null)}>
      <div ref={hostRef} role="img" aria-label={label} className="absolute inset-0 touch-manipulation" />
      <Caption event={announced.event} dropped={announced.dropped} reducedMotion={reducedMotion} tone="ink" />
    </div>
  );
}
