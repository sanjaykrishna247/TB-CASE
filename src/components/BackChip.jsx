import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useApp } from '../AppContext';

/** "Back to questions" pill shown after jumping from the index. */
export default function BackChip() {
  const { backChip, jumpTo, active } = useApp();
  const show = backChip && active.startsWith('q');
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={() => jumpTo('index', { highlight: false })}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-ivory shadow-lift hover:bg-brick"
          aria-label="Back to the question list"
        >
          <ArrowUp size={16} /> Back to questions
        </motion.button>
      )}
    </AnimatePresence>
  );
}
