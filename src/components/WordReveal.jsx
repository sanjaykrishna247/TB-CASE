import { motion } from 'framer-motion';

/** Word-by-word masked reveal for big headlines. */
export default function WordReveal({ text, className = '', delay = 0, start = true, wordClass = () => '' }) {
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden>
          <motion.span
            className={`inline-block ${wordClass(w, i)}`}
            initial={{ y: '110%', rotate: 4 }}
            animate={start ? { y: '0%', rotate: 0 } : {}}
            transition={{ duration: 0.9, delay: delay + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
