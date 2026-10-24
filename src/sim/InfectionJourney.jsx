import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { Maximize2, Pause, Play, RotateCcw, SkipBack, SkipForward, Tag, Video } from 'lucide-react';
import { makeBronchialTree, makeLungGeometry } from '../three/geometry';
import { createHoloMaterial } from '../three/HoloMaterial';
import { makeHuman } from './humanGeo';

/* ════════════════════════════════════════════════════════════════
   Key world positions (patient faces +z; patient's LEFT = +x)
   ════════════════════════════════════════════════════════════════ */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const GHON = V(0.44, 1.24, 0.06); // subpleural focus, lower part of left upper lobe
const APEX = V(0.27, 1.68, 0.04); // reactivation site, left apex
const HILAR_L = V(0.13, 1.45, 0.03);
const HILAR_R = V(-0.13, 1.45, 0.03);
const CERVICAL_L = [V(0.11, 2.3, 0.04), V(0.115, 2.4, 0.03), V(0.11, 2.5, 0.05)];
const CERVICAL_R = [V(-0.11, 2.34, 0.04), V(-0.115, 2.46, 0.03)];
const HEART = V(0.1, 1.12, 0.12);
const CONTACT_Z = 1.7; // infectious contact stands face to face with the patient
const M = V(40, 0, 0); // microscopic scene lives far away in the same world

const curve = (pts) => new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
const INHALE = curve([V(0, 2.64, 1.37), V(0, 2.68, 1.05), V(0, 2.72, 0.7), V(0, 2.725, 0.33), V(0, 2.83, 0.2), V(0, 2.74, 0.0), V(0, 2.5, 0.02), V(0, 2.27, 0.06), V(0, 1.92, 0.02)]);
const AIRWAY = curve([V(0, 1.92, 0.02), V(0, 1.52, 0.02), V(0.17, 1.37, 0.02), V(0.32, 1.3, 0.04), GHON]);
const LYMPH = curve([GHON, V(0.3, 1.36, 0.04), HILAR_L, V(0.08, 1.75, 0.0), V(0.16, 2.08, 0.0), CERVICAL_L[0], CERVICAL_L[1]]);
const EXHALE = curve([APEX, V(0.17, 1.5, 0.02), V(0, 1.52, 0.02), V(0, 1.92, 0.02), V(0, 2.27, 0.06), V(0, 2.62, 0.2), V(0, 2.64, 0.31), V(0, 2.65, 0.7), V(0, 2.66, 1.05), V(0, 2.64, 1.37)]);

/* ════════════════════════════════════════════════════════════════
   The story
   ════════════════════════════════════════════════════════════════ */
export const STAGES = [
  { t: 'Exposure', short: 'Exposure', view: 'side', dur: 7, d: 'An untreated patient coughs, releasing droplet nuclei (1–5 µm) that hang in the air of a crowded, poorly ventilated room.', tags: ['Airborne', 'Droplet nuclei'] },
  { t: 'Inhalation', short: 'Inhalation', view: 'front', dur: 7, d: 'Our patient breathes them in. Large droplets are trapped in the nose, but tiny nuclei pass the pharynx and larynx into the trachea.', tags: ['Nose → pharynx → trachea'] },
  { t: 'Down the airways', short: 'Airways', view: 'front', dur: 7, d: 'They follow the bronchial tree to the well-ventilated subpleural alveoli in the lower part of the upper lobe.', tags: ['Bronchi', 'Alveoli'] },
  { t: 'Inside the alveolus', short: 'Alveolus', view: 'micro', dur: 11, d: 'Alveolar macrophages engulf the bacilli, but cord factor, LAM and ESAT-6 block phagosome–lysosome fusion. The bacilli survive and multiply.', tags: ['Macrophage', 'Fusion blocked', 'Multiplication'] },
  { t: 'Spread to lymph nodes', short: 'Lymph nodes', view: 'front', dur: 9, d: 'Bacilli travel in lymphatics to the hilar nodes (focus + nodes = Ghon complex) and on to the cervical nodes, as in this patient.', tags: ['Ghon complex', 'Cervical nodes'] },
  { t: 'Immune response · granuloma', short: 'Granuloma', view: 'micro', dur: 11, d: 'After ~3 weeks Th1 cells release IFN-γ; activated macrophages become epithelioid and Langhans giant cells, walling off a caseous centre.', tags: ['Type IV hypersensitivity', 'Caseation'] },
  { t: 'Reactivation', short: 'Reactivation', view: 'front', dur: 9, d: 'Bacilli can stay latent for years. When immunity falls (malnutrition, crowding, anaemia) they reactivate at the oxygen-rich apex and form a cavity.', tags: ['Apex', 'Cavity'] },
  { t: 'Transmission', short: 'Transmission', view: 'side', dur: 8, d: 'The cavity opens into a bronchus, so our patient is now infectious. His cough spreads bacilli to a healthy family member, and the cycle repeats. Early diagnosis and treatment break this chain.', tags: ['Now infectious', 'New person exposed', 'Cycle repeats'] },
];

