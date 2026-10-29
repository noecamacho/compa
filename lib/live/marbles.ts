// Pure physics of the Marbles view: one ball per person in a jar, bigger with points. Verlet integration, wall
// bounces and pairwise separation on a sorted sweep, so a few hundred balls cost one short loop per frame.
import type { LiveSnapshotT } from "@/lib/api/schemas";

export const MARBLES_MAX = 260;
const MIN_R = 7;
const MAX_R = 30;
const DAMPING = 0.992;
const RESTITUTION = 0.55;

export type Ball = { id: string; name: string; rank: number; x: number; y: number; px: number; py: number; r: number; targetR: number; hue: number };

export type Jar = { width: number; height: number };

const fraction = (value: number): number => value - Math.floor(value);

// Radius by points against the leader, scaled by the jar so a phone stays a jar and a projector a wall.
export function radiusOf(points: number, leaderPoints: number, jar: Jar): number {
  const scale = Math.max(0.55, Math.min(1.6, Math.min(jar.width, jar.height) / 600));
  const share = leaderPoints <= 0 ? 0 : points / leaderPoints;
  return (MIN_R + (MAX_R - MIN_R) * Math.sqrt(share)) * scale;
}

// Every ball starts above the jar at a column by rank, so a first load pours in; a new person is dropped in later.
export function makeBall(person: LiveSnapshotT["people"][number], rank: number, leaderPoints: number, jar: Jar): Ball {
  const r = radiusOf(person.points, leaderPoints, jar);
  const x = (0.08 + fraction(rank * 0.618) * 0.84) * jar.width;
  const y = -r - fraction(rank * 0.37) * jar.height * 0.5;
  return { id: person.id, name: person.name, rank, x, y, px: x, py: y, r, targetR: r, hue: fraction(rank * 0.618) * 360 };
}

export type Spring = { a: Ball; b: Ball; left: number };

// One physics step: gravity (tilted by `tilt` radians so the pile keeps creeping), springs, integration, walls, pairs.
export function stepBalls(balls: Ball[], springs: Spring[], jar: Jar, dt: number, tilt: number, gravity = 900): void {
  const gx = Math.sin(tilt) * gravity;
  const gy = Math.cos(tilt) * gravity;
  for (const spring of springs) {
    const dx = spring.b.x - spring.a.x;
    const dy = spring.b.y - spring.a.y;
    const distance = Math.hypot(dx, dy) || 1;
    const pull = (distance - (spring.a.r + spring.b.r + 4)) * 6;
    spring.a.x += (dx / distance) * pull * dt;
    spring.a.y += (dy / distance) * pull * dt;
    spring.b.x -= (dx / distance) * pull * dt;
    spring.b.y -= (dy / distance) * pull * dt;
  }
  for (const ball of balls) {
    const vx = (ball.x - ball.px) * DAMPING;
    const vy = (ball.y - ball.py) * DAMPING;
    ball.px = ball.x;
    ball.py = ball.y;
    ball.x += vx + gx * dt * dt;
    ball.y += vy + gy * dt * dt;
    ball.r += (ball.targetR - ball.r) * Math.min(1, dt * 6);
  }
  separate(balls);
  for (const ball of balls) bounce(ball, jar);
}

function bounce(ball: Ball, jar: Jar): void {
  if (ball.x < ball.r) {
    ball.px = ball.x + (ball.x - ball.px) * RESTITUTION;
    ball.x = ball.r;
  }
  if (ball.x > jar.width - ball.r) {
    ball.px = ball.x + (ball.x - ball.px) * RESTITUTION;
    ball.x = jar.width - ball.r;
  }
  if (ball.y > jar.height - ball.r) {
    ball.py = ball.y + (ball.y - ball.py) * RESTITUTION;
    ball.y = jar.height - ball.r;
  }
}

// Push overlapping pairs apart; balls are sorted by x so each one only looks at neighbours within reach.
function separate(balls: Ball[]): void {
  balls.sort((a, b) => a.x - b.x);
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i]!;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j]!;
      const reach = a.r + b.r;
      if (b.x - a.x > reach) break;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.01;
      if (distance >= reach) continue;
      const push = ((reach - distance) / distance) * 0.5;
      a.x -= dx * push;
      a.y -= dy * push;
      b.x += dx * push;
      b.y += dy * push;
    }
  }
}

export const ballAt = (balls: readonly Ball[], x: number, y: number): Ball | null => balls.find((ball) => Math.hypot(ball.x - x, ball.y - y) <= ball.r + 6) ?? null;

// Reduced motion: no simulation. Balls sit packed in rows from the bottom left, by rank, and never move between polls.
export function packBalls(balls: Ball[], jar: Jar): void {
  const sorted = [...balls].sort((a, b) => a.rank - b.rank);
  let x = 0;
  let y = jar.height;
  let rowTop = jar.height;
  for (const ball of sorted) {
    const size = ball.targetR * 2 + 2;
    if (x + size > jar.width) {
      x = 0;
      y = rowTop;
    }
    ball.r = ball.targetR;
    ball.x = x + ball.targetR + 1;
    ball.y = y - ball.targetR - 1;
    ball.px = ball.x;
    ball.py = ball.y;
    rowTop = Math.min(rowTop, y - size);
    x += size;
  }
}
