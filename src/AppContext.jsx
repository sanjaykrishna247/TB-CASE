import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { questions } from './data/answers';

/**
 * App-wide state:
 *  - Lenis smooth scrolling + `jumpTo(id)` that scrolls under the sticky nav
 *  - keyLine highlight trigger after a jump
 *  - active section tracking (for nav pills / dot rail / keyboard nav)
 *  - presentation mode + reduced-motion / low-power flags
 */
const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const SECTION_IDS = ['hero', 'case', ...questions.map((q) => q.id), 'index', 'footer'];
const NAV_OFFSET = 64; // sticky nav height

function detectLowPower() {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const small = window.matchMedia('(max-width: 768px)').matches;
  return cores <= 4 || mem <= 4 || small;
}

export function AppProvider({ children }) {
  const lenisRef = useRef(null);
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [lowPower] = useState(detectLowPower);
  const [presentation, setPresentation] = useState(false);
  const [active, setActive] = useState('hero');
  const [navOver, setNavOver] = useState('hero'); // section currently under the sticky nav
  const [highlight, setHighlight] = useState({ id: null, key: 0 });
  const [backChip, setBackChip] = useState(false);
  const [loaded, setLoaded] = useState(false); // preloader finished

  // Watch the OS reduced-motion setting
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Lenis smooth scroll (skipped when reduced motion is on)
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenisRef.current = lenis;
    if (import.meta.env.DEV) window.__lenis = lenis;
    let raf;
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  // Stop scrolling while the preloader runs
  useEffect(() => {
    const l = lenisRef.current;
    if (!l) return;
    loaded ? l.start() : l.stop();
  }, [loaded, reduced]);

  // Presentation-mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('present', presentation);
  }, [presentation]);

  // Active section via IntersectionObserver (a thin band across the middle of the viewport)
  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    // thin band at the very top → which section sits under the navbar (drives its light/dark tint)
    const top = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setNavOver(e.target.id));
      },
      { rootMargin: '-40px 0px -92% 0px' }
    );
    els.forEach((el) => {
      io.observe(el);
      top.observe(el);
    });
    return () => {
      io.disconnect();
      top.disconnect();
    };
  }, [loaded]);

  const targetTop = (el) => el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;

  /** Smooth-scroll to a section; for questions, highlight the keyLine on arrival. */
  const jumpTo = useCallback(
    (id, { highlight: doHighlight = true } = {}) => {
      const el = document.getElementById(id);
      if (!el) return;
      const isQ = /^q\d$/.test(id);
      const offset = id === 'hero' ? 0 : -NAV_OFFSET;

      const arrive = () => {
        // Safety net: if anything moved the layout (or Lenis missed), land exactly with a native scroll
        const drift = Math.abs(el.getBoundingClientRect().top - (id === 'hero' ? 0 : NAV_OFFSET));
        if (drift > 6) {
          const y = id === 'hero' ? 0 : targetTop(el);
          if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        }
        if (isQ && doHighlight) setHighlight({ id, key: Date.now() });
        setBackChip(isQ);
        history.replaceState(null, '', id === 'hero' ? ' ' : `#${id}`);
      };

      if (lenisRef.current) {
        const l = lenisRef.current;
        // Re-sync Lenis if the page was scrolled natively (keyboard focus, find-in-page…)
        if (Math.abs(l.animatedScroll - window.scrollY) > 2) {
          l.animatedScroll = l.targetScroll = window.scrollY;
        }
        const dist = Math.abs(targetTop(el) - window.scrollY);
        const duration = Math.min(2.2, Math.max(0.8, dist / 3200));
        l.scrollTo(el, {
          offset,
          duration,
          force: true,
          easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
          onComplete: arrive,
        });
      } else {
        window.scrollTo({ top: id === 'hero' ? 0 : targetTop(el), behavior: reduced ? 'auto' : 'smooth' });
        setTimeout(arrive, reduced ? 50 : 900);
      }
    },
    [reduced]
  );

  const qIds = useMemo(() => questions.map((q) => q.id), []);

  /** Next / previous question relative to where the presenter currently is. */
  const stepQuestion = useCallback(
    (dir) => {
      const idx = qIds.indexOf(active);
      let next;
      if (idx === -1) {
        const order = SECTION_IDS.indexOf(active);
        next = dir > 0 ? (order < SECTION_IDS.indexOf('q1') ? 0 : qIds.length - 1) : order > SECTION_IDS.indexOf('q8') ? qIds.length - 1 : 0;
      } else next = Math.min(qIds.length - 1, Math.max(0, idx + dir));
      jumpTo(qIds[next]);
    },
    [active, jumpTo, qIds]
  );

  // Keyboard shortcuts: ←/→ or J/K — prev/next question · I — index · P — presentation mode
  useEffect(() => {
    const onKey = (e) => {
      if (!loaded) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright' || k === 'k') {
        e.preventDefault();
        stepQuestion(1);
      } else if (k === 'arrowleft' || k === 'j') {
        e.preventDefault();
        stepQuestion(-1);
      } else if (k === 'i') jumpTo('index', { highlight: false });
      else if (k === 'p') setPresentation((p) => !p);
      else if (k === 'h') jumpTo('hero', { highlight: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, stepQuestion, jumpTo]);

  // Hide the "back to questions" chip once the presenter is back at the index
  useEffect(() => {
    if (active === 'index' || active === 'hero') setBackChip(false);
  }, [active]);

  // Deep link: /#q3 jumps there after the preloader
  useEffect(() => {
    if (!loaded) return;
    const h = window.location.hash.replace('#', '');
    if (h && document.getElementById(h)) setTimeout(() => jumpTo(h), 150);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    lenis: lenisRef,
    reduced,
    lowPower,
    presentation,
    setPresentation,
    active,
    navOver,
    highlight,
    jumpTo,
    stepQuestion,
    backChip,
    setBackChip,
    loaded,
    setLoaded,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
