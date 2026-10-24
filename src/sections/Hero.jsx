import { lazy, Suspense, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import config from '../config';
import { useApp } from '../AppContext';
import WordReveal from '../components/WordReveal';
import Magnetic from '../components/Magnetic';
import LazyMount from '../components/LazyMount';

const HeroScene = lazy(() => import('../three/HeroScene'));

const fade = (loaded, delay) => ({
  initial: { opacity: 0, y: 14 },
  animate: loaded ? { opacity: 1, y: 0 } : {},
  transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
});

export default function Hero() {
  const { loaded, jumpTo } = useApp();
  const ref = useRef(null);
  // the hero is pinned while you scroll through it; progress drives the zoom into the lesion
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const textOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);
  const textEvents = useTransform(scrollYProgress, (v) => (v > 0.2 ? 'none' : 'auto'));
  const cardOpacity = useTransform(scrollYProgress, [0.62, 0.78], [0, 1]);
  const cardY = useTransform(scrollYProgress, [0.62, 0.78], [30, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);
  return (
    <section id="hero" ref={ref} className="relative h-[280vh] bg-night" aria-label="Introduction">
      <div className="grain sticky top-0 isolate flex h-[100svh] items-center overflow-hidden text-ivory">
      {/* warm glow behind the lungs */}
      <div className="absolute right-[8%] top-1/2 h-[70vh] w-[70vh] -translate-y-1/2 rounded-full bg-[#7a3a22]/25 blur-[140px]" />

      <LazyMount className="absolute inset-0" rootMargin="0px">
        {(visible) => (
          <Suspense fallback={null}>
            <motion.div className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: loaded ? 1 : 0 }} transition={{ duration: 1.6 }}>
              <HeroScene visible={visible} progress={scrollYProgress} />
            </motion.div>
          </Suspense>
        )}
      </LazyMount>
      <motion.div style={{ opacity: textOpacity }} className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night via-night/70 to-transparent lg:via-transparent lg:to-transparent lg:[background-image:linear-gradient(to_right,#17110F_0%,rgba(23,17,15,.75)_32%,transparent_55%)]" />

      <motion.div style={{ opacity: textOpacity, y: textY }} className="container-x pointer-events-none relative z-10 pb-24 pt-28">
        <div className="max-w-2xl">
          <motion.p {...fade(loaded, 0.1)} className="text-[13px] font-medium uppercase tracking-[0.2em] text-saffron">
            {config.eventName} · {config.className}
          </motion.p>

          <h1 className="mt-6 font-serif font-medium leading-[0.95] tracking-[-0.03em]">
            <span className="block text-[3.6rem] sm:text-[5.5rem] lg:text-[6.8rem]">
              <WordReveal text="Tuberculosis" start={loaded} delay={0.2} />
            </span>
            <span className="mt-2 block text-[2.2rem] italic text-ivory/80 sm:text-[3.2rem] lg:text-[3.8rem]">
              <WordReveal text="a biosocial disease" start={loaded} delay={0.45} />
            </span>
          </h1>

          <motion.p {...fade(loaded, 0.9)} className="mt-8 max-w-md text-lg leading-relaxed text-ivory/65">
            A case study across pathology, microbiology and pharmacology — in eight questions.
          </motion.p>

          <motion.div {...fade(loaded, 1.05)} style={{ pointerEvents: textEvents }} className="mt-10 flex flex-wrap items-center gap-6">
            <Magnetic>
              <button
                onClick={() => jumpTo('case', { highlight: false })}
                className="group flex items-center gap-3 rounded-full bg-ivory px-7 py-4 font-medium text-night transition hover:bg-saffron"
              >
                Begin with the case
                <ArrowDown size={18} className="transition group-hover:translate-y-0.5" />
              </button>
            </Magnetic>
            <button onClick={() => jumpTo('index', { highlight: false })} className="text-[15px] font-medium text-ivory/70 underline decoration-ivory/30 underline-offset-[6px] hover:text-ivory hover:decoration-saffron">
              Go to the questions
            </button>
            <a href="/simulation" className="text-[15px] font-medium text-saffron underline decoration-saffron/40 underline-offset-[6px] hover:decoration-saffron">
              Open clinical simulation →
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* appears once the camera has zoomed all the way into the lesion */}
      <motion.div style={{ opacity: cardOpacity, y: cardY }} className="pointer-events-none absolute bottom-10 left-0 right-0 z-10">
        <div className="container-x">
          <div className="max-w-md rounded-2xl border border-ivory/15 bg-night/75 p-6 backdrop-blur-md">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-saffron">Zoomed in · left upper lobe</p>
            <h2 className="mt-2 font-serif text-[1.9rem] leading-tight">A caseating cavity at the apex</h2>
            <ul className="mt-3 space-y-1.5 text-[14.5px] text-ivory/75">
              <li>Dull percussion · bronchial breathing · fine crackles</li>
              <li>X-ray: thick-walled cavity in the left upper zone</li>
              <li>GeneXpert: MTB detected, rifampicin-sensitive</li>
            </ul>
            <p className="mt-4 flex items-center gap-2 text-[13px] text-ivory/50">
              <ArrowDown size={14} /> Keep scrolling for the case
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div style={{ opacity: hintOpacity }} className="pointer-events-none absolute bottom-0 left-0 right-0 z-10">
        <motion.div {...fade(loaded, 1.3)} className="container-x flex items-end justify-between gap-6 pb-7">
          <p className="max-w-lg text-[12px] leading-relaxed text-ivory/40">
            {config.departmentName} · {config.collegeName}
          </p>
          <p className="hidden shrink-0 text-[12px] text-ivory/45 sm:block">Drag the lungs to rotate · scroll to zoom in</p>
        </motion.div>
      </motion.div>
      </div>
    </section>
  );
}
