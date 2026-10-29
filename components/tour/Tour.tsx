"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCopy } from "@/components/LocaleProvider";

export type TourStep = {
  // Matches `data-tour="<target>"` on the element to spotlight.
  target: string;
  title: string;
  body: string;
};

type Props = {
  // Storage key; the tour runs once per key unless the URL has `?tour=1`.
  id: string;
  steps: TourStep[];
};

type Box = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const RADIUS = 18;
const POPUP_WIDTH = 318;
const POPUP_HEIGHT = 210;
const GAP = 14;
// The spotlight and the card glide from one target to the next (same spring as the dock).
const MOVE = ".45s cubic-bezier(.34,1.2,.5,1)";
const RECT_MOVE = `x ${MOVE}, y ${MOVE}, width ${MOVE}, height ${MOVE}`;

const storageKey = (id: string) => `compa:tour:${id}`;

function wasSeen(id: string): boolean {
  try {
    return localStorage.getItem(storageKey(id)) === "done";
  } catch {
    return true;
  }
}

function markSeen(id: string): void {
  try {
    localStorage.setItem(storageKey(id), "done");
  } catch {
    // Blocked storage: the tour will show again next time, which is harmless.
  }
}

// A target can exist twice (the bottom dock and the desktop rail); the visible one wins.
const findTarget = (name: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find((element) => element.getClientRects().length > 0) ?? null;

function measure(element: HTMLElement): Box {
  const rect = element.getBoundingClientRect();
  return { top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 };
}

// Keeps the spotlight glued to the target while the page scrolls or resizes.
function useTargetBox(target: string | null): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useLayoutEffect(() => {
    if (!target) return;
    const element = findTarget(target);
    if (!element) return;
    element.scrollIntoView({ block: "center", behavior: "instant" });
    const update = () => setBox(measure(element));
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [target]);
  return target ? box : null;
}

function popupPosition(box: Box): { top: number; left: number; arrowTop: boolean } {
  const left = Math.min(Math.max(16, box.left + box.width / 2 - POPUP_WIDTH / 2), window.innerWidth - POPUP_WIDTH - 16);
  const below = box.top + box.height + GAP;
  if (below + POPUP_HEIGHT <= window.innerHeight) return { top: below, left, arrowTop: true };
  return { top: Math.max(16, box.top - GAP - POPUP_HEIGHT), left, arrowTop: false };
}

// Steps whose target is not on screen (e.g. a card hidden in the empty state) are skipped.
const nextAvailable = (steps: TourStep[], from: number): number | null => {
  const found = steps.findIndex((step, index) => index >= from && findTarget(step.target));
  return found === -1 ? null : found;
};

const previousAvailable = (steps: TourStep[], from: number): number | null => {
  for (let index = from; index >= 0; index--) if (findTarget(steps[index]?.target ?? "")) return index;
  return null;
};

// Dims the whole screen except one element and explains it in a card (guided onboarding, step by step).
export function Tour({ id, steps }: Props) {
  const copy = useCopy().tour;
  const router = useRouter();
  const params = useSearchParams();
  const forced = params.get("tour") === "1";
  const [index, setIndex] = useState<number | null>(null);
  const step = index === null ? null : (steps[index] ?? null);
  const box = useTargetBox(step?.target ?? null);

  // Starts after the first paint so every target is in the DOM and storage is readable.
  useEffect(() => {
    if (!forced && wasSeen(id)) return;
    const timer = setTimeout(() => setIndex(nextAvailable(steps, 0)), 50);
    return () => clearTimeout(timer);
  }, [id, forced, steps]);

  const finish = useCallback(() => {
    markSeen(id);
    setIndex(null);
    if (forced) router.replace(window.location.pathname);
  }, [id, forced, router]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, finish]);

  if (index === null || !step || !box) return null;
  const next = nextAvailable(steps, index + 1);
  const previous = previousAvailable(steps, index - 1);
  const last = next === null;
  const position = popupPosition(box);
  const maskId = `tour-mask-${id}`;
  const arrowLeft = Math.min(Math.max(18, box.left + box.width / 2 - position.left - 8), POPUP_WIDTH - 34);
  const arrowBorder = position.arrowTop
    ? { top: -10, borderLeft: "2.5px solid #1E1B2E", borderTop: "2.5px solid #1E1B2E" }
    : { bottom: -10, borderRight: "2.5px solid #1E1B2E", borderBottom: "2.5px solid #1E1B2E" };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={step.title} className="animate-overlay-in fixed inset-0 z-50">
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            <rect x={box.left} y={box.top} width={box.width} height={box.height} rx={RADIUS} fill="#000" style={{ transition: RECT_MOVE }} />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(30,27,46,0.78)" mask={`url(#${maskId})`} />
        <rect
          x={box.left}
          y={box.top}
          width={box.width}
          height={box.height}
          rx={RADIUS}
          fill="none"
          stroke="#FFD93D"
          strokeWidth={3}
          strokeDasharray="8 6"
          style={{ transition: RECT_MOVE }}
        />
      </svg>
      <div
        className="animate-rise absolute rounded-card bg-white px-4 py-[14px] border-ink shadow-hard-4"
        style={{ top: position.top, left: position.left, width: POPUP_WIDTH, transition: `top ${MOVE}, left ${MOVE}` }}
      >
        <span
          aria-hidden="true"
          className="absolute h-4 w-4 bg-white"
          style={{ left: arrowLeft, transform: "rotate(45deg)", transition: `left ${MOVE}`, ...arrowBorder }}
        />
        {/* Keyed by step so the text fades in while the card itself glides. */}
        <div key={index} className="animate-fade-in relative flex flex-col gap-[10px]">
          <span className="flex items-center justify-between">
            <span className="inline-flex h-6 items-center rounded-[8px] bg-sun-soft px-2 font-display text-[11px] font-bold" style={{ border: "2px solid #1E1B2E" }}>
              {copy.step(index + 1, steps.length)}
            </span>
            <button type="button" onClick={finish} className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-extrabold text-muted tappable">
              {copy.skip}
            </button>
          </span>
          <span className="font-display text-[19px] leading-[1.15] font-bold">{step.title}</span>
          <span className="text-[14px] leading-[1.4] font-bold">{step.body}</span>
          <div className="flex gap-2 pt-1">
            {previous !== null && (
              <button
                type="button"
                onClick={() => setIndex(previous)}
                className="h-11 cursor-pointer rounded-[14px] bg-white px-4 font-display text-[15px] font-bold text-ink border-ink shadow-hard-2 pressable"
              >
                {copy.back}
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setIndex(next))}
              className="h-11 flex-1 cursor-pointer rounded-[14px] bg-mint px-4 font-display text-[15px] font-bold text-ink border-ink shadow-hard-3 pressable"
            >
              {last ? copy.done : copy.next}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
