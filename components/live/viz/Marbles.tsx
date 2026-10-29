"use client";

// Marbles: a jar of bouncing balls, one per person, bigger with points, podium colours on the top three. Gravity
// slowly tilts so the pile never rests; a check-in drops a new ball from the top; a connection springs two balls
// together with a flash; points inflate a ball with a burst.
import { useRef } from "react";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import type { LiveEvent } from "@/lib/live/events";
import { initials } from "@/lib/live/orbit";
import { MARBLES_MAX, ballAt, makeBall, packBalls, radiusOf, stepBalls, type Ball, type Jar, type Spring } from "@/lib/live/marbles";
import { Caption } from "./Caption";
import { Particles } from "./particles";
import { KIND_COLOR, PALETTE, type VizProps } from "./types";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";
import { useAnnouncer, useLiveEvents } from "./useLiveEvents";

const SPRING_SECONDS = 1.6;
const PODIUM = [PALETTE.sun, PALETTE.silver, PALETTE.bronze] as const;
const TAP_SLOP_PX = 8;

type Flash = { ball: Ball; left: number; color: string };
type Scene = { balls: Ball[]; byId: Map<string, Ball>; springs: Spring[]; flashes: Flash[]; particles: Particles; jar: Jar; serial: number; nudgeIn: number; leader: number; more: number };

const createScene = (): Scene => ({ balls: [], byId: new Map(), springs: [], flashes: [], particles: new Particles(), jar: { width: 1, height: 1 }, serial: 0, nudgeIn: 1, leader: 0, more: 0 });

function colorOf(ball: Ball, selected: boolean): string {
  if (selected) return PALETTE.ink;
  return PODIUM[ball.rank - 1] ?? `hsl(${ball.hue} 80% 74%)`;
}

// Reads a snapshot into the jar: existing balls keep their place and ease to their new size, newcomers drop in.
function ingest(scene: Scene, snapshot: LiveSnapshotT, events: LiveEvent[]): void {
  const people = snapshot.people.slice(0, MARBLES_MAX);
  scene.leader = people[0]?.points ?? 0;
  scene.more = snapshot.people.length - people.length;
  const next = new Map<string, Ball>();
  people.forEach((person, index) => {
    const known = scene.byId.get(person.id);
    const ball = known ?? makeBall(person, index + 1, scene.leader, scene.jar);
    ball.rank = index + 1;
    ball.name = person.name;
    ball.targetR = radiusOf(person.points, scene.leader, scene.jar);
    next.set(person.id, ball);
  });
  scene.byId = next;
  scene.balls = [...next.values()];
  for (const event of events) react(scene, event);
}

function react(scene: Scene, event: LiveEvent): void {
  if (event.kind === "connection") {
    const a = scene.byId.get(event.a);
    const b = scene.byId.get(event.b);
    if (!a || !b) return;
    scene.springs.push({ a, b, left: SPRING_SECONDS });
    scene.flashes.push({ ball: a, left: 1, color: KIND_COLOR[event.link] }, { ball: b, left: 1, color: KIND_COLOR[event.link] });
    return;
  }
  const ball = scene.byId.get(event.id);
  if (!ball) return;
  if (event.kind === "checkin") {
    ball.y = -ball.r * 2;
    ball.py = ball.y + 2;
    scene.flashes.push({ ball, left: 1.5, color: PALETTE.sky });
    return;
  }
  const color = event.kind === "points" ? PALETTE.sun : PALETTE.coral;
  scene.flashes.push({ ball, left: 1.2, color });
  scene.particles.burst(ball.x, ball.y, color, 14, 140);
}

