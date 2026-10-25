import { motion, useScroll, useSpring } from 'framer-motion';
import { useApp } from '../AppContext';

const DARK = new Set(['hero', 'footer']);

/** Simple top bar: logo · Case · Questions, with a thin reading-progress line. */
export default function Navbar() {
  const { navOver, active, jumpTo } = useApp();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  const dark = DARK.has(navOver);
  const inQuestions = active.startsWith('q') || active === 'index';

  const link = (label, id, on) => (
    <button
      onClick={() => jumpTo(id, { highlight: false })}
      className={`relative px-1 py-1 text-[14px] font-medium transition-colors ${
        dark ? (on ? 'text-ivory' : 'text-ivory/60 hover:text-ivory') : on ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
      {on && <motion.span layoutId="navline" className={`absolute -bottom-0.5 left-1 right-1 h-[2px] rounded ${dark ? 'bg-saffron' : 'bg-brick'}`} />}
    </button>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        dark ? 'bg-transparent' : 'border-b border-line/80 bg-paper/85 backdrop-blur-md'
      }`}
    >
      <nav className="container-x flex h-[64px] items-center justify-between" aria-label="Main">
        <button onClick={() => jumpTo('hero', { highlight: false })} className="flex items-center gap-2.5" aria-label="Back to top">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ivory ring-1 ring-black/5">
            <img src="/brand/crest.png" alt="Vinayaka Mission's Research Foundation crest" className="h-[72%] w-auto -translate-y-[5%] object-contain" />
          </span>
          <span className="mx-0.5 h-6 w-px bg-current opacity-15" />
          <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
            <path d="M2 17h7l2.5-6 3.5 12 3-8 2 2h10" fill="none" stroke={dark ? '#E0A33A' : '#B8432F'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={`font-serif text-[19px] font-medium tracking-tight ${dark ? 'text-ivory' : 'text-ink'}`}>
            TB <span className="italic">Case Study</span>
          </span>
        </button>
        <div className="flex items-center gap-7">
          {link('Case', 'case', active === 'case')}
          {link('Questions', 'index', inQuestions)}
          <a
            href="/simulation"
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition ${dark ? 'bg-ivory/10 text-ivory hover:bg-ivory/20' : 'bg-ink text-ivory hover:bg-brick'}`}
          >
            Simulation
          </a>
        </div>
      </nav>
      <motion.div className={`h-[2px] origin-left ${dark ? 'bg-saffron/80' : 'bg-brick'}`} style={{ scaleX: progress }} />
    </header>
  );
}
