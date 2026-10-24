import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Procedural lung: a sphere sculpted into an apex-tapered, medially flattened
 * shape with a concave diaphragmatic base. side = -1 → right lung (viewer's
 * left), +1 → left lung (viewer's right, has a cardiac notch).
 */
export function makeLungGeometry(side, segments = 80) {
  const g = new THREE.SphereGeometry(1, segments, segments);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    const t = (y + 1) / 2; // 0 = base, 1 = apex

    // Taper toward the apex
    const taper = 1 - 0.52 * Math.pow(t, 1.7);
    x *= taper;
    z *= taper;

    // Flatten the medial (mediastinal) surface
    const medial = x * -side;
    if (medial > 0) x *= 0.48 - 0.1 * smooth(0.2, -0.8, y);

    // Concave base resting on the diaphragm dome
    if (y < 0) {
      const w = y * y;
      const rxz = Math.min(1, Math.sqrt(x * x + z * z) / 0.9);
      y += 0.5 * w * (1 - rxz * rxz);
    }

    // Cardiac notch on the left lung: scoop out the antero-medial lower part
    if (side > 0) {
      const d2 = (x + 0.15) ** 2 * 6 + (y + 0.25) ** 2 * 5 + (z - 0.55) ** 2 * 4;
      const notch = Math.exp(-d2);
      x += 0.42 * notch;
      z -= 0.2 * notch;
    }

    // Overall proportions + gentle organic noise
    const n = 0.018 * Math.sin(x * 7 + y * 5) * Math.cos(z * 6 - y * 3);
    v.set(x * 0.95 + n, y * 1.5, z * 0.82 + n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Trachea + recursively branching bronchi merged into one geometry. */
export function makeBronchialTree() {
  const parts = [];
  const tube = (a, b, r0, bend) => {
    const mid = a.clone().lerp(b, 0.5).add(bend);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    parts.push(new THREE.TubeGeometry(curve, 10, r0, 8, false));
  };
  // Trachea
  const top = new THREE.Vector3(0, 1.85, 0.05);
  const carina = new THREE.Vector3(0, 0.75, 0.05);
  tube(top, carina, 0.085, new THREE.Vector3(0, 0, 0));

  // Deterministic pseudo-random for stable shapes
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;

  const branch = (start, dir, len, r, depth, side) => {
    const end = start.clone().add(dir.clone().multiplyScalar(len));
    tube(start, end, r, new THREE.Vector3(rnd() * 0.08, rnd() * 0.08, rnd() * 0.08));
    if (depth === 0) return;
    for (let k = 0; k < 2; k++) {
      const spread = (k === 0 ? 1 : -1) * (0.45 + rnd() * 0.25);
      const nd = dir
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), spread * (k === 0 ? 1 : 0.8))
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 1.2)
        .normalize();
      // keep branches growing outward and mostly downward, inside the lung
      nd.x = Math.abs(nd.x) * side * (k === 0 ? 1 : 0.6) + side * 0.15;
      nd.normalize();
      branch(end, nd, len * 0.72, r * 0.68, depth - 1, side);
    }
  };
  // Main bronchi (right is steeper & wider)
  branch(carina, new THREE.Vector3(-0.62, -0.75, 0).normalize(), 0.62, 0.06, 4, -1);
  branch(carina, new THREE.Vector3(0.72, -0.62, 0).normalize(), 0.66, 0.055, 4, 1);
  // Upper-lobe bronchi reaching toward the apices
  branch(new THREE.Vector3(-0.3, 0.55, 0.05), new THREE.Vector3(-0.4, 0.9, 0).normalize(), 0.42, 0.04, 2, -1);
  branch(new THREE.Vector3(0.38, 0.5, 0.05), new THREE.Vector3(0.45, 0.88, 0.1).normalize(), 0.42, 0.04, 2, 1);
  return mergeGeometries(parts);
}

/** Biconcave red-blood-cell disc (Evans–Fung profile) as a lathe. */
export function makeRBCGeometry(R = 0.13) {
  const pts = [];
  const steps = 18;
  const h = (r) => Math.sqrt(Math.max(0, 1 - r * r)) * (0.21 + 2.0 * r * r - 1.12 * r ** 4) * 0.5;
  for (let i = 0; i <= steps; i++) {
    const r = i / steps;
    pts.push(new THREE.Vector2(r * R, h(r) * R));
  }
  for (let i = steps; i >= 0; i--) {
    const r = i / steps;
    pts.push(new THREE.Vector2(r * R, -h(r) * R));
  }
  const g = new THREE.LatheGeometry(pts, 28);
  g.computeVertexNormals();
  return g;
}
