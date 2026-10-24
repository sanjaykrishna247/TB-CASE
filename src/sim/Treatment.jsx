import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pill } from 'lucide-react';
import { course, weightBands } from './simData';

const DRUG = { H: '#7FA889', R: '#E07A3F', Z: '#A68AC6', E: '#E0B04A' };

/** Simple line chart (SVG) of a value over months 0–6 up to the current month. */
function Spark({ values, month, color, min, max, unit, label }) {
  const W = 300;
  const H = 110;
  const x = (m) => 24 + (m / 6) * (W - 40);
  const y = (v) => H - 22 - ((v - min) / (max - min)) * (H - 40);
  const pts = values.slice(0, month + 1).map((v, m) => `${x(m)},${y(v)}`);
  return (
    <div className="rounded-xl bg-sim-panel2 p-3">
      <div className="flex justify-between text-[12px]">
        <span className="text-sim-dim">{label}</span>
        <span className="font-mono text-sim-text">
          {values[month].toFixed(1)} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full">
        {[0, 1, 2, 3, 4, 5, 6].map((m) => (
          <text key={m} x={x(m)} y={H - 4} fontSize="10" fill="#8B908F" textAnchor="middle" fontFamily="Inter">
            M{m}
          </text>
        ))}
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {pts.length > 0 && <circle cx={x(month)} cy={y(values[month])} r="4.5" fill={color} />}
      </svg>
    </div>
  );
}

export default function Treatment({ onDone }) {
  const [weight, setWeight] = useState(48);
  const [month, setMonth] = useState(0);
  const [started, setStarted] = useState(false);
  const band = weightBands.find((b) => weight >= b.min && weight <= b.max) || weightBands[0];
  const ip = month < 2;
  const st = course[month];

  useEffect(() => {
    if (month === 6) onDone?.();
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.3fr)] [&>*]:min-w-0">
      {/* prescription */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Prescription · new, RIF-sensitive</p>
          <label className="mt-4 block text-[13px] text-sim-dim">
            Body weight
            <div className="mt-1 flex items-center gap-3">
              <input type="range" min="30" max="80" value={weight} onChange={(e) => setWeight(+e.target.value)} className="flex-1 accent-[#E0A33A]" />
              <span className="w-16 text-right font-mono text-lg text-sim-text">{weight} kg</span>
            </div>
          </label>
          <div className="mt-4 rounded-xl bg-sim-panel2 p-4">
            <p className="text-[12px] text-sim-dim">
              Weight band {band.min}–{band.max > 100 ? '+' : band.max} kg
            </p>
            <div className="mt-3 space-y-3">
              <Rx phase="Intensive · 2 months" drugs={['H', 'R', 'Z', 'E']} tabs={band.tabs} dose="HRZE 75/150/400/275 mg" active={started && ip} />
              <Rx phase="Continuation · 4 months" drugs={['H', 'R', 'E']} tabs={band.tabs} dose="HRE 75/150/275 mg" active={started && !ip} />
            </div>
            <p className="mt-3 text-[12px] text-sim-dim">+ Pyridoxine 10 mg daily · once daily, empty stomach</p>
          </div>
          {!started ? (
            <button onClick={() => setStarted(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-saffron py-2.5 text-[14px] font-semibold text-black">
              <Pill size={16} /> Start treatment
            </button>
          ) : (
            <p className="mt-4 text-[12px] text-mon-ecg">Notified on Nikshay · household contacts screened · DOT / 99DOTS adherence</p>
          )}
          <p className="mt-3 text-[11px] text-sim-dim/70">Weight bands per NTEP daily FDC chart — verify against the current guideline.</p>
        </div>
      </div>

      {/* course */}
      <div className={`flex flex-col gap-4 ${started ? '' : 'pointer-events-none opacity-40'}`}>
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Treatment course</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ip ? 'bg-saffron/20 text-saffron' : 'bg-mon-ecg/15 text-mon-ecg'}`}>{ip ? 'Intensive phase' : month === 6 ? 'Completed' : 'Continuation phase'}</span>
          </div>
          <input type="range" min="0" max="6" value={month} onChange={(e) => setMonth(+e.target.value)} className="mt-4 w-full accent-[#E0A33A]" aria-label="Month of treatment" />
          <div className="flex justify-between text-[11px] text-sim-dim">
            {course.map((c) => (
              <button key={c.m} onClick={() => setMonth(c.m)} className={month === c.m ? 'font-semibold text-sim-text' : ''}>
                M{c.m}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Spark label="Weight" unit="kg" color="#4ADE80" values={course.map((c) => weight + c.dWt)} month={month} min={weight - 1} max={weight + 5} />
            <Spark label="Evening temperature" unit="°F" color="#FDBA74" values={course.map((c) => c.temp)} month={month} min={97.5} max={100.5} />
          </div>
        </div>
        <motion.div key={month} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 rounded-2xl border border-sim-line bg-sim-panel p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Month {month} review</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat k="Cough" v={st.cough} />
            <Stat k="Sputum smear" v={st.smear} hl={st.smear === 'Negative'} warn={st.smear.startsWith('AFB')} />
            <Stat k="Weight" v={`${(weight + st.dWt).toFixed(1)} kg`} />
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-sim-text">{st.note}</p>
          {month === 6 && <p className="mt-4 inline-block rounded-lg bg-mon-ecg/15 px-3 py-1.5 font-serif text-xl text-mon-ecg">Outcome: Cured</p>}
          <p className="mt-4 text-[11px] text-sim-dim/70">Simulated course for teaching.</p>
        </motion.div>
      </div>
    </div>
  );
}

function Rx({ phase, drugs, tabs, dose, active }) {
  return (
    <div className={`rounded-lg border p-3 transition ${active ? 'border-saffron/60 bg-saffron/5' : 'border-sim-line'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-sim-text">{phase}</span>
        <span className="font-mono text-[13px] text-saffron">{tabs} tab/day</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {drugs.map((d) => (
          <span key={d} className="flex h-6 w-11 overflow-hidden rounded-full">
            <span className="grid w-1/2 place-items-center text-[11px] font-bold text-black" style={{ background: DRUG[d] }}>
              {d}
            </span>
            <span className="w-1/2 bg-[#e8e3db]" />
          </span>
        ))}
        <span className="ml-1 text-[11.5px] text-sim-dim">{dose}</span>
      </div>
    </div>
  );
}

function Stat({ k, v, hl, warn }) {
  return (
    <div className="rounded-xl bg-sim-panel2 p-3">
      <p className="text-[11px] text-sim-dim">{k}</p>
      <p className={`mt-1 text-[14px] font-medium ${hl ? 'text-mon-ecg' : warn ? 'text-mon-bp' : 'text-sim-text'}`}>{v}</p>
    </div>
  );
}
