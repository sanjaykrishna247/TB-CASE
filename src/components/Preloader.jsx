import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import config from '../config';
import { useApp } from '../AppContext';

const ECG = 'M0 60 H200 l16 -7 l12 7 H270 l10 -44 l16 92 l14 -70 l10 22 H370 l24 -12 l22 12 H600';
const NAME = "Vinayaka Mission's Research Foundation";
const WRITE_AT = 0.7; // s — handwriting starts
const WRITE_DUR = 2.6; // s — time to write both lines
const LINES = [
  { text: "Vinayaka Mission's", y: 78, w: 540, at: WRITE_AT, dur: WRITE_DUR * 0.48 },
  { text: 'Research Foundation', y: 168, w: 600, at: WRITE_AT + WRITE_DUR * 0.5, dur: WRITE_DUR * 0.5 },
];

/** Crest → name handwritten in cursive → heartbeat line + title → lift away. Click or any key skips. */
export default function Preloader() {
  const { setLoaded, reduced } = useApp();
  const [show, setShow] = useState(true);
  const [fontReady, setFontReady] = useState(false);

  // wait for the script font so the handwriting never starts in a fallback font
  useEffect(() => {
    let done = false;
    const go = () => !done && ((done = true), setFontReady(true));
    document.fonts?.load('72px "Great Vibes"').then(go, go);
    const t = setTimeout(go, 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), reduced ? 300 : config.preloaderMs);
    const skip = () => setShow(false);
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, [reduced]);

  const write = { duration: WRITE_DUR, delay: WRITE_AT, ease: [0.45, 0.05, 0.55, 0.95] };

  return (
    <AnimatePresence onExitComplete={() => setLoaded(true)}>
      {show && (
        <motion.div
          key="pre"
          className="grain fixed inset-0 z-[10000] flex cursor-pointer items-center justify-center bg-night"
          onClick={() => setShow(false)}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          role="status"
          aria-label="Loading presentation"
        >
          <div className="relative flex w-[min(820px,92vw)] flex-col items-center text-center">
            {/* lockup: crest + name written in two lines beside it, centred as one group */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full bg-ivory shadow-[0_0_0_6px_rgba(241,228,211,.08),0_0_50px_-6px_rgba(224,163,58,.45)] sm:h-36 sm:w-36"
              >
                <img src="/brand/crest.png" alt="Vinayaka Mission's Research Foundation crest" className="h-[82%] w-auto object-contain" />
              </motion.div>
              <svg viewBox="0 0 620 190" className="w-[min(460px,84vw)] overflow-visible" aria-label={NAME}>
                <defs>
                  {LINES.map((l, i) => (
                    <clipPath key={i} id={`writeClip${i}`}>
                      <motion.rect x="-10" y={l.y - 75} height="100" initial={{ width: 0 }} animate={fontReady ? { width: l.w + 30 } : {}} transition={{ ...write, duration: l.dur, delay: l.at }} />
                    </clipPath>
                  ))}
                  <linearGradient id="ink" x1="0" x2="1">
                    <stop offset="0" stopColor="#F6E7D6" />
                    <stop offset="1" stopColor="#E0A33A" />
                  </linearGradient>
                </defs>
                {LINES.map((l, i) => (
                  <g key={i}>
                    <text x="0" y={l.y} textLength={l.w} lengthAdjust="spacingAndGlyphs" fontFamily='"Great Vibes", cursive' fontSize="78" fill="url(#ink)" clipPath={`url(#writeClip${i})`} style={{ opacity: fontReady ? 1 : 0 }}>
                      {l.text}
                    </text>
                    {/* glowing pen nib following the writing */}
                    <motion.g
                      initial={{ x: 0, opacity: 0 }}
                      animate={fontReady ? { x: [0, l.w], opacity: [0, 1, 1, 0] } : {}}
                      transition={{ ...write, duration: l.dur, delay: l.at, opacity: { duration: l.dur, delay: l.at, times: [0, 0.06, 0.9, 1] } }}
                    >
                      <circle cx="0" cy={l.y - 14} r="5" fill="#FFE7B0" />
                      <circle cx="0" cy={l.y - 14} r="14" fill="#E0A33A" opacity="0.35" />
                    </motion.g>
                  </g>
                ))}
              </svg>
            </div>

            <motion.div className="mt-10 w-[min(520px,80vw)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: WRITE_AT + WRITE_DUR - 0.2 }}>
              <svg viewBox="0 0 600 120" className="w-full overflow-visible">
                <motion.path
                  d={ECG}
                  fill="none"
                  stroke="#F1E4D3"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: WRITE_AT + WRITE_DUR - 0.2, ease: 'easeInOut' }}
                />
                <motion.circle cx="600" cy="60" r="6" fill="#E0533F" initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }} transition={{ delay: WRITE_AT + WRITE_DUR + 0.6, duration: 0.5 }} />
              </svg>
            </motion.div>
            <div className="mt-2 overflow-hidden">
              <motion.div
                className="font-serif text-3xl font-medium tracking-tight text-ivory sm:text-4xl"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ delay: WRITE_AT + WRITE_DUR + 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                TB Case Study
              </motion.div>
            </div>
            <motion.p className="mt-2 text-sm text-ivory/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: WRITE_AT + WRITE_DUR + 0.7 }}>
              A case of pulmonary tuberculosis
            </motion.p>
          </div>
          <span className="absolute bottom-6 right-6 text-[12px] text-ivory/35">Click or press any key to skip</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
