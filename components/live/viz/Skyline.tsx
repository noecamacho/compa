"use client";

// Skyline: an isometric night city on canvas. Every person is a building, floors are points, lit windows are
// connections; the top three fly a flag. Windows twinkle and a blimp drifts past when nothing happens; a check-in
// raises a new building, points add floors, a connection fires fireworks between two rooftops.
import { useRef } from "react";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import type { LiveEvent } from "@/lib/live/events";
import { firstName } from "@/lib/live/orbit";
import { BUILDINGS_MAX, MAX_FLOORS, buildings, gridSize, project, type Building, type Iso } from "@/lib/live/skyline";
import { Caption } from "./Caption";
import { Particles } from "./particles";
import { KIND_COLOR, PALETTE, type VizProps } from "./types";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";
import { useAnnouncer, useLiveEvents } from "./useLiveEvents";

const PODIUM = [PALETTE.sun, PALETTE.silver, PALETTE.bronze] as const;
const STARS = 90;
type Tower = Building & { shown: number; glow: number; glowColor: string };
type Rocket = { from: Tower; to: Tower; t: number; color: string };
type Scene = { towers: Map<string, Tower>; order: Tower[]; rockets: Rocket[]; particles: Particles; serial: number; size: number; more: number; blimp: number };

const fraction = (value: number): number => value - Math.floor(value);

const createScene = (): Scene => ({ towers: new Map(), order: [], rockets: [], particles: new Particles(), serial: 0, size: 2, more: 0, blimp: 0 });

function ingest(scene: Scene, snapshot: LiveSnapshotT, events: LiveEvent[], animate: boolean): void {
  const city = buildings(snapshot);
  scene.size = gridSize(city.length);
  scene.more = Math.max(0, snapshot.people.length - BUILDINGS_MAX);
  const next = new Map<string, Tower>();
  for (const building of city) {
    const known = scene.towers.get(building.id);
    const shown = known ? known.shown : animate && scene.serial > 0 ? 0 : building.floors;
    next.set(building.id, { ...building, shown, glow: known?.glow ?? 0, glowColor: known?.glowColor ?? PALETTE.sun });
  }
  scene.towers = next;
  // Painter's order: back rows first, then left to right.
  scene.order = [...next.values()].sort((a, b) => a.row - b.row || a.col - b.col);
  for (const event of events) react(scene, event);
}

function react(scene: Scene, event: LiveEvent): void {
  if (event.kind === "connection") {
    const from = scene.towers.get(event.a);
    const to = scene.towers.get(event.b);
    if (!from || !to) return;
    scene.rockets.push({ from, to, t: 0, color: KIND_COLOR[event.link] });
    return;
  }
  const tower = scene.towers.get(event.id);
  if (!tower) return;
  tower.glow = 1.6;
  tower.glowColor = event.kind === "checkin" ? PALETTE.sky : event.kind === "points" ? PALETTE.sun : PALETTE.coral;
}

