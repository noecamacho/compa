"use client";

import { useEffect, useRef } from "react";
import { LoomScene, type LoomData } from "./loom-scene";

type Props = {
  data: LoomData;
  selectedId: string | null;
  label: string;
  // A person's id, or null for empty space (A5: empty space opens the leaderboard).
  onSelect: (id: string | null) => void;
  onUnavailable: () => void;
};

const TAP_SLOP_PX = 8;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createScene(host: HTMLElement): LoomScene | null {
  try {
    return new LoomScene(host, prefersReducedMotion());
  } catch {
    return null;
  }
}

// Loaded with next/dynamic and ssr: false, so Three.js never runs on the server and stays out of the main bundle.
export default function Loom({ data, selectedId, label, onSelect, onUnavailable }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LoomScene | null>(null);
  const handlers = useRef({ onSelect, onUnavailable });

  useEffect(() => {
    handlers.current = { onSelect, onUnavailable };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = createScene(host);
    if (!scene) {
      handlers.current.onUnavailable();
      return;
    }
    sceneRef.current = scene;
    const observer = new ResizeObserver(() => scene.resize());
    observer.observe(host);
    let down: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => (down = { x: event.clientX, y: event.clientY });
    const onUp = (event: PointerEvent) => {
      const tap = down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < TAP_SLOP_PX;
      down = null;
      if (tap) handlers.current.onSelect(scene.pick(event.clientX, event.clientY));
    };
    const onMove = (event: PointerEvent) => (scene.canvas.style.cursor = scene.pick(event.clientX, event.clientY) ? "pointer" : "default");
    scene.canvas.addEventListener("pointerdown", onDown);
    scene.canvas.addEventListener("pointerup", onUp);
    scene.canvas.addEventListener("pointermove", onMove);
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => sceneRef.current?.update(data), [data]);
  useEffect(() => sceneRef.current?.select(selectedId), [selectedId]);

  return <div ref={hostRef} role="img" aria-label={label} className="absolute inset-0 touch-manipulation" />;
}
