// The landing hero in Three.js: pixel-art monitos on a small event floor act out lib/landing/hero-timeline.ts.
// Everything is a flat sticker (no lights, no gradients); depth comes from a tilted orthographic camera and hard ink
// shadows. Overlays (bubbles, QR, points, confetti) are sized in CSS pixels so they read the same on a phone.
import * as THREE from "three";
import {
  PHASES,
  POINTS,
  actorAt,
  clamp01,
  easeOutCubic,
  linksAt,
  meetingSpots,
  momentAt,
  popScale,
  progress,
  roleOf,
  within,
  type Actor,
  type LinkKind,
  type LinkState,
} from "@/lib/landing/hero-timeline";
import type { MonitoLook } from "@/lib/monito/look";
import { TONE, dashCanvas, dotsBubble, monitoCanvas, pointsBadge, qrCard, scanLineCanvas, textBubble, topicBubble, type BubbleSide, type Sticker, type Tone } from "./hero-textures";

export type HeroStory = { topics: string[]; hello: string; reconnection: string };

const HEIGHT = 2.3;
const WIDTH = (HEIGHT * 17) / 21;
const HEAD_TOP = HEIGHT * (1 - 2 / 21);
const FLOOR = { rx: 5.25, rz: 2.3 };
const HALF_WIDTH = 5.7;
const TARGET = new THREE.Vector3(0, 1.45, 0.1);
const PITCH = (24 * Math.PI) / 180;
const PARALLAX = { yaw: (6 * Math.PI) / 180, pitch: (3 * Math.PI) / 180 };
const DASH = { spacing: 0.5, length: 0.36, width: 0.2, max: 40 };
const GREET_SECONDS = 1.4;
const TOPIC_TONES: Tone[] = ["bubblegum", "sun", "sky"];
const CONFETTI_TONES: Tone[] = ["mint", "sky", "bubblegum", "sun", "coral"];
const CONFETTI_COUNT = 28;

type Anchor = "tip" | "center";
type Person = { group: THREE.Group; sprite: THREE.Mesh; shadow: THREE.Mesh; actor: Actor; greetAt: number };
type Thread = { mesh: THREE.InstancedMesh; material: THREE.MeshBasicMaterial };
type Piece = { x: number; y: number; vx: number; vy: number; spin: number; color: THREE.Color };

// Deterministic jitter, so every loop of the confetti looks alike and tests of the page stay stable.
const jitter = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function flatMaterial(options: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, ...options });
}

// A camera-facing plane showing one sticker texture at a fixed size in CSS pixels.
class Overlay {
  readonly mesh: THREE.Mesh;
  private readonly material = flatMaterial({});
  key = "";
  sticker: Sticker | null = null;

  constructor(geometry: THREE.PlaneGeometry, order: number) {
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = order;
    this.mesh.visible = false;
  }

  use(key: string, texture: THREE.Texture, sticker: Sticker): void {
    if (key === this.key) return;
    this.key = key;
    this.sticker = sticker;
    this.material.map = texture;
    this.material.needsUpdate = true;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.material.dispose();
  }
}

