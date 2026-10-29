// "El Telar" (the loom): attendees are pegs on a ring and every accepted connection weaves a thread between two
// of them, mint for new and bubblegum for reconnections (M16: color encodes the kind; people stay neutral).
// Ported from the Three.js prototype and restyled to the V2 tokens (design/compa-v2/README.md "Sistema visual").
// Built to hold a venue of thousands: pegs are two instanced meshes and settled threads are merged per kind, so the
// draw calls stay flat however many people and connections the room has (docs/research/live-dataviz.md).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LoomAmbient } from "./loom-ambient";

export type LoomPerson = { id: string; points: number };
export type LoomLink = { id: string; a: string; b: string; kind: "new" | "reconnection" };
export type LoomData = { people: LoomPerson[]; links: LoomLink[] };

type Kind = LoomLink["kind"];

const COLORS = {
  ink: "#1E1B2E",
  plate: "#FFFFFF",
  peg: "#FFFFFF",
  selected: "#FFD93D",
  new: "#6BE4A3",
  reconnection: "#FF8FAB",
} as const;

const KINDS: readonly Kind[] = ["new", "reconnection"];
const RING = 300;
const TILT = (16 * Math.PI) / 180;
// Six degrees a minute: alive on a projector, never distracting.
const SPIN_PER_SECOND = (6 * Math.PI) / 180 / 60;
const DRAW_SECONDS = 0.6;
const FRESH_SECONDS = 5;
// A rush animates its newest threads only; the rest join the settled weave at once.
const MAX_FRESH = 24;
// Up to this many settled threads are tubes; beyond it the weave is drawn as hairlines, which a crowd reads better.
const TUBE_BUDGET = 400;
const PICK_SLOP_PX = 14;
// Thread radius in ring units: thick and ink-outlined while fresh, thinner as the weave gets denser.
const THIN = 3.2;
const THICK = 5.5;
const INK_HULL = 2.6;

type Peg = { id: string; index: number; position: THREE.Vector3; size: number };
type Thread = { link: LoomLink; mesh: THREE.Mesh; hull: THREE.Mesh; draw: number; bornAt: number };

// Stable seat on the ring: sorted by id, so a person keeps roughly the same place as others arrive.
function seats(people: LoomPerson[]): Map<string, THREE.Vector3> {
  const sorted = [...people].sort((a, b) => a.id.localeCompare(b.id));
  const step = (Math.PI * 2) / Math.max(1, sorted.length);
  return new Map(sorted.map((person, index) => [person.id, new THREE.Vector3(RING * Math.cos(index * step - Math.PI / 2), RING * Math.sin(index * step - Math.PI / 2), 0)]));
}

// Pegs shrink as the room fills so neighbours never overlap; points add a little weight.
function pegSize(count: number, points: number): number {
  const room = Math.min(10, Math.max(1.2, ((Math.PI * RING) / Math.max(1, count)) * 0.8));
  return room + Math.min(room * 0.6, points / 400);
}

// Settled threads thin out as the weave fills, so 300 threads stay a pattern instead of a blot.
const settledRadius = (count: number): number => THIN * Math.min(1, Math.max(0.35, Math.sqrt(120 / Math.max(1, count))));

function curveBetween(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const control = a.clone().add(b).multiplyScalar(0.5 * 0.55);
  control.z = 30 + a.distanceTo(b) * 0.06;
  return new THREE.QuadraticBezierCurve3(a.clone().setZ(3), control, b.clone().setZ(3));
}

