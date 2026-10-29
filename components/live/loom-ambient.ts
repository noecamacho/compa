// Ambient life on the loom so it never stands still, even in an empty room: dust motes drifting over the plate and
// sun-yellow beads travelling along recent threads, like shuttles on a real loom. Fixed-size buffers, two draw calls.
import * as THREE from "three";
import type { LoomLink } from "./loom-scene";

const DUST = 90;
const BEADS = 14;
// Beads ride the newest threads, where the room's attention is.
const BEAD_POOL = 80;
const RING = 300;

type Curve = THREE.QuadraticBezierCurve3;
type Bead = { curve: Curve | null; t: number; speed: number };
type Mote = { angle: number; radius: number; speed: number; phase: number };

export class LoomAmbient {
  private readonly dust: THREE.Points;
  private readonly motes: Mote[];
  private readonly beads: THREE.InstancedMesh;
  private readonly hulls: THREE.InstancedMesh;
  private readonly riders: Bead[];
  private curves: Curve[] = [];
  private time = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly point = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();

  constructor(parent: THREE.Object3D, disc: THREE.BufferGeometry) {
    this.motes = Array.from({ length: DUST }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.sqrt(Math.random()) * (RING + 30),
      speed: (0.04 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1),
      phase: Math.random() * Math.PI * 2,
    }));
    const positions = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(DUST * 3), 3));
    this.dust = new THREE.Points(positions, new THREE.PointsMaterial({ color: "#6CC4FF", size: 4, sizeAttenuation: false, transparent: true, opacity: 0.55 }));
    this.beads = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ color: "#FFD93D" }), BEADS);
    this.hulls = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ color: "#1E1B2E" }), BEADS);
    this.riders = Array.from({ length: BEADS }, () => ({ curve: null, t: Math.random(), speed: 0.25 + Math.random() * 0.3 }));
    // Positions change every frame, so bounds computed once would cull them; the whole set is always on screen anyway.
    for (const object of [this.dust, this.beads, this.hulls]) object.frustumCulled = false;
    parent.add(this.dust, this.hulls, this.beads);
    this.step(0);
  }

  // The threads beads may ride, refreshed when the weave changes.
  setThreads(links: LoomLink[], curveFor: (link: LoomLink) => Curve | null): void {
    this.curves = links.slice(-BEAD_POOL).flatMap((link) => curveFor(link) ?? []);
    for (const rider of this.riders) rider.curve = this.pick();
  }

  private pick(): Curve | null {
    return this.curves[Math.floor(Math.random() * this.curves.length)] ?? null;
  }

  step(dt: number): void {
    this.time += dt;
    this.stepDust(dt);
    this.stepBeads(dt);
  }

  private stepDust(dt: number): void {
    const attribute = this.dust.geometry.getAttribute("position");
    for (const [index, mote] of this.motes.entries()) {
      mote.angle += mote.speed * dt;
      const wobble = Math.sin(this.time * 0.6 + mote.phase) * 12;
      attribute.setXYZ(index, Math.cos(mote.angle) * (mote.radius + wobble), Math.sin(mote.angle) * (mote.radius + wobble), 40 + Math.sin(this.time + mote.phase) * 20);
    }
    attribute.needsUpdate = true;
  }

  private stepBeads(dt: number): void {
    for (const [index, rider] of this.riders.entries()) {
      rider.t += rider.speed * dt;
      if (rider.t >= 1) Object.assign(rider, { t: 0, curve: this.pick() });
      const size = rider.curve ? 4.5 + Math.sin(rider.t * Math.PI) * 2 : 0;
      if (rider.curve) rider.curve.getPoint(rider.t, this.point).setZ(this.point.z + 6);
      this.beads.setMatrixAt(index, this.matrix.compose(this.point, this.quaternion, this.scale.setScalar(size)));
      this.hulls.setMatrixAt(index, this.matrix.compose(this.point.setZ(this.point.z - 0.5), this.quaternion, this.scale.setScalar(size * 1.35)));
    }
    this.beads.instanceMatrix.needsUpdate = true;
    this.hulls.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.dust.geometry.dispose();
    for (const object of [this.dust, this.beads, this.hulls]) {
      object.removeFromParent();
      [object.material].flat().forEach((material) => material.dispose());
    }
    this.beads.dispose();
    this.hulls.dispose();
  }
}
