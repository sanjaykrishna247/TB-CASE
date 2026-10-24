import { useEffect, useState } from 'react';
import { useAnimate } from 'framer-motion';
import { useApp } from '../AppContext';
import config from '../config';
import { parseRich } from './RichText';

/**
 * The answer sentence. When its question is opened from the index, a
 * highlighter sweeps across it, then it settles into a soft underline.
 */
export default function KeyLine({ q }) {
  const { highlight, reduced } = useApp();
  const [scope, animate] = useAnimate();
  const [phase, setPhase] = useState('idle'); // idle | active | persist

  useEffect(() => {
    if (highlight.id !== q.id || !scope.current) return;
    let cancelled = false;
    let timer;
    (async () => {
      setPhase('active');
      await animate(scope.current, { backgroundSize: ['0% 100%', '100% 100%'] }, { duration: reduced ? 0.01 : 1.1, ease: [0.65, 0, 0.35, 1] });
      await new Promise((r) => (timer = setTimeout(r, config.highlightMs)));
      if (cancelled) return;
      setPhase('persist');
      await animate(scope.current, { backgroundSize: '100% 16%' }, { duration: 0.9, ease: 'easeInOut' });
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [highlight.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative rounded-2xl border bg-white px-6 py-5 transition-shadow duration-700 sm:px-7 sm:py-6 ${
        phase === 'active' ? 'border-saffron/60 shadow-[0_0_0_5px_rgba(224,163,58,.18),0_24px_48px_-24px_rgba(30,25,23,.3)]' : 'border-line shadow-soft'
      }`}
    >
      <span className="absolute inset-y-5 left-0 w-[3px] rounded-r bg-brick" />
      <p className="eyebrow mb-2 !text-brick">Answer</p>
      <p className="font-serif text-[1.3rem] leading-[1.5] text-ink sm:text-[1.45rem]">
        <mark ref={scope} id={`${q.id}-key`} className={`keyline bg-transparent text-ink ${phase === 'active' ? 'is-active' : ''}`}>
          {parseRich(q.keyLine)}
        </mark>
      </p>
    </div>
  );
}
