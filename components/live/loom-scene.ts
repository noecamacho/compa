// "El Telar" (the loom): attendees are pegs on a ring and every accepted connection weaves a thread between two
// of them, mint for new and bubblegum for reconnections (M16: color encodes the kind; people stay neutral).
// Ported from the Three.js prototype and restyled to the V2 tokens (design/compa-v2/README.md "Sistema visual").
import * as THREE from "three";

export type LoomPerson = { id: string; points: number };
export type LoomLink = { id: string; a: string; b: string; kind: "new" | "reconnection" };
export type LoomData = { people: LoomPerson[]; links: LoomLink[] };

const COLORS = {
  ink: "#1E1B2E",
  plate: "#FFFFFF",
  peg: "#FFFFFF",
  selected: "#FFD93D",
  new: "#6BE4A3",
  reconnection: "#FF8FAB",
} as const;

const RING = 300;
const TILT = (16 * Math.PI) / 180;
// Six degrees a minute: alive on a projector, never distracting.
const SPIN_PER_SECOND = (6 * Math.PI) / 180 / 60;
const DRAW_SECONDS = 0.6;
const FRESH_SECONDS = 5;
const PICK_SLOP_PX = 14;
// Thread radius in ring units: thin when settled, thick and ink-outlined while fresh.
const THIN = 3.2;
const THICK = 5.5;

type Peg = { id: string; mesh: THREE.Mesh; position: THREE.Vector3; size: number };
type Thread = { link: LoomLink; mesh: THREE.Mesh; hull: THREE.Mesh | null; draw: number; bornAt: number };

// Stable seat on the ring: sorted by id, so a person keeps roughly the same place as others arrive.
function seats(people: LoomPerson[]): Map<string, THREE.Vector3> {
  const sorted = [...people].sort((a, b) => a.id.localeCompare(b.id));
  const step = (Math.PI * 2) / Math.max(1, sorted.length);
  return new Map(sorted.map((person, index) => [person.id, new THREE.Vector3(RING * Math.cos(index * step - Math.PI / 2), RING * Math.sin(index * step - Math.PI / 2), 0)]));
}

// Pegs shrink as the room fills so neighbours never overlap; points add a little weight.
function pegSize(count: number, points: number): number {
  const room = Math.min(10, Math.max(3, ((Math.PI * RING) / Math.max(1, count)) * 0.8));
  return room + Math.min(room * 0.6, points / 400);
}

function curveBetween(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const control = a.clone().add(b).multiplyScalar(0.5 * 0.55);
  control.z = 30 + a.distanceTo(b) * 0.06;
  return new THREE.QuadraticBezierCurve3(a.clone().setZ(3), control, b.clone().setZ(3));
}

function disposeMesh(mesh: THREE.Mesh | null): void {
  if (!mesh) return;
  mesh.removeFromParent();
  mesh.geometry.dispose();
}

