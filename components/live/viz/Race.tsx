"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/monito/Avatar";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { boardRows, type BoardRow } from "@/lib/live/live-model";
import { BUBBLE_COUNT, GHOST_WIDTHS, barRatio, bubbleRadius, bubbleX, bubbleY, flipDeltas, gainedIds, pointsById, raceRows } from "@/lib/live/race";
import { PALETTE, type VizProps } from "./types";
import { Particles } from "./particles";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";

const FLIP_MS = 500;
const BAR_MS = 600;
// How long a scoring bar keeps shedding sparks while it grows to its new length.
const EMIT_SECONDS = 0.7;
const STRIPE_PX = 28;
// 26 px at 1920 wide, 15 px on a phone; every other size in a row is in em of this.
const ROW_FONT = "clamp(15px, 1.4vw, 32px)";
const STRIPES = "linear-gradient(135deg, rgba(255,255,255,.4) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.4) 50%, rgba(255,255,255,.4) 75%, transparent 75%)";
const PODIUM = [PALETTE.sun, PALETTE.silver, PALETTE.bronze];
const DASHED = `2.5px dashed ${PALETTE.ink}`;
// Room for the points value after the longest bar.
const LABEL_EM = 4.5;

type Els = Map<string, HTMLElement>;
type Ref = (element: HTMLElement | null) => void;
type Emitter = { id: string; color: string; left: number; started: boolean };
type Gains = { source: LiveSnapshotT; points: Map<string, number>; fresh: string[]; counts: Record<string, number> };

const colorOf = (rank: number): string => PODIUM[rank - 1] ?? PALETTE.new;

const barWidth = (ratio: number): string => `calc((100% - ${LABEL_EM}em) * ${ratio})`;

function nextGains(state: Gains, snapshot: LiveSnapshotT, rows: readonly BoardRow[]): Gains {
  const fresh = gainedIds(state.points, rows);
  const counts = { ...state.counts };
  for (const id of fresh) counts[id] = (counts[id] ?? 0) + 1;
  return { source: snapshot, points: pointsById(snapshot.people), fresh, counts };
}

const measureTops = (els: Els): Map<string, number> => new Map([...els].map(([id, element]): [string, number] => [id, element.offsetTop]));

// FLIP: jump each moved row back to where it was, force one layout, then let it slide home.
function playFlip(deltas: Map<string, number>, els: Els, list: HTMLElement): void {
  for (const [id, delta] of deltas) {
    const style = els.get(id)?.style;
    if (!style) continue;
    style.transition = "none";
    style.transform = `translateY(${delta}px)`;
  }
  void list.offsetHeight;
  for (const id of deltas.keys()) {
    const style = els.get(id)?.style;
    if (!style) continue;
    style.transition = `transform ${FLIP_MS}ms cubic-bezier(.2,.8,.2,1)`;
    style.transform = "";
  }
}

