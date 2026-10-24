import * as THREE from 'three';

/**
 * Holographic "scan" material: fresnel rim glow, moving scan bands and an
 * optional pulsing crimson lesion glow around a world-space point.
 */
export function createHoloMaterial({ base = '#2a1a14', rim = '#F1E4D3', lesion = '#FF5A3C', opacity = 1, lit = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color(base) },
      uRim: { value: new THREE.Color(rim) },
      uLesion: { value: new THREE.Color(lesion) },
      uLesionPos: { value: new THREE.Vector3(100, 100, 100) },
      uLesionAmt: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uLit: { value: lit },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uRim, uLesion, uLesionPos;
      uniform float uTime, uLesionAmt, uOpacity, uLit;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
        vec3 col = mix(uBase, uRim, f);
        float a = 0.06 + f * 0.7;
        // soft key light from just above the viewer: shows relief (face, muscles)
        vec3 L = normalize(V + vec3(0.35, 0.55, 0.0));
        float dif = pow(max(dot(normalize(vN), L), 0.0), 2.0);
        col += uRim * uLit * dif * 0.38;
        a += uLit * (dif * 0.22 - 0.04);

        // fine horizontal scan lines + one slow sweeping band
        float lines = smoothstep(0.94, 1.0, sin(vW.y * 46.0) * 0.5 + 0.5) * 0.08;
        float band = exp(-pow((vW.y - (mod(uTime * 0.55, 4.6) - 2.3)) * 5.0, 2.0)) * 0.3;
        col += uRim * (lines + band);
        a += lines * 0.4 + band * 0.5;

        // lesion glow
        float d = distance(vW, uLesionPos);
        float pulse = 0.7 + 0.3 * sin(uTime * 3.2);
        float les = smoothstep(0.62, 0.0, d) * uLesionAmt * pulse;
        col = mix(col, uLesion * 1.4, clamp(les * 1.3, 0.0, 1.0));
        a = max(a, les);

        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}
