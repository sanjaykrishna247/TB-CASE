import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import config from '../config';
import { useApp } from '../AppContext';

const ECG = 'M0 60 H200 l16 -7 l12 7 H270 l10 -44 l16 92 l14 -70 l10 22 H370 l24 -12 l22 12 H600';

/** Heartbeat line → wordmark → lift away. Click or any key skips. */
export default function Preloader() {
  const { setLoaded, reduced } = useApp();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), reduced ? 300 : config.preloaderMs);
    const skip = () => setShow(false);
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
  }, [reduced]);

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
          <div className="relative w-[min(560px,86vw)] text-center">
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
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
              <motion.circle cx="600" cy="60" r="6" fill="#E0533F" initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }} transition={{ delay: 0.95, duration: 0.5 }} />
            </svg>
            <div className="mt-6 overflow-hidden">
              <motion.div
                className="font-serif text-5xl font-medium tracking-tight text-ivory sm:text-6xl"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {config.eventName.charAt(0) + config.eventName.slice(1).toLowerCase()}
              </motion.div>
            </div>
            <motion.p className="mt-3 text-sm text-ivory/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
              A case of pulmonary tuberculosis
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