// One fixed camera distance for every stage; only the angle changes.
const CAM_D = 4.3;
const VIEWS = {
  side: { target: V(0, 2.25, CONTACT_Z / 2), theta: Math.PI / 2, phi: Math.PI / 2 - 0.06 },
  front: { target: V(0, 1.95, 0.05), theta: 0, phi: Math.PI / 2 - 0.06 },
  micro: { target: M.clone(), theta: 0.12, phi: Math.PI / 2 - 0.1 },
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => x * x * (3 - 2 * x);

/* ════════════════════════════════════════════════════════════════
   Human body (translucent) + organs
   ════════════════════════════════════════════════════════════════ */
// depth-only pass: lets the holographic skin draw just its OUTER surface,
// so joints and overlapping parts merge into one clean human silhouette
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });

function Human({ material, order = 10, ...props }) {
  const parts = useMemo(() => makeHuman(), []);
  return (
    <group {...props}>
      {parts.map((g, i) => (
        <mesh key={`d${i}`} geometry={g} material={depthOnly} renderOrder={order} />
      ))}
      {parts.map((g, i) => (
        <mesh key={i} geometry={g} material={material} renderOrder={order + 1} />
      ))}
    </group>
  );
}

function Body({ jr }) {
  const skin = useMemo(() => {
    const m = createHoloMaterial({ base: '#4a3428', rim: '#F6E7D6', opacity: 1, lit: 1 });
    m.side = THREE.FrontSide;
    m.depthFunc = THREE.LessEqualDepth;
    return m;
  }, []);
  useFrame(({ clock }) => {
    skin.uniforms.uTime.value = clock.elapsedTime;
    jr.current.breath = Math.sin(clock.elapsedTime * 1.6) * 0.5 + 0.5;
  });
  return <Human material={skin} />;
}

