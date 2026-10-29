"use client";

// Wave: the room's heartbeat. An ECG line scrolls right to left; every arrival is a spike (mint new, pink
// reconnection) whose bubbles fly into the current bar of the 30-minute histogram below.
import { useRef } from "react";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import { PULSE_MINUTES, pulse, recentCount } from "@/lib/live/live-model";
import { approach, freshLinks, Heartbeat, historySlots, idsOf, NEW, NONE, RECONNECTION, SAMPLES, waveLayout, type Kind, type Started } from "@/lib/live/wave";
import { Particles } from "./particles";
import { KIND_COLOR, PALETTE, type VizProps } from "./types";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";

const FLIGHT_SECONDS = 1;
const IDLE_BUBBLES_PER_SECOND = 3;
const KIND_STROKE: Record<Kind, string> = { [NONE]: PALETTE.ink, [NEW]: KIND_COLOR.new, [RECONNECTION]: KIND_COLOR.reconnection };

type Scene = {
  snapshot: LiveSnapshotT | null;
  seen: Set<string> | null;
  heartbeat: Heartbeat;
  particles: Particles;
  bars: Float32Array;
  target: Float32Array;
  shownCount: number;
  targetCount: number;
  flash: number;
  flashKind: Kind;
  kick: number;
  landIn: number;
  font: string;
};

const createScene = (): Scene => ({
  snapshot: null,
  seen: null,
  heartbeat: new Heartbeat(),
  particles: new Particles(),
  bars: new Float32Array(PULSE_MINUTES),
  target: new Float32Array(PULSE_MINUTES),
  shownCount: 0,
  targetCount: 0,
  flash: 0,
  flashKind: NEW,
  kick: 0,
  landIn: -1,
  font: "",
});

function fontFamily(): string {
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim();
  return display || getComputedStyle(document.body).fontFamily;
}

// Reads a new snapshot into the scene: spikes for unseen connections, new bar targets, a new count.
function ingest(scene: Scene, snapshot: LiveSnapshotT, calm: boolean): void {
  const first = scene.snapshot === null;
  const fresh = freshLinks(scene.seen, snapshot.connections);
  scene.seen = idsOf(snapshot.connections);
  scene.snapshot = snapshot;
  scene.target.set(pulse(snapshot));
  scene.targetCount = recentCount(snapshot);
  // Calm mode repaints only when the set of connections changed, so an unchanged room stays pixel-still.
  if (calm && !first && fresh.news + fresh.reconnections === 0) return;
  if (first || calm) {
    scene.heartbeat.seed(historySlots(snapshot), calm);
    scene.bars.set(scene.target);
    scene.shownCount = scene.targetCount;
    return;
  }
  scene.heartbeat.add(NEW, fresh.news);
  scene.heartbeat.add(RECONNECTION, fresh.reconnections);
}

type Box = { width: number; height: number; headX: number; headY: number };

function headBox(scene: Scene, { width, height }: Frame): Box {
  const layout = waveLayout(width, height);
  const headValue = scene.heartbeat.valueAt(SAMPLES - 1);
  const headX = (SAMPLES - 1 - scene.heartbeat.offset) * (width / (SAMPLES - 1));
  return { width, height, headX, headY: layout.baseY - headValue * layout.amp };
}

// Bubbles arc from the line's right edge into the newest bar: a rise first, then gravity brings them down onto it.
function launchBubbles(scene: Scene, box: Box, started: Started): void {
  const layout = waveLayout(box.width, box.height);
  const barWidth = (box.width - layout.pad * 2) / PULSE_MINUTES;
  const targetX = layout.pad + barWidth * (PULSE_MINUTES - 0.5);
  const gravity = box.height * 1.2;
  const color = KIND_COLOR[started.kind === RECONNECTION ? "reconnection" : "new"];
  const count = 4 + Math.round(started.amp * 12);
  for (let index = 0; index < count; index++) {
    const targetY = layout.histTop + (layout.histBottom - layout.histTop) * (0.2 + Math.random() * 0.3);
    const ttl = FLIGHT_SECONDS * (0.8 + Math.random() * 0.4);
    const landX = targetX + (Math.random() - 0.5) * barWidth;
    const startX = box.headX - Math.random() * 14;
    scene.particles.spawn({
      x: startX,
      y: box.headY,
      color,
      vx: (landX - startX) / ttl,
      vy: (targetY - box.headY - 0.5 * gravity * ttl * ttl) / ttl,
      gravity,
      ttl,
      size: 3 + Math.random() * 4,
    });
  }
  scene.flash = 1;
  scene.flashKind = started.kind;
  scene.landIn = FLIGHT_SECONDS;
}

