import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import config from '../config';
import { useApp } from '../AppContext';

const ECG = 'M0 60 H200 l16 -7 l12 7 H270 l10 -44 l16 92 l14 -70 l10 22 H370 l24 -12 l22 12 H600';
const NAME = "Vinayaka Mission's Research Foundation";
const WRITE_AT = 0.7; // s — handwriting starts
const WRITE_DUR = 2.4; // s — time to write the name

/** Crest → name handwritten in cursive → heartbeat line + title → lift away. Click or any key skips. */
export default function Preloader() {
  const { setLoaded, reduced } = useApp();
  const [show, setShow] = useState(true);
  const [fontReady, setFontReady] = useState(false);
  const textRef = useRef(null);
  const [tw, setTw] = useState(0); // measured width of the written name (SVG units)
  const tx0 = 500 - tw / 2;
  useEffect(() => {
    if (fontReady && textRef.current) setTw(textRef.current.getComputedTextLength());
  }, [fontReady]);

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
            {/* crest on an ivory disc so its blue and red read on the dark screen */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid h-32 w-32 place-items-center rounded-full bg-ivory shadow-[0_0_0_6px_rgba(241,228,211,.08),0_0_50px_-6px_rgba(224,163,58,.45)] sm:h-40 sm:w-40"
            >
              <img src="/brand/crest.png" alt="Vinayaka Mission's Research Foundation crest" className="h-[72%] w-auto -translate-y-[5%] object-contain" />
            </motion.div>

            {/* cursive name at its natural width, revealed left → right with a glowing pen nib */}
            <svg viewBox="0 0 1000 170" className="mt-6 w-full overflow-visible" aria-label={NAME}>
              <defs>
                <clipPath id="writeClip">
                  <motion.rect x={tx0 - 20} y="0" height="140" initial={{ width: 0 }} animate={fontReady && tw ? { width: tw + 40 } : {}} transition={write} />
                </clipPath>
                <linearGradient id="ink" x1="0" x2="1">
                  <stop offset="0" stopColor="#F8EBDA" />
                  <stop offset=".55" stopColor="#EED2A0" />
                  <stop offset="1" stopColor="#E0A33A" />
                </linearGradient>
              </defs>
              <text
                ref={textRef}
                x="500"
                y="92"
                textAnchor="middle"
                fontFamily='"Great Vibes", cursive'
                fontSize="64"
                letterSpacing="0.6"
                wordSpacing="14"
                fill="url(#ink)"
                clipPath="url(#writeClip)"
                style={{ opacity: fontReady ? 1 : 0, filter: 'drop-shadow(0 2px 10px rgba(224,163,58,.18))' }}
              >
                {NAME}
              </text>
              <motion.g
                initial={{ x: tx0, opacity: 0 }}
                animate={fontReady && tw ? { x: [tx0, tx0 + tw], opacity: [0, 1, 1, 0] } : {}}
                transition={{ ...write, opacity: { duration: WRITE_DUR, delay: WRITE_AT, times: [0, 0.05, 0.92, 1] } }}
              >
                <circle cx="0" cy="80" r="4.5" fill="#FFE7B0" />
                <circle cx="0" cy="80" r="13" fill="#E0A33A" opacity="0.3" />
              </motion.g>
              {/* flourish: hairlines out from a small diamond, drawn once the name is written */}
              <g transform="translate(500 132)">
                {[-1, 1].map((d) => (
                  <motion.path
                    key={d}
                    d={`M${d * 14} 0 C ${d * 90} -6, ${d * 170} 6, ${d * 260} 0`}
                    fill="none"
                    stroke="#E0A33A"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={fontReady ? { pathLength: 1, opacity: 0.75 } : {}}
                    transition={{ duration: 0.8, delay: WRITE_AT + WRITE_DUR - 0.1, ease: 'easeOut' }}
                  />
                ))}
                <motion.path d="M0 -5 L5 0 L0 5 L-5 0 Z" fill="#E0A33A" initial={{ scale: 0 }} animate={fontReady ? { scale: 1 } : {}} transition={{ delay: WRITE_AT + WRITE_DUR - 0.2, type: 'spring', stiffness: 300 }} />
              </g>
            </svg>

            <motion.div className="mt-6 w-[min(520px,80vw)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: WRITE_AT + WRITE_DUR - 0.2 }}>
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