function Organs({ jr }) {
  const { lungL, lungR, tree, upper, lungMat, airMat } = useMemo(() => {
    const upperCurve = curve([V(0, 2.725, 0.33), V(0, 2.83, 0.2), V(0, 2.74, 0.0), V(0, 2.5, 0.02), V(0, 2.27, 0.06), V(0, 1.92, 0.02)]);
    return {
      lungL: makeLungGeometry(1, 64),
      lungR: makeLungGeometry(-1, 64),
      tree: makeBronchialTree(),
      upper: new THREE.TubeGeometry(upperCurve, 60, 0.032, 12, false),
      lungMat: new THREE.MeshStandardMaterial({ color: '#d98c86', emissive: '#4a1512', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6 }),
      airMat: new THREE.MeshStandardMaterial({ color: '#f2c6a0', emissive: '#5a3a1e', transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.4 }),
    };
  }, []);
  const chest = useRef();
  const heart = useRef();
  useFrame(({ clock }) => {
    const b = jr.current.breath || 0;
    if (chest.current) chest.current.scale.set(0.36 * (1 + b * 0.03), 0.36 * (1 + b * 0.02), 0.36 * (1 + b * 0.03));
    if (heart.current) {
      const beat = Math.max(0, Math.sin(clock.elapsedTime * 10)) ** 6;
      heart.current.scale.setScalar(1 + beat * 0.08);
    }
  });
  return (
    <group>
      <group ref={chest} position={[0, 1.25, 0]} scale={0.36}>
        <mesh geometry={lungR} material={lungMat} position={[-0.74, 0, 0]} scale={1.04} />
        <mesh geometry={lungL} material={lungMat} position={[0.7, 0, 0]} scale={[0.96, 1, 1]} />
        <mesh geometry={tree} material={airMat} />
      </group>
      <mesh geometry={upper} material={airMat} />
      <mesh ref={heart} position={HEART} scale={[1, 1.15, 0.9]}>
        <sphereGeometry args={[0.12, 32, 24]} />
        <meshStandardMaterial color="#9b1c2c" emissive="#4a0710" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* lymph nodes, Ghon focus and apical cavity react to the story */
function Lesions({ jr }) {
  const ghon = useRef();
  const cav = useRef();
  const hilar = useRef();
  const cerv = useRef();
  const lymphLine = useRef();
  const lymphGeo = useMemo(() => new THREE.TubeGeometry(LYMPH, 80, 0.006, 6, false), []);
  useFrame(({ clock }) => {
    const { stage: S, p } = jr.current;
    const pulse = 0.85 + Math.sin(clock.elapsedTime * 4) * 0.15;
    const g = S < 2 ? 0 : S === 2 ? smooth(clamp((p - 0.65) / 0.35)) : 1;
    ghon.current.scale.setScalar(Math.max(0.001, g * pulse));
    const c = S < 6 ? 0 : S === 6 ? smooth(clamp((p - 0.3) / 0.5)) : 1;
    cav.current.scale.setScalar(Math.max(0.001, c));
    const nodesOn = S > 4 || (S === 4 && p > 0.45);
    hilar.current.material.emissiveIntensity = nodesOn ? 1.2 * pulse : 0.15;
    const cervOn = S > 4 || (S === 4 && p > 0.75);
    cerv.current.children.forEach((m) => {
      m.scale.setScalar(cervOn ? 1.7 : 1);
      m.material.emissiveIntensity = cervOn ? 1.1 * pulse : 0.15;
    });
    lymphLine.current.material.opacity = S === 4 ? 0.35 + 0.5 * smooth(clamp(p * 2)) : S > 4 ? 0.25 : 0;
  });
  const nodeMat = () => new THREE.MeshStandardMaterial({ color: '#E0A33A', emissive: '#E0A33A', emissiveIntensity: 0.15, roughness: 0.5 });
  return (
    <group>
      <mesh ref={ghon} position={GHON}>
        <sphereGeometry args={[0.045, 24, 16]} />
        <meshStandardMaterial color="#F6DDB4" emissive="#E0533F" emissiveIntensity={0.9} />
      </mesh>
      <group ref={cav} position={APEX}>
        <mesh>
          <sphereGeometry args={[0.075, 32, 24]} />
          <meshStandardMaterial color="#E0533F" emissive="#E0533F" emissiveIntensity={1.1} transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.045, 24, 16]} />
          <meshBasicMaterial color="#0a0505" />
        </mesh>
      </group>
      <mesh ref={hilar} position={HILAR_L} material={nodeMat()}>
        <sphereGeometry args={[0.035, 20, 14]} />
      </mesh>
      <mesh position={HILAR_R} material={nodeMat()}>
        <sphereGeometry args={[0.032, 20, 14]} />
      </mesh>
      <group ref={cerv}>
        {CERVICAL_L.map((v, i) => (
          <mesh key={i} position={v} material={nodeMat()}>
            <sphereGeometry args={[0.026, 16, 12]} />
          </mesh>
        ))}
      </group>
      {CERVICAL_R.map((v, i) => (
        <mesh key={i} position={v} material={nodeMat()}>
          <sphereGeometry args={[0.024, 16, 12]} />
        </mesh>
      ))}
      <mesh ref={lymphLine} geometry={lymphGeo}>
        <meshBasicMaterial color="#E0A33A" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* side-view person: the infected source in stage 1, a NEW healthy family member in stage 8 */
function Contact({ jr }) {
  const g = useRef();
  const mat = useMemo(() => {
    const m = createHoloMaterial({ base: '#4a2e12', rim: '#F0B550', opacity: 1, lit: 1 });
    m.side = THREE.FrontSide;
    m.depthFunc = THREE.LessEqualDepth;
    return m;
  }, []);
  useFrame(({ clock }) => {
    const { stage: S, p } = jr.current;
    const o = S === 0 ? 1 : S === 1 ? 1 - clamp(p / 0.2) : S === 7 ? clamp(p / 0.2) : 0;
    mat.uniforms.uOpacity.value = o;
    g.current.visible = o > 0.01;
    // stage 8 shows a different, healthy person (cool ivory-green) — not the original source
    if (S === 7) {
      mat.uniforms.uRim.value.set('#BFE3C8');
      mat.uniforms.uBase.value.set('#1f3a2a');
    } else {
      mat.uniforms.uRim.value.set('#F0B550');
      mat.uniforms.uBase.value.set('#4a2e12');
    }
    mat.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <group ref={g}>
      <Human material={mat} order={20} position={[0, 0, CONTACT_Z]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

/* ════════════════════════════════════════════════════════════════
   Bacilli travelling through the body
   ════════════════════════════════════════════════════════════════ */
const N = 30;
function BodyBacilli({ jr }) {
  const rods = useRef();
  const glow = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        phase: i / N,
        j: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.012 + Math.random() * 0.02),
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: (Math.random() - 0.5) * 3,
      })),
    []
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const { stage: S, p } = jr.current;
    seeds.forEach((s, i) => {
      let vis = true;
      let spread = 1;
      const lag = (k = 0.3) => clamp(p * (1 + k) - s.phase * k);
      if (S === 0) {
        INHALE.getPointAt(lag(0.35) * 0.33, tmp);
        spread = 3.5;
      } else if (S === 1) INHALE.getPointAt(0.33 + lag() * 0.67, tmp);
      else if (S === 2) AIRWAY.getPointAt(lag(), tmp);
      else if (S === 3) tmp.copy(GHON);
      else if (S === 4 || S === 5) {
        const u = S === 4 ? lag(0.4) : 1;
        if (i % 3 === 0) LYMPH.getPointAt(u, tmp);
        else if (i % 3 === 1) LYMPH.getPointAt(u * 0.36, tmp);
        else tmp.copy(GHON);
      } else if (S === 6) {
        const grown = clamp((p - 0.25) / 0.55) * N;
        if (i < grown) {
          tmp.copy(APEX);
          spread = 1.8;
        } else if (i % 3 === 0) LYMPH.getPointAt(1, tmp);
        else tmp.copy(GHON);
      } else {
        if (i % 2 === 0) {
          EXHALE.getPointAt(lag(), tmp);
          spread = 1 + lag() * 2.5;
        } else {
          tmp.copy(APEX);
          spread = 1.8;
        }
      }
      s.rot.x += s.spin * dt;
      s.rot.y += s.spin * dt * 0.7;
      dummy.position.copy(tmp).addScaledVector(s.j, spread);
      dummy.rotation.copy(s.rot);
      dummy.scale.setScalar(vis ? 1 : 0.0001);
      dummy.updateMatrix();
      rods.current.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      glow.current.setMatrixAt(i, dummy.matrix);
    });
    rods.current.instanceMatrix.needsUpdate = true;
    glow.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={rods} args={[undefined, undefined, N]} frustumCulled={false}>
        <capsuleGeometry args={[0.009, 0.04, 4, 8]} />
        <meshStandardMaterial color="#ff5a3c" emissive="#E0533F" emissiveIntensity={1.4} />
      </instancedMesh>
      <instancedMesh ref={glow} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.03, 12, 8]} />
        <meshBasicMaterial color="#ff6b4a" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

/* ════════════════════════════════════════════════════════════════
   Microscopic scene: alveolus → macrophage → granuloma
   ════════════════════════════════════════════════════════════════ */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function Micro({ jr, labels }) {
  const r = useMemo(() => rng(11), []);
  const root = useRef();
  const sacs = useMemo(() => {
    const out = [{ p: V(0, 0, 0), r: 1.7 }];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      out.push({ p: V(Math.cos(a) * 2.6, (r() - 0.5) * 1.6, Math.sin(a) * 2.2 - 1.2), r: 1.05 + r() * 0.4 });
    }
    return out;
  }, [r]);
  const capillaries = useMemo(
    () =>
      Array.from({ length: 7 }, (_, k) => {
        const pts = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 8) * Math.PI * 2 + k;
          pts.push(V(Math.cos(a) * (2 + r() * 1.5), Math.sin(a * 1.3 + k) * 1.8, Math.sin(a) * (1.6 + r()) - 1));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.032, 8, true);
      }),
    [r]
  );
  const sacMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#efb0a6', emissive: '#3a1210', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, roughness: 0.5 }), []);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b3263a', emissive: '#3a0610', transparent: true, opacity: 0.38, depthWrite: false }), []);

  // macrophage with living, deforming membrane
  const macGeo = useMemo(() => new THREE.IcosahedronGeometry(0.8, 4), []);
  const base = useMemo(() => Float32Array.from(macGeo.attributes.position.array), [macGeo]);
  const mac = useRef();
  const MAC_C = V(0, -0.55, 0.25);
  const toBac = V(-0.8, 0.55, 0.3).normalize();

  // bacilli + phagosomes + lysosomes
  const NB = 16;
  const bac = useRef();
  const pha = useRef();
  const lys = useRef();
  const seeds = useMemo(
    () =>
      Array.from({ length: NB }, (_, i) => ({
        start: V(-3.4 + (i % 4) * 0.35, 1.9 - (i % 4) * 0.25, 1.3),
        inside: V((r() - 0.5) * 0.75, (r() - 0.5) * 0.65, (r() - 0.5) * 0.6),
        rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
      })),
    [r]
  );

  // granuloma cells (cut-away: open towards the camera)
  const epi = useMemo(() => {
    const out = [];
    const n = 70;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const d = V(Math.cos(th) * rad, y, Math.sin(th) * rad);
      if (d.z < 0.3) out.push(d);
    }
    return out;
  }, []);
  const lymphs = useMemo(() => {
    const out = [];
    while (out.length < 90) {
      const d = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      if (d.z < 0.4) out.push({ d, rad: 1.65 + r() * 0.4 });
    }
    return out;
  }, [r]);
  const epiRef = useRef();
  // slipper-shaped epithelioid cell (elongated sphere)
  const epiGeo = useMemo(() => new THREE.SphereGeometry(1, 16, 12).scale(0.3, 0.13, 0.13), []);
  const lymRef = useRef();
  const core = useRef();
  const giants = useRef();
  const alv = useRef();
  const gran = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const X = useMemo(() => V(1, 0, 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const lbl = useRef({});

  useFrame(({ clock }) => {
    const { stage: S, p } = jr.current;
    const t = clock.elapsedTime;
    const show = S === 3 || S === 5;
    root.current.visible = show;
    if (!show) {
      Object.values(lbl.current).forEach((el) => el && (el.style.opacity = 0));
      return;
    }
    const granStage = S === 5;
    const fade = granStage ? smooth(clamp(p / 0.35)) : 0;
    sacMat.opacity = 0.1 * (1 - fade * 0.85);
    capMat.opacity = 0.38 * (1 - fade * 0.8);

    // ── macrophage membrane
    const engulf = !granStage ? Math.sin(Math.PI * clamp((p - 0.12) / 0.4)) : 0;
    const pos = macGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];
      const len = Math.hypot(bx, by, bz) || 1;
      const dx = bx / len;
      const dy = by / len;
      const dz = bz / len;
      tmp.set(bx, by, bz);
      let k = 1 + 0.07 * Math.sin(dx * 4 + t * 1.3) * Math.cos(dy * 3 + t);
      const dot = dx * toBac.x + dy * toBac.y + dz * toBac.z;
      if (dot > 0.7) k += 0.55 * engulf * smooth((dot - 0.7) / 0.3);
      pos.setXYZ(i, tmp.x * k, tmp.y * k, tmp.z * k);
    }
    pos.needsUpdate = true;
    macGeo.computeVertexNormals();
    const macC = granStage ? MAC_C.clone().lerp(V(0, 0, 0), fade) : MAC_C;
    mac.current.position.copy(macC);
    mac.current.scale.setScalar(granStage ? 1 - fade * 0.35 : 1);

    // ── bacilli: approach → engulfed → multiply
    const visible = granStage ? NB : p < 0.5 ? 4 : 4 + Math.floor(clamp((p - 0.5) / 0.45) * (NB - 4));
    seeds.forEach((s, i) => {
      const parent = seeds[i % 4];
      if (granStage) tmp.copy(s.inside).multiplyScalar(0.6).add(macC);
      else if (i < 4) {
        const a = clamp(p / 0.22);
        const b = clamp((p - 0.22) / 0.25);
        const surf = MAC_C.clone().addScaledVector(toBac, 1.05);
        tmp.copy(s.start).lerp(surf, smooth(a)).lerp(s.inside.clone().add(MAC_C), smooth(b));
      } else {
        const born = clamp(((p - 0.5) / 0.45) * (NB - 4) - (i - 4));
        tmp.copy(parent.inside).lerp(s.inside, smooth(born)).add(MAC_C);
      }
      s.rot.x += 0.01;
      s.rot.z += 0.013;
      dummy.position.copy(tmp);
      dummy.rotation.copy(s.rot);
      dummy.scale.setScalar(i < visible ? 1 : 0.0001);
      dummy.updateMatrix();
      bac.current.setMatrixAt(i, dummy.matrix);
      const inside = granStage || (i < 4 ? p > 0.45 : i < visible);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(inside && i < visible && !granStage ? 1 : 0.0001);
      dummy.updateMatrix();
      pha.current.setMatrixAt(i, dummy.matrix);
    });
    bac.current.instanceMatrix.needsUpdate = true;
    pha.current.instanceMatrix.needsUpdate = true;
    // lysosomes buzz around but never fuse
    for (let i = 0; i < 8; i++) {
      const a = t * 0.9 + i * 0.785;
      dummy.position.set(MAC_C.x + Math.cos(a) * 0.62, MAC_C.y + Math.sin(a * 1.3) * 0.45, MAC_C.z + Math.sin(a) * 0.5);
      dummy.scale.setScalar(!granStage && p > 0.45 ? 1 : 0.0001);
      dummy.updateMatrix();
      lys.current.setMatrixAt(i, dummy.matrix);
    }
    lys.current.instanceMatrix.needsUpdate = true;

    // ── granuloma assembly
    gran.current.visible = granStage;
    if (granStage) {
      epi.forEach((d, i) => {
        const arrive = smooth(clamp(p * 2.2 - 0.3 - (i / epi.length) * 0.6));
        tmp.copy(d).multiplyScalar(1.15 + (1 - arrive) * 4);
        dummy.position.copy(tmp);
        const tan = V(0, 1, 0).cross(d).normalize();
        if (tan.lengthSq() < 0.01) tan.set(1, 0, 0);
        q.setFromUnitVectors(X, tan);
        dummy.quaternion.copy(q);
        dummy.scale.set(1, 1, 1).multiplyScalar(arrive > 0.01 ? 1 : 0.0001);
        dummy.updateMatrix();
        epiRef.current.setMatrixAt(i, dummy.matrix);
      });
      epiRef.current.instanceMatrix.needsUpdate = true;
      dummy.quaternion.identity();
      lymphs.forEach((l, i) => {
        const arrive = smooth(clamp(p * 2 - 0.55 - (i / lymphs.length) * 0.5));
        dummy.position.copy(l.d).multiplyScalar(l.rad + (1 - arrive) * 5);
        dummy.scale.setScalar(arrive > 0.01 ? 1 : 0.0001);
        dummy.updateMatrix();
        lymRef.current.setMatrixAt(i, dummy.matrix);
      });
      lymRef.current.instanceMatrix.needsUpdate = true;
      core.current.scale.setScalar(Math.max(0.001, smooth(clamp((p - 0.55) / 0.4)) * 0.62));
      giants.current.scale.setScalar(Math.max(0.001, smooth(clamp((p - 0.35) / 0.2))));
    }
    alv.current.visible = true;
    // label visibility by sub-phase
    const L = lbl.current;
    const set = (k, v) => L[k] && (L[k].style.opacity = v ? 1 : 0);
    set('alv', !granStage);
    set('mac', !granStage);
    set('bac', !granStage && p < 0.5);
    set('fus', !granStage && p > 0.45);
    set('mul', !granStage && p > 0.6);
    set('epi', granStage && p > 0.3);
    set('lan', granStage && p > 0.45);
    set('lym', granStage && p > 0.55);
    set('cas', granStage && p > 0.75);
  });


  return (
    <group ref={root} position={M} scale={0.55} visible={false}>
      <group ref={alv}>
        {sacs.map((s, i) => (
          <mesh key={i} position={s.p} material={sacMat}>
            <sphereGeometry args={[s.r, 40, 28]} />
          </mesh>
        ))}
        {capillaries.map((g, i) => (
          <mesh key={i} geometry={g} material={capMat} />
        ))}
      </group>
      <mesh ref={mac} geometry={macGeo}>
        <meshStandardMaterial color="#a48ad0" emissive="#2a1a44" transparent opacity={0.58} roughness={0.55} depthWrite={false} />
      </mesh>
      <instancedMesh ref={bac} args={[undefined, undefined, NB]} frustumCulled={false}>
        <capsuleGeometry args={[0.055, 0.28, 4, 10]} />
        <meshStandardMaterial color="#ff5a3c" emissive="#E0533F" emissiveIntensity={0.9} />
      </instancedMesh>
      <instancedMesh ref={pha} args={[undefined, undefined, NB]} frustumCulled={false}>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color="#F6DDB4" transparent opacity={0.22} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={lys} args={[undefined, undefined, 8]} frustumCulled={false}>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshStandardMaterial color="#7fd18b" emissive="#2f6b3a" />
      </instancedMesh>

      <group ref={gran} visible={false}>
        <instancedMesh ref={epiRef} args={[epiGeo, undefined, epi.length]} frustumCulled={false}>
          <meshStandardMaterial color="#e79ab5" emissive="#4a1a2a" roughness={0.5} />
        </instancedMesh>
        <instancedMesh ref={lymRef} args={[undefined, undefined, lymphs.length]} frustumCulled={false}>
          <sphereGeometry args={[0.085, 12, 8]} />
          <meshStandardMaterial color="#7a4fb0" emissive="#2a1440" />
        </instancedMesh>
        <mesh ref={core}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial color="#F6DDB4" roughness={0.9} emissive="#3a2a14" />
        </mesh>
        <group ref={giants}>
          {[V(-0.75, 0.55, -0.55), V(0.85, -0.35, -0.45)].map((g, k) => (
            <group key={k} position={g}>
              <mesh>
                <sphereGeometry args={[0.32, 24, 16]} />
                <meshStandardMaterial color="#d97aa0" emissive="#3a1022" transparent opacity={0.85} />
              </mesh>
              {Array.from({ length: 9 }, (_, i) => {
                const a = Math.PI * 0.25 + (i / 8) * Math.PI * 1.5; // horseshoe of nuclei
                return (
                  <mesh key={i} position={[Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.18]}>
                    <sphereGeometry args={[0.05, 10, 8]} />
                    <meshStandardMaterial color="#3b1d63" />
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>
      </group>

      <MicroLabel reg={lbl} show={labels} k="alv" pos={[0, 1.95, 0.4]}>Alveolus</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="mac" pos={[0.9, -1.4, 0.6]} color="#c9b6ee">Alveolar macrophage</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="bac" pos={[-3.1, 2.4, 1.3]} color="#ff8a6e">M. tuberculosis</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="fus" pos={[-1.2, -0.2, 1.0]} color="#7fd18b">✕ Phagosome–lysosome fusion blocked</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="mul" pos={[0.2, 0.55, 1.0]} color="#ff8a6e">Bacilli multiply inside</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="epi" pos={[0, 1.55, 0.2]} color="#f2a9c2">Epithelioid cells</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="lan" pos={[-1.35, 1.0, -0.4]} color="#e5a0bf">Langhans giant cell</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="lym" pos={[1.9, 1.35, 0]} color="#b598e0">Lymphocyte cuff (Th1 · IFN-γ)</MicroLabel>
      <MicroLabel reg={lbl} show={labels} k="cas" pos={[0, 0, 0.9]} color="#F6DDB4">Caseous necrosis</MicroLabel>
    </group>
  );
}


function MicroLabel({ reg, show, k, pos, children, color = '#F1E4D3' }) {
  if (!show) return null;
  return (
    <Html position={pos} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={(el) => (reg.current[k] = el)} className="whitespace-nowrap rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[11px] font-medium backdrop-blur transition-opacity duration-500" style={{ color, opacity: 0 }}>
        {children}
      </div>
    </Html>
  );
}

/* ════════════════════════════════════════════════════════════════
   Body labels
   ════════════════════════════════════════════════════════════════ */
const BODY_LABELS = [
  { k: 'Nose & mouth', p: V(0.22, 2.74, 0.36), s: [1] },
  { k: 'Trachea', p: V(-0.2, 2.15, 0.1), s: [1, 2] },
  { k: 'Left main bronchus', p: V(0.26, 1.42, 0.12), s: [2] },
  { k: 'Alveoli · Ghon focus', p: V(0.6, 1.2, 0.08), s: [2, 4] },
  { k: 'Hilar lymph node', p: V(-0.05, 1.42, 0.2), s: [4] },
  { k: "Cervical nodes (scrofula)", p: V(0.4, 2.42, 0.05), s: [4] },
  { k: 'Apex · cavity', p: V(0.5, 1.82, 0.1), s: [6] },
  { k: 'Heart', p: V(0.18, 0.92, 0.25), s: [] },
  { k: 'Infected person (source)', p: V(0, 3.38, CONTACT_Z), s: [0] },
  { k: 'Healthy family member', p: V(0, 3.38, CONTACT_Z), s: [7] },
  { k: 'Our patient', p: V(0, 3.38, 0), s: [0] },
  { k: 'Our patient · now infectious', p: V(0, 3.38, 0), s: [7] },
];
function BodyLabels({ stage }) {
  return BODY_LABELS.filter((l) => l.s.includes(stage)).map((l) => {
    const on = true;
    return (
      <Html key={l.k} position={l.p} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all duration-500 ${on ? 'border-saffron/60 bg-black/75 text-saffron' : 'border-white/10 bg-black/50 text-white/45'}`}>{l.k}</div>
      </Html>
    );
  });
}

/* ════════════════════════════════════════════════════════════════
   Timeline driver + camera director
   ════════════════════════════════════════════════════════════════ */
function Director({ jr, playing, setStage, setPlaying, autoCam, userRef, flash }) {
  const { camera, controls } = useThree();
  const sph = useMemo(() => new THREE.Spherical(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const j = jr.current;
    if (playing) {
      j.p += dt / STAGES[j.stage].dur;
      if (j.p >= 1) {
        if (j.stage < STAGES.length - 1) {
          j.stage += 1;
          j.p = 0;
          userRef.current = false;
          setStage(j.stage);
        } else {
          j.p = 1;
          setPlaying(false);
        }
      }
    }
    if (!controls) return;
    const v = VIEWS[STAGES[j.stage].view];
    // switching between the body and the microscopic world: cut with a fade, keep the same framing
    const cut = controls.target.distanceTo(v.target) > 15;
    if (cut) {
      flash();
      off.copy(camera.position).sub(controls.target);
      controls.target.copy(v.target);
      camera.position.copy(v.target).add(off);
    }
    if (autoCam && !userRef.current) {
      const k = cut ? 1 : 1 - Math.exp(-dt * 2.2);
      controls.target.lerp(v.target, k);
      off.copy(camera.position).sub(controls.target);
      sph.setFromVector3(off);
      let dTheta = v.theta - sph.theta;
      dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta)); // shortest way round
      sph.theta += dTheta * k;
      sph.phi += (v.phi - sph.phi) * k;
      sph.radius += (CAM_D - sph.radius) * k;
      camera.position.setFromSpherical(sph).add(controls.target);
      controls.update();
    } else if (cut) controls.update();
  });
  return null;
}

/* ════════════════════════════════════════════════════════════════
   Module UI
   ════════════════════════════════════════════════════════════════ */
export default function InfectionJourney({ onDone }) {
  const jr = useRef({ stage: 0, p: 0, breath: 0 });
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [labels, setLabels] = useState(true);
  const [autoCam, setAutoCam] = useState(true);
  const userRef = useRef(false);
  const wrap = useRef(null);
  const fadeRef = useRef(null);
  const bars = useRef([]);

  const goto = (s) => {
    jr.current.stage = s;
    jr.current.p = 0;
    userRef.current = false;
    setStage(s);
  };
  const flash = () => {
    const el = fadeRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.opacity = '1';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .7s ease';
      el.style.opacity = '0';
    });
  };

  useEffect(() => {
    if (stage === STAGES.length - 1) onDone?.();
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // per-stage progress fills, updated without re-rendering React
  useEffect(() => {
    let raf;
    const tick = () => {
      const { stage: S, p } = jr.current;
      bars.current.forEach((b, i) => b && (b.style.transform = `scaleX(${i < S ? 1 : i === S ? p : 0})`));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const st = STAGES[stage];
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : wrap.current?.requestFullscreen?.());
  const v0 = VIEWS[STAGES[0].view];
  const cam0 = new THREE.Vector3().setFromSphericalCoords(CAM_D, v0.phi, v0.theta).add(v0.target);

  return (
    <div ref={wrap} className="grid gap-4 bg-sim-bg xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* 3D view */}
      <div className="relative h-[min(74vh,720px)] min-h-[480px] overflow-hidden rounded-2xl border border-sim-line bg-[#0b0908]">
        <Canvas dpr={[1, 1.75]} camera={{ position: cam0.toArray(), fov: 38, near: 0.01, far: 200 }} gl={{ antialias: true }}>
          <color attach="background" args={['#0b0908']} />
          <fog attach="fog" args={['#0b0908', 9, 60]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[3, 5, 4]} intensity={1.6} color="#fff1e0" />
          <pointLight position={[-3, 2, 3]} intensity={18} color="#E0A33A" />
          <pointLight position={[M.x + 2, 2, 4]} intensity={40} color="#fff1e0" />
          <pointLight position={[M.x - 3, -1, 2]} intensity={20} color="#E0533F" />
          <Body jr={jr} />
          <Organs jr={jr} />
          <Lesions jr={jr} />
          <Contact jr={jr} />
          <BodyBacilli jr={jr} />
          <Micro jr={jr} labels={labels} />
          {labels && st.view !== 'micro' && <BodyLabels stage={stage} />}
          <OrbitControls makeDefault target={v0.target.toArray()} enableDamping dampingFactor={0.08} minDistance={0.6} maxDistance={12} onStart={() => (userRef.current = true)} />
          <Director jr={jr} playing={playing} setStage={setStage} setPlaying={setPlaying} autoCam={autoCam} userRef={userRef} flash={flash} />
        </Canvas>
        <div ref={fadeRef} className="pointer-events-none absolute inset-0 bg-[#0b0908] opacity-0" />

        <div className="absolute right-3 top-3 flex gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur">
          <Tool on={labels} onClick={() => setLabels((v) => !v)} icon={Tag} label="Labels" />
          <Tool on={autoCam} onClick={() => ((userRef.current = false), setAutoCam((v) => !v))} icon={Video} label="Auto camera" />
          <Tool onClick={() => (userRef.current = false)} icon={RotateCcw} label="Reset view" />
          <Tool onClick={fullscreen} icon={Maximize2} label="Fullscreen" />
        </div>
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white/55">Drag to rotate · scroll / pinch to zoom · right-drag to pan · Reset view returns to the guided angle</p>
        {st.view === 'micro' && <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-saffron px-2 py-1 text-[11px] font-semibold text-black">Microscopic view</span>}
      </div>

      {/* side panel: caption + controls + stage list */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron">
            Stage {stage + 1} of {STAGES.length}
          </p>
          <h3 className="mt-1 font-serif text-[1.5rem] leading-tight text-ivory">{st.t}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ivory/75">{st.d}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {st.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-ivory/80">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <button onClick={() => stage > 0 && goto(stage - 1)} disabled={stage === 0} className="grid h-10 w-10 place-items-center rounded-lg border border-sim-line text-ivory/80 hover:bg-white/10 disabled:opacity-30" aria-label="Previous stage">
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => {
                if (!playing && stage === STAGES.length - 1 && jr.current.p >= 1) goto(0);
                setPlaying((v) => !v);
              }}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-saffron text-[14px] font-semibold text-black hover:brightness-110"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => stage < STAGES.length - 1 && goto(stage + 1)} disabled={stage === STAGES.length - 1} className="grid h-10 w-10 place-items-center rounded-lg border border-sim-line text-ivory/80 hover:bg-white/10 disabled:opacity-30" aria-label="Next stage">
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        <ol className="flex-1 rounded-2xl border border-sim-line bg-sim-panel p-2">
          {STAGES.map((s2, i) => (
            <li key={s2.t}>
              <button onClick={() => goto(i)} className={`w-full rounded-lg px-3 py-2 text-left transition ${i === stage ? 'bg-white/[.06]' : 'hover:bg-white/[.03]'}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${i === stage ? 'bg-saffron text-black' : i < stage ? 'bg-white/15 text-ivory' : 'bg-white/5 text-ivory/45'}`}>{i + 1}</span>
                  <span className={`text-[13.5px] ${i === stage ? 'font-semibold text-ivory' : i < stage ? 'text-ivory/75' : 'text-ivory/45'}`}>{s2.t}</span>
                  {s2.view === 'micro' && <span className="ml-auto text-[10px] uppercase tracking-wider text-ivory/35">micro</span>}
                </div>
                <div className="ml-9 mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[.06]">
                  <div ref={(el) => (bars.current[i] = el)} className="h-full origin-left rounded-full bg-saffron" style={{ transform: 'scaleX(0)' }} />
                </div>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Tool({ on, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={on} className={`grid h-8 w-8 place-items-center rounded-md ${on ? 'bg-saffron text-black' : 'text-ivory/75 hover:bg-white/10'}`}>
      <Icon size={15} />
    </button>
  );
}
