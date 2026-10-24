import { useEffect, useRef, useState } from 'react';
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
const SILHOUETTE =
  'M128 14 C 128 34 126 46 120 54 C 104 62 84 66 66 74 C 46 82 34 96 30 118 L 22 196 C 20 206 24 210 32 208 L 40 176 C 42 230 46 280 52 316 C 60 352 96 372 150 374 C 204 372 240 352 248 316 C 254 280 258 230 260 176 L 268 208 C 276 210 280 206 278 196 L 270 118 C 266 96 254 82 234 74 C 216 66 196 62 180 54 C 174 46 172 34 172 14 Z';


const HI = 'rgba(255,222,190,.26)';
const SH = 'rgba(25,12,6,.78)';

function FrontRelief() {
  return (
    <g>
      {/* neck: shadow under the jaw, light on the muscles */}
      <rect x="120" y="0" width="60" height="18" fill={SH} />
      <ellipse cx="136" cy="44" rx="7" ry="22" fill={HI} />
      <ellipse cx="164" cy="44" rx="7" ry="22" fill={HI} />
      <ellipse cx="150" cy="70" rx="9" ry="6" fill={SH} />
      {/* clavicles: bright bone, hollow below */}
      <ellipse cx="108" cy="78" rx="38" ry="5" fill={HI} />
      <ellipse cx="192" cy="78" rx="38" ry="5" fill={HI} />
      <ellipse cx="96" cy="90" rx="16" ry="7" fill={SH} opacity=".6" />
      <ellipse cx="204" cy="90" rx="16" ry="7" fill={SH} opacity=".6" />
      {/* deltoids */}
      <ellipse cx="54" cy="104" rx="16" ry="26" fill={HI} />
      <ellipse cx="246" cy="104" rx="16" ry="26" fill={HI} />
      {/* pectorals: lit upper surface, deep shadow along the lower border */}
      <ellipse cx="114" cy="118" rx="34" ry="24" fill={HI} />
      <ellipse cx="186" cy="118" rx="34" ry="24" fill={HI} />
      <path d="M150 156 C 128 174 100 176 76 156 L 80 170 C 104 188 132 184 150 168 Z" fill={SH} />
      <path d="M150 156 C 172 174 200 176 224 156 L 220 170 C 196 188 168 184 150 168 Z" fill={SH} />
      {/* sternal groove */}
      <rect x="146" y="84" width="8" height="140" fill={SH} opacity=".55" />
      {/* serratus / ribs at the sides */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <ellipse cx="72" cy={196 + i * 22} rx="12" ry="6" fill={HI} opacity=".7" />
          <ellipse cx="228" cy={196 + i * 22} rx="12" ry="6" fill={HI} opacity=".7" />
        </g>
      ))}
      {/* rib-cage edge: light above, shadow below */}
      <path d="M150 228 C 126 246 102 266 80 298 L 92 306 C 112 276 134 256 150 244 Z" fill={SH} opacity=".7" />
      <path d="M150 228 C 174 246 198 266 220 298 L 208 306 C 188 276 166 256 150 244 Z" fill={SH} opacity=".7" />
      {/* abdominals */}
      {[262, 300, 338].map((y) => (
        <g key={y}>
          <ellipse cx="134" cy={y} rx="13" ry="14" fill={HI} opacity=".75" />
          <ellipse cx="166" cy={y} rx="13" ry="14" fill={HI} opacity=".75" />
        </g>
      ))}
      <rect x="147" y="240" width="6" height="130" fill={SH} opacity=".5" />
      {/* obliques shadow */}
      <ellipse cx="70" cy="320" rx="16" ry="40" fill={SH} opacity=".6" />
      <ellipse cx="230" cy="320" rx="16" ry="40" fill={SH} opacity=".6" />
    </g>
  );
}