// A few tiny bubbles always drifting up, so a silent room still looks alive.
function drift(scene: Scene, { width, height, dt }: Frame): void {
  if (Math.random() > dt * IDLE_BUBBLES_PER_SECOND) return;
  scene.particles.spawn({
    x: Math.random() * width,
    y: height * (0.45 + Math.random() * 0.55),
    color: Math.random() < 0.5 ? PALETTE.sky : PALETTE.silver,
    vx: (Math.random() - 0.5) * 14,
    vy: -(14 + Math.random() * 30),
    ttl: 3 + Math.random() * 2,
    size: 2 + Math.random() * 2.5,
  });
}

function stepScene(scene: Scene, frame: Frame): void {
  const { dt } = frame;
  const started = scene.heartbeat.advance(dt);
  if (started) launchBubbles(scene, headBox(scene, frame), started);
  drift(scene, frame);
  scene.particles.step(dt);
  scene.flash = approach(scene.flash, 0, dt, 3);
  scene.kick = approach(scene.kick, 0, dt, 4);
  scene.shownCount = approach(scene.shownCount, scene.targetCount, dt, 5);
  for (let index = 0; index < PULSE_MINUTES; index++) scene.bars[index] = approach(scene.bars[index] ?? 0, scene.target[index] ?? 0, dt, 6);
  if (scene.landIn < 0) return;
  scene.landIn -= dt;
  if (scene.landIn < 0) scene.kick = 1;
}

function strokeTrace(ctx: CanvasRenderingContext2D, heartbeat: Heartbeat, { width, height }: Frame, strokeWidth: number, tint: boolean): void {
  const layout = waveLayout(width, height);
  const dx = width / (SAMPLES - 1);
  const shift = heartbeat.offset;
  ctx.lineWidth = strokeWidth;
  let run: Kind = heartbeat.kindAt(0);
  ctx.beginPath();
  ctx.moveTo(-shift * dx, layout.baseY - heartbeat.valueAt(0) * layout.amp);
  for (let index = 1; index < SAMPLES; index++) {
    ctx.lineTo((index - shift) * dx, layout.baseY - heartbeat.valueAt(index) * layout.amp);
    const kind = heartbeat.kindAt(index);
    if (kind === run) continue;
    ctx.strokeStyle = tint ? KIND_STROKE[run] : PALETTE.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((index - shift) * dx, layout.baseY - heartbeat.valueAt(index) * layout.amp);
    run = kind;
  }
  ctx.strokeStyle = tint ? KIND_STROKE[run] : PALETTE.ink;
  ctx.stroke();
}