function drawBubbles(ctx: CanvasRenderingContext2D, seconds: number, width: number, height: number): void {
  const scale = Math.max(1, width / 700);
  ctx.lineWidth = 1.5;
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.strokeStyle = "rgba(30,27,46,0.22)";
  for (let index = 0; index < BUBBLE_COUNT; index++) {
    ctx.beginPath();
    ctx.arc(bubbleX(index, seconds, width), bubbleY(index, seconds, height), bubbleRadius(index) * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function sparkle(particles: Particles, emitter: Emitter, x: number, y: number): void {
  if (!emitter.started) particles.burst(x, y, emitter.color, 10, 110);
  particles.spawn({ x, y, color: Math.random() < 0.5 ? emitter.color : PALETTE.white, vx: (Math.random() - 0.2) * 90, vy: (Math.random() - 0.8) * 100, ttl: 0.5, size: 2 + Math.random() * 2.5, gravity: 90 });
  emitter.started = true;
}

// Sparks come from wherever the bar's end is right now, so they ride the growing bar.
function emitFromBars(emitters: Emitter[], bars: Els, particles: Particles, root: HTMLElement, dt: number): void {
  const origin = root.getBoundingClientRect();
  for (const emitter of emitters) {
    emitter.left -= dt;
    const box = bars.get(emitter.id)?.getBoundingClientRect();
    if (!box) continue;
    sparkle(particles, emitter, box.right - origin.left, box.top + box.height / 2 - origin.top);
  }
}

type RowProps = {
  row: BoardRow;
  ratio: number;
  selected: boolean;
  reduced: boolean;
  avatar: number;
  gain: number;
  liRef: Ref;
  barRef: Ref;
  onSelect: (id: string) => void;
};

function RaceRow({ row, ratio, selected, reduced, avatar, gain, liRef, barRef, onSelect }: RowProps) {
  const color = colorOf(row.rank);
  const scored = gain > 0 && !reduced;
  return (
    <li ref={liRef} className="relative max-h-[18%] min-h-0 flex-1" style={{ animation: reduced ? undefined : "rise 400ms ease-out" }}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(row.id);
        }}
        className={`flex h-full w-full cursor-pointer items-center gap-[0.6em] rounded-button px-[0.5em] text-left text-ink ${selected ? "bg-white ring-[5px] ring-ink" : "bg-white/75"}`}
        style={{ fontSize: ROW_FONT }}
      >
        <span className="grid shrink-0 place-items-center rounded-full font-display font-bold tabular-nums border-ink" style={{ width: "1.9em", height: "1.9em", background: color }}>
          {row.rank}
        </span>
        <span className="shrink-0">
          <Avatar person={{ name: row.name, photoUrl: row.photoUrl }} size={avatar} />
        </span>
        <span className="min-w-0 shrink-0 basis-[22%] truncate font-display font-bold">{row.name}</span>
        <span className="flex min-w-0 flex-1 items-center">
          <span
            ref={barRef}
            className="relative block h-[1.5em] shrink-0 overflow-hidden rounded-full border-ink"
            style={{
              width: barWidth(ratio),
              backgroundColor: color,
              backgroundImage: reduced ? undefined : STRIPES,
              backgroundSize: `${STRIPE_PX}px ${STRIPE_PX}px`,
              backgroundPosition: "var(--stripe, 0px) 0",
              transition: reduced ? "none" : `width ${BAR_MS}ms cubic-bezier(.3,.9,.3,1)`,
            }}
          >
            {scored && <span key={gain} className="absolute inset-0 bg-white" style={{ animation: "fade-in 600ms ease-out reverse both" }} />}
          </span>
          <span key={gain} className="ml-[0.4em] whitespace-nowrap font-display font-bold tabular-nums" style={{ animation: scored ? "bump 500ms ease-out" : undefined }}>
            {row.points}
          </span>
        </span>
      </button>
    </li>
  );
}

// Nobody yet: dashed outlines of what the race will look like, shimmering so the screen is never dead.
function GhostRows({ reduced }: { reduced: boolean }) {
  return (
    <ol aria-hidden className="absolute inset-0 m-0 flex list-none flex-col gap-[1%] p-[2%]">
      {GHOST_WIDTHS.map((width, index) => (
        <li key={width} className="flex max-h-[18%] min-h-0 flex-1 items-center gap-[0.6em] px-[0.5em]" style={{ fontSize: ROW_FONT, animation: reduced ? undefined : `blink 1.8s ease-in-out ${index * 0.3}s infinite` }}>
          <span className="shrink-0 rounded-full" style={{ width: "1.9em", height: "1.9em", border: DASHED }} />
          <span className="shrink-0 rounded-full" style={{ width: "2.3em", height: "2.3em", border: DASHED }} />
          <span className="h-[1em] shrink-0 basis-[22%] rounded-full" style={{ border: DASHED }} />
          <span className="flex min-w-0 flex-1 items-center">
            <span className="block h-[1.5em] shrink-0 rounded-full" style={{ width: barWidth(width), border: DASHED }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function register(els: Els, id: string, element: HTMLElement | null): void {
  if (element) els.set(id, element);
  else els.delete(id);
}

const avatarSize = (height: number, count: number): number => Math.round(Math.min(72, Math.max(26, Math.min(height / Math.max(count, 1), height * 0.18) * 0.72)));

export default function Race({ snapshot, reducedMotion, label, selectedId, onSelect }: VizProps) {
  const rows = useMemo(() => raceRows(boardRows(snapshot)), [snapshot]);
  const leader = rows[0]?.points ?? 0;
  const order = rows.map((row) => row.id).join(",");
  const [gains, setGains] = useState<Gains>(() => ({ source: snapshot, points: pointsById(snapshot.people), fresh: [], counts: {} }));
  const [height, setHeight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const rowEls = useRef<Els>(new Map());
  const barEls = useRef<Els>(new Map());
  const tops = useRef(new Map<string, number>());
  const emitters = useRef<Emitter[]>([]);
  const [particles] = useState(() => new Particles());

  const setRow = useCallback((id: string, element: HTMLElement | null) => register(rowEls.current, id, element), []);
  const setBar = useCallback((id: string, element: HTMLElement | null) => register(barEls.current, id, element), []);

  if (gains.source !== snapshot) setGains(nextGains(gains, snapshot, rows));

  useLayoutEffect(() => {
    const next = measureTops(rowEls.current);
    if (!reducedMotion && listRef.current) playFlip(flipDeltas(tops.current, next), rowEls.current, listRef.current);
    tops.current = next;
  }, [order, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => {
      setHeight(root.clientHeight);
      tops.current = measureTops(rowEls.current);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    for (const id of gains.fresh) {
      const rank = rows.find((row) => row.id === id)?.rank ?? 4;
      emitters.current.push({ id, color: colorOf(rank), left: EMIT_SECONDS, started: false });
    }
  }, [gains, rows, reducedMotion]);

  const draw = ({ ctx, width, height: canvasHeight, now, dt }: Frame) => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    root.style.setProperty("--stripe", `${(now / 35) % STRIPE_PX}px`);
    drawBubbles(ctx, now / 1000, width, canvasHeight);
    if (emitters.current.length > 0) emitFromBars(emitters.current, barEls.current, particles, root, dt);
    emitters.current = emitters.current.filter((emitter) => emitter.left > 0);
    particles.step(dt);
    particles.draw(ctx);
  };
  const canvasRef = useCanvasLoop(draw, !reducedMotion, [snapshot, reducedMotion]);
  const avatar = avatarSize(height, rows.length);

  return (
    // The keyboard reaches every row through its button; the empty-space click is a pointer shortcut (A5).
    <div ref={rootRef} role="group" aria-label={label} data-viz="race" className="absolute inset-0 overflow-hidden" onClick={() => onSelect(null)}>
      {rows.length === 0 && <GhostRows reduced={reducedMotion} />}
      <ol ref={listRef} className="absolute inset-0 m-0 flex list-none flex-col gap-[1%] p-[2%]">
        {rows.map((row) => (
          <RaceRow
            key={row.id}
            row={row}
            ratio={barRatio(row.points, leader)}
            selected={row.id === selectedId}
            reduced={reducedMotion}
            avatar={avatar}
            gain={gains.counts[row.id] ?? 0}
            liRef={(element) => setRow(row.id, element)}
            barRef={(element) => setBar(row.id, element)}
            onSelect={onSelect}
          />
        ))}
      </ol>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
