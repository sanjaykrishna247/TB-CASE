import { Easing, useCurrentFrame } from 'remotion';
import { C, MONO, ScanBg, Tag, lerp, useSpringAt } from './shared';

/**
 * Q7 · NTEP regimen for drug-sensitive TB (12 s = 360 frames):
 * 6-month bar → months 1–2 intensive (H R Z E) → months 3–6 continuation
 * (H R E) → sputum checkpoints → treatment completed.
 */
export const DRUGS = {
  H: { name: 'Isoniazid', color: '#7FA889' },
  R: { name: 'Rifampicin', color: '#E07A3F' },
  Z: { name: 'Pyrazinamide', color: '#A68AC6' },
  E: { name: 'Ethambutol', color: '#E0B04A' },
};

const X0 = 110;
const X1 = 1170;
const W = X1 - X0;
const M = W / 6; // px per month
const BAR_Y = 400;

function Pill({ x, y, letter, delay }) {
  const s = useSpringAt(delay, { damping: 10, mass: 0.6 });
  const d = DRUGS[letter];
  return (
    <g transform={`translate(${x} ${y}) scale(${s * 0.95})`}>
      <rect x={-44} y={-22} width={88} height={44} rx={22} fill={d.color} />
      <rect x={0} y={-22} width={44} height={44} rx={0} fill="rgba(255,255,255,.85)" />
      <rect x={-44} y={-22} width={88} height={44} rx={22} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={2} />
      <path d="M22 -22 a22 22 0 0 1 0 44" fill="rgba(255,255,255,.85)" />
      <text x={-22} y={9} textAnchor="middle" fill={C.bg} fontSize={26} fontWeight={600}>
        {letter}
      </text>
    </g>
  );
}

function Flag({ month, label, sub, reached, drop = 96 }) {
  const s = useSpringAt(reached, { damping: 11 });
  const x = X0 + month * M;
  return (
    <g transform={`translate(${x} ${BAR_Y})`} opacity={s}>
      <line x1={0} y1={-34} x2={0} y2={drop - 26} stroke="white" strokeWidth={2} strokeDasharray="4 4" opacity={0.6} />
      <g transform={`translate(0 ${drop + (1 - s) * 20})`}>
        <circle r={9} fill={C.crimson} />
        <text y={40} textAnchor="middle" fill="white" fontSize={21} fontWeight={700}>
          {label}
        </text>
        <text y={66} textAnchor="middle" fill="rgba(255,255,255,.55)" fontFamily={MONO} fontSize={16}>
          {sub}
        </text>
      </g>
    </g>
  );
}