function BackRelief() {
  return (
    <g>
      <rect x="120" y="0" width="60" height="16" fill={SH} />
      {/* trapezius */}
      <path d="M150 30 C 130 50 100 62 70 74 C 100 84 130 90 150 110 C 170 90 200 84 230 74 C 200 62 170 50 150 30 Z" fill={HI} />
      {/* deltoids */}
      <ellipse cx="54" cy="104" rx="16" ry="26" fill={HI} />
      <ellipse cx="246" cy="104" rx="16" ry="26" fill={HI} />
      {/* scapulae: raised blades with shadow at the medial border */}
      <path d="M108 100 L 94 220 L 64 140 C 62 122 70 108 84 102 Z" fill={HI} />
      <path d="M192 100 L 206 220 L 236 140 C 238 122 230 108 216 102 Z" fill={HI} />
      <path d="M110 100 L 114 104 L 100 226 L 94 222 Z" fill={SH} />
      <path d="M190 100 L 186 104 L 200 226 L 206 222 Z" fill={SH} />
      <ellipse cx="86" cy="116" rx="22" ry="5" fill={HI} />
      <ellipse cx="214" cy="116" rx="22" ry="5" fill={HI} />
      {/* spinal groove between the erector spinae */}
      <rect x="145" y="40" width="10" height="330" fill={SH} opacity=".7" />
      <ellipse cx="132" cy="290" rx="12" ry="60" fill={HI} opacity=".8" />
      <ellipse cx="168" cy="290" rx="12" ry="60" fill={HI} opacity=".8" />
      {/* latissimus */}
      <ellipse cx="70" cy="250" rx="18" ry="48" fill={HI} opacity=".6" />
      <ellipse cx="230" cy="250" rx="18" ry="48" fill={HI} opacity=".6" />
      <ellipse cx="96" cy="300" rx="20" ry="22" fill={SH} opacity=".5" />
      <ellipse cx="204" cy="300" rx="20" ry="22" fill={SH} opacity=".5" />
    </g>
  );
}

