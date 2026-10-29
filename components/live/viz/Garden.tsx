"use client";

// Garden: a generative SVG meadow. Every person is a plant; the top ones are flowers whose stems grow with points,
// the rest a lawn. Wind sways everything; a connection sends a bee from one flower to the other on a pollen trail;
// a check-in sprouts; points make a flower bloom.
import { useEffect, useRef, useState } from "react";
import { FLOWERS, flowers, grassCount, type Flower } from "@/lib/live/garden";
import type { LiveEvent } from "@/lib/live/events";
import { firstName } from "@/lib/live/orbit";
import { Caption } from "./Caption";
import { KIND_COLOR, PALETTE, type VizProps } from "./types";
import { useElementSize } from "./useElementSize";
import { useAnnouncer, useLiveEvents } from "./useLiveEvents";

const BEE_MS = 2200;
const GROUND = 0.12;
const NAMED = 8;
type Bee = { key: string; from: number; to: number; color: string; born: number };

const fraction = (value: number): number => value - Math.floor(value);

// A flower's x and the top of its stem, in pixels.
const topOf = (flower: Flower | undefined, width: number, height: number): [number, number] =>
  flower ? [flower.x * width, height * (1 - GROUND) - flower.stem * height * (1 - GROUND - 0.08)] : [width / 2, height * (1 - GROUND)];

function Sun({ width, reduced }: { width: number; reduced: boolean }) {
  const r = Math.max(28, width * 0.045);
  return (
    <g transform={`translate(${width * 0.88} ${r * 1.6})`}>
      <g style={{ animation: reduced ? undefined : "spin 40s linear infinite", transformOrigin: "0 0" }}>
        {Array.from({ length: 12 }, (_, index) => (
          <line key={index} x1={0} y1={-r * 1.25} x2={0} y2={-r * 1.7} stroke={PALETTE.ink} strokeWidth={3} strokeLinecap="round" transform={`rotate(${index * 30})`} />
        ))}
      </g>
      <circle r={r} fill={PALETTE.sun} stroke={PALETTE.ink} strokeWidth={3} />
    </g>
  );
}

function Cloud({ width, height, index, reduced }: { width: number; height: number; index: number; reduced: boolean }) {
  const y = height * (0.08 + index * 0.1);
  const scale = Math.max(0.6, width / 1400) * (1 + index * 0.3);
  return (
    <g style={{ animation: reduced ? undefined : `marquee-x ${70 + index * 25}s linear infinite`, animationDelay: `${-index * 30}s` }}>
      <g transform={`translate(${width * (0.1 + index * 0.3)} ${y}) scale(${scale})`} fill={PALETTE.white} stroke={PALETTE.ink} strokeWidth={3}>
        <ellipse cx={0} cy={0} rx={48} ry={18} />
        <circle cx={-14} cy={-10} r={18} />
        <circle cx={14} cy={-12} r={22} />
      </g>
    </g>
  );
}

function Plant({ flower, width, height, selected, reduced, bloomed, onSelect }: { flower: Flower; width: number; height: number; selected: boolean; reduced: boolean; bloomed: boolean; onSelect: (id: string) => void }) {
  const [x, top] = topOf(flower, width, height);
  const base = height * (1 - GROUND);
  const head = Math.max(9, Math.min(26, width * 0.011 + (flower.rank <= 3 ? 6 : 0)));
  const color = flower.rank <= 3 ? [PALETTE.sun, PALETTE.silver, PALETTE.bronze][flower.rank - 1] : `hsl(${flower.hue} 85% 72%)`;
  const label = flower.rank <= NAMED && width > 500;
  return (
    <g
      role="button"
      tabIndex={-1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(flower.id);
      }}
      style={{ cursor: "pointer", transformOrigin: `${x}px ${base}px`, animation: reduced ? undefined : `sway ${3.2 + fraction(flower.rank * 0.37) * 2.4}s ease-in-out infinite alternate`, animationDelay: `${-fraction(flower.rank * 0.71) * 4}s` }}
    >
      <path d={`M${x} ${base} Q${x + (flower.rank % 2 ? 14 : -14)} ${(base + top) / 2} ${x} ${top}`} fill="none" stroke="#2F9E5E" strokeWidth={Math.max(3, head * 0.22)} strokeLinecap="round" style={{ transition: "d 900ms cubic-bezier(.2,.8,.2,1)" }} />
      <ellipse cx={x + head * 0.8} cy={(base + top) / 2 + head} rx={head * 0.55} ry={head * 0.25} fill="#5BCB7A" stroke={PALETTE.ink} strokeWidth={2} transform={`rotate(-30 ${x + head * 0.9} ${(base + top) / 2 + head})`} />
      <g key={bloomed ? flower.points : "calm"} style={{ transformOrigin: `${x}px ${top}px`, animation: bloomed && !reduced ? "pop 700ms ease-out both" : undefined }}>
        {Array.from({ length: flower.petals }, (_, index) => (
          <ellipse key={index} cx={x} cy={top - head * 0.9} rx={head * 0.5} ry={head * 0.95} fill={color} stroke={PALETTE.ink} strokeWidth={2} transform={`rotate(${(index / flower.petals) * 360} ${x} ${top})`} />
        ))}
        <circle cx={x} cy={top} r={head * 0.55} fill={selected ? PALETTE.ink : PALETTE.sun} stroke={PALETTE.ink} strokeWidth={selected ? 4 : 2} />
        {flower.rank <= 3 && (
          <text x={x} y={top} textAnchor="middle" dominantBaseline="central" fontSize={head * 0.6} fontWeight={800} fill={selected ? PALETTE.white : PALETTE.ink}>
            {flower.rank}
          </text>
        )}
      </g>
      {label && (
        <text x={x} y={top - head * 2.1} textAnchor="middle" fontSize={Math.max(12, width * 0.011)} fontWeight={800} fill={PALETTE.ink} stroke={PALETTE.paper} strokeWidth={4} paintOrder="stroke" fontFamily="var(--font-display)">
          {firstName(flower.name)}
        </text>
      )}
    </g>
  );
}

