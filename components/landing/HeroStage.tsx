"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import type { HeroStory } from "./hero-scene";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

let webglSupport: boolean | null = null;

function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function subscribeMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// True only in a browser with WebGL and without prefers-reduced-motion; false on the server.
function useCanAnimate(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia(REDUCED_MOTION).matches && hasWebGL(),
    () => false,
  );
}

type Props = { story: HeroStory; children: ReactNode };

// The SVG crowd (children) shows on the server, while Three.js loads, with reduced motion and without WebGL.
// Once the scene draws its first frame it fades in over the same box, so nothing shifts or goes blank.
export function HeroStage({ story, children }: Props) {
  const canAnimate = useCanAnimate();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = canAnimate && !failed;
  const showScene = live && ready;
  return (
    <>
      <div className={`absolute inset-0 transition-opacity duration-500 ${showScene ? "opacity-0" : "opacity-100"}`}>{children}</div>
      {live && (
        <div className={`absolute inset-0 transition-opacity duration-500 ${showScene ? "opacity-100" : "opacity-0"}`} data-testid="hero-scene">
          <HeroScene story={story} onReady={() => setReady(true)} onUnavailable={() => setFailed(true)} />
        </div>
      )}
    </>
  );
}
