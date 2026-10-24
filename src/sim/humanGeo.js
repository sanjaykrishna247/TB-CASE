import * as THREE from 'three';

/**
 * Procedural adult human (head to hips), facing +z, height units match the
 * organ layout used in InfectionJourney (lungs ~0.7–1.8, chin ~2.45, crown ~3.2).
 * Returns an array of BufferGeometries to render with one material.
 */

// Torso profile: [y, half-width, half-depth, front bulge]
const TORSO = [
  [-0.12, 0.5, 0.31, 0.0],
  [0.12, 0.47, 0.29, 0.0],
  [0.38, 0.44, 0.27, 0.0], // waist
  [0.65, 0.5, 0.29, 0.01],
  [0.95, 0.58, 0.32, 0.03],
  [1.25, 0.64, 0.34, 0.05], // chest
  [1.55, 0.68, 0.34, 0.05],
  [1.8, 0.74, 0.31, 0.02],
  [1.97, 0.77, 0.27, 0.0], // shoulder line
  [2.06, 0.6, 0.22, 0.0],
  [2.13, 0.32, 0.17, 0.0], // trapezius slope
  [2.18, 0.15, 0.13, 0.0], // neck base
];

const lerpProfile = (y) => {
  for (let i = 0; i < TORSO.length - 1; i++) {
    const a = TORSO[i];
    const b = TORSO[i + 1];
    if (y >= a[0] && y <= b[0]) {
      const t = (y - a[0]) / (b[0] - a[0]);
      const s = t * t * (3 - 2 * t);
      return a.map((v, k) => v + (b[k] - v) * s);
    }
  }
  return TORSO[TORSO.length - 1];
};

/** loft a closed surface through superellipse cross-sections */
function torso() {
  const rows = 70;
  const cols = 72;
  const pos = [];
  const idx = [];
  const y0 = TORSO[0][0];
  const y1 = TORSO[TORSO.length - 1][0];
  for (let r = 0; r <= rows; r++) {
    const y = y0 + ((y1 - y0) * r) / rows;
    const [, w, d, bulge] = lerpProfile(y);
    for (let c = 0; c < cols; c++) {
      const a = (c / cols) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // superellipse (n≈2.6) → flatter flanks, rounder chest
      const n = 2.6;
      const x = Math.sign(ca) * Math.abs(ca) ** (2 / n) * w;
      let z = Math.sign(sa) * Math.abs(sa) ** (2 / n) * d;
      // pectorals / shoulder blades
      if (sa > 0) z += bulge * Math.exp(-((Math.abs(x) - w * 0.42) ** 2) / 0.03) * sa;
      else z -= 0.015 * Math.exp(-((Math.abs(x) - w * 0.45) ** 2) / 0.02) * -sa * (y > 1.4 && y < 1.95 ? 1 : 0);
      // spine groove
      if (sa < 0) z += 0.012 * Math.exp(-(x * x) / 0.004) * -sa;
      pos.push(x, y, z);
    }
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const a = r * cols + c;
      const b = r * cols + ((c + 1) % cols);
      idx.push(a, a + cols, b, b, a + cols, b + cols);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const G2 = (x, y, cx, cy, sx, sy) => Math.exp(-((x - cx) ** 2 / (2 * sx * sx) + (y - cy) ** 2 / (2 * sy * sy)));
const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// head transform (unit sphere → world)
const HS = { x: 0.29, y: 0.39, z: 0.34, cy: 2.84, cz: 0.02 };
// facial landmarks in unit-sphere coordinates (front = +z)
const EYE = { x: 0.33, y: 0.08 };
const eyeZ = () => (Math.sqrt(1 - EYE.x ** 2 - EYE.y ** 2) * 0.9 - 0.1) * HS.z + HS.cz - 0.012;

/** head: sculpted sphere — cranium, jaw, brow, eye sockets, cheekbones, nose, lips, chin */
function head() {
  const g = new THREE.SphereGeometry(1, 160, 120);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let { x, y, z } = v;
    if (y < 0.0) {
      const t = Math.min(1, -y);
      x *= 1 - 0.36 * t ** 1.4; // jaw taper
      z *= 1 - 0.12 * t;
    }
    if (z > 0) z *= 0.9; // flatter face
    else z *= 1.08; // rounder back of skull
    if (z > 0 && y > 0.45) z *= 1 - 0.12 * (y - 0.45); // forehead slope
    x *= 1 - 0.05 * G2(Math.abs(x), y, 0.85, 0.25, 0.15, 0.2); // temples

    const f = sstep(0.15, 0.55, z); // sculpt only the face
    if (f > 0) {
      const ax = Math.abs(x);
      let dz = 0;
      dz += 0.055 * G2(x, y, 0, 0.27, 0.42, 0.055); // brow ridge
      dz -= 0.1 * G2(ax, y, EYE.x, EYE.y, 0.11, 0.075); // eye sockets
      dz += 0.045 * G2(ax, y, 0.46, -0.12, 0.1, 0.09); // cheekbones
      dz -= 0.03 * G2(ax, y, 0.34, -0.38, 0.1, 0.12); // cheek hollows
      if (y < 0.2 && y > -0.42) {
        // nose: bridge → tip, widening towards the base
        const t = Math.min(1, Math.max(0, (0.16 - y) / 0.46));
        const h = 0.025 + 0.19 * t ** 1.5;
        const w = 0.04 + 0.045 * t;
        const under = y < -0.3 ? Math.exp(-((y + 0.3) ** 2) / 0.0012) : 1;
        dz += h * Math.exp(-(x * x) / (2 * w * w)) * under;
      }
      dz += 0.06 * G2(ax, y, 0.1, -0.33, 0.04, 0.035); // nostril wings
      dz -= 0.02 * G2(ax, y, 0.07, -0.37, 0.025, 0.015); // nostrils
      dz += 0.02 * G2(x, y, 0, -0.42, 0.03, 0.04); // philtrum
      dz += 0.05 * G2(x, y, 0, -0.48, 0.15, 0.03); // upper lip
      dz -= 0.035 * G2(x, y, 0, -0.53, 0.16, 0.012); // mouth line
      dz -= 0.02 * G2(ax, y, 0.16, -0.53, 0.02, 0.02); // mouth corners
      dz += 0.045 * G2(x, y, 0, -0.585, 0.13, 0.03); // lower lip
      dz -= 0.025 * G2(x, y, 0, -0.66, 0.12, 0.025); // chin groove
      dz += 0.07 * G2(x, y, 0, -0.78, 0.15, 0.07); // chin
      z += dz * f;
    }
    p.setXYZ(i, x * HS.x, y * HS.y, z * HS.z);
  }
  g.computeVertexNormals();
  g.translate(0, HS.cy, HS.cz);
  return g;
}

function eyes() {
  return [-1, 1].map((s) => {
    const g = new THREE.SphereGeometry(0.03, 24, 16);
    g.translate(s * EYE.x * HS.x, EYE.y * HS.y + HS.cy, eyeZ());
    return g;
  });
}

/** upper & lower eyelids as thin arcs over each eyeball */
function lids() {
  const out = [];
  for (const s of [-1, 1]) {
    for (const up of [true, false]) {
      const g = new THREE.TorusGeometry(up ? 0.032 : 0.031, 0.006, 8, 24, Math.PI * 0.85);
      g.rotateZ(up ? Math.PI * 0.075 : Math.PI * 1.075);
      g.scale(1.15, up ? 0.75 : 0.55, 1);
      g.translate(s * EYE.x * HS.x, EYE.y * HS.y + HS.cy, eyeZ() + 0.008);
      out.push(g);
    }
  }
  return out;
}

function ear(side) {
  const shell = new THREE.SphereGeometry(1, 24, 16);
  shell.scale(0.022, 0.08, 0.05);
  const rim = new THREE.TorusGeometry(0.052, 0.009, 8, 28, Math.PI * 1.5);
  rim.rotateY(Math.PI / 2);
  rim.rotateX(-Math.PI * 0.6);
  rim.scale(1, 1.35, 0.85);
  const lobe = new THREE.SphereGeometry(0.018, 12, 10);
  lobe.translate(0, -0.075, 0.012);
  return [shell, rim, lobe].map((g) => {
    g.rotateY(side * 0.3);
    g.translate(side * 0.282, 2.85, -0.03);
    return g;
  });
}

function neck() {
  const pts = [
    [0.13, 2.1],
    [0.125, 2.3],
    [0.12, 2.45],
    [0.135, 2.58],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 40);
  g.scale(1, 1, 1.08);
  return g;
}

/** tapered limb segment between a and b (radius r0 → r1) */
function limb(a, b, r0, r1, bulgeAt = 0.35, bulge = 0.12) {
  const len = a.distanceTo(b);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.exp(-((t - bulgeAt) ** 2) / 0.03)); // muscle belly
    pts.push(new THREE.Vector2(r, t * len));
  }
  const g = new THREE.LatheGeometry(pts, 28);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}