// A tiny random kick every couple of seconds keeps the pile alive; the tilt makes it creep.
function ambient(scene: Scene, dt: number, now: number): number {
  scene.nudgeIn -= dt;
  if (scene.nudgeIn <= 0 && scene.balls.length > 0) {
    scene.nudgeIn = 1.5 + Math.random() * 2;
    const ball = scene.balls[Math.floor(Math.random() * scene.balls.length)]!;
    ball.py += 6 + Math.random() * 10;
    ball.px += (Math.random() - 0.5) * 8;
  }
  return Math.sin(now / 9000) * 0.28;
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, selected: boolean, big: boolean): void {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = colorOf(ball, selected);
  ctx.fill();
  ctx.lineWidth = selected ? 4 : 2.5;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ball.x - ball.r * 0.35, ball.y - ball.r * 0.38, ball.r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();
  if (ball.r < 13 || !big) return;
  ctx.fillStyle = selected ? PALETTE.white : PALETTE.ink;
  ctx.font = `800 ${Math.round(ball.r * 0.75)}px var(--font-nunito), sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ball.rank <= 3 ? String(ball.rank) : initials(ball.name), ball.x, ball.y + 1);
}

const GHOSTS = 7;

// An empty jar shows a few dashed marbles bobbing at the bottom: the place is set, nobody is in yet.
function drawGhosts(ctx: CanvasRenderingContext2D, width: number, height: number, seconds: number): void {
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(30,27,46,0.35)";
  for (let index = 0; index < GHOSTS; index++) {
    const r = Math.max(12, Math.min(width, height) * (0.03 + (index % 3) * 0.012));
    const x = width * (0.1 + (index / (GHOSTS - 1)) * 0.8);
    const y = height - r - 10 - Math.abs(Math.sin(seconds * 1.3 + index * 0.9)) * r * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function draw(scene: Scene, { ctx, width, height, now, dt }: Frame, animate: boolean, selectedId: string | null, font: string): void {
  if (animate) {
    const tilt = ambient(scene, dt, now);
    stepBalls(scene.balls, scene.springs, scene.jar, dt, tilt);
    for (const spring of scene.springs) spring.left -= dt;
    scene.springs = scene.springs.filter((spring) => spring.left > 0);
    for (const flash of scene.flashes) flash.left -= dt;
    scene.flashes = scene.flashes.filter((flash) => flash.left > 0);
    scene.particles.step(dt);
  } else {
    packBalls(scene.balls, scene.jar);
  }
  ctx.lineWidth = 3;
  for (const spring of scene.springs) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(spring.a.x, spring.a.y);
    ctx.lineTo(spring.b.x, spring.b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const flash of scene.flashes) {
    ctx.globalAlpha = Math.min(1, flash.left);
    ctx.strokeStyle = flash.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(flash.ball.x, flash.ball.y, flash.ball.r + 6 + (1 - Math.min(1, flash.left)) * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const big = width > 500;
  if (scene.balls.length === 0) drawGhosts(ctx, width, height, animate ? now / 1000 : 0);
  for (const ball of scene.balls) drawBall(ctx, ball, ball.id === selectedId, big);
  scene.particles.draw(ctx);
  if (scene.more <= 0) return;
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `800 ${big ? 20 : 14}px ${font}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`+${scene.more}`, width - 14, height - 12);
}

export default function Marbles({ snapshot, reducedMotion, label, selectedId, onSelect }: VizProps) {
  const sceneRef = useRef<Scene | null>(null);
  const batch = useLiveEvents(snapshot);
  const announced = useAnnouncer(batch, reducedMotion);
  // The scene is read only inside the frame loop and the tap handler, never during render.
  const canvasRef = useCanvasLoop(
    (frame) => {
      const scene = (sceneRef.current ??= createScene());
      scene.jar = { width: frame.width, height: frame.height };
      if (scene.serial !== batch.serial) {
        scene.serial = batch.serial;
        ingest(scene, snapshot, batch.fresh);
      }
      draw(scene, frame, !reducedMotion, selectedId, "var(--font-fredoka), sans-serif");
    },
    !reducedMotion,
    [snapshot, selectedId],
  );
  const down = useRef<{ x: number; y: number } | null>(null);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px] border-ink" data-viz="marbles" style={{ background: "linear-gradient(#FFF6E5, #FFE3EA)" }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className="block h-full w-full touch-manipulation"
        onPointerDown={(event) => (down.current = { x: event.clientX, y: event.clientY })}
        onPointerUp={(event) => {
          const start = down.current;
          down.current = null;
          if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_SLOP_PX) return;
          const box = event.currentTarget.getBoundingClientRect();
          const scale = event.currentTarget.clientWidth / Math.max(1, box.width);
          onSelect(ballAt(sceneRef.current?.balls ?? [], (event.clientX - box.left) * scale, (event.clientY - box.top) * scale)?.id ?? null);
        }}
      />
      <Caption event={announced.event} dropped={announced.dropped} reducedMotion={reducedMotion} />
    </div>
  );
}
