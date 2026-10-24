import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FlaskConical, Play, RotateCcw } from 'lucide-react';
import { xpertProbes } from './simData';

/**
 * CBNAAT (GeneXpert MTB/RIF) run, compressed from ~2 h to ~25 s.
 * Five molecular-beacon probes cover the rpoB hotspot; all rising within
 * ΔCt ≤ 4 means rifampicin resistance is NOT detected. SPC = internal control.
 */
const CYCLES = 40;
const RUN_MS = 24000;
const THRESH = 0.18;
const PHASES = [
  { at: 0, label: 'Sample processing · filtration' },
  { at: 0.18, label: 'Lysis · DNA release (sonication)' },
  { at: 0.3, label: 'Real-time PCR · rpoB hotspot' },
  { at: 1, label: 'Analysis complete' },
];

const sig = (c, ct) => 0.02 + 1 / (1 + Math.exp(-(c - ct - 2.2) / 1.25));

export default function GeneXpert({ onDone }) {
  const [step, setStep] = useState(0); // 0 add reagent, 1 load, 2 running, 3 done
  const [p, setP] = useState(0);
  const raf = useRef();

  useEffect(() => {
    if (step !== 2) return;
    const t0 = performance.now();
    const tick = (now) => {
      const v = Math.min(1, (now - t0) / RUN_MS);
      setP(v);
      if (v < 1) raf.current = requestAnimationFrame(tick);
      else {
        setStep(3);
        onDone?.();
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const pcr = Math.max(0, (p - 0.3) / 0.7);
  const cycle = pcr * CYCLES;
  const phase = [...PHASES].reverse().find((ph) => p >= ph.at)?.label;
  const simMin = Math.round(p * 112);
  const dCt = Math.max(...xpertProbes.filter((x) => !x.control).map((x) => x.ct)) - Math.min(...xpertProbes.filter((x) => !x.control).map((x) => x.ct));

  // chart geometry
  const W = 640;
  const H = 300;
  const px = (c) => 50 + (c / CYCLES) * (W - 70);
  const py = (f) => H - 36 - f * (H - 70);

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
      {/* instrument */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-gradient-to-b from-[#e9e7e2] to-[#cfccc6] p-5 text-[#222]">
          <div className="flex items-center justify-between text-[12px] font-semibold tracking-wide text-[#555]">
            <span>CBNAAT ANALYSER · MODULE A1</span>
            <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-green-700' : step === 3 ? 'text-blue-800' : 'text-[#777]'}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${step === 2 ? 'animate-pulse bg-green-500' : step === 3 ? 'bg-blue-600' : 'bg-[#999]'}`} />
              {step === 2 ? 'RUNNING' : step === 3 ? 'COMPLETE' : 'READY'}
            </span>
          </div>
          {/* bay + cartridge */}
          <div className="relative mt-4 h-52 overflow-hidden rounded-xl bg-[#1b1c1d] shadow-[inset_0_6px_20px_rgba(0,0,0,.7)]">
            <motion.div
              className="absolute left-1/2 w-24 -translate-x-1/2"
              initial={false}
              animate={{ top: step >= 1 ? 26 : -170 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            >
              {/* cartridge */}
              <div className="rounded-t-lg bg-[#f2f2f0] p-2 shadow-lg">
                <div className="mx-auto h-6 w-14 rounded bg-[#3d7a54]" />
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="h-5 rounded-sm bg-[#d7d7d3]" />
                  ))}
                </div>
                <div className="mt-2 h-14 rounded bg-[#e1e1dc]">
                  <motion.div className="h-full origin-bottom rounded bg-amber-200/80" animate={{ scaleY: step >= 2 ? 1 - p * 0.85 : 1 }} />
                </div>
              </div>
            </motion.div>
            {step === 2 && <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-green-500/70" />}
          </div>
          {/* lcd */}
          <div className="mt-4 rounded-md bg-[#1d2a20] px-3 py-2 font-mono text-[12px] text-[#9be7a8]">
            <div>{step < 2 ? 'Insert cartridge and start test' : phase}</div>
            <div className="mt-1 flex justify-between">
              <span>{step >= 2 ? `Cycle ${Math.min(CYCLES, Math.floor(cycle))}/${CYCLES}` : '—'}</span>
              <span>{step >= 2 ? `${simMin} / 112 min` : ''}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded bg-black/40">
              <div className="h-full bg-[#9be7a8]" style={{ width: `${p * 100}%` }} />
            </div>
          </div>
        </div>

        {/* procedure */}
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Procedure</p>
          <Step n={1} done={step > 0} active={step === 0} title="Add sample reagent 2 : 1 to sputum, shake, stand 15 min">
            <button onClick={() => setStep(1)} className="mt-2 flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-[13px] font-semibold text-black">
              <FlaskConical size={15} /> Prepare sample
            </button>
          </Step>
          <Step n={2} done={step > 1} active={step === 1} title="Transfer 2 ml to cartridge, load into module">
            <button onClick={() => setStep(2)} className="mt-2 flex items-center gap-2 rounded-lg bg-saffron px-4 py-2 text-[13px] font-semibold text-black">
              <Play size={15} /> Start test
            </button>
          </Step>
          <Step n={3} done={step > 2} active={step === 2} title="Automated extraction + real-time PCR (~2 h)" />
          {step === 3 && (
            <button onClick={() => (setStep(0), setP(0))} className="mt-3 flex items-center gap-2 text-[12px] text-sim-dim hover:text-sim-text">
              <RotateCcw size={13} /> Run again
            </button>
          )}
        </div>
      </div>

      {/* results */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Amplification curves</p>
            <div className="flex flex-wrap gap-3 text-[11px]">
              {xpertProbes.map((x) => (
                <span key={x.name} className="flex items-center gap-1.5 text-sim-dim">
                  <span className="h-2 w-2 rounded-full" style={{ background: x.color }} />
                  {x.name}
                </span>
              ))}
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
            {[0, 10, 20, 30, 40].map((c) => (
              <g key={c}>
                <line x1={px(c)} x2={px(c)} y1={20} y2={H - 36} stroke="#272C30" />
                <text x={px(c)} y={H - 16} fill="#8B908F" fontSize="11" textAnchor="middle" fontFamily="Inter">
                  {c}
                </text>
              </g>
            ))}
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={50} x2={W - 20} y1={py(f)} y2={py(f)} stroke="#272C30" />
            ))}
            <line x1={50} x2={W - 20} y1={py(THRESH)} y2={py(THRESH)} stroke="#F87171" strokeDasharray="5 4" opacity=".7" />
            <text x={W - 22} y={py(THRESH) - 6} fill="#F87171" fontSize="10" textAnchor="end" fontFamily="Inter">
              threshold
            </text>
            <text x={W / 2} y={H - 1} fill="#8B908F" fontSize="11" textAnchor="middle" fontFamily="Inter">
              PCR cycle
            </text>
            <text x={14} y={H / 2} fill="#8B908F" fontSize="11" textAnchor="middle" fontFamily="Inter" transform={`rotate(-90 14 ${H / 2})`}>
              Fluorescence
            </text>
            {step >= 2 &&
              xpertProbes.map((x) => {
                const pts = [];
                for (let c = 0; c <= Math.min(CYCLES, cycle); c += 0.25) pts.push(`${px(c).toFixed(1)},${py(sig(c, x.ct) * (x.control ? 0.55 : 0.9 + (x.ct % 1) * 0.1)).toFixed(1)}`);
                return pts.length > 1 ? <polyline key={x.name} points={pts.join(' ')} fill="none" stroke={x.color} strokeWidth="2" /> : null;
              })}
          </svg>
        </div>

        <div className="flex-1 rounded-2xl border border-sim-line bg-sim-panel p-5">
          {step === 3 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Test result</p>
              <p className="mt-2 font-serif text-[1.7rem] leading-tight text-sim-text">
                <span className="text-mon-bp">MTB DETECTED MEDIUM</span>; Rif Resistance <span className="text-mon-ecg">NOT DETECTED</span>
              </p>
              <table className="mt-4 w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-sim-dim">
                    <th className="py-1.5">Analyte</th>
                    <th>Ct</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {xpertProbes.map((x) => (
                    <tr key={x.name} className="border-t border-sim-line text-sim-text">
                      <td className="py-1.5">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: x.color }} />
                        {x.name}
                      </td>
                      <td className="font-mono">{x.ct.toFixed(1)}</td>
                      <td className={x.control ? 'text-sim-dim' : 'text-mon-ecg'}>{x.control ? 'PASS' : 'POS'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-[13px] leading-relaxed text-sim-dim">
                Ct 16–22 → <b className="text-sim-text">medium</b> bacillary load. Probe ΔCt = {dCt.toFixed(1)} (≤ 4.0) → no rpoB mutation → <b className="text-sim-text">rifampicin-sensitive</b>. Start first-line therapy.
              </p>
            </motion.div>
          ) : (
            <div className="grid h-full min-h-[160px] place-items-center text-center text-[14px] text-sim-dim">
              {step === 2 ? 'Run in progress — curves cross the threshold when MTB DNA amplifies…' : 'Prepare the sample and start the test to see results.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, done, active, children }) {
  return (
    <div className={`mt-3 flex gap-3 ${!done && !active ? 'opacity-40' : ''}`}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${done ? 'bg-mon-ecg text-black' : 'bg-sim-panel2 text-sim-text'}`}>
        {done ? <CheckCircle2 size={14} /> : n}
      </span>
      <div>
        <p className="text-[13.5px] text-sim-text">{title}</p>
        {active && children}
      </div>
    </div>
  );
}
