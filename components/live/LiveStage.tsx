"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { VIZ_IDS, firstViz, isVizId, nextViz, rotationFrom, type Rotation, type VizId } from "@/lib/live/rotation";
import type { VizProps } from "./viz/types";

// Each visualization is its own chunk and never runs on the server (canvas, WebGL).
const VIEWS: Record<Exclude<VizId, "loom">, ComponentType<VizProps>> = {
  orbit: dynamic(() => import("./viz/Orbit"), { ssr: false }),
  race: dynamic(() => import("./viz/Race"), { ssr: false }),
  wave: dynamic(() => import("./viz/Wave"), { ssr: false }),
};
const LoomViz = dynamic(() => import("./viz/LoomViz"), { ssr: false });

const LAST_KEY = "compa.live.viz";
const FADE_MS = 700;

type Props = Omit<VizProps, "reducedMotion"> & { locale: Locale };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);
}

// Storage can be blocked (private mode, kiosk policies); the screen still works, it just may repeat a view.
function readLast(): VizId | null {
  try {
    const value = window.sessionStorage.getItem(LAST_KEY);
    return isVizId(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLast(id: VizId): void {
  try {
    window.sessionStorage.setItem(LAST_KEY, id);
  } catch {
    // Not fatal: see readLast.
  }
}

type Shown = { current: VizId; leaving: VizId | null; rotation: Rotation; available: VizId[] };

// Picks a different visualization than the last load, then moves on every `rotation.seconds` with a cross-fade.
// The stage only ever renders in the browser (LiveBoard loads it with ssr: false), so it can read the URL at once.
function initialStage(): Shown {
  const rotation = rotationFrom(window.location.search);
  const current = rotation.pinned ?? firstViz(readLast(), Math.random());
  return { current, leaving: null, rotation, available: [...VIZ_IDS] };
}

function useStage(): [Shown | null, (id: VizId) => void] {
  const [shown, setShown] = useState<Shown | null>(initialStage);

  const current = shown?.current;
  const seconds = shown?.rotation.seconds ?? 0;
  useEffect(() => {
    if (!current) return;
    writeLast(current);
    if (seconds === 0) return;
    const timer = window.setTimeout(() => setShown((state) => state && { ...state, current: nextViz(state.current, state.available), leaving: state.current }), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [current, seconds]);

  const leaving = shown?.leaving;
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setShown((state) => state && { ...state, leaving: null }), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // A view that cannot run here (no WebGL) leaves the rotation for good and hands over at once.
  const drop = (id: VizId) =>
    setShown((state) => {
      if (!state) return state;
      const available = state.available.filter((other) => other !== id);
      if (available.length === 0) return state;
      return { ...state, available, current: state.current === id ? nextViz(id, available) : state.current, leaving: null };
    });

  return [shown, drop];
}

function View({ id, props, onUnavailable }: { id: VizId; props: VizProps; onUnavailable: () => void }) {
  if (id === "loom") return <LoomViz {...props} onUnavailable={onUnavailable} />;
  const Component = VIEWS[id];
  return <Component {...props} />;
}

// Which view is on and how long until the next: a strip of named dots with a filling bar, so the change never surprises.
function Indicator({ shown, locale, reducedMotion }: { shown: Shown; locale: Locale; reducedMotion: boolean }) {
  const names = copyFor(locale).live.vizNames;
  const seconds = shown.rotation.seconds;
  return (
    <ol className="pointer-events-none absolute bottom-2 left-2 m-0 flex list-none items-center gap-1.5 rounded-chip bg-white/90 px-2 py-1 border-ink shadow-hard-2" aria-hidden="true" data-testid="live-viz-indicator">
      {shown.available.map((id) => (
        <li key={id} className={`relative overflow-hidden rounded-full px-2 text-[12px] font-extrabold lg:text-[clamp(12px,0.8vw,18px)] ${id === shown.current ? "bg-sun" : "text-ink/60"}`}>
          {names[id]}
          {id === shown.current && seconds > 0 && !reducedMotion && (
            <span key={`${id}-${shown.leaving}`} className="absolute bottom-0 left-0 h-[3px] bg-ink" style={{ animation: `viz-progress ${seconds}s linear forwards` }} />
          )}
        </li>
      ))}
    </ol>
  );
}

// The stage behind the counters: one visualization at a time, a new one on every load and every 30 s by default.
export default function LiveStage({ locale, ...rest }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, drop] = useStage();
  if (!shown) return null;
  const props: VizProps = { ...rest, reducedMotion };
  const layers = shown.leaving && !reducedMotion ? [shown.leaving, shown.current] : [shown.current];
  return (
    <div className="absolute inset-0" data-testid="live-stage" data-current={shown.current}>
      {layers.map((id) => (
        <div
          key={id}
          className="absolute inset-0"
          style={{ animation: reducedMotion ? undefined : `${id === shown.current ? "viz-in" : "viz-out"} ${FADE_MS}ms ease-in-out both`, pointerEvents: id === shown.current ? "auto" : "none" }}
        >
          <View id={id} props={props} onUnavailable={() => drop(id)} />
        </div>
      ))}
      {!shown.rotation.pinned && shown.available.length > 1 && <Indicator shown={shown} locale={locale} reducedMotion={reducedMotion} />}
    </div>
  );
}
