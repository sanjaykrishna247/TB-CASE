import { motion } from 'framer-motion';

const PATH = 'M0 30 H520 l10 -5 l8 5 H570 l6 -22 l9 44 l8 -34 l6 12 H640 l14 -7 l12 7 H1200';

/** Thin ECG trace that draws itself — a quiet divider. */
export default function EcgLine({ color = '#B8432F', className = '' }) {
  return (
    <div className={`pointer-events-none w-full ${className}`} aria-hidden>
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="h-10 w-full">
        <motion.path
          d={PATH}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}
