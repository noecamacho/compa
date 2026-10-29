"use client";

import { useEffect, useState } from "react";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { eventsSince, seenOf, trimEvents, type LiveEvent, type Seen } from "@/lib/live/events";

type Batch = { snapshot: LiveSnapshotT | null; seen: Seen | null; fresh: LiveEvent[]; dropped: number; serial: number };

const EMPTY: Batch = { snapshot: null, seen: null, fresh: [], dropped: 0, serial: 0 };

// The events each new snapshot brought (a fresh array per snapshot, empty when nothing changed) and a running serial,
// so a view reacts exactly once per poll. Derived during render, the React way to track a prop across renders.
export function useLiveEvents(snapshot: LiveSnapshotT): Batch {
  const [batch, setBatch] = useState<Batch>(EMPTY);
  if (batch.snapshot !== snapshot) {
    const trimmed = trimEvents(eventsSince(batch.seen, snapshot));
    const next = { snapshot, seen: seenOf(snapshot), fresh: trimmed.events, dropped: trimmed.dropped, serial: batch.serial + 1 };
    setBatch(next);
    return next;
  }
  return batch;
}

export const ANNOUNCE_MS = 1600;
// How long the last event of a batch stays on screen before the stage is quiet again.
export const LINGER_MS = 4000;

// One event at a time from each batch, a beat apart, so a poll that brought six says all six; the last one lingers,
// then the caption leaves the page, so a quiet room shows nothing at all.
export type Announced = { event: LiveEvent | null; dropped: number };

const QUIET: Announced = { event: null, dropped: 0 };

// Reduced motion: the first event of each batch, held with its count until a later batch brings events, so nothing
// changes between polls.
export function useAnnouncer(batch: Batch, reducedMotion = false): Announced {
  const [shown, setShown] = useState<{ serial: number; index: number }>({ serial: 0, index: 0 });
  const [held, setHeld] = useState<Announced>(QUIET);
  const { fresh, serial, dropped } = batch;
  if (shown.serial !== serial && fresh.length > 0) setShown({ serial, index: 0 });
  if (reducedMotion && fresh.length > 0 && held.event !== fresh[0]) setHeld({ event: fresh[0] ?? null, dropped });
  useEffect(() => {
    if (fresh.length === 0 || reducedMotion) return;
    const step = window.setInterval(() => setShown((state) => (state.index + 1 < fresh.length ? { serial, index: state.index + 1 } : state)), ANNOUNCE_MS);
    const clear = window.setTimeout(() => setShown({ serial, index: -1 }), ANNOUNCE_MS * (fresh.length - 1) + LINGER_MS);
    return () => {
      window.clearInterval(step);
      window.clearTimeout(clear);
    };
  }, [fresh, serial, reducedMotion]);
  if (reducedMotion) return fresh.length > 0 ? { event: fresh[0] ?? null, dropped } : held;
  const index = shown.serial === serial ? shown.index : 0;
  const event = index < 0 ? null : (fresh[index] ?? null);
  return event ? { event, dropped } : QUIET;
}