function Torso({ view, children }) {
  const line = 'rgba(241,228,211,.13)';
  const soft = 'rgba(241,228,211,.06)';
  return (
    <svg viewBox="0 0 300 380" className="h-full w-full" role="img" aria-label={`${view === 'front' ? 'Anterior' : 'Posterior'} chest`}>
      <defs>
        <linearGradient id="skinShade" x1="0" x2="1">
          <stop offset="0" stopColor="#2e211b" />
          <stop offset=".2" stopColor="#5c4538" />
          <stop offset=".5" stopColor="#6e5444" />
          <stop offset=".8" stopColor="#5c4538" />
          <stop offset="1" stopColor="#2e211b" />
        </linearGradient>
        <radialGradient id="skinLight" cx="50%" cy="30%" r="60%">
          <stop offset="0" stopColor="rgba(255,236,214,.07)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <clipPath id="bodyClip">
          <path d={SILHOUETTE} />
        </clipPath>
        <filter id="soft14" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="soft8" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="skinTex">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 .6  0 0 0 0 .5  0 0 0 0 .45  0 0 0 .55 0" />
        </filter>
      </defs>
      <path d={SILHOUETTE} fill="url(#skinShade)" stroke="rgba(0,0,0,.35)" strokeWidth="1.2" />
      {/* sculpted relief: soft highlights and shadows clipped to the body */}
      <g clipPath="url(#bodyClip)">
        <g filter="url(#soft14)">{view === 'front' ? <FrontRelief /> : <BackRelief />}</g>
        <rect width="300" height="380" filter="url(#skinTex)" opacity=".13" style={{ mixBlendMode: 'soft-light' }} />
        <path d={SILHOUETTE} fill="url(#skinLight)" />
        {/* rim darkening at the flanks */}
        <path d={SILHOUETTE} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="26" filter="url(#soft8)" />
      </g>

      {view === 'front' ? (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* sternocleidomastoids + suprasternal notch */}
          <path d="M132 22 C 136 40 140 56 146 70" stroke={soft} strokeWidth="1.4" />
          <path d="M168 22 C 164 40 160 56 154 70" stroke={soft} strokeWidth="1.4" />
          <path d="M143 72 Q 150 78 157 72" stroke={line} strokeWidth="1.6" />
          {/* clavicles (gentle S-curve) */}
          <path d="M146 76 C 128 72 114 80 98 78 C 86 76 76 78 66 84" stroke={line} strokeWidth="2.2" />
          <path d="M154 76 C 172 72 186 80 202 78 C 214 76 224 78 234 84" stroke={line} strokeWidth="2.2" />
          {/* deltopectoral grooves */}
          <path d="M70 90 C 76 104 80 116 80 130" stroke={soft} strokeWidth="1.2" />
          <path d="M230 90 C 224 104 220 116 220 130" stroke={soft} strokeWidth="1.2" />
          {/* sternum: manubrium, body, xiphoid */}
          <path d="M150 80 V 228" stroke={soft} strokeWidth="5" />
          <path d="M144 98 H 156" stroke={soft} strokeWidth="1.2" />
          {/* lower borders of pectoralis major */}
          <path d="M150 150 C 130 168 104 170 80 150" stroke={line} strokeWidth="1.6" />
          <path d="M150 150 C 170 168 196 170 220 150" stroke={line} strokeWidth="1.6" />
          {/* lateral ribs */}
          {[0, 1, 2].map((i) => (
            <g key={i} stroke={soft} strokeWidth="1.1">
              <path d={`M62 ${190 + i * 22} C 74 ${196 + i * 22} 86 ${204 + i * 22} 96 ${214 + i * 22}`} />
              <path d={`M238 ${190 + i * 22} C 226 ${196 + i * 22} 214 ${204 + i * 22} 204 ${214 + i * 22}`} />
            </g>
          ))}
          {/* costal margins from the xiphoid */}
          <path d="M150 232 C 128 248 104 268 82 300" stroke={line} strokeWidth="1.8" />
          <path d="M150 232 C 172 248 196 268 218 300" stroke={line} strokeWidth="1.8" />
          {/* linea alba, tendinous intersections, navel */}
          <path d="M150 236 V 360" stroke={soft} strokeWidth="1.2" />
          <path d="M128 288 Q 150 294 172 288 M130 326 Q 150 332 170 326" stroke={soft} strokeWidth="1" />
          <ellipse cx="150" cy="356" rx="3" ry="4.5" fill="rgba(0,0,0,.35)" stroke="none" />
        </g>
      ) : (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* trapezius outline */}
          <path d="M150 40 L 150 236 M 128 30 C 120 52 96 64 70 74 M172 30 C 180 52 204 64 230 74" stroke={soft} strokeWidth="1.3" />
          <path d="M150 236 C 132 200 118 160 112 120 M150 236 C 168 200 182 160 188 120" stroke={soft} strokeWidth="1.1" />
          {/* spinous processes */}
          {Array.from({ length: 18 }, (_, i) => (
            <path key={i} d={`M150 ${46 + i * 17} v 5`} stroke="rgba(255,226,196,.10)" strokeWidth="4" />
          ))}
          {/* scapulae: medial border, inferior angle, lateral border, spine of scapula */}
          <path d="M108 96 L 92 228 L 60 140 C 58 124 62 110 70 102 Z" stroke={line} strokeWidth="1.6" fill="rgba(0,0,0,.08)" />
          <path d="M192 96 L 208 228 L 240 140 C 242 124 238 110 230 102 Z" stroke={line} strokeWidth="1.6" fill="rgba(0,0,0,.08)" />
          <path d="M106 120 C 92 114 78 108 62 112" stroke={line} strokeWidth="2.2" />
          <path d="M194 120 C 208 114 222 108 238 112" stroke={line} strokeWidth="2.2" />
          {/* latissimus edge + lower ribs */}
          <path d="M52 200 C 70 250 100 290 140 310 M248 200 C 230 250 200 290 160 310" stroke={soft} strokeWidth="1.1" />
          {[0, 1].map((i) => (
            <g key={i} stroke={soft} strokeWidth="1">
              <path d={`M144 ${296 + i * 20} C 120 ${290 + i * 20} 92 ${296 + i * 20} 66 ${310 + i * 22}`} />
              <path d={`M156 ${296 + i * 20} C 180 ${290 + i * 20} 208 ${296 + i * 20} 234 ${310 + i * 22}`} />
            </g>
          ))}
        </g>
      )}
      <text x="14" y="24" fill="rgba(241,228,211,.5)" fontSize="12" fontFamily="Inter" fontWeight="600">
        {view === 'front' ? 'R' : 'L'}
      </text>
      <text x="278" y="24" fill="rgba(241,228,211,.5)" fontSize="12" fontFamily="Inter" fontWeight="600">
        {view === 'front' ? 'L' : 'R'}
      </text>
      {children}
    </svg>
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
                <circle cx="164" cy="44" r="12" fill="rgba(224,163,58,.15)" stroke="#E0A33A" strokeDasharray="3 3" />
                <text x="182" y="40" fill="#E0A33A" fontSize="11" fontFamily="Inter">left cervical chain</text>
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
