"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { VIZ_IDS, firstViz, isVizId, nextViz, rotationFrom, type Rotation, type VizId } from "@/lib/live/rotation";
import type { VizProps } from "./viz/types";

// Each visualization is its own chunk and never runs on the server (canvas, WebGL).
const VIEWS: Record<VizId, ComponentType<VizProps>> = {
  loom: dynamic(() => import("./viz/LoomViz"), { ssr: false }),
  orbit: dynamic(() => import("./viz/Orbit"), { ssr: false }),
  race: dynamic(() => import("./viz/Race"), { ssr: false }),
  wave: dynamic(() => import("./viz/Wave"), { ssr: false }),
  cosmos: dynamic(() => import("./viz/Cosmos"), { ssr: false }),
  garden: dynamic(() => import("./viz/Garden"), { ssr: false }),
  marquee: dynamic(() => import("./viz/Marquee"), { ssr: false }),
  marbles: dynamic(() => import("./viz/Marbles"), { ssr: false }),
  skyline: dynamic(() => import("./viz/Skyline"), { ssr: false }),
};

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

// `held`: a view pinned by tap on the switcher; it stays until tapped again, whatever the rotation says.
type Shown = { current: VizId; leaving: VizId | null; rotation: Rotation; available: VizId[]; held: VizId | null };

// Picks a different visualization than the last load, then moves on every `rotation.seconds` with a cross-fade.
// The stage only ever renders in the browser (LiveBoard loads it with ssr: false), so it can read the URL at once.
function initialStage(): Shown {
  const rotation = rotationFrom(window.location.search);
  const current = rotation.pinned ?? firstViz(readLast(), Math.random());
  return { current, leaving: null, rotation, available: [...VIZ_IDS], held: null };
}

type Stage = { shown: Shown | null; drop: (id: VizId) => void; pick: (id: VizId) => void };

function useStage(reducedMotion: boolean): Stage {
  const [shown, setShown] = useState<Shown | null>(initialStage);

  const current = shown?.current;
  // Reduced motion: no hard cut every 30 s unless the URL asked for a period.
  const seconds = !shown || shown.held || (reducedMotion && !shown.rotation.explicit) ? 0 : shown.rotation.seconds;
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
      return { ...state, available, current: state.current === id ? firstViz(readLast(), Math.random(), available) : state.current, leaving: null };
    });

  // Tap a view to hold it; tap the held one again to let the rotation go on from there.
  const pick = (id: VizId) =>
    setShown((state) => {
      if (!state) return state;
      if (state.held === id) return { ...state, held: null };
      return { ...state, held: id, current: id, leaving: state.current === id ? null : state.current };
    });

  return { shown, drop, pick };
}

function View({ id, props }: { id: VizId; props: VizProps }) {
  const Component = VIEWS[id];
  return <Component {...props} />;
}

type SwitcherProps = { shown: Shown; locale: Locale; reducedMotion: boolean; onPick: (id: VizId) => void };

// Which view is on and how long until the next, as a strip of buttons: tap one to hold it (the bar stops), tap it
// again to release. Keyboard reaches it like any button, so it works on a projector with a remote keyboard.
function Switcher({ shown, locale, reducedMotion, onPick }: SwitcherProps) {
  const copy = copyFor(locale).live;
  const seconds = shown.held ? 0 : shown.rotation.seconds;
  return (
    <div role="group" aria-label={copy.pickViz} className="absolute bottom-2 left-2 flex max-w-[calc(100%-16px)] flex-wrap items-center gap-1 rounded-chip bg-white/90 px-1.5 py-1 border-ink shadow-hard-2" data-testid="live-viz-indicator" data-held={shown.held ?? undefined}>
      {shown.available.map((id) => {
        const on = id === shown.current;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={shown.held === id}
            title={shown.held === id ? copy.release : undefined}
            onClick={(event) => {
              event.stopPropagation();
              onPick(id);
            }}
            className={`relative cursor-pointer overflow-hidden rounded-full px-2 py-0.5 text-[12px] font-extrabold lg:text-[clamp(12px,0.8vw,18px)] ${on ? "bg-sun text-ink" : "text-ink/60 hover:bg-sun-soft"} ${shown.held === id ? "ring-2 ring-ink" : ""}`}
          >
            {copy.vizNames[id]}
            {shown.held === id && <span className="ml-1 text-[0.8em] opacity-70">📌</span>}
            {on && seconds > 0 && !reducedMotion && <span key={id} className="absolute bottom-0 left-0 h-[3px] bg-ink" style={{ animation: `viz-progress ${seconds}s linear forwards` }} />}
          </button>
        );
      })}
    </div>
  );
}

// The stage behind the counters: one visualization at a time, a new one on every load and every 30 s by default.
export default function LiveStage({ locale, ...rest }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const { shown, drop, pick } = useStage(reducedMotion);
  if (!shown) return null;
  const layers = shown.leaving && !reducedMotion ? [shown.leaving, shown.current] : [shown.current];
  return (
    <div className="absolute inset-0" data-testid="live-stage" data-current={shown.current}>
      {layers.map((id) => (
        <div
          key={id}
          className="absolute inset-0"
          style={{ animation: reducedMotion ? undefined : `${id === shown.current ? "viz-in" : "viz-out"} ${FADE_MS}ms ease-in-out both`, pointerEvents: id === shown.current ? "auto" : "none" }}
        >
          <View id={id} props={{ ...rest, reducedMotion, onUnavailable: () => drop(id) }} />
        </div>
      ))}
      {!shown.rotation.pinned && shown.available.length > 1 && <Switcher shown={shown} locale={locale} reducedMotion={reducedMotion} onPick={pick} />}
    </div>
  );
}
