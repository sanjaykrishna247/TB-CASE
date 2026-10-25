import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { makeHuman } from './humanGeo';
import { useHumanGeometry } from './humanModel';
import { Hand, Headphones, Stethoscope, Volume2 } from 'lucide-react';
import { chestPoints, findingsAt, vitals } from './simData';
import { getAnalyser, getCtx, percuss, setVolume, startBreathing } from './audio';
import useCanvas from './useCanvas';

const TOOLS = [
  { id: 'steth', label: 'Auscultate', icon: Stethoscope },
  { id: 'percuss', label: 'Percuss', icon: Hand },
  { id: 'palpate', label: 'Palpate neck', icon: Hand },
];

/** Front / back torso drawn with real surface anatomy (no marks that look like exam points). */
/* ─────────────────────────────────────────────────────────────
   Lit 3D torso (same body model as the infection journey), shown
   straight-on with an orthographic camera. The SVG overlay uses the
   same 300×380 coordinate space as the exam points in simData.
   SVG (x, y) ↔ world: X = (x − 150) / K,  Y = TOP − y / K
   ───────────────────────────────────────────────────────────── */
const K = 118;
const TOP = 3.5;

function BodyModel({ view }) {
  const real = useHumanGeometry();
  const fallback = useMemo(() => makeHuman({ withHead: false, surfaceDetail: false }), []);
  const parts = real ? [real] : fallback;
  const skin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#9c6a52',
        roughness: 0.78,
        sheen: 0.35,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color('#ffc9ad'),
      }),
    []
  );
  return (
    <group rotation={[0, view === 'front' ? 0 : Math.PI, 0]}>
      {parts.map((g, i) => (
        <mesh key={i} geometry={g} material={skin} />
      ))}
    </group>
  );
}

function OrthoRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.left = -150 / K;
    camera.right = 150 / K;
    camera.top = TOP;
    camera.bottom = TOP - 380 / K;
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Torso({ view, children }) {
  const label = 'rgba(241,228,211,.5)';
  return (
    <div className="relative h-full w-full">
      <Canvas orthographic dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ near: 0.1, far: 20 }} className="!absolute inset-0">
        <OrthoRig />
        <hemisphereLight args={['#fff4ea', '#1a0f0a', 0.35]} />
        {/* key: high and to the side so muscles cast soft relief */}
        <directionalLight position={[-4, 6, 2.6]} intensity={3.1} color="#fff0e2" />
        <directionalLight position={[4, 0.5, 2.5]} intensity={0.45} color="#ffd2b8" />
        {/* rim lights separate the body from the dark background */}
        <directionalLight position={[-5, 2, -4]} intensity={1.4} color="#ffd8bd" />
        <directionalLight position={[5, 2, -4]} intensity={1.1} color="#ffd8bd" />
        <BodyModel view={view} />
      </Canvas>
      <svg viewBox="0 0 300 380" className="absolute inset-0 h-full w-full" role="img" aria-label={`${view === 'front' ? 'Anterior' : 'Posterior'} chest`}>
        <text x="14" y="24" fill={label} fontSize="12" fontFamily="Inter" fontWeight="600">
          {view === 'front' ? 'R' : 'L'}
        </text>
        <text x="278" y="24" fill={label} fontSize="12" fontFamily="Inter" fontWeight="600">
          {view === 'front' ? 'L' : 'R'}
        </text>
        {children}
      </svg>
    </div>
  );
}

