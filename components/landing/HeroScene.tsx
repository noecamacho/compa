"use client";

import { useEffect, useRef } from "react";
import { SAMPLE_PEOPLE, type SampleId } from "@/lib/monito/sample-people";
import { HeroScene as Scene, type HeroStory } from "./hero-scene";

type Props = { story: HeroStory; onReady: () => void; onUnavailable: () => void };

// Seat order matches HOMES in lib/landing/hero-timeline.ts.
const CAST: SampleId[] = ["XS", "DR", "ST", "VO", "PN", "CI"];
const TAP_SLOP_PX = 8;

function createScene(host: HTMLElement, story: HeroStory, onFirstFrame: () => void): Scene | null {
  try {
    return new Scene(host, story, CAST.map((id) => SAMPLE_PEOPLE[id].look), onFirstFrame);
  } catch {
    return null;
  }
}

// Pauses the loop while the hero is off screen or the tab is hidden.
function watchVisibility(host: HTMLElement, scene: Scene): () => void {
  let onScreen = true;
  const sync = () => scene.setRunning(onScreen && document.visibilityState === "visible");
  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    sync();
  });
  observer.observe(host);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", sync);
  };
}

// Hover (mouse) or tap (touch) on a monito makes it jump and say hi; a mouse anywhere on the page steers the parallax.
function watchPointer(scene: Scene): () => void {
  const canvas = scene.canvas;
  let down: { x: number; y: number } | null = null;
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    scene.lookAt((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  };
  const onHover = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const index = scene.pick(event.clientX, event.clientY);
    canvas.style.cursor = index < 0 ? "default" : "pointer";
    scene.greet(index);
  };
  const onDown = (event: PointerEvent) => (down = { x: event.clientX, y: event.clientY });
  const onUp = (event: PointerEvent) => {
    const tap = down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < TAP_SLOP_PX;
    down = null;
    if (tap) scene.greet(scene.pick(event.clientX, event.clientY));
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  canvas.addEventListener("pointermove", onHover);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  return () => {
    window.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointermove", onHover);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
  };
}

// Loaded with next/dynamic and ssr: false, so Three.js never runs on the server and stays out of the main bundle.
export default function HeroScene({ story, onReady, onUnavailable }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onUnavailable });

  useEffect(() => {
    handlers.current = { onReady, onUnavailable };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = createScene(host, story, () => handlers.current.onReady());
    if (!scene) {
      handlers.current.onUnavailable();
      return;
    }
    const resize = new ResizeObserver(() => scene.resize());
    resize.observe(host);
    const lost = () => handlers.current.onUnavailable();
    scene.canvas.addEventListener("webglcontextlost", lost);
    const stopVisibility = watchVisibility(host, scene);
    const stopPointer = watchPointer(scene);
    return () => {
      resize.disconnect();
      stopVisibility();
      stopPointer();
      scene.canvas.removeEventListener("webglcontextlost", lost);
      scene.dispose();
    };
  }, [story]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0 touch-manipulation" />;
}
