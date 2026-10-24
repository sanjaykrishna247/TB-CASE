import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, CheckCircle2, ClipboardList, Dna, Microscope as MicIcon, Orbit, Pill, ScanLine, Stethoscope } from 'lucide-react';
import { banner, history, vitals } from './simData';

const InfectionJourney = lazy(() => import('./InfectionJourney'));
const Monitor = lazy(() => import('./Monitor'));
const Auscultation = lazy(() => import('./Auscultation'));
const XrayViewer = lazy(() => import('./XrayViewer'));
const Microscope = lazy(() => import('./Microscope'));
const GeneXpert = lazy(() => import('./GeneXpert'));
const Treatment = lazy(() => import('./Treatment'));

const MODULES = [
  { id: 'brief', label: 'Case brief', icon: ClipboardList, title: 'Case brief', sub: 'Work up the patient step by step. Each module unlocks a piece of the diagnosis.' },
  { id: 'journey', label: 'How TB infects (3D)', icon: Orbit, title: 'How TB enters and infects the body', sub: 'An 8-stage 3D journey — rotate, zoom and pan at any time, or let the camera guide you.', C: InfectionJourney },
  { id: 'monitor', label: 'Vitals monitor', icon: Activity, title: 'Bedside monitor', sub: 'Live ECG, pulse oximetry and respiration. Note the alarm.', C: Monitor },
  { id: 'exam', label: 'Examination', icon: Stethoscope, title: 'Chest examination', sub: 'Auscultate and percuss both sides; palpate the neck.', C: Auscultation },
  { id: 'xray', label: 'Chest X-ray', icon: ScanLine, title: 'Chest X-ray · PA view', sub: 'Read the film like a radiologist: adjust window, measure, report.', C: XrayViewer },
  { id: 'micro', label: 'Sputum microscopy', icon: MicIcon, title: 'Sputum smear · Ziehl–Neelsen', sub: 'Find, focus and count acid-fast bacilli, then grade the smear.', C: Microscope },
  { id: 'xpert', label: 'GeneXpert', icon: Dna, title: 'CBNAAT · GeneXpert MTB/RIF', sub: 'Run the cartridge and interpret the amplification curves.', C: GeneXpert },
  { id: 'rx', label: 'Treatment', icon: Pill, title: 'Treatment & follow-up', sub: 'Dose by weight band and follow the patient through 6 months.', C: Treatment },
];

const SUMMARY = {
  journey: 'Airborne droplet nuclei → alveolar macrophages → Ghon complex → latency → apical reactivation',
  monitor: 'Febrile (37.8 °C), tachypnoeic (RR 24), HR 98, BP stable',
  exam: 'Left upper zone: dull, bronchial breathing, fine crackles; matted cervical nodes',
  xray: 'Cavitating consolidation, left upper lobe',
  micro: 'Sputum ZN: acid-fast bacilli seen',
  xpert: 'MTB detected (medium), rifampicin-sensitive',
  rx: '2 HRZE + 4 HRE → cured at 6 months',
};

