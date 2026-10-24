import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import { createHoloMaterial } from './HoloMaterial';
import { makeBronchialTree, makeLungGeometry } from './geometry';
import { Particles } from './Particles';
import { useApp } from '../AppContext';

const LEFT_LUNG_X = 0.7;
// Lesion in the LEFT upper lobe (patient's left = viewer's right), anterior-lateral
const LESION_LOCAL = new THREE.Vector3(0.28, 0.78, 0.42);

function PulseRing({ delay = 0 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = ((clock.elapsedTime + delay) % 2) / 2;
    if (!ref.current) return;
    ref.current.scale.setScalar(0.4 + t * 1.6);
    ref.current.material.opacity = (1 - t) * 0.9;
  });
  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.16, 0.18, 48]} />
      <meshBasicMaterial color="#FF6B4A" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function Lungs({ progress, drag, showCallout }) {
  const group = useRef();
  const lesionRef = useRef();
  const coreRef = useRef();
  const { presentation, reduced } = useApp();

  const { rightGeo, leftGeo, tree, matR, matL, matTree, rightPts, leftPts } = useMemo(() => {
    const rightGeo = makeLungGeometry(-1);
    const leftGeo = makeLungGeometry(1);
    const sub = (g) => {
      // sparse surface points for a "point cloud" scan look
      const src = g.attributes.position;
      const arr = [];
      for (let i = 0; i < src.count; i += 3) arr.push(src.getX(i), src.getY(i), src.getZ(i));
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      return pg;
    };
    return {
      rightGeo,
      leftGeo,
      tree: makeBronchialTree(),
      matR: createHoloMaterial(),
      matL: createHoloMaterial(),
      matTree: createHoloMaterial({ base: '#3a2416', rim: '#F2C27A', opacity: 0.7 }),
      rightPts: sub(rightGeo),
      leftPts: sub(leftGeo),
    };
  }, []);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(0, 0.25, 0), []);
  const camEnd = useMemo(() => new THREE.Vector3(), []);
  const lookEnd = useMemo(() => new THREE.Vector3(), []);
  const calloutRef = useRef();
  const { camera, size } = useThree();
  // pull the camera back on portrait screens so both lungs fit
  const aspect = size.width / Math.max(1, size.height);
  const baseZ = aspect < 0.85 ? Math.min(13, 6.4 * (0.85 / Math.max(aspect, 0.42)) * 1.05) : 6.4;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const p = progress ? progress.get() : 0; // 0 → 1 while the hero is pinned
    const g = group.current;
    if (!g) return;

    // Breathing: slow scale pulse (~14 breaths/min)
    const breath = Math.sin(t * 1.45) * 0.5 + 0.5;
    g.scale.set(1 + breath * 0.04, 1 + breath * 0.025, 1 + breath * 0.04);

    // Free rotation: drag spins the lungs (with inertia); otherwise a gentle idle sway
    const d = drag.current;
    if (!d.down) {
      d.yaw += d.vy * dt;
      d.pitch += d.vx * dt;
      d.vy *= Math.exp(-dt * 3);
      d.vx *= Math.exp(-dt * 3);
    }
    d.pitch = THREE.MathUtils.clamp(d.pitch, -1.2, 1.2);
    const sway = (1 - p) * Math.sin(t * 0.25) * 0.35;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, d.yaw + sway, 8, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, d.pitch, 8, dt);

    // Lesion world position → shader uniforms
    lesionRef.current.getWorldPosition(tmp);
    const amt = 0.85 + p * 0.35;
    [matR, matL].forEach((m) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uLesionPos.value.copy(tmp);
    });
    matL.uniforms.uLesionAmt.value = amt;
    matTree.uniforms.uTime.value = t;
    if (coreRef.current) coreRef.current.scale.setScalar(0.9 + Math.sin(t * 3.2) * 0.12);

    // Scroll zoom: camera flies all the way in to the left-upper-lobe lesion
    const z = Math.min(1, p / 0.82);
    const e = z * z * (3 - 2 * z);
    camEnd.set(tmp.x + 0.35, tmp.y + 0.15, tmp.z + 1.9);
    const cx = THREE.MathUtils.lerp(0, camEnd.x, e);
    const cy = THREE.MathUtils.lerp(0.15, camEnd.y, e);
    const cz = THREE.MathUtils.lerp(baseZ, camEnd.z, e);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, 6, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, cy, 6, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, 6, dt);
    lookEnd.set(THREE.MathUtils.lerp(0, tmp.x, e), THREE.MathUtils.lerp(0.25, tmp.y, e), THREE.MathUtils.lerp(0, tmp.z, e));
    lookAt.lerp(lookEnd, 1 - Math.exp(-dt * 8));
    camera.lookAt(lookAt);
    // on wide screens the lungs sit on the right (beside the title) and glide to centre as we zoom
    const off = aspect > 1.2 ? -9 + 3.5 * e : 0; // ends slightly right of centre, clear of the info card
    if (Math.abs(camera.filmOffset - off) > 0.001) {
      camera.filmOffset = off;
      camera.updateProjectionMatrix();
    }
    // the small 3D label hands over to the big on-screen card near full zoom
    if (calloutRef.current) calloutRef.current.style.opacity = String(Math.max(0, 1 - p / 0.45));
  });

  return (
    <>
      <group ref={group} position={[0, -0.1, 0]}>
        {/* Right lung (viewer's left) */}
        <group position={[-LEFT_LUNG_X - 0.04, 0, 0]} scale={1.04}>
          <mesh geometry={rightGeo} material={matR} />
          <points geometry={rightPts}>
            <pointsMaterial size={0.012} color="#F1E4D3" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
        </group>
        {/* Left lung (viewer's right) — contains the lesion */}
        <group position={[LEFT_LUNG_X, 0, 0]} scale={[0.96, 1, 1]}>
          <mesh geometry={leftGeo} material={matL} />
          <points geometry={leftPts}>
            <pointsMaterial size={0.012} color="#F1E4D3" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
          <group ref={lesionRef} position={LESION_LOCAL}>
            <mesh ref={coreRef}>
              <sphereGeometry args={[0.09, 24, 24]} />
              <meshBasicMaterial color="#FF6B4A" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.2, 24, 24]} />
              <meshBasicMaterial color="#E0533F" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <Billboard>
              <PulseRing />
              <PulseRing delay={1} />
            </Billboard>
            {showCallout && aspect >= 0.85 && (
              <Html position={[-0.06, 0.04, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                {/* sits on the inner side of the lesion so the screen edge never cuts it off */}
                <div ref={calloutRef} className="flex -translate-x-full -translate-y-1/2 flex-row-reverse items-center" style={{ width: 290 }}>
                  <span className="h-px w-14 shrink-0 bg-ivory/50" />
                  <div className="rounded-xl border border-ivory/15 bg-night/80 px-4 py-3 backdrop-blur-md">
                    <div className="font-serif text-[15px] italic text-ivory">Left upper lobe</div>
                    <div className="mt-0.5 text-[12px] leading-snug text-ivory/60">dullness · crackles · bronchial breathing</div>
                  </div>
                </div>
              </Html>
            )}
          </group>
        </group>
        {/* Airways */}
        <mesh geometry={tree} material={matTree} />
      </group>
      {!reduced && <Particles bacilli={presentation ? 10 : 18} rbc={presentation ? 3 : 6} spread={[6.5, 3.8, 4]} paused={presentation} />}
    </>
  );
}

