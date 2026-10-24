import { Easing, useCurrentFrame } from 'remotion';
import { C, MONO, ScanBg, Tag, lerp, rng, useSpringAt } from './shared';

/**
 * Q3 · Granuloma build (10 s = 300 frames): caseous centre → epithelioid
 * ring → Langhans giant cell (horseshoe nuclei) → lymphocyte cuff →
 * fibroblasts, each with a leader-line label.
 */
const CX = 470;
const CY = 370;

function Label({ from, x1, y1, x2, y2, title, sub, color }) {
  const f = useCurrentFrame();
  const draw = lerp(f, [from, from + 14], [1, 0], Easing.out(Easing.cubic));
  const o = lerp(f, [from + 8, from + 18], [0, 1]);
  return (
    <g>
      <circle cx={x1} cy={y1} r={6} fill={color} opacity={1 - draw} />
      <path d={`M${x1} ${y1} L${x2 - 40} ${y2} L${x2} ${y2}`} fill="none" stroke={color} strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
      <g opacity={o} transform={`translate(${x2 + 14} ${y2})`}>
        <text y={-4} fill="white" fontSize={28} fontWeight={700}>
          {title}
        </text>
        <text y={24} fill="rgba(255,255,255,.55)" fontFamily={MONO} fontSize={17}>
          {sub}
        </text>
      </g>
    </g>
  );
}

export default function GranulomaBuild() {
  const f = useCurrentFrame();
  const r = rng(5);
  const centre = useSpringAt(6, { damping: 13 });
  const giant = useSpringAt(105, { damping: 11 });
  const breathe = 1 + Math.sin(f * 0.06) * 0.01;

  const epi = Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2;
    const rr = 150 + (r() - 0.5) * 22;
    return { a, rr, d: 40 + i * 2 };
  });
  const lymph = Array.from({ length: 90 }, (_, i) => {
    const a = r() * Math.PI * 2;
    const rr = 215 + r() * 55;
    return { a, rr, d: 150 + r() * 50, s: 6 + r() * 4 };
  });
  const fibro = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    return { a, rr: 290 + r() * 14, d: 205 + i * 1.5 };
  });

  // caseous centre: irregular granular blob
  const cas = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const rr = 92 + Math.sin(a * 5) * 9 + Math.cos(a * 3) * 6;
    return `${CX + Math.cos(a) * rr * centre},${CY + Math.sin(a) * rr * centre}`;
  }).join(' ');

  // Langhans giant cell at the inner edge (upper-right)
  const gA = -0.7;
  const gx = CX + Math.cos(gA) * 150;
  const gy = CY + Math.sin(gA) * 150;

  return (
    <ScanBg glow={C.violet}>
      <Tag>Histology · Tubercle · H&amp;E</Tag>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <defs>
          <radialGradient id="cas" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff4e0" />
            <stop offset="1" stopColor={C.cream} />
          </radialGradient>
          <pattern id="gran" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.4" fill="rgba(200,140,90,.35)" />
            <circle cx="8" cy="7" r="1" fill="rgba(200,140,90,.3)" />
          </pattern>
        </defs>
        <g transform={`translate(${CX} ${CY}) scale(${breathe}) translate(${-CX} ${-CY})`}>
          {/* fibroblasts */}
          {fibro.map((c, i) => {
            const o = lerp(f - c.d, [0, 12], [0, 1]);
            const x = CX + Math.cos(c.a) * c.rr;
            const y = CY + Math.sin(c.a) * c.rr;
            return (
              <path
                key={`f${i}`}
                d={`M${x - 30} ${y} Q${x} ${y - 7} ${x + 30} ${y} Q${x} ${y + 7} ${x - 30} ${y}`}
                transform={`rotate(${(c.a * 180) / Math.PI + 90} ${x} ${y})`}
                fill="rgba(241,228,211,.35)"
                opacity={o}
              />
            );
          })}
          {/* lymphocytes */}
          {lymph.map((l, i) => {
            const s = lerp(f - l.d, [0, 10], [0, 1], Easing.out(Easing.back(2)));
            return <circle key={`l${i}`} cx={CX + Math.cos(l.a) * l.rr} cy={CY + Math.sin(l.a) * l.rr} r={l.s * s} fill="#6d28d9" stroke="#a78bfa" strokeWidth={1.2} />;
          })}
          {/* epithelioid cells */}
          {epi.map((c, i) => {
            const t = lerp(f - c.d, [0, 18], [0, 1], Easing.out(Easing.cubic));
            const rr = c.rr + (1 - t) * 160;
            const x = CX + Math.cos(c.a) * rr;
            const y = CY + Math.sin(c.a) * rr;
            const rot = (c.a * 180) / Math.PI + 90;
            return (
              <g key={`e${i}`} opacity={t} transform={`rotate(${rot} ${x} ${y})`}>
                <ellipse cx={x} cy={y} rx={30} ry={16} fill="rgba(244,114,182,.55)" stroke="#f9a8d4" strokeWidth={1.5} />
                <ellipse cx={x} cy={y} rx={13} ry={5} fill="rgba(124,58,237,.75)" />
              </g>
            );
          })}
          {/* caseous centre */}
          <polygon points={cas} fill="url(#cas)" stroke="#f5c27a" strokeWidth={2} />
          <polygon points={cas} fill="url(#gran)" />
          {/* Langhans giant cell */}
          <g transform={`translate(${gx} ${gy}) scale(${giant})`}>
            <ellipse rx={58} ry={46} fill="rgba(244,114,182,.75)" stroke="#fbcfe8" strokeWidth={2.5} />
            {Array.from({ length: 11 }, (_, i) => {
              // horseshoe arrangement of nuclei at the periphery
              const a = Math.PI * 0.15 + (i / 10) * Math.PI * 1.7;
              return <ellipse key={i} cx={Math.cos(a) * 40} cy={Math.sin(a) * 30} rx={8} ry={5.5} transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 40} ${Math.sin(a) * 30})`} fill="#4c1d95" />;
            })}
          </g>
        </g>

        <Label from={20} x1={CX + 40} y1={CY - 20} x2={880} y2={120} title="Caseous necrosis" sub="cheesy, amorphous, pink-granular" color={C.cream} />
        <Label from={80} x1={CX + 145} y1={CY - 37} x2={880} y2={230} title="Epithelioid cells" sub="activated macrophages" color="#f9a8d4" />
        <Label from={125} x1={gx + 30} y1={gy - 20} x2={880} y2={340} title="Langhans giant cell" sub="nuclei in a horseshoe" color="#fbcfe8" />
        <Label from={185} x1={CX + 225} y1={CY + 82} x2={880} y2={450} title="Lymphocyte cuff" sub="CD4⁺ / CD8⁺ T cells" color="#a78bfa" />
        <Label from={228} x1={CX + 212} y1={CY + 198} x2={880} y2={560} title="Fibroblasts" sub="fibrosis / healing rim" color={C.cyan} />
      </svg>
    </ScanBg>
  );
}