export default function SimulationApp() {
  const [active, setActive] = useState('brief');
  const [done, setDone] = useState({});
  const mod = MODULES.find((m) => m.id === active);
  const mark = (id) => setDone((d) => (d[id] ? d : { ...d, [id]: true }));
  const count = Object.keys(done).length;

  useEffect(() => {
    document.title = 'Clinical Simulation · TB Case';
    document.documentElement.style.background = '#0D0F10';
    document.body.style.background = '#0D0F10';
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-sim-bg font-sans text-sim-text">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-sim-line bg-sim-bg/90 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-2.5 lg:px-6">
          <a href="/" className="flex items-center gap-2 text-[13px] text-sim-dim hover:text-sim-text">
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Presentation</span>
          </a>
          <span className="h-5 w-px bg-sim-line" />
          <span className="font-serif text-[17px]">
            Clinical <em className="text-saffron">Simulation</em>
          </span>
          <div className="ml-auto flex items-center gap-3 text-[12px] text-sim-dim">
            <span className="hidden md:inline">Workup</span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sim-line">
              <div className="h-full rounded-full bg-saffron transition-all" style={{ width: `${(count / (MODULES.length - 1)) * 100}%` }} />
            </div>
            <span className="tabular-nums">
              {count}/{MODULES.length - 1}
            </span>
          </div>
        </div>
        {/* EMR-style patient banner */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-sim-line bg-sim-panel px-4 py-2 text-[12.5px] lg:px-6">
          <span className="font-semibold text-sim-text">{banner.name}</span>
          <span className="text-sim-dim">
            {banner.age} y · {banner.sex === 'M' ? 'Male' : 'Female'}
          </span>
          <span className="text-sim-dim">UHID {banner.uhid}</span>
          <span className="text-sim-dim">{banner.dept}</span>
          <span className="text-sim-dim">Allergies: {banner.allergies}</span>
          <span className="ml-auto rounded bg-mon-bp/15 px-2 py-0.5 font-medium text-mon-bp">Airborne precautions</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* module nav */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-sim-line bg-sim-bg p-2 lg:w-60 lg:flex-col lg:border-b-0 lg:border-r lg:p-3" aria-label="Simulation modules">
          {MODULES.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition ${active === m.id ? 'bg-sim-panel2 text-sim-text' : 'text-sim-dim hover:bg-white/[.03] hover:text-sim-text'}`}
            >
              <m.icon size={17} className={active === m.id ? 'text-saffron' : ''} />
              <span className="whitespace-nowrap">{m.label}</span>
              {i > 0 && done[m.id] && <CheckCircle2 size={15} className="ml-auto hidden text-mon-ecg lg:block" />}
            </button>
          ))}
        </nav>

        {/* module */}
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mb-5">
            <h1 className="font-serif text-[1.9rem] leading-tight">{mod.title}</h1>
            <p className="mt-1 text-[14px] text-sim-dim">{mod.sub}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-sim-panel" />}>
                {mod.C ? <mod.C onDone={() => mark(mod.id)} onSeen={() => mark(mod.id)} /> : <Brief done={done} go={setActive} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Brief({ done, go }) {
  const all = Object.keys(done).length === MODULES.length - 1;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-sim-line bg-sim-panel p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Presenting complaint</p>
        <h2 className="mt-2 font-serif text-[1.7rem] leading-snug">35-year-old man, cough for six weeks.</h2>
        <ul className="mt-4 space-y-2.5">
          {history.map((h) => (
            <li key={h} className="flex gap-3 text-[14.5px] text-sim-text/90">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
              {h}
            </li>
          ))}
        </ul>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            ['Temp', `${vitals.tempF} °F`],
            ['RR', `${vitals.rr}/min`],
            ['Hb · ESR', '10.2 · 50'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-sim-panel2 p-3">
              <p className="text-[11px] text-sim-dim">{k}</p>
              <p className="mt-1 font-mono text-[15px]">{v}</p>
            </div>
          ))}
        </div>
        <button onClick={() => go('journey')} className="mt-6 rounded-lg bg-saffron px-5 py-2.5 text-[14px] font-semibold text-black">
          Begin workup →
        </button>
      </div>

      <div className="rounded-2xl border border-sim-line bg-sim-panel p-6">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Clinical summary (builds as you work)</p>
        <ol className="mt-4 space-y-3">
          {MODULES.slice(1).map((m) => (
            <li key={m.id}>
              <button onClick={() => go(m.id)} className="flex w-full gap-3 text-left">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${done[m.id] ? 'bg-mon-ecg text-black' : 'bg-sim-panel2 text-sim-dim'}`}>
                  {done[m.id] ? <CheckCircle2 size={14} /> : <m.icon size={13} />}
                </span>
                <span>
                  <span className="block text-[14px] text-sim-text">{m.label}</span>
                  <span className={`block text-[13px] ${done[m.id] ? 'text-sim-dim' : 'text-sim-dim/50 italic'}`}>{done[m.id] ? SUMMARY[m.id] : 'Not yet done'}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className={`mt-6 rounded-xl p-4 ${all ? 'bg-saffron/10' : 'bg-sim-panel2'}`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-saffron">Final diagnosis</p>
          <p className={`mt-1 font-serif text-[1.25rem] leading-snug ${all ? 'text-sim-text' : 'text-sim-dim/60 blur-[4px]'}`}>
            Post-primary pulmonary tuberculosis (left upper lobe, cavitary) with tuberculous cervical lymphadenitis — rifampicin-sensitive.
          </p>
          {!all && <p className="mt-2 text-[12px] text-sim-dim">Complete all modules to reveal.</p>}
        </div>
      </div>
    </div>
  );
}
