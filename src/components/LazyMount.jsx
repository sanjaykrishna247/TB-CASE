import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';

let order = 0; // staggers background warm-up so heavy pieces don't all mount in the same frame

/**
 * Mounts children once the box nears the viewport — or, a few seconds after
 * the preloader, in the background (staggered) so the first long jump from
 * the Question Index doesn't stutter while 3D scenes / videos initialise.
 * Also reports whether it is currently on-screen (used to pause canvases /
 * players). The wrapper keeps its size, so there is no layout shift.
 */
export default function LazyMount({ children, className = '', style, rootMargin = '400px', fallback = null, warm = true }) {
  const ref = useRef(null);
  const { loaded, lowPower } = useApp();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const slot = useRef(order++);

  useEffect(() => {
    const el = ref.current;
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin });
    const vis = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '50px' });
    near.observe(el);
    vis.observe(el);
    return () => {
      near.disconnect();
      vis.disconnect();
    };
  }, [rootMargin]);

  useEffect(() => {
    if (!warm || !loaded || mounted || lowPower) return;
    const t = setTimeout(() => {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
      idle(() => setMounted(true), { timeout: 2000 });
    }, 2500 + (slot.current % 12) * 600);
    return () => clearTimeout(t);
  }, [warm, loaded, mounted, lowPower]);

  return (
    <div ref={ref} className={className} style={style}>
      {mounted ? (typeof children === 'function' ? children(visible) : children) : fallback}
    </div>
  );
}
