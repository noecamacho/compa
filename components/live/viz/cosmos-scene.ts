// Cosmos: a 3D galaxy in Three.js. Every person is a star (brighter and bigger with points, the leaders at the core),
// every connection a faint thread of light; the camera drifts in a slow orbit and stardust turns behind. A check-in
// is a star being born with a flare, a connection a comet that flies from star to star, points a pulse of light.
import * as THREE from "three";
import type { LiveSnapshotT } from "@/lib/api/schemas";
import type { LiveEvent } from "@/lib/live/events";
import { PALETTE } from "./types";

const DUST = 700;
const RADIUS = 420;
const COMET_SECONDS = 1.1;
const PULSE_SECONDS = 1.4;
const FLARE_SECONDS = 1.8;

type Star = { index: number; position: THREE.Vector3; base: number };
type Comet = { a: THREE.Vector3; b: THREE.Vector3; t: number; line: THREE.Line };
type Pulse = { star: Star; t: number; color: THREE.Color };

const fraction = (value: number): number => value - Math.floor(value);

// A soft round sprite for points, drawn once on a tiny canvas (no texture file to ship).
function makeGlow(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Leaders at the galactic core, the rest along two spiral arms by rank, a little scatter so nothing lines up.
function starPosition(rank: number, count: number): THREE.Vector3 {
  const share = Math.sqrt(rank / Math.max(1, count));
  const arm = rank % 2 === 0 ? 0 : Math.PI;
  const angle = arm + share * 4.5 + (fraction(rank * 0.618) - 0.5) * 0.9;
  const radius = 30 + share * RADIUS + (fraction(rank * 0.37) - 0.5) * 50;
  return new THREE.Vector3(Math.cos(angle) * radius, (fraction(rank * 0.29) - 0.5) * 70 * (1 - share * 0.6), Math.sin(angle) * radius);
}

const starSize = (points: number, leaderPoints: number, big: boolean): number => (big ? 30 : 18) + (leaderPoints <= 0 ? 0 : (points / leaderPoints) * (big ? 60 : 34));

export class CosmosScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 1, 6000);
  private readonly glow = makeGlow();
  private readonly starsMaterial: THREE.PointsMaterial;
  private readonly stars = new THREE.Points(new THREE.BufferGeometry(), undefined);
  private readonly dust: THREE.Points;
  private readonly threads = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: PALETTE.sky, transparent: true, opacity: 0.28 }));
  private readonly cometMaterial = new THREE.LineBasicMaterial({ color: PALETTE.new, transparent: true, opacity: 1, linewidth: 2 });
  private readonly flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: PALETTE.sky, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  private byId = new Map<string, Star>();
  private list: Star[] = [];
  private comets: Comet[] = [];
  private pulses: Pulse[] = [];
  private flareLeft = 0;
  private frame = 0;
  private last = 0;
  private angle = 0;
  private distance = 1000;
  private big = true;

  constructor(
    private readonly host: HTMLElement,
    private readonly animate: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = "block";
    host.prepend(this.renderer.domElement);
    this.starsMaterial = new THREE.PointsMaterial({ size: 24, map: this.glow, vertexColors: true, transparent: true, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.stars.material = this.starsMaterial;
    this.dust = this.makeDust();
    this.flare.visible = false;
    this.scene.add(this.dust, this.threads, this.stars, this.flare);
    this.resize();
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private makeDust(): THREE.Points {
    const positions = new Float32Array(DUST * 3);
    for (let index = 0; index < DUST; index++) {
      const angle = fraction(index * 0.618) * Math.PI * 2;
      const radius = 120 + fraction(index * 0.37) * RADIUS * 2.2;
      positions.set([Math.cos(angle) * radius, (fraction(index * 0.29) - 0.5) * 500, Math.sin(angle) * radius], index * 3);
    }
    const geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 4, color: PALETTE.white, map: this.glow, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  }

  resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.big = width > 700;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = width / height;
    // A phone in portrait pulls back so the whole galaxy stays in frame.
    this.distance = width < height ? 1500 : 980;
    this.camera.updateProjectionMatrix();
    this.place();
    this.render();
  }

  // Rebuilds the stars and threads from a snapshot; known stars keep their place, so a refresh never jumps.
  update(snapshot: LiveSnapshotT, events: LiveEvent[]): void {
    const leader = snapshot.people[0]?.points ?? 0;
    const count = snapshot.people.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const next = new Map<string, Star>();
    const palette = [new THREE.Color(PALETTE.sun), new THREE.Color(PALETTE.silver), new THREE.Color(PALETTE.bronze)];
    const plain = new THREE.Color(PALETTE.sky);
    snapshot.people.forEach((person, index) => {
      const known = this.byId.get(person.id);
      const star: Star = { index, position: known?.position ?? starPosition(index + 1, count), base: starSize(person.points, leader, this.big) };
      next.set(person.id, star);
      star.position.toArray(positions, index * 3);
      (palette[index] ?? plain).toArray(colors, index * 3);
      sizes[index] = star.base;
    });
    this.byId = next;
    this.list = [...next.values()];
    this.stars.geometry.dispose();
    this.stars.geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)).setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.starsMaterial.size = this.big ? 46 : 28;
    const lines = new Float32Array(snapshot.connections.length * 6);
    let used = 0;
    for (const link of snapshot.connections) {
      const a = next.get(link.a);
      const b = next.get(link.b);
      if (!a || !b) continue;
      a.position.toArray(lines, used);
      b.position.toArray(lines, used + 3);
      used += 6;
    }
    this.threads.geometry.dispose();
    this.threads.geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(lines.subarray(0, used), 3));
    for (const event of events) this.react(event);
    this.render();
  }

  private react(event: LiveEvent): void {
    if (event.kind === "connection") {
      const a = this.byId.get(event.a);
      const b = this.byId.get(event.b);
      if (!a || !b) return;
      const material = this.cometMaterial.clone();
      material.color.set(event.link === "new" ? PALETTE.new : PALETTE.reconnection);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.position, a.position]), material);
      this.scene.add(line);
      this.comets.push({ a: a.position, b: b.position, t: 0, line });
      this.pulses.push({ star: b, t: 0, color: material.color });
      return;
    }
    const star = this.byId.get(event.id);
    if (!star) return;
    if (event.kind === "checkin") {
      this.flare.position.copy(star.position);
      this.flare.visible = true;
      this.flareLeft = FLARE_SECONDS;
      return;
    }
    this.pulses.push({ star, t: 0, color: new THREE.Color(event.kind === "points" ? PALETTE.sun : PALETTE.coral) });
  }

  // A high, slow orbit: the galaxy reads as a disc with depth, never edge-on.
  private place(): void {
    this.camera.position.set(Math.sin(this.angle), 0.55 + Math.sin(this.angle * 0.7) * 0.1, Math.cos(this.angle)).setLength(this.distance);
    this.camera.lookAt(0, 0, 0);
  }

  private step(dt: number): void {
    this.angle += dt * 0.05;
    this.place();
    this.dust.rotation.y -= dt * 0.02;
    for (const comet of this.comets) {
      comet.t += dt / COMET_SECONDS;
      const t = Math.min(1, comet.t);
      const head = comet.a.clone().lerp(comet.b, t);
      const tail = comet.a.clone().lerp(comet.b, Math.max(0, t - 0.25));
      comet.line.geometry.setFromPoints([tail, head]);
      (comet.line.material as THREE.LineBasicMaterial).opacity = comet.t < 1 ? 1 : Math.max(0, 2 - comet.t);
      if (comet.t >= 2) {
        this.scene.remove(comet.line);
        comet.line.geometry.dispose();
      }
    }
    this.comets = this.comets.filter((comet) => comet.t < 2);
    const colors = this.stars.geometry.getAttribute("color");
    for (const pulse of this.pulses) {
      pulse.t += dt / PULSE_SECONDS;
      const lift = Math.sin(Math.min(1, pulse.t) * Math.PI);
      const color = new THREE.Color(PALETTE.white).lerp(pulse.color, 1 - lift);
      if (colors instanceof THREE.BufferAttribute && pulse.star.index < colors.count) {
        colors.setXYZ(pulse.star.index, color.r, color.g, color.b);
        colors.needsUpdate = true;
      }
    }
    this.pulses = this.pulses.filter((pulse) => pulse.t < 1);
    if (this.flareLeft > 0) {
      this.flareLeft -= dt;
      const life = this.flareLeft / FLARE_SECONDS;
      this.flare.scale.setScalar((this.big ? 260 : 160) * (1 - life * 0.5));
      (this.flare.material as THREE.SpriteMaterial).opacity = life;
      this.flare.visible = this.flareLeft > 0;
    }
    this.starsMaterial.size = (this.big ? 46 : 28) * (1 + 0.06 * Math.sin(this.angle * 6));
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.animate) this.step(dt);
    this.render();
    if (this.animate) this.frame = requestAnimationFrame(this.tick);
  };

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.stars.geometry.dispose();
    this.threads.geometry.dispose();
    this.dust.geometry.dispose();
    for (const comet of this.comets) comet.line.geometry.dispose();
    this.glow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
