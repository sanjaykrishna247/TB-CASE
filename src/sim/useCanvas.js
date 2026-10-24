import { useEffect, useRef } from 'react';

/**
 * Keeps a <canvas> sized to its CSS box × devicePixelRatio and calls
 * draw(ctx, w, h, dt, t) every frame (or once per resize when animate=false).
 */
export default function useCanvas(draw, { animate = true, deps = [] } = {}) {
  const ref = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    let raf;
    let last = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!animate) drawRef.current(ctx, w, h, 0, performance.now() / 1000);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (animate) {
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        drawRef.current(ctx, w, h, dt, now / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return ref;
}