/** Hero canvas: lungs + particles. Drag to rotate; `progress` (0–1) drives the scroll zoom. */
export default function HeroScene({ visible = true, showCallout = true, progress }) {
  const { reduced, lowPower } = useApp();
  const drag = useRef({ down: false, x: 0, y: 0, yaw: 0, pitch: 0, vy: 0, vx: 0, t: 0 });

  const onDown = (e) => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    const d = drag.current;
    Object.assign(d, { down: true, x: e.clientX, y: e.clientY, vy: 0, vx: 0, t: performance.now() });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    const dx = (e.clientX - d.x) * 0.006;
    const dy = (e.clientY - d.y) * 0.006;
    d.yaw += dx;
    d.pitch += dy;
    d.vy = dx / dt;
    d.vx = dy / dt;
    Object.assign(d, { x: e.clientX, y: e.clientY, t: now });
  };
  const onUp = () => (drag.current.down = false);

  return (
    <div className="h-full w-full cursor-grab active:cursor-grabbing" style={{ touchAction: 'pan-y' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
      <Canvas
        dpr={lowPower ? [1, 1.25] : [1, 1.5]}
        frameloop={reduced ? 'demand' : visible ? 'always' : 'never'}
        camera={{ position: [0, 0.15, 6.4], fov: 36 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        aria-label="3D model of the lungs with a lesion in the left upper lobe — drag to rotate"
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 4]} intensity={40} color="#F2C27A" />
        <pointLight position={[-3, -2, 3]} intensity={25} color="#E0533F" />
        <Lungs progress={progress} drag={drag} showCallout={showCallout} />
      </Canvas>
    </div>
  );
}
