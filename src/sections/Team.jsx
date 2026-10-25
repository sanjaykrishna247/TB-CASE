import { motion } from 'framer-motion';
import config from '../config';
import Reveal, { item, stagger } from '../components/Reveal';

// two-letter initials: first letter of the first and last word ("A. Jeyashree" → "AJ")
const initials = (name) => {
  const w = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || '') + (w.length > 1 ? w[w.length - 1][0] : w[0]?.[1] || '')).toUpperCase();
};

// warm palette, one per avatar (gradient from → to)
const TONES = [
  ['#B8432F', '#7E2B1E'],
  ['#E0A33A', '#A9741F'],
  ['#5E8466', '#3C5A43'],
  ['#8E6BB0', '#5E4580'],
  ['#C8654A', '#8E3F2C'],
  ['#3F6E7E', '#274A56'],
  ['#A8743A', '#6E4A22'],
  ['#9B4A6A', '#6A2E47'],
];

export default function Team() {
  return (
    <section id="team" aria-labelledby="team-title" className="relative overflow-hidden bg-paper py-24 lg:py-32">
      <div className="container-x">
        <Reveal className="text-center">
          <p className="eyebrow !text-brick">The team</p>
          <h2 id="team-title" className="mt-4 font-serif text-[2.6rem] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[3.6rem]">
            Presented <em>by</em>
          </h2>
          <p className="mt-4 text-[15px] text-muted">{config.className}</p>
        </Reveal>

        <motion.ul
          variants={stagger(0.08, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4"
        >
          {config.presenters.map((name, i) => {
            const [a, b] = TONES[i % TONES.length];
            return (
              <motion.li key={name} variants={item} className="group flex flex-col items-center text-center">
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="relative grid h-24 w-24 place-items-center rounded-full sm:h-28 sm:w-28"
                  style={{ background: `radial-gradient(circle at 30% 25%, ${a}, ${b})`, boxShadow: `0 18px 40px -18px ${b}, inset 0 1px 0 rgba(255,255,255,.25)` }}
                >
                  {/* thin outer ring */}
                  <span className="absolute -inset-1.5 rounded-full border border-ink/10 transition-colors duration-300 group-hover:border-ink/25" />
                  <span className="font-serif text-[2.1rem] font-medium italic tracking-wide text-ivory sm:text-[2.4rem]">{initials(name)}</span>
                </motion.div>
                <p className="mt-5 font-serif text-[1.15rem] leading-snug text-ink">{name}</p>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
