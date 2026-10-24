import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { findings, patient, publicHealth, timeline, vitals } from '../data/caseData';
import Reveal, { item, stagger } from '../components/Reveal';
import Counter from '../components/Counter';

/** Six-week symptom line that fills as you scroll. */
function Timeline() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 90%', 'end 55%'] });
  const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  return (
    <div ref={ref} className="relative">
      <div className="absolute left-0 right-0 top-[7px] hidden h-[2px] bg-line md:block" />
      <motion.div className="absolute left-0 right-0 top-[7px] hidden h-[2px] origin-left bg-brick md:block" style={{ scaleX: fill }} />
      <motion.ol variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} className="relative grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-6">
        {timeline.map((t) => (
          <motion.li key={t.label} variants={item}>
            <span className={`block h-4 w-4 rounded-full border-[3px] border-paper ${t.alert ? 'bg-brick ring-4 ring-brick/20' : 'bg-ink'}`} />
            <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{t.week}</p>
            <p className={`mt-1 font-serif text-[1.15rem] leading-snug ${t.alert ? 'italic text-brick' : 'text-ink'}`}>{t.label}</p>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}

export default function CaseHistory() {
  return (
    <section id="case" aria-labelledby="case-title" className="relative bg-paper py-24 lg:min-h-screen lg:py-28">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Reveal>
              <p className="eyebrow !text-brick">The case</p>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 id="case-title" className="mt-4 font-serif text-[2.4rem] font-medium leading-[1.08] tracking-[-0.02em] sm:text-[3.4rem]">
                A 35-year-old man with a cough for <em className="text-brick">six weeks</em>.
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-4">
            <dl className="divide-y divide-line border-y border-line">
              {patient.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-[15px]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal className="mt-16">
          <Timeline />
        </Reveal>

        {/* Vitals strip */}
        <Reveal className="mt-16">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-white/70 sm:grid-cols-3 lg:grid-cols-6">
            {vitals.map((v) => (
              <div key={v.label} className="border-b border-r border-line p-5 lg:border-b-0 lg:last:border-r-0">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{v.label}</p>
                <p className={`mt-2 font-serif text-[2rem] leading-none ${v.flag ? 'text-brick' : 'text-ink'}`}>
                  <Counter value={v.value} decimals={v.decimals || 0} />
                  {v.second && (
                    <>
                      /<Counter value={v.second} />
                    </>
                  )}
                  <span className="ml-1 font-sans text-[13px] text-muted">{v.unit}</span>
                </p>
                <p className="mt-2 h-4 text-[12px] font-medium text-brick">{v.flag === 'high' ? '↑ raised' : v.flag === 'low' ? '↓ low' : ''}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Key findings */}
        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-6 grid gap-4 md:grid-cols-3">
          {findings.map((f) => (
            <motion.div key={f.title} variants={item} className={`rounded-2xl p-6 ${f.highlight ? 'bg-ink text-ivory shadow-lift' : 'border border-line bg-white/70'}`}>
              <p className={`text-[12px] font-medium uppercase tracking-[0.12em] ${f.highlight ? 'text-saffron' : 'text-muted'}`}>{f.title}</p>
              {f.lines.map((l, i) => (
                <p key={l} className={`mt-2 ${i === 0 ? `font-serif text-[1.25rem] leading-snug ${f.highlight ? 'text-ivory' : 'text-ink'}` : `text-[14.5px] ${f.highlight ? 'text-ivory/65' : 'text-muted'}`}`}>
                  {l}
                </p>
              ))}
            </motion.div>
          ))}
        </motion.div>
        <Reveal className="mt-6">
          <p className="text-[14px] text-muted">
            <span className="font-medium text-ink">Public health:</span> {publicHealth}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