function joint(c, r) {
  const g = new THREE.SphereGeometry(r, 24, 16);
  g.translate(c.x, c.y, c.z);
  return g;
}

function hand(side, wrist) {
  const g = new THREE.SphereGeometry(1, 24, 16);
  g.scale(0.055, 0.13, 0.035);
  g.rotateZ(side * 0.06);
  g.translate(wrist.x + side * 0.01, wrist.y - 0.12, wrist.z + 0.01);
  return g;
}

function adamsApple() {
  const g = new THREE.SphereGeometry(1, 16, 12);
  g.scale(0.032, 0.04, 0.03);
  g.translate(0, 2.36, 0.118);
  return g;
}

/** collarbones following the front of the upper chest */
function clavicles() {
  const surfZ = (x, y) => {
    const [, w, d] = lerpProfile(y);
    const u = Math.min(0.98, Math.abs(x) / w);
    return d * (1 - u ** 2.6) ** (1 / 2.6);
  };
  return [-1, 1].map((s) => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = s * (0.05 + 0.55 * t);
      const y = 2.07 - 0.03 * Math.sin(t * Math.PI) + 0.02 * t;
      pts.push(new THREE.Vector3(x, y, surfZ(x, y) + 0.004));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.017, 10, false);
  });
}

export function makeHuman() {
  const parts = [torso(), neck(), head(), ...eyes(), ...lids(), ...ear(-1), ...ear(1), adamsApple(), ...clavicles()];
  for (const s of [-1, 1]) {
    const sh = new THREE.Vector3(s * 0.74, 1.96, -0.01);
    const el = new THREE.Vector3(s * 0.86, 1.05, -0.04);
    const wr = new THREE.Vector3(s * 0.9, 0.28, 0.06);
    const delt = new THREE.SphereGeometry(0.155, 28, 20);
    delt.scale(1, 1.05, 0.95);
    delt.translate(s * 0.71, 1.92, -0.01);
    parts.push(delt, limb(sh, el, 0.135, 0.095, 0.3, 0.14), joint(el, 0.098), limb(el, wr, 0.095, 0.058, 0.2, 0.18), joint(wr, 0.06), hand(s, wr));
  }
  return parts;
}