function isoFor(width: number, height: number, size: number): { iso: Iso; floor: number } {
  // The diamond (2·size tiles wide, size tiles tall) must fit the width, and the tallest tower the height above it.
  const tile = Math.min(width / (size * 2.15), (height - 40) / (size + MAX_FLOORS * 0.38 + 2.5));
  const floor = tile * 0.38;
  return { iso: { originX: width / 2, originY: height - size * tile - 16, tile }, floor };
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number, animate: boolean): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#1E1B2E");
  sky.addColorStop(1, "#4B3A7A");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  for (let index = 0; index < STARS; index++) {
    const twinkle = animate ? 0.5 + 0.5 * Math.sin(seconds * (1 + fraction(index * 0.37) * 2) + index) : 0.8;
    ctx.globalAlpha = 0.3 + 0.7 * twinkle;
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(fraction(index * 0.618) * width, fraction(index * 0.291) * height * 0.6, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.16, Math.max(18, width * 0.03), 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.sun;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawBlimp(ctx: CanvasRenderingContext2D, width: number, height: number, x: number): void {
  const y = height * 0.12;
  const w = Math.max(60, width * 0.07);
  ctx.fillStyle = PALETTE.coral;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, w / 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(x - w * 0.12, y + w / 5 - 2, w * 0.24, w * 0.1);
  ctx.strokeRect(x - w * 0.12, y + w / 5 - 2, w * 0.24, w * 0.1);
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, iso: Iso, floor: number, seconds: number, selected: boolean, animate: boolean): void {
  const { col, row } = tower;
  const z = tower.shown;
  const [ax, ay] = project(col, row, z, iso, floor);
  const [bx, by] = project(col + 1, row, z, iso, floor);
  const [cx, cy] = project(col + 1, row + 1, z, iso, floor);
  const [dx, dy] = project(col, row + 1, z, iso, floor);
  const [bx0, by0] = project(col + 1, row, 0, iso, floor);
  const [cx0, cy0] = project(col + 1, row + 1, 0, iso, floor);
  const [dx0, dy0] = project(col, row + 1, 0, iso, floor);
  const base = selected ? PALETTE.sun : PODIUM[tower.rank - 1] ?? `hsl(${tower.hue} 55% 70%)`;
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.ink;
  // Left face, right face (darker), top face (lightest).
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx0, cy0);
  ctx.lineTo(dx0, dy0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(30,27,46,0.35)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx0, by0);
  ctx.lineTo(cx0, cy0);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.fillStyle = "rgba(30,27,46,0.35)";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();
  ctx.stroke();
  // Windows on the left face: one per floor, lit when the person has connections, twinkling.
  const lit = tower.windows;
  for (let level = 0; level < Math.floor(z); level++) {
    const on = lit > 0 && (fraction((tower.rank + level) * 0.618) < lit / 6 || (animate && Math.sin(seconds * 2 + level + tower.rank) > 0.92));
    const [wx, wy] = project(col + 0.5, row + 1, level + 0.55, iso, floor);
    ctx.fillStyle = on ? PALETTE.sun : "rgba(30,27,46,0.5)";
    ctx.fillRect(wx - iso.tile * 0.12, wy - floor * 0.2, iso.tile * 0.24, floor * 0.35);
  }
  if (tower.glow > 0) {
    ctx.globalAlpha = Math.min(1, tower.glow);
    ctx.strokeStyle = tower.glowColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.lineTo(dx, dy);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (tower.rank > 3 && !selected) return;
  const [fx, fy] = project(col + 0.5, row + 0.5, z, iso, floor);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx, fy - floor * 2.2);
  ctx.stroke();
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(fx, fy - floor * 2.2);
  ctx.lineTo(fx + iso.tile * 0.6, fy - floor * 1.9);
  ctx.lineTo(fx, fy - floor * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.white;
  ctx.font = `800 ${Math.max(12, iso.tile * 0.4)}px var(--font-fredoka), sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.strokeText(firstName(tower.name), fx, fy - floor * 2.6);
  ctx.fillText(firstName(tower.name), fx, fy - floor * 2.6);
}

function stepRockets(scene: Scene, iso: Iso, floor: number, dt: number): void {
  for (const rocket of scene.rockets) {
    rocket.t += dt / 1.2;
    const [ax, ay] = project(rocket.from.col + 0.5, rocket.from.row + 0.5, rocket.from.shown, iso, floor);
    const [bx, by] = project(rocket.to.col + 0.5, rocket.to.row + 0.5, rocket.to.shown, iso, floor);
    const t = Math.min(1, rocket.t);
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t - Math.sin(t * Math.PI) * floor * 8;
    scene.particles.spawn({ x, y, color: rocket.color, vx: (Math.random() - 0.5) * 30, vy: 20, ttl: 0.6, size: 3 });
    if (rocket.t >= 1) {
      scene.particles.burst(bx, by - floor * 2, rocket.color, 26, 160);
      scene.particles.burst(ax, ay - floor * 2, PALETTE.white, 14, 120);
    }
  }
  scene.rockets = scene.rockets.filter((rocket) => rocket.t < 1);
}

function draw(scene: Scene, { ctx, width, height, now, dt }: Frame, animate: boolean, selectedId: string | null): void {
  const seconds = now / 1000;
  const { iso, floor } = isoFor(width, height, scene.size);
  drawSky(ctx, width, height, seconds, animate);
  if (animate) {
    scene.blimp = (scene.blimp + dt * 12) % (width + 200);
    drawBlimp(ctx, width, height, scene.blimp - 100);
    for (const tower of scene.towers.values()) {
      tower.shown += (tower.floors - tower.shown) * Math.min(1, dt * 3);
      tower.glow = Math.max(0, tower.glow - dt);
    }
    stepRockets(scene, iso, floor, dt);
    scene.particles.step(dt);
  } else {
    for (const tower of scene.towers.values()) tower.shown = tower.floors;
  }
  // Ground diamond.
  const [gx0, gy0] = project(0, 0, 0, iso, floor);
  const [gx1, gy1] = project(scene.size, 0, 0, iso, floor);
  const [gx2, gy2] = project(scene.size, scene.size, 0, iso, floor);
  const [gx3, gy3] = project(0, scene.size, 0, iso, floor);
  ctx.fillStyle = "#2E6B4F";
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(gx0, gy0);
  ctx.lineTo(gx1, gy1);
  ctx.lineTo(gx2, gy2);
  ctx.lineTo(gx3, gy3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (const tower of scene.order) drawTower(ctx, tower, iso, floor, seconds, tower.id === selectedId, animate);
  scene.particles.draw(ctx);
  if (scene.more <= 0) return;
  ctx.fillStyle = PALETTE.paper;
  ctx.font = `800 ${width > 500 ? 20 : 14}px var(--font-fredoka), sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`+${scene.more}`, width - 14, height - 12);
}

export default function Skyline({ snapshot, reducedMotion, label, selectedId, onSelect }: VizProps) {
  const sceneRef = useRef<Scene | null>(null);
  const batch = useLiveEvents(snapshot);
  const announced = useAnnouncer(batch, reducedMotion);
  // The scene is read only inside the frame loop, never during render.
  const canvasRef = useCanvasLoop(
    (frame) => {
      const scene = (sceneRef.current ??= createScene());
      if (scene.serial !== batch.serial) {
        ingest(scene, snapshot, batch.fresh, !reducedMotion);
        scene.serial = batch.serial;
      }
      draw(scene, frame, !reducedMotion, selectedId);
    },
    !reducedMotion,
    [snapshot, selectedId],
  );
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px] border-ink" data-viz="skyline" style={{ background: PALETTE.ink }}>
      <canvas ref={canvasRef} role="img" aria-label={label} className="block h-full w-full touch-manipulation" onClick={() => onSelect(null)} />
      <Caption event={announced.event} dropped={announced.dropped} reducedMotion={reducedMotion} />
    </div>
  );
}