export default function RegimenTimeline() {
  const f = useCurrentFrame();
  const prog = lerp(f, [24, 250], [0, 6], Easing.inOut(Easing.cubic)); // months elapsed
  const head = X0 + prog * M;
  const title = useSpringAt(0);
  const done = useSpringAt(262, { damping: 12 });
  const ipFill = Math.min(prog, 2) * M;
  const cpFill = Math.max(0, prog - 2) * M;
  // first frame at which the playhead reaches a given month
  const at = (mo) => {
    for (let k = 24; k <= 250; k++) if (lerp(k, [24, 250], [0, 6], Easing.inOut(Easing.cubic)) >= mo - 0.001) return k;
    return 250;
  };

  return (
    <ScanBg>
      <Tag>NTEP · Drug-sensitive TB · daily FDC</Tag>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <g opacity={title} transform={`translate(0 ${(1 - title) * 20})`}>
          <text x={X0} y={150} fill="white" fontSize={64} fontWeight={600} letterSpacing={-1.5}>
            <tspan fill={C.teal}>2</tspan> HRZE <tspan fill="rgba(255,255,255,.35)">+</tspan> <tspan fill={C.cyan}>4</tspan> HRE
          </text>
          <text x={X0} y={192} fill="rgba(255,255,255,.55)" fontFamily={MONO} fontSize={20}>
            6 months · weight-band fixed-dose combinations · pyridoxine with H
          </text>
        </g>

        {/* month ticks */}
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i} transform={`translate(${X0 + i * M} ${BAR_Y})`}>
            <line y1={34} y2={46} stroke="rgba(255,255,255,.35)" strokeWidth={2} />
            <text y={68} textAnchor="middle" fill={prog >= i ? 'white' : 'rgba(255,255,255,.35)'} fontFamily={MONO} fontSize={17}>
              {i === 0 ? 'START' : `M${i}`}
            </text>
          </g>
        ))}

        {/* track */}
        <rect x={X0} y={BAR_Y - 26} width={W} height={52} rx={26} fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)" />
        <clipPath id="barclip">
          <rect x={X0} y={BAR_Y - 26} width={W} height={52} rx={26} />
        </clipPath>
        <g clipPath="url(#barclip)">
          <rect x={X0} y={BAR_Y - 26} width={ipFill} height={52} fill={C.teal} />
          <rect x={X0 + 2 * M} y={BAR_Y - 26} width={cpFill} height={52} fill="rgba(241,228,211,.75)" />
          {/* moving stripes */}
          {Array.from({ length: 40 }, (_, i) => (
            <rect key={i} x={X0 + i * 30 - ((f * 1.5) % 30)} y={BAR_Y - 26} width={10} height={52} fill="rgba(255,255,255,.08)" transform={`skewX(-20)`} />
          ))}
        </g>
        <line x1={X0 + 2 * M} y1={BAR_Y - 40} x2={X0 + 2 * M} y2={BAR_Y + 30} stroke="white" strokeWidth={3} />

        {/* phase labels */}
        <g opacity={lerp(f, [20, 40], [0, 1])}>
          <text x={X0 + M} y={BAR_Y + 8} textAnchor="middle" fill={ipFill > M * 0.6 ? C.bg : 'rgba(255,255,255,.6)'} fontFamily={MONO} fontSize={17} fontWeight={700}>
            INTENSIVE PHASE
          </text>
          <text x={X0 + 4 * M} y={BAR_Y + 8} textAnchor="middle" fill={cpFill > M * 2 ? C.bg : 'rgba(255,255,255,.6)'} fontFamily={MONO} fontSize={17} fontWeight={700}>
            CONTINUATION PHASE
          </text>
        </g>

        {/* playhead */}
        <g transform={`translate(${head} ${BAR_Y})`} opacity={lerp(f, [20, 26], [0, 1])}>
          <circle r={18} fill="white" />
          <circle r={30} fill="none" stroke="white" strokeWidth={2} opacity={0.4 + Math.sin(f * 0.3) * 0.3} />
        </g>

        {/* pills: IP above months 1–2, CP above months 3–6 */}
        {['H', 'R', 'Z', 'E'].map((l, i) => (
          <Pill key={`ip${l}`} letter={l} x={X0 + 44 + i * 86} y={BAR_Y - 86} delay={30 + i * 7} />
        ))}
        {['H', 'R', 'E'].map((l, i) => (
          <Pill key={`cp${l}`} letter={l} x={X0 + 2 * M + 170 + i * 120} y={BAR_Y - 86} delay={at(2) + 4 + i * 7} />
        ))}
        <text x={X0 + 2 * M + 100} y={BAR_Y - 130} fill="rgba(255,255,255,.5)" fontFamily={MONO} fontSize={16} opacity={lerp(f, [at(2), at(2) + 10], [0, 1])}>
          Z stopped
        </text>

        {/* sputum checkpoints */}
        <Flag month={2} label="End of IP" sub="sputum follow-up" reached={at(2)} />
        <Flag month={5} label="Month 5" sub="sputum (if indicated)" reached={at(5)} />
        <Flag month={6} label="End of treatment" sub="sputum · outcome" reached={at(6)} drop={176} />

        {/* completion stamp */}
        <g transform={`translate(1040 150) rotate(-8) scale(${done})`} opacity={done}>
          <rect x={-150} y={-46} width={300} height={92} rx={16} fill="rgba(14,165,164,.15)" stroke={C.teal} strokeWidth={4} />
          <text y={-4} textAnchor="middle" fill={C.teal} fontSize={30} fontWeight={600} letterSpacing={2}>
            TREATMENT
          </text>
          <text y={30} textAnchor="middle" fill={C.teal} fontSize={30} fontWeight={600} letterSpacing={2}>
            COMPLETED
          </text>
        </g>
      </svg>
    </ScanBg>
  );
}