export class HeroScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private readonly plane = new THREE.PlaneGeometry(1, 1);
  private readonly feetPlane = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  private readonly disc = new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2);
  private readonly dashTexture: THREE.CanvasTexture;
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly stickers = new Map<string, { texture: THREE.Texture; sticker: Sticker }>();
  private readonly people: Person[];
  private readonly threads = new Map<string, Thread>();
  private readonly floor: { rim: THREE.Mesh; shadow: THREE.Mesh };
  private readonly bubbles = { a: new Overlay(this.plane, 20), b: new Overlay(this.plane, 20) };
  private readonly qr = new Overlay(this.plane, 18);
  private readonly scanLine = new Overlay(this.plane, 19);
  private readonly badge = new Overlay(this.plane, 22);
  private readonly hellos: Overlay[];
  private readonly beam: THREE.Mesh;
  private readonly confetti: THREE.InstancedMesh;
  private readonly pieces: Piece[];
  private readonly ray = new THREE.Raycaster();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly look = { x: 0, y: 0, tx: 0, ty: 0 };
  private confettiOrigin = new THREE.Vector3();
  private confettiAge = Infinity;
  private lastBurst = "";
  private width = 1;
  private height = 1;
  private pxw = 0.01;
  // World units per CSS pixel for overlays: a touch smaller in a phone-width hero so bubbles leave the monitos room.
  private uiw = 0.01;
  private story = 0.6;
  private wall = 0;
  private frame = 0;
  private last = 0;
  private running = false;
  private rendered = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly copy: HeroStory,
    cast: MonitoLook[],
    private readonly onFirstFrame: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    this.dashTexture = this.track(new THREE.CanvasTexture(dashCanvas()));
    this.floor = this.addFloor();
    this.people = cast.map((look, i) => this.addPerson(look, i));
    this.hellos = this.people.map(() => new Overlay(this.plane, 21));
    for (const overlay of this.overlays()) this.scene.add(overlay.mesh);
    this.beam = this.addBeam();
    this.confetti = this.addConfetti();
    this.pieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => this.piece(i));
    void document.fonts?.ready.then(() => this.forgetStickers());
    this.resize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private track<T extends THREE.Texture>(texture: T, pixelated = false): T {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
    texture.minFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
    texture.generateMipmaps = false;
    this.textures.push(texture);
    return texture;
  }

  private material(options: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
    const material = flatMaterial(options);
    this.materials.push(material);
    return material;
  }

  private overlays(): Overlay[] {
    return [this.bubbles.a, this.bubbles.b, this.qr, this.scanLine, this.badge, ...this.hellos];
  }

  // White plate, ink rim and a hard ink shadow down and to the right, plus a dashed ring like the live loom.
  private addFloor(): { rim: THREE.Mesh; shadow: THREE.Mesh } {
    const shadow = new THREE.Mesh(this.disc, this.material({ color: TONE.ink }));
    const rim = new THREE.Mesh(this.disc, this.material({ color: TONE.ink }));
    const plate = new THREE.Mesh(this.disc, this.material({ color: "#FFFDF7" }));
    plate.scale.set(FLOOR.rx, 1, FLOOR.rz);
    shadow.renderOrder = -3;
    rim.renderOrder = -2;
    plate.renderOrder = -1;
    const ring = new THREE.InstancedMesh(this.plane, this.material({ map: this.dashTexture, color: TONE.ink, opacity: 0.14 }), 44);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2;
      const at = new THREE.Vector3(Math.cos(angle) * (FLOOR.rx - 0.45), 0.01, Math.sin(angle) * (FLOOR.rz - 0.3));
      const yaw = Math.atan2(-Math.cos(angle) * (FLOOR.rz - 0.3), -Math.sin(angle) * (FLOOR.rx - 0.45));
      ring.setMatrixAt(i, matrix.compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, yaw, 0, "YXZ")), new THREE.Vector3(0.28, 0.12, 1)));
    }
    ring.renderOrder = -0.5;
    this.scene.add(shadow, rim, plate, ring);
    return { rim, shadow };
  }

  private addPerson(look: MonitoLook, i: number): Person {
    const texture = this.track(new THREE.CanvasTexture(monitoCanvas(look)), true);
    const sprite = new THREE.Mesh(this.feetPlane, this.material({ map: texture, alphaTest: 0.5 }));
    sprite.scale.set(WIDTH, HEIGHT, 1);
    sprite.userData.index = i;
    const group = new THREE.Group();
    group.add(sprite);
    const shadow = new THREE.Mesh(this.disc, this.material({ color: TONE.ink, opacity: 0.16 }));
    shadow.renderOrder = 2;
    this.scene.add(group, shadow);
    return { group, sprite, shadow, actor: actorAt(i, this.story), greetAt: -Infinity };
  }

  private addBeam(): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    const beam = new THREE.Mesh(geometry, this.material({ color: TONE.sky, opacity: 0.4, side: THREE.DoubleSide }));
    beam.renderOrder = 17;
    beam.frustumCulled = false;
    this.scene.add(beam);
    return beam;
  }

  private addConfetti(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.plane, this.material({}), CONFETTI_COUNT);
    // Under the badge, so the burst frames the number instead of covering it.
    mesh.renderOrder = 21.5;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.scene.add(mesh);
    return mesh;
  }

  private piece(i: number): Piece {
    const tone = CONFETTI_TONES[i % CONFETTI_TONES.length] ?? "sun";
    const color = new THREE.Color(TONE[tone]);
    this.confetti.setColorAt(i, color);
    return { x: 0, y: 0, vx: 0, vy: 0, spin: 0, color };
  }

  private sticker(key: string, draw: () => Sticker): { texture: THREE.Texture; sticker: Sticker } {
    const cached = this.stickers.get(key);
    if (cached) return cached;
    const sticker = draw();
    const entry = { texture: this.track(new THREE.CanvasTexture(sticker.canvas)), sticker };
    this.stickers.set(key, entry);
    return entry;
  }

  // Text stickers drawn before the web font loaded are redrawn once it is ready.
  private forgetStickers(): void {
    for (const { texture } of this.stickers.values()) texture.dispose();
    this.stickers.clear();
    for (const overlay of this.overlays()) overlay.key = "";
  }

  private show(overlay: Overlay, key: string, draw: () => Sticker): void {
    const { texture, sticker } = this.sticker(key, draw);
    overlay.use(key, texture, sticker);
  }

  // Places an overlay at a world anchor: its tail tip (bubbles) or its center sits on the anchor, kept inside the frame.
  private place(overlay: Overlay, anchor: THREE.Vector3, scale: number, mode: Anchor, opacity = 1): void {
    const sticker = overlay.sticker;
    if (!sticker || scale <= 0.001) return overlay.hide();
    const w = sticker.width * this.uiw;
    const h = sticker.height * this.uiw;
    const center = anchor.clone();
    if (mode === "tip") center.addScaledVector(this.right, (sticker.width / 2 - sticker.tipX) * this.uiw * scale).addScaledVector(this.up, (h / 2) * scale);
    const across = center.clone().sub(this.camera.position).dot(this.right);
    const room = this.camera.right - (w * scale) / 2 - 6 * this.uiw;
    center.addScaledVector(this.right, Math.max(-room, Math.min(room, across)) - across);
    overlay.mesh.position.copy(center);
    overlay.mesh.quaternion.copy(this.camera.quaternion);
    overlay.mesh.scale.set(w * scale, h * scale, 1);
    (overlay.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    overlay.mesh.visible = true;
  }

  // Orthographic fit: the floor and the space above the heads stay in frame for the hero's 16:10 box.
  resize(): void {
    this.width = this.host.clientWidth || 1;
    this.height = this.host.clientHeight || 1;
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    const aspect = this.width / this.height;
    const halfWidth = Math.max(HALF_WIDTH, 3.6 * aspect);
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfWidth / aspect;
    this.camera.bottom = -halfWidth / aspect;
    this.camera.updateProjectionMatrix();
    this.pxw = (halfWidth * 2) / this.width;
    this.uiw = this.pxw * Math.min(1, Math.max(0.8, this.width / 520));
    // The rim and shadow are 2.5 px and 5 px on screen; the floor is foreshortened by the camera pitch along z.
    const squash = Math.sin(PITCH);
    this.floor.rim.scale.set(FLOOR.rx + 2.5 * this.pxw, 1, FLOOR.rz + (2.5 * this.pxw) / squash);
    this.floor.shadow.scale.copy(this.floor.rim.scale);
    this.floor.shadow.position.set(5 * this.pxw, -0.01, (5 * this.pxw) / squash);
    if (!this.running) this.render();
  }

  // Pointer position in -1..1 across the viewport; the camera eases toward it.
  lookAt(x: number, y: number): void {
    this.look.tx = Math.max(-1, Math.min(1, x));
    this.look.ty = Math.max(-1, Math.min(1, y));
  }

  // The monito under a client point, or -1.
  pick(clientX: number, clientY: number): number {
    const box = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObjects(this.people.map((person) => person.sprite), false)[0];
    return typeof hit?.object.userData.index === "number" ? hit.object.userData.index : -1;
  }

  // Hover or tap: the monito jumps and says hi, at most once per greeting.
  greet(index: number): void {
    const person = this.people[index];
    if (!person || this.wall - person.greetAt < GREET_SECONDS) return;
    person.greetAt = this.wall;
    if (!this.running) this.render();
  }

  setRunning(running: boolean): void {
    if (running === this.running) return;
    this.running = running;
    cancelAnimationFrame(this.frame);
    if (!running) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    // rAF timestamps can trail the performance.now() taken on resume; never step the story backwards.
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.story += dt;
    this.wall += dt;
    this.render(dt);
    this.frame = requestAnimationFrame(this.tick);
  };

  private render(dt = 0): void {
    this.moveCamera(dt);
    this.people.forEach((person, i) => this.movePerson(person, i));
    this.drawThreads();
    this.drawStory(dt);
    this.renderer.render(this.scene, this.camera);
    if (this.rendered) return;
    this.rendered = true;
    this.onFirstFrame();
  }

  private moveCamera(dt: number): void {
    const ease = 1 - Math.exp(-dt * 3);
    this.look.x += (this.look.tx - this.look.x) * ease;
    this.look.y += (this.look.ty - this.look.y) * ease;
    const yaw = this.look.x * PARALLAX.yaw;
    const pitch = PITCH + this.look.y * PARALLAX.pitch;
    const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(30);
    this.camera.position.copy(TARGET).add(offset);
    this.camera.lookAt(TARGET);
    this.camera.updateMatrixWorld();
    this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
  }

  private movePerson(person: Person, i: number): void {
    const actor = actorAt(i, this.story);
    person.actor = actor;
    const greet = clamp01((this.wall - person.greetAt) / 0.6);
    const jump = greet < 1 ? Math.sin(Math.PI * greet) * 0.75 : 0;
    const bob = (Math.sin(this.story * 2.4 + i * 1.9) * 0.5 + 0.5) * 0.07;
    const step = actor.walking ? Math.abs(Math.sin(this.story * 13)) * 0.18 : 0;
    const lift = actor.hop + jump + step + bob;
    const waddle = actor.walking ? Math.sin(this.story * 13) * 0.07 : 0;
    const wave = greet < 1 ? Math.sin(greet * Math.PI * 4) * 0.12 : 0;
    person.group.position.set(actor.x, 0, actor.z);
    person.group.quaternion.copy(this.camera.quaternion);
    person.sprite.position.y = lift;
    person.sprite.rotation.z = -actor.lean + waddle + wave;
    const stretch = Math.min(0.12, (actor.hop + jump) * 0.16);
    person.sprite.scale.set(WIDTH * (1 - stretch * 0.6), HEIGHT * (1 + stretch), 1);
    // Back row first: painter's order by depth, since the stickers do not write depth.
    person.sprite.renderOrder = 5 + (actor.z + 3) / 10;
    const shrink = 1 - Math.min(0.45, lift * 0.5);
    person.shadow.position.set(actor.x, 0.01, actor.z);
    person.shadow.scale.set(WIDTH * 0.42 * shrink, 1, WIDTH * 0.2 * shrink);
  }

  private feet(i: number): THREE.Vector3 {
    const actor = this.people[i]?.actor;
    return new THREE.Vector3(actor?.x ?? 0, 0.02, (actor?.z ?? 0) + 0.05);
  }

  private head(i: number, extra = 0): THREE.Vector3 {
    const person = this.people[i];
    return this.feet(i).addScaledVector(this.up, HEAD_TOP + (person?.sprite.position.y ?? 0) + extra);
  }

  private thread(key: string): Thread {
    const existing = this.threads.get(key);
    if (existing) return existing;
    const material = this.material({ map: this.dashTexture });
    const mesh = new THREE.InstancedMesh(this.plane, material, DASH.max);
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    const thread = { mesh, material };
    this.threads.set(key, thread);
    return thread;
  }

  private drawThreads(): void {
    const links = linksAt(this.story);
    const live = new Set(links.map((link) => link.key));
    for (const [key, thread] of this.threads) thread.mesh.visible = live.has(key);
    for (const link of links) this.drawThread(link);
  }

  // Marching dashes on the floor along a gentle arc from one pair of feet to the other.
  private drawThread(link: LinkState): void {
    const { mesh, material } = this.thread(link.key);
    material.color.set(link.kind === "new" ? TONE.mint : TONE.sky);
    material.opacity = link.opacity;
    mesh.visible = link.opacity > 0.01;
    const a = this.feet(link.a);
    const b = this.feet(link.b);
    const length = a.distanceTo(b);
    const bend = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).multiplyScalar(0.18);
    const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(bend), b);
    const visible = length * link.draw;
    const march = (this.story * 0.5) % DASH.spacing;
    const matrix = new THREE.Matrix4();
    const size = new THREE.Vector3(DASH.length, DASH.width, 1);
    let count = 0;
    for (let s = march; s < visible && count < DASH.max; s += DASH.spacing) {
      const u = s / Math.max(length, 0.001);
      const tangent = curve.getTangent(u);
      const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.atan2(-tangent.z, tangent.x), 0, "YXZ"));
      mesh.setMatrixAt(count++, matrix.compose(curve.getPoint(u), turn, size));
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }

  private drawStory(dt: number): void {
    const { loop, index, beat, t } = momentAt(this.story);
    const left = meetingSpots(beat).a.x < meetingSpots(beat).b.x ? beat.a : beat.b;
    const sideOf = (i: number): BubbleSide => (i === left ? "right" : "left");
    const topic = this.copy.topics[beat.topic % Math.max(1, this.copy.topics.length)] ?? "";
    const tone = TOPIC_TONES[beat.topic % TOPIC_TONES.length] ?? "sun";
    this.show(this.bubbles.a, `topic:${topic}:${tone}:${sideOf(beat.a)}`, () => topicBubble(topic, tone, sideOf(beat.a)));
    this.place(this.bubbles.a, this.head(beat.a, 0.2), popScale(t, PHASES.talkA), "tip");
    this.show(this.bubbles.b, `dots:${sideOf(beat.b)}`, () => dotsBubble(sideOf(beat.b)));
    this.place(this.bubbles.b, this.head(beat.b, 0.2), popScale(t, PHASES.talkB), "tip");
    this.drawScan(beat.a, beat.b, t);
    this.drawPoints(beat.a, beat.b, beat.kind, t, `${loop}:${index}`);
    this.drawConfetti(dt);
    this.people.forEach((_, i) => this.drawHello(i, roleOf(i, beat) !== "idle" && within(t, [PHASES.talkA[0], PHASES.talkB[1]])));
  }

  // The scanner points at the other's QR: a sky beam, a scan line sweeping twice, then a mint check.
  private drawScan(a: number, b: number, t: number): void {
    const scanned = t >= PHASES.scanned[0];
    this.show(this.qr, `qr:${scanned}`, () => qrCard(scanned));
    const card = this.feet(b).addScaledVector(this.up, HEIGHT * 0.5 + (this.people[b]?.sprite.position.y ?? 0));
    this.place(this.qr, card, popScale(t, PHASES.scan, 0.3, 0.25), "center");
    const sweeping = within(t, [PHASES.scan[0] + 0.15, PHASES.scanned[0]]);
    this.show(this.scanLine, "scan", scanLineCanvas);
    const sweep = progress(t, [PHASES.scan[0] + 0.15, PHASES.scanned[0]]) * 2;
    const line = card.clone().addScaledVector(this.up, (0.5 - (sweep % 1)) * 36 * this.uiw);
    this.place(this.scanLine, line, sweeping ? 1 : 0, "center");
    this.beam.visible = sweeping;
    if (!sweeping) return;
    const from = this.feet(a).addScaledVector(this.up, HEIGHT * 0.55 + (this.people[a]?.sprite.position.y ?? 0));
    const half = 20 * this.uiw;
    const toward = Math.sign(card.clone().sub(from).dot(this.right)) || 1;
    const edge = card.clone().addScaledVector(this.right, -toward * half);
    const corners = [from, edge.clone().addScaledVector(this.up, half), edge.clone().addScaledVector(this.up, -half)];
    const position = this.beam.geometry.getAttribute("position") as THREE.BufferAttribute;
    corners.forEach((corner, k) => position.setXYZ(k, corner.x, corner.y, corner.z));
    position.needsUpdate = true;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 40) * 0.12;
  }

  // "+50" (or "+20 reencuentro") pops between the pair, floats up and fades; confetti bursts as it lands.
  private drawPoints(a: number, b: number, kind: LinkKind, t: number, beatKey: string): void {
    const fresh = kind === "new";
    const word = fresh ? null : this.copy.reconnection;
    this.show(this.badge, `points:${kind}:${word}`, () => pointsBadge(POINTS[kind], word, fresh ? "sun" : "sky"));
    const rise = easeOutCubic(progress(t, PHASES.points));
    const anchor = this.head(a).lerp(this.head(b), 0.5).addScaledVector(this.up, 0.5 + rise * 0.9);
    const fade = 1 - progress(t, [PHASES.points[1] - 0.5, PHASES.points[1]]);
    this.place(this.badge, anchor, popScale(t, PHASES.points, 0.4, 0.01), "center", fade);
    if (t < PHASES.points[0] + 0.12 || this.lastBurst === beatKey) return;
    this.lastBurst = beatKey;
    this.burst(anchor);
  }

  private burst(origin: THREE.Vector3): void {
    this.confettiOrigin.copy(origin);
    this.confettiAge = 0;
    this.pieces.forEach((piece, i) => {
      const angle = Math.PI * (0.1 + 0.8 * jitter(i + 1));
      const speed = 160 + 200 * jitter(i + 31);
      Object.assign(piece, { x: 0, y: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, spin: (jitter(i + 7) - 0.5) * 14 });
    });
  }

  // Pixel confetti in the four accents plus coral, simulated in screen pixels around the badge.
  private drawConfetti(dt: number): void {
    this.confettiAge += dt;
    const life = 1.2;
    if (this.confettiAge > life) {
      this.confetti.count = 0;
      return;
    }
    const matrix = new THREE.Matrix4();
    const size = 7 * this.uiw * (1 - Math.max(0, this.confettiAge - life * 0.6) / (life * 0.4));
    this.pieces.forEach((piece, i) => {
      piece.vy -= 620 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      const at = this.confettiOrigin.clone().addScaledVector(this.right, piece.x * this.uiw).addScaledVector(this.up, piece.y * this.uiw);
      const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), piece.spin * this.confettiAge);
      this.confetti.setMatrixAt(i, matrix.compose(at, this.camera.quaternion.clone().multiply(spin), new THREE.Vector3(size, size * 0.7, 1)));
    });
    this.confetti.count = CONFETTI_COUNT;
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  private drawHello(i: number, busy: boolean): void {
    const overlay = this.hellos[i];
    if (!overlay) return;
    const age = this.wall - (this.people[i]?.greetAt ?? -Infinity);
    this.show(overlay, `hello:${this.copy.hello}`, () => textBubble(this.copy.hello, "center"));
    this.place(overlay, this.head(i, 0.25), busy ? 0 : popScale(age, [0, GREET_SECONDS]), "tip");
  }

  dispose(): void {
    this.setRunning(false);
    for (const overlay of this.overlays()) overlay.dispose();
    for (const thread of this.threads.values()) thread.mesh.dispose();
    this.confetti.dispose();
    this.beam.geometry.dispose();
    for (const geometry of [this.plane, this.feetPlane, this.disc]) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.stickers.clear();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
