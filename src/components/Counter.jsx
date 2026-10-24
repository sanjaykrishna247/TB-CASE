import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';

/** Count-up number that runs once when scrolled into view. */
export default function Counter({ value, decimals = 0, duration = 1.6, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView, value, duration]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {v.toFixed(decimals)}
    </span>
  );
}