/** Live waveform of what the stethoscope "hears". */
function Scope({ active }) {
  const data = useRef(null);
  const ref = useCanvas((ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    if (!active) return;
    const an = getAnalyser();
    if (!data.current) data.current = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(data.current);
    ctx.strokeStyle = '#4ADE80';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const d = data.current;
    for (let i = 0; i < d.length; i++) {
      const x = (i / d.length) * w;
      const y = h / 2 - d[i] * h * 0.9;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  });
  return <canvas ref={ref} className="h-20 w-full rounded-lg" aria-hidden />;
}

export default function Auscultation({ onDone }) {
  const [view, setView] = useState('front');
  const [tool, setTool] = useState('steth');
  const [sel, setSel] = useState(null); // selected point
  const [neck, setNeck] = useState(false);
  const [vol, setVol] = useState(0.8);
  const [examined, setExamined] = useState({});
  const stopRef = useRef(null);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    setVolume(vol);
  }, [vol]);

  const choose = (p) => {
    getCtx();
    setNeck(false);
    setSel(p);
    setExamined((e) => ({ ...e, [`${p.id}-${tool}`]: true }));
    if (p.abnormal) onDone?.();
    if (tool === 'steth') {
      stop();
      stopRef.current = p.abnormal ? startBreathing('bronchial', { rr: vitals.rr, withCrackles: true }) : startBreathing('vesicular', { rr: vitals.rr });
    } else if (tool === 'percuss') {
      stop();
      percuss(p.abnormal ? 'dull' : 'resonant');
      setTimeout(() => percuss(p.abnormal ? 'dull' : 'resonant'), 260);
    }
  };

  const f = sel ? findingsAt(sel.abnormal) : null;
  const points = chestPoints[view];

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col rounded-2xl border border-sim-line bg-sim-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-black/40 p-1">
            {['front', 'back'].map((v) => (
              <button
                key={v}
                onClick={() => (setView(v), setSel(null), stop())}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${view === v ? 'bg-sim-panel2 text-sim-text' : 'text-sim-dim hover:text-sim-text'}`}
              >
                {v === 'front' ? 'Anterior' : 'Posterior'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id);
                  if (t.id === 'palpate') {
                    stop();
                    setSel(null);
                    setView('front');
                  } else if (t.id !== 'steth') stop();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium ${tool === t.id ? 'bg-saffron text-black' : 'text-sim-dim hover:bg-white/5 hover:text-sim-text'}`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-3 aspect-[300/380] w-full max-w-[420px] flex-1">
          <Torso view={view}>
            {tool === 'palpate' && view === 'front' && (
              <g onClick={() => (setNeck(true), onDone?.())} className="cursor-pointer">
                <circle cx="168" cy="146" r="10" fill="rgba(224,163,58,.15)" stroke="#E0A33A" strokeDasharray="3 3" />
                <text x="182" y="142" fill="#E0A33A" fontSize="11" fontFamily="Inter">left cervical chain</text>
              </g>
            )}
            {tool !== 'palpate' &&
              points.map((p) => {
                const on = sel?.id === p.id;
                const done = examined[`${p.id}-${tool}`];
                return (
                  <g key={p.id} onClick={() => choose(p)} className="cursor-pointer" role="button" aria-label={p.label}>
                    <circle cx={p.x} cy={p.y} r="17" fill="transparent" />
                    {on ? (
                      <g>
                        <circle cx={p.x} cy={p.y} r="15" fill="#c9ccce" stroke="#6b7074" strokeWidth="3" />
                        <circle cx={p.x} cy={p.y} r="9" fill="#9ea3a6" />
                        <circle cx={p.x} cy={p.y} r="22" fill="none" stroke="#E0A33A" strokeWidth="1.5">
                          <animate attributeName="r" values="16;26;16" dur={`${60 / vitals.rr}s`} repeatCount="indefinite" />
                          <animate attributeName="opacity" values="1;.2;1" dur={`${60 / vitals.rr}s`} repeatCount="indefinite" />
                        </circle>
                      </g>
                    ) : (
                      <g>
                        <circle cx={p.x} cy={p.y} r="8" fill={done ? 'rgba(224,163,58,.75)' : 'rgba(241,228,211,.12)'} stroke={done ? '#E0A33A' : 'rgba(241,228,211,.75)'} strokeWidth="1.4" strokeDasharray={done ? 'none' : '3 2'} />
                        <circle cx={p.x} cy={p.y} r="1.8" fill="rgba(241,228,211,.85)" />
                      </g>
                    )}
                  </g>
                );
              })}
          </Torso>
        </div>
        <p className="mt-2 text-center text-[12px] text-sim-dim">
          <Headphones size={12} className="mr-1 inline" />
          Use headphones. Click a point on the chest to {tool === 'steth' ? 'listen' : tool === 'percuss' ? 'percuss' : 'feel the neck'}.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Stethoscope signal</p>
            <label className="flex items-center gap-2 text-[12px] text-sim-dim">
              <Volume2 size={14} />
              <input type="range" min="0" max="1.5" step="0.05" value={vol} onChange={(e) => setVol(+e.target.value)} className="w-24 accent-[#E0A33A]" />
            </label>
          </div>
          <div className="mt-3">
            <Scope active={!!stopRef.current || tool === 'percuss'} />
          </div>
          {sel && tool === 'steth' && (
            <button onClick={() => (stop(), setSel(null))} className="mt-3 text-[12px] text-sim-dim underline hover:text-sim-text">
              Remove stethoscope
            </button>
          )}
        </div>

        <div className="flex-1 rounded-2xl border border-sim-line bg-sim-panel p-5">
          {neck ? (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-saffron">Palpation · neck</p>
              <h3 className="mt-2 font-serif text-2xl text-sim-text">Cervical lymphadenopathy</h3>
              <Row k="Size" v="3 × 2 cm" />
              <Row k="Consistency" v="Firm, matted together" />
              <Row k="Tenderness" v="Non-tender" />
              <Row k="Overlying skin" v="Normal, no sinus" />
              <p className="mt-4 text-[13.5px] leading-relaxed text-sim-dim">Matted, painless nodes suggest tuberculous lymphadenitis — confirmed later by FNAC / biopsy showing caseating granulomas.</p>
            </>
          ) : f ? (
            <>
              <p className={`text-[12px] font-semibold uppercase tracking-[0.14em] ${sel.abnormal ? 'text-mon-bp' : 'text-mon-ecg'}`}>{sel.label}</p>
              <h3 className="mt-2 font-serif text-2xl text-sim-text">{tool === 'percuss' ? `${f.percussion} note` : f.breath}</h3>
              <Row k="Breath sounds" v={f.breath} hl={sel.abnormal} />
              <Row k="Added sounds" v={f.added} hl={sel.abnormal} />
              <Row k="Percussion" v={f.percussion} hl={sel.abnormal} />
              <Row k="Vocal resonance" v={f.resonance} hl={sel.abnormal} />
              <p className="mt-4 text-[13.5px] leading-relaxed text-sim-dim">{f.note}</p>
            </>
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Stethoscope className="mx-auto text-sim-dim" />
                <p className="mt-3 max-w-xs text-[14px] text-sim-dim">Examine both sides and compare. One zone sounds very different — find it.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, hl }) {
  return (
    <div className="mt-3 flex justify-between gap-4 border-b border-sim-line pb-2 text-[14px]">
      <span className="text-sim-dim">{k}</span>
      <span className={`text-right font-medium ${hl ? 'text-mon-bp' : 'text-sim-text'}`}>{v}</span>
    </div>
  );
}
