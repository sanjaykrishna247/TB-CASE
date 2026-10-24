import { motion } from 'framer-motion';
import { useApp } from '../AppContext';

/** Fade/slide-up on scroll into view. */
export default function Reveal({ children, delay = 0, y = 28, className = '', as = 'div', once = true, amount = 0.25 }) {
  const { reduced } = useApp();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y, filter: reduced ? 'none' : 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, amount }}
      transition={{ duration: reduced ? 0.3 : 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Staggered container + item helpers */
export const stagger = (s = 0.08, d = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: s, delayChildren: d } },
});
export const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};
