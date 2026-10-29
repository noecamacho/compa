"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  chordControl,
  curvePoint,
  easeInOut,
  ellipsize,
  firstName,
  initials,
  INNER_RING_SIZE,
  makeDust,
  nearestDot,
  RING_FRACTIONS,
  RING_SPEEDS,
  buildLayout,
  type Dot,
  type OrbitLayout,
} from "@/lib/live/orbit";
import { Particles } from "./particles";
import { KIND_COLOR, PALETTE, type VizProps } from "./types";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";

type Link = VizProps["snapshot"]["connections"][number];
type Comet = { linkId: string; aId: string; bId: string; color: string; startAt: number };
type Runtime = { comets: Comet[]; flying: Set<string>; pulses: Map<string, number>; particles: Particles; seen: Set<string> | null; font: string | null };
type RingGeo = { rx: number; ry: number; speed: number };
type Scene = {
  frame: Frame;
  snapshot: VizProps["snapshot"];
  layout: OrbitLayout;
  rt: Runtime;
  t: number;
  cx: number;
  cy: number;
  big: boolean;
  font: string;
  geo: RingGeo[];
  sunR: number;
  innerR: number;
};

const DUST = makeDust(48);
const DOT_COLORS = [PALETTE.sky, PALETTE.new, PALETTE.reconnection, PALETTE.coral] as const;
const PODIUM = [PALETTE.sun, PALETTE.silver, PALETTE.bronze] as const;
const GHOSTS_PER_RING = [6, 10, 14, 18, 22] as const;
const COMET_MS = 1000;
const PULSE_MS = 900;
const MAX_COMETS = 20;
// Generous enough for the rim of a top-ten dot (radius up to 20) and its label.
const HIT_RADIUS_PX = 28;
const TAP_SLOP_PX = 8;
const BIG_SCREEN_PX = 700;

const createRuntime = (): Runtime => ({ comets: [], flying: new Set(), pulses: new Map(), particles: new Particles(), seen: null, font: null });

const dotColor = (index: number): string => PODIUM[index] ?? DOT_COLORS[index % DOT_COLORS.length] ?? PALETTE.sky;

function readFont(): string {
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim();
  return display || getComputedStyle(document.body).fontFamily;
}

// New links get a comet; the first snapshot only records what is already there, so joining mid-event stays calm.
function scheduleArrivals(rt: Runtime, links: Link[], animate: boolean, now: number): void {
  const previous = rt.seen;
  rt.seen = new Set(links.map((link) => link.id));
  if (!animate) {
    rt.comets = [];
    rt.flying.clear();
    rt.pulses.clear();
    rt.particles.clear();
  }
  if (!previous || !animate) return;
  const room = MAX_COMETS - rt.comets.length;
  const fresh = room > 0 ? links.filter((link) => !previous.has(link.id)).slice(-room) : [];
  const gap = Math.min(500, Math.max(180, 3000 / Math.max(1, fresh.length)));
  for (const [order, link] of fresh.entries()) {
    rt.flying.add(link.id);
    rt.comets.push({ linkId: link.id, aId: link.a, bId: link.b, color: KIND_COLOR[link.kind], startAt: now + order * gap });
  }
}

function ringGeometry(width: number, height: number, rings: number, big: boolean): RingGeo[] {
  const pad = big ? 40 : 20;
  const halfW = Math.max(40, width / 2 - pad);
  const halfH = Math.max(40, height / 2 - pad);
  return RING_FRACTIONS.slice(0, rings).map((fraction, ring) => ({ rx: fraction * halfW, ry: fraction * halfH, speed: RING_SPEEDS[ring] ?? 0 }));
}

function makeScene(frame: Frame, props: VizProps, layout: OrbitLayout, rt: Runtime): Scene {
  const { width, height } = frame;
  const big = width >= BIG_SCREEN_PX;
  const half = Math.min(width, height) / 2;
  rt.font ??= readFont();
  return {
    frame,
    snapshot: props.snapshot,
    layout,
    rt,
    t: props.reducedMotion ? 0 : frame.now / 1000,
    cx: width / 2,
    cy: height / 2,
    big,
    font: rt.font,
    geo: ringGeometry(width, height, layout.rings.length, big),
    sunR: half * 0.17,
    innerR: Math.max(10, Math.min(20, half * 0.045)),
  };
}

function placeDots(s: Scene): void {
  for (const [ring, members] of s.layout.rings.entries()) {
    const geo = s.geo[ring];
    if (!geo) continue;
    for (const dot of members) {
      const angle = dot.phase + s.t * geo.speed;
      dot.x = s.cx + geo.rx * Math.cos(angle);
      dot.y = s.cy + geo.ry * Math.sin(angle);
    }
  }
}

