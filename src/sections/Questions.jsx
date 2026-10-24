import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { questionById } from '../data/answers';
import QuestionShell from '../components/QuestionShell';
import LazyClip from '../components/LazyClip';
import { item, stagger } from '../components/Reveal';

/* ───────────── Q1 · chest X-ray (realistic, generated in the browser) ───────────── */
// crop of the generated film shown in the card (source is 1000 × 1150)
const CROP = { y: 70, h: 940 };

function ChestXray() {
  const [film, setFilm] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { generateXray, XR_W } = await import('../sim/xrayGen');
      const xr = generateXray();
      if (cancelled) return;
      setFilm({ src: xr.canvas.toDataURL('image/jpeg', 0.9), lesion: xr.lesion, cavity: xr.cavity, w: XR_W });
    };
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const id = idle(run);
    return () => {
      cancelled = true;
      window.cancelIdleCallback?.(id);
    };
  }, []);

  return (
    <figure className="overflow-hidden rounded-2xl bg-black shadow-lift">
      <div className="relative w-full" style={{ aspectRatio: `1000 / ${CROP.h}` }}>
        {film ? (
          <>
            <img src={film.src} alt="Chest X-ray, PA view: cavitating lesion in the left upper zone" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `0 ${(CROP.y / (1150 - CROP.h)) * 100}%`, filter: 'contrast(1.08)' }} />
            <svg viewBox={`0 ${CROP.y} 1000 ${CROP.h}`} className="absolute inset-0 h-full w-full" aria-hidden>
              <motion.ellipse
                cx={film.lesion.x}
                cy={film.lesion.y}
                rx={film.lesion.r}
                ry={film.lesion.r * 0.8}
                fill="none"
                stroke="#E0A33A"
                strokeWidth="4"
                strokeDasharray="14 10"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3 }}
              />
              <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.3 }}>
                <path d={`M${film.cavity.x + 30} ${film.cavity.y - 30} L ${film.cavity.x + 120} ${film.cavity.y - 150} H ${film.cavity.x + 230}`} fill="none" stroke="#E0533F" strokeWidth="3" />
                <text x={film.cavity.x + 126} y={film.cavity.y - 162} fill="#ff8a6e" fontFamily="Inter" fontWeight="600" fontSize="28">
                  Cavity
                </text>
              </motion.g>
            </svg>
            <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[11px] leading-tight text-white/60">
              CHEST PA · ERECT
            </div>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[13px] text-white/40">Developing film…</div>
        )}
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 bg-[#100c0b] px-5 py-4">
        <span className="font-serif text-[1.05rem] italic text-ivory">Left upper zone — patchy consolidation with a thick-walled cavity</span>
        <span className="text-[12px] text-ivory/45">Simulated radiograph</span>
      </figcaption>
    </figure>
  );
}

