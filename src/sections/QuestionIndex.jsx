import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { questions } from '../data/answers';
import { useApp } from '../AppContext';
import Reveal, { item, stagger } from '../components/Reveal';

/** All eight questions. Clicking one scrolls to it and highlights the answer. */
export default function QuestionIndex() {
  const { jumpTo } = useApp();
  return (
    <section id="index" aria-labelledby="index-title" className="relative bg-paper2 py-24 lg:py-32">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow !text-brick">Questions</p>
            <h2 id="index-title" className="mt-4 font-serif text-[2.6rem] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[3.6rem]">
              Eight questions, <em>one case.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-5">
            <p className="text-[15px] leading-relaxed text-muted lg:text-right">Select a question to jump to its answer — it will be highlighted.</p>
          </Reveal>
        </div>

        <motion.ol variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} className="mt-12 border-t border-ink/15">
          {questions.map((q) => (
            <motion.li key={q.id} variants={item} className="border-b border-ink/15">
              <button
                onClick={() => jumpTo(q.id)}
                aria-label={`Question ${q.n}: ${q.question} — go to answer`}
                className="group grid w-full grid-cols-[48px_1fr_auto] items-center gap-4 px-2 py-5 text-left transition-colors duration-300 hover:bg-white/60 sm:grid-cols-[72px_1fr_160px_auto] sm:py-6"
              >
                <span className="font-serif text-[1.6rem] italic text-brick sm:text-[2rem]">{String(q.n).padStart(2, '0')}</span>
                <span className="font-serif text-[1.2rem] leading-snug text-ink transition-transform duration-300 group-hover:translate-x-1 sm:text-[1.5rem]">{q.question}</span>
                <span className="hidden text-[13px] text-muted sm:block">{q.tag}</span>
                <span className="grid h-10 w-10 place-items-center rounded-full border border-ink/15 text-ink transition-all duration-300 group-hover:border-brick group-hover:bg-brick group-hover:text-white">
                  <ArrowRight size={17} />
                </span>
              </button>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
