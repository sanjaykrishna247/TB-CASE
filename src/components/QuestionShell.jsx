import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useApp } from '../AppContext';
import KeyLine from './KeyLine';
import Reveal, { item, stagger } from './Reveal';
import { parseRich } from './RichText';

/**
 * One question = one screen: question + answer + short points on the left,
 * a single visual on the right.
 */
export default function QuestionShell({ q, visual, alt = false, wideVisual = false }) {
  const { highlight } = useApp();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (highlight.id !== q.id) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 3400);
    return () => clearTimeout(t);
  }, [highlight.key, q.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section id={q.id} aria-labelledby={`${q.id}-title`} className={`relative flex items-center py-20 lg:min-h-screen lg:py-24 ${alt ? 'bg-paper2' : 'bg-paper'}`}>
      <div className="container-x grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <div className={`min-w-0 ${wideVisual ? 'lg:col-span-5' : 'lg:col-span-6'}`}>
          <Reveal className="mb-5 flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-full bg-ink font-serif text-[15px] italic text-ivory ${pulse ? 'focus-pulse' : ''}`}>
              {q.n}
            </span>
            <span className="eyebrow">{q.tag}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 id={`${q.id}-title`} className="font-serif text-[2rem] font-medium leading-[1.12] tracking-[-0.015em] text-ink sm:text-[2.5rem] lg:text-[2.7rem]">
              {q.question}
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-7">
            <KeyLine q={q} />
          </Reveal>
          {q.points?.length > 0 && (
            <motion.ul variants={stagger(0.07, 0.15)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} className="mt-7 space-y-3">
              {q.points.map((p) => (
                <motion.li key={p} variants={item} className="flex gap-3 text-[15.5px] leading-relaxed text-muted">
                  <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage-soft text-sage">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="[&_strong]:text-ink">{parseRich(p)}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>
        <Reveal delay={0.15} className={`min-w-0 ${wideVisual ? 'lg:col-span-7' : 'lg:col-span-6'}`}>
          {visual}
        </Reveal>
      </div>
    </section>
  );
}