/* ───────────── Q5 · diagnostic pathway ───────────── */
const PATH = [
  { t: 'Presumptive TB', s: 'cough > 2 weeks, fever, weight loss' },
  { t: 'Sputum × 2', s: 'smear microscopy · node FNAC / biopsy' },
  { t: 'GeneXpert (CBNAAT)', s: 'MTB? rifampicin resistance?', branches: ['RIF resistant → DR-TB regimen', 'Not detected → culture, X-ray'] },
  { t: 'MTB detected · RIF sensitive', s: 'this patient', you: true },
  { t: 'Start 2 HRZE + 4 HRE', s: 'notify · screen contacts', you: true },
];
function Pathway() {
  return (
    <motion.ol variants={stagger(0.25)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="relative space-y-3">
      <span className="absolute bottom-6 left-[19px] top-6 w-[2px] bg-line" />
      {PATH.map((p, i) => (
        <motion.li key={p.t} variants={item} className="relative flex gap-5">
          <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full font-serif text-[15px] ${p.you ? 'bg-brick text-white' : 'border border-line bg-white text-ink'}`}>
            {i + 1}
          </span>
          <div className={`flex-1 rounded-2xl px-5 py-4 ${p.you ? 'bg-ink text-ivory shadow-lift' : 'border border-line bg-white/80'}`}>
            <p className={`font-serif text-[1.15rem] ${p.you ? 'text-ivory' : 'text-ink'}`}>{p.t}</p>
            <p className={`text-[13.5px] ${p.you ? 'text-saffron' : 'text-muted'}`}>{p.s}</p>
            {p.branches && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.branches.map((b) => (
                  <span key={b} className="rounded-full bg-paper2 px-3 py-1 text-[12.5px] text-muted">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}

/* ───────────── Q6 · drug list ───────────── */
const DRUG_COLORS = { H: '#5E8466', R: '#D9692F', Z: '#8E6BB0', E: '#C99A2E', S: '#7A6A60' };
function Drugs({ q }) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white/80 shadow-soft">
        <div className="hidden grid-cols-[1.2fr_1.3fr_1.2fr] gap-4 border-b border-line bg-paper2/60 sm:grid px-5 py-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span>First-line</span>
          <span>Action</span>
          <span>Key side effect</span>
        </div>
        <motion.ul variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          {q.firstLine.map((d) => (
            <motion.li key={d.code} variants={item} className="grid grid-cols-1 items-center gap-1 border-b border-line px-5 py-3.5 last:border-0 sm:grid-cols-[1.2fr_1.3fr_1.2fr] sm:gap-4">
              <span className="flex items-center gap-3">
                {/* capsule */}
                <span className="flex h-7 w-12 shrink-0 overflow-hidden rounded-full shadow-sm">
                  <span className="grid w-1/2 place-items-center text-[12px] font-semibold text-white" style={{ background: DRUG_COLORS[d.code] }}>
                    {d.code}
                  </span>
                  <span className="w-1/2 bg-paper2" />
                </span>
                <span className="font-serif text-[1.05rem] text-ink">{d.name}</span>
              </span>
              <span className="pl-[60px] text-[14px] text-muted sm:pl-0">{d.mech}</span>
              <span className="pl-[60px] text-[14px] font-medium text-brick sm:pl-0">{d.ae}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
      <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">Second-line · WHO groups</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {q.whoGroups.map((g) => (
          <div key={g.group} className="rounded-2xl border border-line bg-white/70 p-4">
            <span className="font-serif text-2xl italic text-brick">{g.group}</span>
            <p className="mt-1 text-[13.5px] leading-snug text-muted">{g.drugs}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Q8 · four pillars ───────────── */
function Pillars({ q }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3 text-[13px] text-muted">
        {['1962 · NTP', '1993 · RNTCP', '2020 · NTEP'].map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            <span className={i === 2 ? 'font-semibold text-ink' : ''}>{t}</span>
            {i < 2 && <span className="h-px w-8 bg-line" />}
          </span>
        ))}
      </div>
      <motion.svg viewBox="0 0 600 70" className="w-full" initial={{ opacity: 0, y: -16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 }} aria-hidden>
        <path d="M8 64 L300 6 L592 64 Z" fill="#1E1917" />
        <text x="300" y="52" textAnchor="middle" fill="#F1E4D3" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="20">
          TB-free India
        </text>
      </motion.svg>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        {q.pillars.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ scaleY: 0, opacity: 0 }}
            whileInView={{ scaleY: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'bottom' }}
            className="rounded-xl border border-line bg-white/80 p-4"
          >
            <p className="font-serif text-[1.35rem] text-brick">{p.name}</p>
            <ul className="mt-2 space-y-1.5">
              {p.items.map((t) => (
                <li key={t} className="text-[13px] leading-snug text-muted">
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-ink py-2.5 text-center text-[12.5px] font-medium tracking-wide text-ivory">Foundation — nutrition · social support · community</div>
    </div>
  );
}

export function Q1() {
  return <QuestionShell q={questionById.q1} alt visual={<ChestXray />} />;
}
export function Q2() {
  return <QuestionShell q={questionById.q2} wideVisual visual={<LazyClip name="pathogenesis" />} />;
}
export function Q3() {
  return <QuestionShell q={questionById.q3} alt wideVisual visual={<LazyClip name="granuloma" />} />;
}
export function Q4() {
  return <QuestionShell q={questionById.q4} wideVisual visual={<LazyClip name="zn" />} />;
}
export function Q5() {
  return <QuestionShell q={questionById.q5} alt visual={<Pathway />} />;
}
export function Q6() {
  return <QuestionShell q={questionById.q6} wideVisual visual={<Drugs q={questionById.q6} />} />;
}
export function Q7() {
  return <QuestionShell q={questionById.q7} alt wideVisual visual={<LazyClip name="regimen" />} />;
}
export function Q8() {
  return <QuestionShell q={questionById.q8} wideVisual visual={<Pillars q={questionById.q8} />} />;
}
