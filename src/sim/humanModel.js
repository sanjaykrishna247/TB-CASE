import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * Realistic adult male body (MakeHuman CC0 base mesh + young-male targets,
 * arms relaxed). Built by scripts/build-human.py into /models/human-male.bin.
 * World units match the rest of the scene (shoulder joints at y 1.96, x ±0.74).
 */
let promise = null;
let cached = null;

export function loadHumanGeometry() {
  if (cached) return Promise.resolve(cached);
  if (!promise) {
    promise = fetch('/models/human-male.bin')
      .then((r) => {
        if (!r.ok) throw new Error(`human model ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const dv = new DataView(buf);
        const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
        if (magic !== 'HUM1') throw new Error('bad human model');
        const nV = dv.getUint32(4, true);
        const nI = dv.getUint32(8, true);
        const pos = new Float32Array(buf, 12, nV * 3);
        const idx = new Uint16Array(buf, 12 + nV * 12, nI);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setIndex(new THREE.BufferAttribute(idx, 1));
        g.computeVertexNormals();
        g.computeBoundingSphere();
        cached = g;
        return g;
      });
  }
  return promise;
}

/** React hook: the geometry once loaded, null until then (or if loading fails). */
export function useHumanGeometry() {
  const [g, setG] = useState(cached);
  useEffect(() => {
    let alive = true;
    loadHumanGeometry()
      .then((geo) => alive && setG(geo))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return g;
}
