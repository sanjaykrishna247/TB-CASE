import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import config from '../config';
import { useApp } from '../AppContext';
import EcgLine from '../components/EcgLine';

const refs = [
  'Robbins & Kumar — Basic Pathology',
  'Ananthanarayan & Paniker — Textbook of Microbiology',
  'K.D. Tripathi — Essentials of Medical Pharmacology',
  'NTEP guidelines — MoHFW, Government of India',
  'WHO consolidated guidelines on tuberculosis',
];

export default function Footer() {
  const { jumpTo } = useApp();
  return (
    <footer id="footer" className="grain relative overflow-hidden bg-night text-ivory">
      <div className="container-x relative pb-10 pt-24">
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: '100%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-[4.2rem] font-medium leading-none tracking-[-0.03em] sm:text-[7rem] lg:text-[9rem]"
          >
            Thank <em className="text-saffron">you.</em>
          </motion.h2>
        </div>
        <EcgLine color="#E0A33A" className="mt-8 opacity-80" />

        <div className="mt-14 grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="mb-6 flex items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-ivory shadow-[0_0_0_6px_rgba(241,228,211,.06),0_0_40px_-8px_rgba(224,163,58,.35)]">
                <img src="/brand/crest.png" alt="Vinayaka Mission's Research Foundation crest" className="h-[72%] w-auto -translate-y-[5%] object-contain" />
              </span>
              <p className="font-serif text-[1.15rem] italic leading-snug text-ivory/85">
                Vinayaka Mission&apos;s
                <br />
                Research Foundation
              </p>
            </div>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-ivory/45">Presented by</p>
            <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
              {config.presenters.map((n) => (
                <li key={n} className="font-serif text-[1.3rem] leading-snug text-ivory">
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ivory/60">
              {config.className}
              <br />
              {config.departmentName}
              <br />
              {config.collegeName}
            </p>
          </div>
          <div className="md:col-span-5">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-ivory/45">References</p>
            <ol className="mt-3 space-y-2 text-[14px] text-ivory/65">
              {refs.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </div>
          <div className="md:col-span-2 md:text-right">
            <button onClick={() => jumpTo('hero', { highlight: false })} className="inline-flex items-center gap-2 rounded-full border border-ivory/25 px-5 py-2.5 text-sm hover:border-saffron hover:text-saffron" aria-label="Back to top">
              <ArrowUp size={15} /> Top
            </button>
          </div>
        </div>
        <p className="mt-16 border-t border-ivory/10 pt-6 text-[12px] text-ivory/35">For educational use. Verify current NTEP guidance before clinical use.</p>
      </div>
    </footer>
  );
}
