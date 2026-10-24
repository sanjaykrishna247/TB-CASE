import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { makeRBCGeometry } from './geometry';
import { useApp } from '../AppContext';

const rand = (a, b) => a + Math.random() * (b - a);

function useSeeds(count, spread) {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        p: new THREE.Vector3(rand(-spread[0], spread[0]), rand(-spread[1], spread[1]), rand(-spread[2], 0.8)),
        v: new THREE.Vector3(rand(-0.06, 0.06), rand(0.02, 0.1), rand(-0.02, 0.02)),
        r: new THREE.Euler(rand(0, 6), rand(0, 6), rand(0, 6)),
        w: new THREE.Vector3(rand(-0.5, 0.5), rand(-0.5, 0.5), rand(-0.5, 0.5)),
        s: rand(0.6, 1.25),
      })),
    [count, spread]
  );
}

/** Instanced drifting bacilli (rods) + biconcave RBCs. */
export function Particles({ bacilli = 50, rbc = 14, spread = [6, 3.6, 4], paused = false, rbcOpacity = 0.75 }) {
  const rodRef = useRef();
  const rbcRef = useRef();
  const rodSeeds = useSeeds(bacilli, spread);
  const rbcSeeds = useSeeds(rbc, spread);
  const rodGeo = useMemo(() => new THREE.CapsuleGeometry(0.028, 0.17, 4, 8), []);
  const rbcGeo = useMemo(() => makeRBCGeometry(0.13), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const step = (ref, seeds, dt, t) => {
    if (!ref.current) return;
    seeds.forEach((s, i) => {
      if (!paused) {
        s.p.addScaledVector(s.v, dt);
        s.p.x += Math.sin(t * 0.4 + i) * 0.0015;
        s.r.x += s.w.x * dt;
        s.r.y += s.w.y * dt;
        s.r.z += s.w.z * dt;
        if (s.p.y > spread[1] + 0.5) s.p.y = -spread[1] - 0.5;
        if (s.p.x > spread[0] + 0.5) s.p.x = -spread[0] - 0.5;
        if (s.p.x < -spread[0] - 0.5) s.p.x = spread[0] + 0.5;
      }
      dummy.position.copy(s.p);
      dummy.rotation.copy(s.r);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  };

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    step(rodRef, rodSeeds, d, state.clock.elapsedTime);
    step(rbcRef, rbcSeeds, d * 0.6, state.clock.elapsedTime);
  });

  return (
    <group>
      <instancedMesh ref={rodRef} args={[rodGeo, undefined, bacilli]} frustumCulled={false}>
        <meshStandardMaterial color="#E0533F" emissive="#8A2416" emissiveIntensity={0.7} roughness={0.5} transparent opacity={0.7} />
      </instancedMesh>
      {rbc > 0 && (
        <instancedMesh ref={rbcRef} args={[rbcGeo, undefined, rbc]} frustumCulled={false}>
          <meshStandardMaterial color="#b3122f" emissive="#5a0616" emissiveIntensity={0.6} roughness={0.35} metalness={0.1} transparent opacity={rbcOpacity} />
        </instancedMesh>
      )}
    </group>
  );
}

/** Stand-alone background particle canvas for dark sections (paused when off-screen). */
export default function ParticleField({ visible = true, density = 1 }) {
  const { presentation, lowPower } = useApp();
  const n = lowPower ? 0.45 : 1;
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.5]}
      frameloop={visible ? 'always' : 'never'}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 5]} intensity={40} color="#22D3EE" />
      <pointLight position={[-4, -2, 3]} intensity={25} color="#E11D48" />
      <Particles bacilli={Math.round(36 * n * density)} rbc={Math.round(10 * n * density)} spread={[7, 4.2, 4]} paused={presentation} rbcOpacity={0.55} />
    </Canvas>
  );
}