function hairlines(curves: THREE.QuadraticBezierCurve3[]): THREE.BufferGeometry {
  const points: number[] = [];
  for (const curve of curves) {
    const samples = curve.getPoints(12);
    for (let index = 1; index < samples.length; index++) {
      const from = samples[index - 1];
      const to = samples[index];
      if (from && to) points.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
  }
  return new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
}

function disposeObject(object: THREE.Mesh | THREE.LineSegments | null): void {
  if (!object) return;
  object.removeFromParent();
  object.geometry.dispose();
}

export class LoomScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  private readonly loom = new THREE.Group();
  private readonly inkHull = new THREE.MeshBasicMaterial({ color: COLORS.ink, side: THREE.BackSide });
  private readonly inkDisc = new THREE.MeshBasicMaterial({ color: COLORS.ink });
  // Flat discs, not spheres: they read the same under flat shading at a fraction of the triangles (2,500 pegs).
  private readonly pegGeometry = new THREE.CircleGeometry(1, 20);
  // Flat fills with ink outlines, like the V2 stickers; only the plate's shadow gives depth.
  private readonly pegMaterial = new THREE.MeshBasicMaterial({ color: COLORS.peg });
  private readonly selectedPeg = new THREE.Mesh(this.pegGeometry, new THREE.MeshBasicMaterial({ color: COLORS.selected }));
  private readonly threadMaterials = {
    new: new THREE.MeshBasicMaterial({ color: COLORS.new }),
    reconnection: new THREE.MeshBasicMaterial({ color: COLORS.reconnection }),
  };
  private readonly lineMaterials = {
    new: new THREE.LineBasicMaterial({ color: COLORS.new }),
    reconnection: new THREE.LineBasicMaterial({ color: COLORS.reconnection }),
  };
  private pegMesh: THREE.InstancedMesh | null = null;
  private hullMesh: THREE.InstancedMesh | null = null;
  private pegs = new Map<string, Peg>();
  private links: LoomLink[] = [];
  private known = new Set<string>();
  private layoutKey = "";
  private linkKey = "";
  private fresh = new Map<string, Thread>();
  private weave: (THREE.Mesh | THREE.LineSegments)[] = [];
  private weaveDirty = false;
  private selectedId: string | null = null;
  private width = 1;
  private height = 1;
  private frame = 0;
  private last = 0;
  private seeded = false;
  private needsRender = true;
  private ambient: LoomAmbient | null = null;

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
    this.selectedPeg.visible = false;
    const selectedHull = new THREE.Mesh(this.pegGeometry, this.inkDisc);
    selectedHull.scale.setScalar(1.3);
    selectedHull.position.z = -0.5;
    this.selectedPeg.add(selectedHull);
    this.loom.add(this.selectedPeg);
    this.scene.add(this.loom);
    this.addPlate();
    // Reduced motion keeps the loom still: no dust, no beads.
    if (!reducedMotion) this.ambient = new LoomAmbient(this.loom, this.pegGeometry);
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
    // A poll that changed nothing on the loom (points aside) must not rebuild the weave every 3 s.
    const layoutKey = data.people.map((person) => `${person.id}:${person.points}`).join(",");
    const linkKey = `${data.links.length}:${data.links[0]?.id}:${data.links.at(-1)?.id}`;
    if (layoutKey === this.layoutKey && linkKey === this.linkKey) return;
    const relayout = layoutKey !== this.layoutKey;
    this.layoutKey = layoutKey;
    this.linkKey = linkKey;
    if (relayout) this.syncPegs(data.people);
    const visible = data.links.filter((link) => this.pegs.has(link.a) && this.pegs.has(link.b));
    const arrived = this.seeded && !this.reducedMotion ? visible.filter((link) => !this.known.has(link.id)).slice(-MAX_FRESH) : [];
    this.links = visible;
    this.known = new Set(visible.map((link) => link.id));
    for (const [id, thread] of this.fresh) if (!this.known.has(id)) this.dropFresh(id, thread);
    // Fresh threads follow their pegs when the ring re-seats (someone checked in); new arrivals start drawing.
    if (relayout) for (const thread of this.fresh.values()) this.reshapeFresh(thread);
    for (const link of arrived) this.addFresh(link);
    this.weaveDirty = true;
    this.seeded = true;
    this.needsRender = true;
  }

  private syncPegs(people: LoomPerson[]): void {
    const positions = seats(people);
    this.ensurePegCapacity(people.length);
    const pegMesh = this.pegMesh;
    const hullMesh = this.hullMesh;
    if (!pegMesh || !hullMesh) return;
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    this.pegs = new Map();
    for (const [index, person] of people.entries()) {
      const position = positions.get(person.id) ?? new THREE.Vector3();
      const size = pegSize(people.length, person.points);
      this.pegs.set(person.id, { id: person.id, index, position, size });
      pegMesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(position.x, position.y, 5), quaternion, scale.setScalar(size)));
      hullMesh.setMatrixAt(index, matrix.compose(new THREE.Vector3(position.x, position.y, 4.5), quaternion, scale.setScalar(size * 1.3)));
    }
    pegMesh.count = people.length;
    hullMesh.count = people.length;
    pegMesh.instanceMatrix.needsUpdate = true;
    hullMesh.instanceMatrix.needsUpdate = true;
    pegMesh.computeBoundingSphere();
    hullMesh.computeBoundingSphere();
    this.placeSelected();
  }

  // Instanced meshes have a fixed capacity: grow by doubling so a filling room reallocates a handful of times.
  private ensurePegCapacity(count: number): void {
    if (this.pegMesh && this.pegMesh.instanceMatrix.count >= count) return;
    const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, count))));
    for (const mesh of [this.pegMesh, this.hullMesh]) {
      mesh?.removeFromParent();
      mesh?.dispose();
    }
    this.pegMesh = new THREE.InstancedMesh(this.pegGeometry, this.pegMaterial, capacity);
    this.hullMesh = new THREE.InstancedMesh(this.pegGeometry, this.inkDisc, capacity);
    this.loom.add(this.hullMesh, this.pegMesh);
  }

  private placeSelected(): void {
    const peg = this.selectedId ? this.pegs.get(this.selectedId) : undefined;
    this.selectedPeg.visible = Boolean(peg);
    if (!peg) return;
    // A little bigger than its neighbours so it reads on a crowded ring.
    this.selectedPeg.position.set(peg.position.x, peg.position.y, 6);
    this.selectedPeg.scale.setScalar(Math.max(peg.size * 1.4, 6));
  }

  private curveFor(link: LoomLink): THREE.QuadraticBezierCurve3 | null {
    const a = this.pegs.get(link.a);
    const b = this.pegs.get(link.b);
    return a && b ? curveBetween(a.position, b.position) : null;
  }

  // A fresh thread is thick, outlined in ink and drawn end to end; after a few seconds it joins the settled weave.
  private addFresh(link: LoomLink): void {
    const curve = this.curveFor(link);
    if (!curve) return;
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, THICK, 6, false), this.threadMaterials[link.kind]);
    const hull = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, THICK + INK_HULL, 6, false), this.inkHull);
    mesh.position.z = 2;
    hull.position.z = 2;
    this.loom.add(hull, mesh);
    const thread = { link, mesh, hull, draw: 0, bornAt: performance.now() };
    this.fresh.set(link.id, thread);
    this.applyDraw(thread);
  }

  private reshapeFresh(thread: Thread): void {
    const curve = this.curveFor(thread.link);
    if (!curve) return;
    thread.mesh.geometry.dispose();
    thread.hull.geometry.dispose();
    thread.mesh.geometry = new THREE.TubeGeometry(curve, 48, THICK, 6, false);
    thread.hull.geometry = new THREE.TubeGeometry(curve, 48, THICK + INK_HULL, 6, false);
    this.applyDraw(thread);
  }

  private dropFresh(id: string, thread: Thread): void {
    disposeObject(thread.mesh);
    disposeObject(thread.hull);
    this.fresh.delete(id);
  }

  private applyDraw(thread: Thread): void {
    for (const mesh of [thread.mesh, thread.hull]) {
      if (!mesh.geometry.index) continue;
      mesh.geometry.setDrawRange(0, Math.floor((mesh.geometry.index.count * thread.draw) / 3) * 3);
    }
  }

  // Every thread that is not fresh, merged into one mesh (or one set of hairlines) per kind: two draw calls in all.
  private rebuildWeave(): void {
    for (const object of this.weave) disposeObject(object);
    this.weave = [];
    const settled = this.links.filter((link) => !this.fresh.has(link.id));
    const radius = settledRadius(settled.length);
    const tubes = settled.length <= TUBE_BUDGET;
    for (const kind of KINDS) {
      const curves = settled.filter((link) => link.kind === kind).flatMap((link) => this.curveFor(link) ?? []);
      if (curves.length === 0) continue;
      if (!tubes) {
        this.weave.push(new THREE.LineSegments(hairlines(curves), this.lineMaterials[kind]));
        continue;
      }
      const pieces = curves.map((curve) => new THREE.TubeGeometry(curve, 32, radius, 5, false));
      const merged = mergeGeometries(pieces);
      for (const piece of pieces) piece.dispose();
      if (merged) this.weave.push(new THREE.Mesh(merged, this.threadMaterials[kind]));
    }
    for (const object of this.weave) this.loom.add(object);
    this.ambient?.setThreads(this.links, (link) => this.curveFor(link));
    this.weaveDirty = false;
    this.needsRender = true;
  }

  select(id: string | null): void {
    this.selectedId = id;
    this.placeSelected();
    this.needsRender = true;
  }

  // Nearest peg on screen within a forgiving radius, so small pegs on a crowded ring stay easy to hit (Fitts).
  pick(clientX: number, clientY: number): string | null {
    const box = this.canvas.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    this.loom.updateMatrixWorld();
    const unitsPerPixel = (this.camera.right - this.camera.left) / this.width;
    const world = new THREE.Vector3();
    let best: { id: string; distance: number } | null = null;
    for (const peg of this.pegs.values()) {
      world.set(peg.position.x, peg.position.y, 4).applyMatrix4(this.loom.matrixWorld).project(this.camera);
      const distance = Math.hypot(((world.x + 1) / 2) * this.width - x, ((1 - world.y) / 2) * this.height - y);
      if (distance > peg.size / unitsPerPixel + PICK_SLOP_PX) continue;
      if (!best || distance < best.distance) best = { id: peg.id, distance };
    }
    return best?.id ?? null;
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
    this.needsRender = true;
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.reducedMotion) {
      this.loom.rotation.z += dt * SPIN_PER_SECOND;
      this.ambient?.step(dt);
      this.needsRender = true;
    }
    for (const [id, thread] of this.fresh) this.advance(id, thread, now, dt);
    if (this.weaveDirty) this.rebuildWeave();
    // Reduced motion with nothing drawing: the frame is unchanged, so skip the GPU work entirely.
    if (this.needsRender) this.render();
    this.needsRender = false;
    this.frame = requestAnimationFrame(this.tick);
  };

  // Draw calls stay flat however full the room is; the count is published for the e2e scale check.
  private render(): void {
    this.renderer.render(this.scene, this.camera);
    const calls = String(this.renderer.info.render.calls);
    if (this.host.dataset.drawCalls !== calls) this.host.dataset.drawCalls = calls;
  }

  private advance(id: string, thread: Thread, now: number, dt: number): void {
    this.needsRender = true;
    if (thread.draw < 1) {
      thread.draw = Math.min(1, thread.draw + dt / DRAW_SECONDS);
      this.applyDraw(thread);
    }
    if (now - thread.bornAt < FRESH_SECONDS * 1000) return;
    this.dropFresh(id, thread);
    this.weaveDirty = true;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.ambient?.dispose();
    for (const [id, thread] of this.fresh) this.dropFresh(id, thread);
    for (const object of this.weave) disposeObject(object);
    this.pegMesh?.dispose();
    this.hullMesh?.dispose();
    this.scene.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.Line) node.geometry.dispose();
    });
    this.scene.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.Line) [node.material].flat().forEach((material) => material.dispose());
    });
    for (const material of [this.inkHull, this.inkDisc, this.pegMaterial, ...Object.values(this.threadMaterials), ...Object.values(this.lineMaterials)]) material.dispose();
    this.renderer.forceContextLoss();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