function drawDust(s: Scene): void {
  const { ctx, width, height } = s.frame;
  for (const mote of DUST) {
    const x = (((mote.x + s.t * mote.speed) % 1) + 1) % 1;
    const edge = Math.min(1, x * 8, (1 - x) * 8);
    ctx.globalAlpha = (0.14 + 0.12 * Math.sin(s.t * 0.9 + mote.phase)) * edge;
    ctx.fillStyle = mote.sky ? PALETTE.sky : PALETTE.ink;
    ctx.beginPath();
    ctx.arc(x * width, mote.y * height + Math.sin(s.t * 0.3 + mote.phase) * 6, mote.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Dashed rings whose dashes travel at the ring's own speed, so even an empty room visibly turns.
function drawRings(s: Scene): void {
  const { ctx } = s.frame;
  const empty = s.snapshot.people.length === 0;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 12]);
  for (const [ring, geo] of s.geo.entries()) {
    ctx.globalAlpha = 0.2;
    ctx.lineDashOffset = -s.t * geo.speed * ((geo.rx + geo.ry) / 2);
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy, geo.rx, geo.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (empty) drawGhosts(s, geo, GHOSTS_PER_RING[ring] ?? 6);
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawGhosts(s: Scene, geo: RingGeo, count: number): void {
  const { ctx } = s.frame;
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = PALETTE.muted;
  for (let slot = 0; slot < count; slot++) {
    const angle = (slot / count) * Math.PI * 2 + s.t * geo.speed;
    ctx.beginPath();
    ctx.arc(s.cx + geo.rx * Math.cos(angle), s.cy + geo.ry * Math.sin(angle), 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChords(s: Scene): void {
  const { ctx } = s.frame;
  const center = { x: s.cx, y: s.cy };
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  for (const reconnection of [false, true]) {
    ctx.strokeStyle = reconnection ? KIND_COLOR.reconnection : KIND_COLOR.new;
    ctx.beginPath();
    for (const chord of s.layout.chords) {
      if (chord.reconnection !== reconnection || s.rt.flying.has(chord.id)) continue;
      const control = chordControl(chord.a, chord.b, center);
      ctx.moveTo(chord.a.x, chord.a.y);
      ctx.quadraticCurveTo(control.x, control.y, chord.b.x, chord.b.y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSun(s: Scene): void {
  const { ctx } = s.frame;
  const breath = Math.sin(s.t * 1.6);
  const radius = s.sunR * (1 + 0.05 * breath);
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(s.cx + 4, s.cy + 4, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3 + 0.12 * breath;
  ctx.strokeStyle = PALETTE.sun;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(s.cx, s.cy, radius * 1.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.sun;
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(s.cx, s.cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawText(s, String(s.snapshot.counters.connections), s.cx, s.cy, Math.min(s.sunR * 0.95, (s.sunR * 2.6) / String(s.snapshot.counters.connections).length), false);
}

function drawText(s: Scene, text: string, x: number, y: number, size: number, halo: boolean): void {
  const { ctx } = s.frame;
  ctx.font = `700 ${size}px ${s.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (halo) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = PALETTE.paper;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(text, x, y);
}

// Small dots, one path per colour: 2,500 people cost a handful of fills, not 2,500.
function drawOuterDots(s: Scene): void {
  const { ctx } = s.frame;
  const base = Math.max(2, Math.min(4.5, Math.min(s.frame.width, s.frame.height) * 0.007));
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1;
  for (const [ring, members] of s.layout.rings.entries()) {
    const geo = s.geo[ring];
    if (ring === 0 || !geo || members.length === 0) continue;
    const spacing = (2 * Math.PI * Math.sqrt((geo.rx ** 2 + geo.ry ** 2) / 2)) / members.length;
    const radius = Math.max(1.1, Math.min(base, spacing * 0.4));
    for (const [color, fill] of DOT_COLORS.entries()) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const dot of members) {
        if (dot.index % DOT_COLORS.length !== color) continue;
        ctx.moveTo(dot.x + radius, dot.y);
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
      if (radius >= 2.5) ctx.stroke();
    }
  }
}

function drawInnerDots(s: Scene): void {
  const { ctx } = s.frame;
  const size = s.big ? Math.max(18, Math.min(30, s.frame.width / 64)) : Math.round(s.innerR * 0.95);
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.ink;
  for (const dot of s.layout.rings[0] ?? []) {
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(dot.x + 2, dot.y + 2, s.innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dotColor(dot.index);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, s.innerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!s.big) drawText(s, initials(dot.name), dot.x, dot.y + 1, size, false);
  }
  if (s.big) drawNames(s, size);
}

// Names go in a second pass so no dot is painted over a neighbour's label.
function drawNames(s: Scene, size: number): void {
  const maxChars = Math.floor(120 / (size * 0.55));
  for (const dot of s.layout.rings[0] ?? []) drawText(s, ellipsize(firstName(dot.name), maxChars), dot.x, dot.y + s.innerR + size * 0.75, size, true);
}

function drawPulses(s: Scene): void {
  const { ctx } = s.frame;
  for (const [id, startedAt] of s.rt.pulses) {
    const age = (s.frame.now - startedAt) / PULSE_MS;
    const dot = s.layout.byId.get(id);
    if (age >= 1) s.rt.pulses.delete(id);
    if (age >= 1 || !dot) continue;
    const base = dot.index < INNER_RING_SIZE ? s.innerR : 5;
    ctx.globalAlpha = 1 - age;
    ctx.strokeStyle = PALETTE.sun;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, base + 4 + 26 * age, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, base * (1 + 0.5 * (1 - age)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSelected(s: Scene, selectedId: string | null): void {
  const dot = selectedId ? s.layout.byId.get(selectedId) : undefined;
  if (!dot) return;
  const { ctx } = s.frame;
  const radius = (dot.index < INNER_RING_SIZE ? s.innerR : 5) + 6;
  for (const [width, color] of [[8, PALETTE.ink], [4, PALETTE.sun]] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  const size = s.big ? 20 : 13;
  drawText(s, ellipsize(firstName(dot.name), 14), dot.x, dot.y - radius - size * 0.8, size, true);
}

function arrive(s: Scene, a: Dot, b: Dot, comet: Comet): void {
  s.rt.particles.burst(b.x, b.y, comet.color, 14, 110);
  s.rt.pulses.set(a.id, s.frame.now);
  s.rt.pulses.set(b.id, s.frame.now);
}

// Returns false once the comet has landed (or lost an end), so the caller drops it.
function flyComet(s: Scene, comet: Comet): boolean {
  if (s.frame.now < comet.startAt) return true;
  const a = s.layout.byId.get(comet.aId);
  const b = s.layout.byId.get(comet.bId);
  if (!a || !b) return false;
  const progress = (s.frame.now - comet.startAt) / COMET_MS;
  if (progress >= 1) {
    arrive(s, a, b, comet);
    return false;
  }
  const head = curvePoint(a, chordControl(a, b, { x: s.cx, y: s.cy }), b, easeInOut(progress));
  for (let spark = 0; spark < 2; spark++) {
    s.rt.particles.spawn({ ...head, color: spark ? PALETTE.white : comet.color, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, ttl: 0.4 + Math.random() * 0.3, size: 2 + Math.random() * 2.5 });
  }
  const { ctx } = s.frame;
  ctx.fillStyle = comet.color;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  return true;
}

function flyComets(s: Scene): void {
  const landed = s.rt.comets.filter((comet) => !flyComet(s, comet));
  if (landed.length === 0) return;
  for (const comet of landed) s.rt.flying.delete(comet.linkId);
  s.rt.comets = s.rt.comets.filter((comet) => !landed.includes(comet));
}

export default function Orbit(props: VizProps) {
  const { snapshot, reducedMotion, label, selectedId, onSelect } = props;
  const layout = useMemo(() => buildLayout(snapshot), [snapshot]);
  const [rt] = useState(createRuntime);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => scheduleArrivals(rt, snapshot.connections, !reducedMotion, performance.now()), [rt, snapshot, reducedMotion]);

  const canvasRef = useCanvasLoop(
    (frame) => {
      const s = makeScene(frame, props, layout, rt);
      drawDust(s);
      drawRings(s);
      placeDots(s);
      drawChords(s);
      drawSun(s);
      drawOuterDots(s);
      drawInnerDots(s);
      drawPulses(s);
      drawSelected(s, selectedId);
      if (reducedMotion) return;
      flyComets(s);
      rt.particles.step(frame.dt);
      rt.particles.draw(frame.ctx);
    },
    !reducedMotion,
    [snapshot, selectedId, label],
  );

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = down.current;
    down.current = null;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= TAP_SLOP_PX) return;
    // The box can be scaled mid cross-fade; dots live in layout pixels.
    const canvas = event.currentTarget;
    const box = canvas.getBoundingClientRect();
    const scale = canvas.clientWidth / Math.max(1, box.width);
    onSelect(nearestDot(layout.dots, (event.clientX - box.left) * scale, (event.clientY - box.top) * scale, HIT_RADIUS_PX)?.id ?? null);
  };

  return (
    <div role="img" aria-label={label} data-viz="orbit" className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-manipulation"
        onPointerDown={(event) => (down.current = { x: event.clientX, y: event.clientY })}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}