function drawTrace(ctx: CanvasRenderingContext2D, scene: Scene, frame: Frame): void {
  const { width, height } = frame;
  const layout = waveLayout(width, height);
  ctx.strokeStyle = PALETTE.silver;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(0, layout.baseY);
  ctx.lineTo(width, layout.baseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  strokeTrace(ctx, scene.heartbeat, frame, layout.lineWidth + 4, false);
  strokeTrace(ctx, scene.heartbeat, frame, layout.lineWidth, true);
}

function drawFlash(ctx: CanvasRenderingContext2D, scene: Scene, box: Box): void {
  if (scene.flash < 0.02) return;
  const radius = box.height * 0.3;
  const glow = ctx.createRadialGradient(box.headX, box.headY, 0, box.headX, box.headY, radius);
  glow.addColorStop(0, KIND_STROKE[scene.flashKind]);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = scene.flash * 0.7;
  ctx.fillStyle = glow;
  ctx.fillRect(box.headX - radius, box.headY - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

function drawPen(ctx: CanvasRenderingContext2D, scene: Scene, box: Box, seconds: number): void {
  const radius = 6 + 2 * Math.sin(seconds * 6) + scene.flash * 8;
  ctx.beginPath();
  ctx.arc(Math.min(box.headX, box.width - radius), box.headY, radius, 0, Math.PI * 2);
  ctx.fillStyle = scene.flash > 0.1 ? KIND_STROKE[scene.flashKind] : PALETTE.white;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawBars(ctx: CanvasRenderingContext2D, scene: Scene, frame: Frame, sway: number): void {
  const { width, height } = frame;
  const layout = waveLayout(width, height);
  const barWidth = (width - layout.pad * 2) / PULSE_MINUTES;
  const room = layout.histBottom - layout.histTop;
  let peak = 4;
  for (const bar of scene.bars) peak = Math.max(peak, bar);
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.ink;
  for (let index = 0; index < PULSE_MINUTES; index++) {
    const newest = index === PULSE_MINUTES - 1;
    const grown = (scene.bars[index] ?? 0) * (newest ? 1 + 0.2 * scene.kick : 1);
    const barHeight = Math.max(3, (grown / peak) * room) + sway * (1.5 + 1.5 * Math.sin(frame.now / 800 + index * 0.45));
    const x = layout.pad + index * barWidth + barWidth * 0.1;
    ctx.globalAlpha = 0.5 + 0.5 * (index / (PULSE_MINUTES - 1));
    ctx.fillStyle = newest ? PALETTE.new : PALETTE.sky;
    ctx.fillRect(x, layout.histBottom - barHeight, barWidth * 0.8, barHeight);
    ctx.strokeRect(x, layout.histBottom - barHeight, barWidth * 0.8, barHeight);
  }
  ctx.globalAlpha = 1;
}

// The headline number with a short, locale-neutral unit; a white halo keeps it readable where the line crosses it.
function drawCount(ctx: CanvasRenderingContext2D, scene: Scene, { width, height }: Frame): void {
  const { pad } = waveLayout(width, height);
  const size = Math.max(48, Math.min(width * 0.2, height * 0.16, 160)) * (1 + 0.1 * scene.flash);
  const text = String(Math.round(scene.shownCount));
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.font = `700 ${size}px ${scene.font}`;
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = PALETTE.white;
  ctx.strokeText(text, pad, pad);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(text, pad, pad);
  const textWidth = ctx.measureText(text).width;
  ctx.font = `700 ${Math.max(18, size * 0.3)}px ${scene.font}`;
  ctx.lineWidth = size * 0.05;
  ctx.strokeText("/ 5 min", pad + textWidth + size * 0.12, pad + size * 0.52);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText("/ 5 min", pad + textWidth + size * 0.12, pad + size * 0.52);
}

export default function Wave({ snapshot, reducedMotion, label, onSelect }: VizProps) {
  const sceneRef = useRef<Scene | null>(null);

  const draw = (frame: Frame) => {
    const scene = (sceneRef.current ??= createScene());
    if (!scene.font) scene.font = fontFamily();
    if (scene.snapshot !== snapshot) ingest(scene, snapshot, reducedMotion);
    if (reducedMotion) scene.particles.clear();
    else stepScene(scene, frame);
    const box = headBox(scene, frame);
    drawTrace(frame.ctx, scene, frame);
    drawBars(frame.ctx, scene, frame, reducedMotion ? 0 : 1);
    drawFlash(frame.ctx, scene, box);
    scene.particles.draw(frame.ctx);
    if (!reducedMotion) drawPen(frame.ctx, scene, box, frame.now / 1000);
    drawCount(frame.ctx, scene, frame);
  };

  const canvasRef = useCanvasLoop(draw, !reducedMotion, [snapshot, reducedMotion]);

  return (
    // Tapping anywhere is "empty space": there are no people to pick on this view.
    <div role="img" aria-label={label} data-viz="wave" className="absolute inset-0 cursor-pointer select-none" onClick={() => onSelect(null)}>
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
