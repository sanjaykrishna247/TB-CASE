import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/** Wrapper that pulls its child toward the pointer (magnetic button). */
export default function Magnetic({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={() => (x.set(0), y.set(0))} style={{ x, y }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}