function BeeFlight({ bee, list, width, height, reduced }: { bee: Bee; list: Flower[]; width: number; height: number; reduced: boolean }) {
  const [ax, ay] = topOf(list[bee.from], width, height);
  const [bx, by] = topOf(list[bee.to], width, height);
  const lift = Math.min(ay, by) - Math.max(60, Math.abs(ax - bx) * 0.25);
  const path = `M${ax} ${ay - 10} Q${(ax + bx) / 2} ${lift} ${bx} ${by - 10}`;
  return (
    <g>
      <path d={path} fill="none" stroke={bee.color} strokeWidth={4} strokeDasharray="6 10" strokeLinecap="round" opacity={0.9} />
      <g transform={reduced ? `translate(${bx} ${by - 10})` : undefined}>
        {!reduced && <animateMotion dur={`${BEE_MS}ms`} path={path} fill="freeze" rotate="auto" />}
        <ellipse rx={13} ry={9} fill={PALETTE.sun} stroke={PALETTE.ink} strokeWidth={2} />
        <path d="M-6 -8 L-6 8 M0 -9 L0 9" stroke={PALETTE.ink} strokeWidth={2.5} />
        <ellipse cx={-2} cy={-9} rx={7} ry={4} fill={PALETTE.white} stroke={PALETTE.ink} strokeWidth={1.5} />
      </g>
    </g>
  );
}

type Hive = { serial: number; bees: Bee[] };

function beesFor(fresh: LiveEvent[], list: Flower[], born: number): Bee[] {
  const index = new Map(list.map((flower, position) => [flower.id, position]));
  return fresh.flatMap((event): Bee[] => {
    if (event.kind !== "connection") return [];
    const from = index.get(event.a);
    const to = index.get(event.b);
    if (from === undefined && to === undefined) return [];
    return [{ key: event.key, from: from ?? to ?? 0, to: to ?? from ?? 0, color: KIND_COLOR[event.link], born }];
  });
}

// Bees launch once per batch of events (derived in render); a timer sweeps each flight away after it lands.
function useBees(fresh: LiveEvent[], serial: number, list: Flower[]): Bee[] {
  const [hive, setHive] = useState<Hive>({ serial: 0, bees: [] });
  if (hive.serial !== serial) setHive({ serial, bees: [...hive.bees, ...beesFor(fresh, list, serial)].slice(-12) });
  useEffect(() => {
    const timer = window.setTimeout(() => setHive((current) => ({ ...current, bees: current.bees.filter((bee) => bee.born !== serial) })), BEE_MS + 1500);
    return () => window.clearTimeout(timer);
  }, [serial]);
  return hive.bees;
}

export default function Garden({ snapshot, reducedMotion, label, selectedId, onSelect }: VizProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const list = flowers(snapshot);
  const lawn = grassCount(snapshot);
  const batch = useLiveEvents(snapshot);
  const announced = useAnnouncer(batch, reducedMotion);
  const bees = useBees(batch.fresh, batch.serial, list);
  const bloomed = new Set(batch.fresh.filter((event) => event.kind === "points").map((event) => event.id));
  const base = height * (1 - GROUND);
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden rounded-[22px] border-ink" data-viz="garden" style={{ background: "linear-gradient(#BDE8FF, #EAF7FF 70%)" }} onClick={() => onSelect(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          <Sun width={width} reduced={reducedMotion} />
          {[0, 1, 2].map((index) => (
            <Cloud key={index} width={width} height={height} index={index} reduced={reducedMotion} />
          ))}
          <rect x={0} y={base} width={width} height={height - base} fill="#7ED488" stroke={PALETTE.ink} strokeWidth={3} />
          {Array.from({ length: lawn }, (_, index) => {
            const x = fraction(index * 0.618 + 0.11) * width;
            const h = 8 + fraction(index * 0.37) * 16;
            return <path key={index} d={`M${x} ${base} q4 ${-h / 2} ${index % 2 ? 6 : -6} ${-h}`} stroke="#2F9E5E" strokeWidth={2.5} fill="none" strokeLinecap="round" style={{ transformOrigin: `${x}px ${base}px`, animation: reducedMotion ? undefined : `sway ${2 + fraction(index * 0.53) * 2}s ease-in-out infinite alternate` }} />;
          })}
          {list.map((flower) => (
            <Plant key={flower.id} flower={flower} width={width} height={height} selected={flower.id === selectedId} reduced={reducedMotion} bloomed={bloomed.has(flower.id)} onSelect={onSelect} />
          ))}
          {bees.map((bee) => (
            <BeeFlight key={bee.key} bee={bee} list={list} width={width} height={height} reduced={reducedMotion} />
          ))}
          {snapshot.people.length > FLOWERS && (
            <text x={width - 16} y={height - 14} textAnchor="end" fontSize={Math.max(13, width * 0.012)} fontWeight={800} fill={PALETTE.ink} fontFamily="var(--font-display)">
              +{snapshot.people.length - FLOWERS}
            </text>
          )}
        </svg>
      )}
      <Caption event={announced.event} dropped={announced.dropped} reducedMotion={reducedMotion} />
    </div>
  );
}
