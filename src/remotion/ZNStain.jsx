import { interpolateColors, useCurrentFrame } from 'remotion';
import { C, MONO, ScanBg, Tag, lerp, rng } from './shared';

/**
 * Q4 · Ziehl–Neelsen stain (8 s = 240 frames).
 * Carbol fuchsin + heat → acid decolourisation → methylene blue counterstain
 * → slender red acid-fast rods stand out on a blue field.
 */
const CX = 470;
const CY = 360;
const R = 290;
const STEPS = [
  { at: 0, t: 'Carbol fuchsin + heat', c: '#e11d74' },
  { at: 55, t: 'Decolourise · 20 % H₂SO₄', c: '#f5d0dc' },
  { at: 105, t: 'Counterstain · methylene blue', c: '#5b8def' },
  { at: 155, t: 'Read under oil immersion', c: C.cyan },
];

export default function ZNStain() {
  const f = useCurrentFrame();
  const r = rng(21);
  const bg = interpolateColors(f, [0, 40, 60, 95, 110, 150], ['#3a0a1c', '#c2185b', '#c2185b', '#f6e7ec', '#f6e7ec', '#9ec0f5']);
  const cellFill = interpolateColors(f, [0, 40, 60, 95, 110, 150], ['#5a0f2a', '#d6336c', '#d6336c', '#f1dbe2', '#f1dbe2', '#6f9ae8']);
  const nucleus = interpolateColors(f, [0, 40, 60, 95, 110, 150], ['#40091e', '#a51450', '#a51450', '#e9c5d1', '#e9c5d1', '#2f5fc4']);
  const rodO = lerp(f, [20, 45], [0, 1]);
  const pop = lerp(f, [150, 175], [0, 1]);
  const panX = Math.sin(f * 0.012) * 18;
  const panY = Math.cos(f * 0.01) * 12;

  const cells = Array.from({ length: 34 }, () => ({ x: (r() - 0.5) * 2 * R, y: (r() - 0.5) * 2 * R, rr: 18 + r() * 26 }));
  const debris = Array.from({ length: 140 }, () => ({ x: (r() - 0.5) * 2 * R, y: (r() - 0.5) * 2 * R, s: 1 + r() * 2.5 }));
  const rods = Array.from({ length: 26 }, () => {
    // clusters of slender, slightly curved, beaded rods
    const cx = (r() - 0.5) * 1.5 * R;
    const cy = (r() - 0.5) * 1.5 * R;
    return { x: cx, y: cy, a: r() * 180, len: 26 + r() * 22, bend: (r() - 0.5) * 10 };
  });

  const step = STEPS.reduce((acc, s, i) => (f >= s.at ? i : acc), 0);

  return (
    <ScanBg glow={C.crimson}>
      <Tag>Microscopy · Ziehl–Neelsen · 1000×</Tag>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <defs>
          <clipPath id="field">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <radialGradient id="vig" cx="50%" cy="50%" r="50%">
            <stop offset=".72" stopColor="black" stopOpacity="0" />
            <stop offset="1" stopColor="black" stopOpacity=".75" />
          </radialGradient>
          <filter id="rodglow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g clipPath="url(#field)">
          <rect x={CX - R} y={CY - R} width={R * 2} height={R * 2} fill={bg} />
          <g transform={`translate(${CX + panX} ${CY + panY})`}>
            {debris.map((d, i) => (
              <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.s} fill={nucleus} opacity={0.35} />
            ))}
            {cells.map((c, i) => (
              <g key={`c${i}`}>
                <circle cx={c.x} cy={c.y} r={c.rr} fill={cellFill} opacity={0.55} />
                <circle cx={c.x + c.rr * 0.15} cy={c.y - c.rr * 0.1} r={c.rr * 0.38} fill={nucleus} opacity={0.75} />
              </g>
            ))}
            <g opacity={rodO} filter={pop > 0 ? 'url(#rodglow)' : undefined}>
              {rods.map((d, i) => {
                const beads = 5;
                return (
                  <g key={`r${i}`} transform={`translate(${d.x} ${d.y}) rotate(${d.a})`}>
                    <path d={`M${-d.len / 2} 0 Q 0 ${d.bend} ${d.len / 2} 0`} stroke="#d0003f" strokeWidth={5} strokeLinecap="round" fill="none" />
                    {Array.from({ length: beads }, (_, b) => (
                      <circle key={b} cx={-d.len / 2 + (b / (beads - 1)) * d.len} cy={d.bend * 0.5 * (1 - Math.abs(b / (beads - 1) - 0.5) * 2)} r={2.6} fill="#ff1f5a" />
                    ))}
                    {/* second rod of a pair, slight V */}
                    {i % 3 === 0 && <path d={`M${-d.len / 2} 6 L${d.len / 2 - 4} 18`} stroke="#d0003f" strokeWidth={4.5} strokeLinecap="round" />}
                  </g>
                );
              })}
            </g>
            {/* highlight rings on read step */}
            {pop > 0 &&
              rods.slice(0, 6).map((d, i) => (
                <circle key={`h${i}`} cx={d.x} cy={d.y} r={30 + (1 - pop) * 30} fill="none" stroke={C.cyan} strokeWidth={2.5} opacity={pop * 0.9} />
              ))}
          </g>
          <circle cx={CX} cy={CY} r={R} fill="url(#vig)" />
        </g>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(241,228,211,.6)" strokeWidth={3} />
        <circle cx={CX} cy={CY} r={R + 14} fill="none" stroke="rgba(241,228,211,.2)" strokeWidth={1.5} strokeDasharray="4 8" />

        {/* Steps */}
        <g transform="translate(830 170)">
          {STEPS.map((s, i) => {
            const on = i === step;
            const done = i < step;
            return (
              <g key={s.t} transform={`translate(0 ${i * 86})`} opacity={on ? 1 : done ? 0.6 : 0.3}>
                <circle r={20} fill={on ? s.c : 'transparent'} stroke={s.c} strokeWidth={2.5} />
                <text y={7} textAnchor="middle" fill={on ? C.bg : s.c} fontSize={20} fontWeight={600}>
                  {i + 1}
                </text>
                <text x={40} y={8} fill="white" fontSize={25} fontWeight={on ? 700 : 500}>
                  {s.t}
                </text>
                {i < STEPS.length - 1 && <line x1={0} y1={24} x2={0} y2={62} stroke="rgba(255,255,255,.2)" strokeWidth={2} />}
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g opacity={pop} transform={`translate(830 ${520 + (1 - pop) * 20})`}>
          <rect width={390} height={92} rx={18} fill="rgba(225,29,72,.12)" stroke={C.crimson} strokeWidth={2} />
          <rect x={22} y={30} width={44} height={10} rx={5} fill="#ff1f5a" />
          <text x={84} y={42} fill="white" fontSize={27} fontWeight={600}>
            AFB — Ziehl–Neelsen
          </text>
          <text x={84} y={72} fill="rgba(255,255,255,.65)" fontFamily={MONO} fontSize={17}>
            red rods on a blue background
          </text>
        </g>
      </svg>
    </ScanBg>
  );
}