export class LoomScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  private readonly loom = new THREE.Group();
  private readonly inkHull = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });
  private readonly pegGeometry = new THREE.SphereGeometry(1, 18, 12);
  // Flat fills with ink outlines, like the V2 stickers; only the plate's shadow gives depth.
  private readonly pegMaterial = new THREE.MeshBasicMaterial({ color: COLORS.peg });
  private readonly selectedMaterial = new THREE.MeshBasicMaterial({ color: COLORS.selected });
  private readonly threadMaterials = {
    new: new THREE.MeshBasicMaterial({ color: COLORS.new }),
    reconnection: new THREE.MeshBasicMaterial({ color: COLORS.reconnection }),
  };
  private pegs = new Map<string, Peg>();
  private threads = new Map<string, Thread>();
  private layoutKey = "";
  private selectedId: string | null = null;
  private width = 1;
  private height = 1;
  private frame = 0;
  private last = 0;
  private seeded = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly reducedMotion: boolean,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = "block";
    host.prepend(this.renderer.domElement);
    this.camera.position.set(0, -Math.sin(TILT) * 1500, Math.cos(TILT) * 1500);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.loom);
    this.addPlate();
    this.resize();
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  // White plate with an ink rim and a hard, unblurred offset shadow, like a V2 card seen from above.
  private addPlate(): void {
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(RING + 58, 96), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
    shadow.position.set(12, -12, -8);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(RING + 50, 96), new THREE.MeshBasicMaterial({ color: COLORS.plate }));
    plate.position.z = -4;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RING + 50, 4.5, 8, 160), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
    const dashPoints = new THREE.Path().absarc(0, 0, RING - 22, 0, Math.PI * 2, false).getPoints(160);
    const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints(dashPoints), new THREE.LineDashedMaterial({ color: COLORS.ink, dashSize: 6, gapSize: 9 }));
    dash.computeLineDistances();
    dash.position.z = -2;
    this.scene.add(shadow, plate, rim, dash);
  }

  update(data: LoomData): void {
    const positions = seats(data.people);
    const key = [...positions.keys()].join(",");
    const relayout = key !== this.layoutKey;
    this.layoutKey = key;
    this.syncPegs(data.people, positions);
    this.syncThreads(data.links, relayout);
    this.seeded = true;
  }

  private syncPegs(people: LoomPerson[], positions: Map<string, THREE.Vector3>): void {
    const present = new Set(people.map((person) => person.id));
    for (const [id, peg] of this.pegs) {
      if (present.has(id)) continue;
      peg.mesh.removeFromParent();
      this.pegs.delete(id);
    }
    for (const person of people) this.placePeg(person, positions.get(person.id) ?? new THREE.Vector3(), people.length);
  }

  private placePeg(person: LoomPerson, position: THREE.Vector3, count: number): void {
    const peg = this.pegs.get(person.id) ?? this.createPeg(person.id);
    peg.position.copy(position);
    peg.size = pegSize(count, person.points);
    peg.mesh.position.set(position.x, position.y, 4);
    peg.mesh.scale.setScalar(peg.size);
    peg.mesh.material = person.id === this.selectedId ? this.selectedMaterial : this.pegMaterial;
  }

  private createPeg(id: string): Peg {
    const mesh = new THREE.Mesh(this.pegGeometry, this.pegMaterial);
    const hull = new THREE.Mesh(this.pegGeometry, this.inkHull);
    hull.scale.setScalar(1.25);
    mesh.add(hull);
    this.loom.add(mesh);
    const peg = { id, mesh, position: new THREE.Vector3(), size: 1 };
    this.pegs.set(id, peg);
    return peg;
  }

  private syncThreads(links: LoomLink[], relayout: boolean): void {
    const present = new Set(links.map((link) => link.id));
    for (const [id, thread] of this.threads) {
      if (present.has(id) && !relayout) continue;
      this.removeThread(id, thread);
    }
    for (const link of links) {
      if (this.threads.has(link.id)) continue;
      this.addThread(link, this.seeded && !relayout);
    }
  }

  private removeThread(id: string, thread: Thread): void {
    disposeMesh(thread.mesh);
    disposeMesh(thread.hull);
    this.threads.delete(id);
  }

  // A fresh thread is thick, outlined in ink and drawn end to end; it settles to a thin strand after a few seconds.
  private addThread(link: LoomLink, fresh: boolean): void {
    const a = this.pegs.get(link.a);
    const b = this.pegs.get(link.b);
    if (!a || !b) return;
    const curve = curveBetween(a.position, b.position);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, fresh ? THICK : THIN, 6, false), this.threadMaterials[link.kind]);
    const hull = fresh ? new THREE.Mesh(new THREE.TubeGeometry(curve, 48, THICK + 2.6, 6, false), this.inkHull) : null;
    this.loom.add(mesh);
    if (hull) this.loom.add(hull);
    const draw = fresh && !this.reducedMotion ? 0 : 1;
    this.threads.set(link.id, { link, mesh, hull, draw, bornAt: performance.now() });
    this.applyDraw(this.threads.get(link.id));
  }

  private applyDraw(thread: Thread | undefined): void {
    if (!thread) return;
    for (const mesh of [thread.mesh, thread.hull]) {
      if (!mesh?.geometry.index) continue;
      mesh.geometry.setDrawRange(0, Math.floor((mesh.geometry.index.count * thread.draw) / 3) * 3);
    }
  }

  private settle(thread: Thread): void {
    const a = this.pegs.get(thread.link.a);
    const b = this.pegs.get(thread.link.b);
    disposeMesh(thread.hull);
    thread.hull = null;
    if (!a || !b) return;
    thread.mesh.geometry.dispose();
    thread.mesh.geometry = new THREE.TubeGeometry(curveBetween(a.position, b.position), 48, THIN, 6, false);
  }

  select(id: string | null): void {
    this.selectedId = id;
    for (const peg of this.pegs.values()) peg.mesh.material = peg.id === id ? this.selectedMaterial : this.pegMaterial;
  }

  // Nearest peg on screen within a forgiving radius, so small pegs on a crowded ring stay easy to hit (Fitts).
  pick(clientX: number, clientY: number): string | null {
    const box = this.canvas.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    let best: { id: string; distance: number } | null = null;
    for (const peg of this.pegs.values()) {
      const [px, py, radius] = this.toScreen(peg);
      const distance = Math.hypot(px - x, py - y);
      if (distance > radius + PICK_SLOP_PX) continue;
      if (!best || distance < best.distance) best = { id: peg.id, distance };
    }
    return best?.id ?? null;
  }

  private toScreen(peg: Peg): [number, number, number] {
    const world = peg.mesh.getWorldPosition(new THREE.Vector3()).project(this.camera);
    const unitsPerPixel = (this.camera.right - this.camera.left) / this.width;
    return [((world.x + 1) / 2) * this.width, ((1 - world.y) / 2) * this.height, peg.size / unitsPerPixel];
  }

  // Orthographic fit: the whole ring stays visible at any aspect ratio, from a phone to a 1920×1080 projector.
  resize(): void {
    this.width = this.host.clientWidth || 1;
    this.height = this.host.clientHeight || 1;
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    const half = RING + 105;
    const aspect = this.width / this.height;
    const wide = aspect >= 1;
    this.camera.left = wide ? -half * aspect : -half;
    this.camera.right = wide ? half * aspect : half;
    this.camera.top = wide ? half * 0.97 : half / aspect;
    this.camera.bottom = wide ? -half * 1.03 : -half / aspect;
    this.camera.updateProjectionMatrix();
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.reducedMotion) this.loom.rotation.z += dt * SPIN_PER_SECOND;
    for (const thread of this.threads.values()) this.advance(thread, now, dt);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };

  private advance(thread: Thread, now: number, dt: number): void {
    if (thread.draw < 1) {
      thread.draw = Math.min(1, thread.draw + dt / DRAW_SECONDS);
      this.applyDraw(thread);
    }
    if (thread.hull && now - thread.bornAt > FRESH_SECONDS * 1000) this.settle(thread);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    for (const [id, thread] of this.threads) this.removeThread(id, thread);
    this.scene.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.Line) node.geometry.dispose();
    });
    this.renderer.dispose();
    this.canvas.remove();
  }
}
