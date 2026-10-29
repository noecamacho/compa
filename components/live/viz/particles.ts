// A fixed pool of short-lived particles (sparks, bubbles, dust) shared by the canvas visualizations. The pool never
// grows, so a rush of thousands of connections costs the same per frame as a quiet minute.
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; ttl: number; size: number; color: string; gravity: number };

export type Spawn = Partial<Omit<Particle, "life">> & { x: number; y: number; color: string };

const POOL = 320;

export class Particles {
  private items: Particle[] = [];
  // When full, a new spawn replaces the next slot in turn (the oldest, roughly) instead of shifting the array.
  private cursor = 0;

  spawn(spawn: Spawn): void {
    const particle = { vx: 0, vy: 0, ttl: 1.2, size: 3, gravity: 0, ...spawn, life: 0 };
    if (this.items.length < POOL) {
      this.items.push(particle);
      return;
    }
    this.items[this.cursor] = particle;
    this.cursor = (this.cursor + 1) % POOL;
  }

  // A burst of `count` sparks flying out from one point, for an arrival.
  burst(x: number, y: number, color: string, count: number, speed = 90): void {
    for (let index = 0; index < count; index++) {
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4;
      const velocity = speed * (0.5 + Math.random() * 0.7);
      this.spawn({ x, y, color, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, ttl: 0.7 + Math.random() * 0.6, size: 2 + Math.random() * 3, gravity: 60 });
    }
  }

  get count(): number {
    return this.items.length;
  }

  // Moves every particle and compacts the living ones in place: no new array per frame.
  step(dt: number): void {
    let alive = 0;
    for (const particle of this.items) {
      particle.life += dt;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.life < particle.ttl) this.items[alive++] = particle;
    }
    this.items.length = alive;
    this.cursor %= Math.max(1, alive);
  }

  // Ink-outlined dots that fade and shrink as they age, in the V2 sticker style.
  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.items) {
      const left = 1 - particle.life / particle.ttl;
      ctx.globalAlpha = Math.max(0, left);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, Math.max(0.5, particle.size * left), 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.items = [];
  }
}
