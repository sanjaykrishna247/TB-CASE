import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from 'remotion';
import { C, Caption, MONO, ScanBg, SceneFade, lerp, rng, useSpringAt } from './shared';

/**
 * Q2 · Pathogenesis (15 s @ 30 fps = 450 frames), six 75-frame scenes:
 * cough → airway/alveolus → macrophage (fusion blocked) → Th1/IFN-γ →
 * granuloma/caseation → Ghon complex.
 */
const SCENE = 75;
const STEPS = ['Inhalation', 'Alveolus', 'Macrophage', 'Th1 / IFN-γ', 'Granuloma', 'Ghon complex'];

function Bacillus({ x, y, rot = 0, s = 1, color = C.crimson, o = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={o}>
      <rect x={-16} y={-4} width={32} height={8} rx={4} fill={color} />
      <rect x={-16} y={-4} width={32} height={8} rx={4} fill="none" stroke="#ff8fa3" strokeWidth={1} opacity={0.6} />
    </g>
  );
}

/* 1 — droplet cough */
const HEAD_PATH = "M372 560 C 374 530 378 510 392 500 C 410 492 440 486 450 470 C 458 458 456 446 446 440 C 452 432 458 426 456 418 C 452 412 448 410 452 406 C 460 400 460 392 452 386 C 458 382 470 378 478 370 C 484 362 478 352 470 344 C 458 330 448 318 444 308 C 446 296 448 284 444 270 C 438 220 400 160 320 152 C 240 146 175 200 165 280 C 158 340 175 400 210 440 C 220 460 222 500 218 560 Z";

/** head in profile facing right; mirror={true} faces left */
function Head({ x = 0, color, mirror = false, scale = 1, children }) {
  const tf = mirror ? `translate(${x} 0) scale(${-scale} ${scale})` : `translate(${x} 0) scale(${scale})`;
  return (
    <g transform={tf}>
      <path d={HEAD_PATH} fill="rgba(241,228,211,.08)" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <path d="M400 290 Q 420 282 440 290" strokeWidth={2.5} opacity={0.7} />
        <path d="M408 314 Q 421 306 434 314 Q 421 320 408 314 Z" strokeWidth={2} opacity={0.8} />
        <circle cx={427} cy={313} r={3} fill={color} stroke="none" opacity={0.8} />
        <path d="M458 374 Q 464 372 466 366" strokeWidth={2} opacity={0.7} />
        <path d="M450 409 L 436 411" strokeWidth={2} opacity={0.6} />
        <path d="M292 300 C 318 296 326 330 314 352 C 306 366 296 368 290 362" strokeWidth={2.5} opacity={0.7} />
        <path d="M300 318 C 310 320 310 338 302 344" strokeWidth={1.8} opacity={0.5} />
        <path d="M318 420 C 350 460 400 480 440 474" strokeWidth={1.5} opacity={0.3} />
      </g>
      {children}
    </g>
  );
}

/* 1 — the infectious case coughs; our patient breathes the droplet nuclei in */
function Cough() {
  const f = useCurrentFrame();
  const r = rng(3);
  // source (mirrored head on the right) mouth → our patient's nostril
  const SRC = { x: 1290 - 462 * 0.92, y: 408 * 0.92 + 40 };
  const NOSE = { x: 470, y: 368 };
  const drops = Array.from({ length: 30 }, (_, i) => ({ d: i * 1.1, dy: (r() - 0.5) * 220, sz: 3 + r() * 5, bac: i % 3 === 0 }));
  const cough = lerp(f, [0, 6, 14], [0, 1, 0]); // source cough puff
  const breath = Math.max(0, Math.sin(((f - 18) / 22) * Math.PI)) * (f > 18 ? 1 : 0); // patient inhales
  return (
    <SceneFade dur={SCENE}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        {/* our patient (left, facing right) */}
        <Head color={C.cyan} />
        <text x={190} y={128} fill="rgba(255,255,255,.6)" fontFamily={MONO} fontSize={18} letterSpacing={2}>
          OUR PATIENT
        </text>
        {/* infectious case (right, facing left, slightly smaller = further away) */}
        <g transform="translate(0 40)">
          <Head color={C.teal} mirror x={1290} scale={0.92} />
        </g>
        <text x={1010} y={168} fill={C.teal} fontFamily={MONO} fontSize={18} letterSpacing={2} textAnchor="middle" opacity={0.9}>
          INFECTIOUS CASE
        </text>
        {/* cough puff at the source's mouth */}
        <circle cx={SRC.x} cy={SRC.y} r={14 + cough * 30} fill="none" stroke={C.teal} strokeWidth={2} opacity={cough * 0.8} />

        {/* droplet nuclei drift across and are drawn in through the nose */}
        {drops.map((d, i) => {
          const t = lerp(f - d.d, [0, 42], [0, 1], Easing.inOut(Easing.cubic));
          const mx = (SRC.x + NOSE.x) / 2;
          const my = (SRC.y + NOSE.y) / 2 + d.dy;
          const u = 1 - t;
          const x = u * u * SRC.x + 2 * u * t * mx + t * t * NOSE.x;
          const y = u * u * SRC.y + 2 * u * t * my + t * t * NOSE.y;
          const o = lerp(f - d.d, [0, 3, 38, 44], [0, 1, 1, 0]);
          const sz = d.sz * (1 - t * 0.6);
          return (
            <g key={i} opacity={o}>
              <circle cx={x} cy={y} r={sz} fill="rgba(241,228,211,.3)" stroke={C.cyan} strokeWidth={1} />
              {d.bac && <Bacillus x={x} y={y} s={0.22} rot={i * 40} />}
            </g>
          );
        })}

        {/* inhalation arrows into the nostril */}
        <g opacity={breath}>
          {[0, 1, 2].map((k) => {
            const off = ((f * 1.6 + k * 14) % 42) / 42;
            return <path key={k} d={`M${NOSE.x + 60 - off * 50} ${NOSE.y - 6} l -12 6 l 12 6`} fill="none" stroke={C.teal} strokeWidth={3} strokeLinecap="round" opacity={1 - off} />;
          })}
          <text x={NOSE.x + 30} y={NOSE.y - 26} fill={C.teal} fontFamily={MONO} fontSize={16}>
            inhaled
          </text>
        </g>

        <g opacity={lerp(f, [20, 32], [0, 1])}>
          <rect x={490} y={92} width={300} height={56} rx={14} fill="rgba(241,228,211,.08)" stroke="rgba(241,228,211,.4)" />
          <text x={640} y={127} textAnchor="middle" fill="white" fontFamily={MONO} fontSize={21}>
            droplet nuclei 1–5 µm
          </text>
        </g>
      </svg>
      <Caption step={1} text="Droplet nuclei are inhaled" sub="an open case coughs · our patient breathes them in" />
    </SceneFade>
  );
}

/* 2 — airway to subpleural alveolus */
const AIR = [
  [640, 70],
  [640, 220],
  [760, 300],
  [860, 360],
  [940, 410],
];
function along(t) {
  const segs = AIR.length - 1;
  const p = Math.min(segs - 0.0001, t * segs);
  const i = Math.floor(p);
  const k = p - i;
  return [AIR[i][0] + (AIR[i + 1][0] - AIR[i][0]) * k, AIR[i][1] + (AIR[i + 1][1] - AIR[i][1]) * k];
}
function Airway() {
  const f = useCurrentFrame();
  const draw = lerp(f, [0, 30], [1, 0], Easing.inOut(Easing.cubic));
  const alv = useSpringAt(26);
  const t = lerp(f, [18, 58], [0, 1], Easing.inOut(Easing.quad));
  const [bx, by] = along(t);
  const d = `M${AIR.map((p) => p.join(' ')).join(' L')}`;
  const sacs = [
    [960, 430, 46],
    [1020, 400, 40],
    [1000, 480, 38],
    [920, 480, 34],
    [1060, 460, 32],
    [960, 370, 30],
  ];
  return (
    <SceneFade dur={SCENE}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <path d={d} fill="none" stroke="rgba(241,228,211,.25)" strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
        <path d={d} fill="none" stroke={C.cyan} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
        {/* side branches */}
        <path d="M640 220 L520 300 L440 370" fill="none" stroke="rgba(241,228,211,.35)" strokeWidth={22} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
        {sacs.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r * alv} fill="rgba(241,228,211,.10)" stroke={C.cyan} strokeWidth={2.5} />
        ))}
        {/* pleura line */}
        <path d="M1110 220 Q1150 400 1100 600" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={3} strokeDasharray="10 8" opacity={alv} />
        <text x={1120} y={210} fill="rgba(255,255,255,.55)" fontFamily={MONO} fontSize={17}>
          PLEURA
        </text>
        <Bacillus x={bx} y={by} s={1.1} rot={35} o={lerp(f, [16, 20], [0, 1])} />
        <text x={660} y={110} fill="rgba(255,255,255,.55)" fontFamily={MONO} fontSize={18}>
          TRACHEA → BRONCHUS
        </text>
        <g opacity={lerp(f, [45, 58], [0, 1])}>
          <text x={760} y={560} fill="white" fontFamily={MONO} fontSize={22}>
            subpleural alveoli
          </text>
          <text x={760} y={590} fill="rgba(255,255,255,.5)" fontFamily={MONO} fontSize={17}>
            lower upper lobe / upper lower lobe
          </text>
        </g>
      </svg>
      <Caption step={2} text="Bacilli reach the subpleural alveoli" sub="well-ventilated mid-zone of the lung" />
    </SceneFade>
  );
}

/* blob path for an amoeboid cell */
function blob(cx, cy, r, f, amp = 10, n = 9, seed = 0) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rr = r + Math.sin(a * n + f * 0.08 + seed) * amp + Math.cos(a * 3 - f * 0.05) * amp * 0.6;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z`;
}

/* 3 — macrophage engulfs, fusion blocked */
function Macrophage() {
  const f = useCurrentFrame();
  const enter = lerp(f, [0, 22], [0, 1], Easing.out(Easing.cubic));
  const bx = 1100 - enter * 440;
  const phago = useSpringAt(22);
  const lyso = lerp(f, [26, 44], [0, 1], Easing.out(Easing.quad));
  const x = useSpringAt(42, { damping: 9 });
  const mult = Math.floor(lerp(f, [52, 70], [1, 4.99]));
  return (
    <SceneFade dur={SCENE}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <path d={blob(600, 320, 190, f, 12)} fill="rgba(124,58,237,.14)" stroke="#a78bfa" strokeWidth={3} />
        <ellipse cx={500} cy={300} rx={62} ry={44} fill="rgba(124,58,237,.35)" stroke="#a78bfa" strokeWidth={2} />
        <text x={500} y={306} textAnchor="middle" fill="white" fontFamily={MONO} fontSize={15}>
          nucleus
        </text>
        {/* phagosome */}
        <circle cx={660} cy={330} r={58 * phago} fill="rgba(225,29,72,.08)" stroke={C.crimson} strokeWidth={2.5} strokeDasharray="6 5" />
        {Array.from({ length: mult }, (_, i) => (
          <Bacillus key={i} x={i === 0 ? bx : 660 + Math.cos(i * 2.1) * 26} y={i === 0 ? 330 : 330 + Math.sin(i * 2.1) * 22} rot={i * 50 + 20} s={i === 0 ? 1.2 : 0.9} />
        ))}
        {/* lysosomes trying to fuse */}
        {[
          [520, 440],
          [760, 200],
          [780, 460],
        ].map(([lx, ly], i) => {
          const tx = lx + (660 - lx) * 0.55 * lyso;
          const ty = ly + (330 - ly) * 0.55 * lyso;
          return (
            <g key={i}>
              <circle cx={tx} cy={ty} r={20} fill="rgba(241,228,211,.25)" stroke={C.cyan} strokeWidth={2} />
              <text x={tx} y={ty + 5} textAnchor="middle" fill="white" fontFamily={MONO} fontSize={12}>
                L
              </text>
            </g>
          );
        })}
        {/* X — fusion blocked */}
        <g transform={`translate(760 300) scale(${x})`}>
          <circle r={34} fill={C.crimson} />
          <path d="M-14 -14 L14 14 M14 -14 L-14 14" stroke="white" strokeWidth={6} strokeLinecap="round" />
        </g>
        <g opacity={lerp(f, [44, 56], [0, 1])}>
          <rect x={860} y={140} width={350} height={150} rx={18} fill="rgba(225,29,72,.10)" stroke={C.crimson} />
          <text x={884} y={182} fill={C.crimson} fontFamily={MONO} fontSize={18} letterSpacing={2}>
            VIRULENCE FACTORS
          </text>
          {['ESAT-6 / CFP-10 (ESX-1)', 'Cord factor · Sulfatides', 'Lipoarabinomannan'].map((t, i) => (
            <text key={t} x={884} y={218 + i * 28} fill="white" fontFamily={MONO} fontSize={18}>
              {t}
            </text>
          ))}
        </g>
      </svg>
      <Caption step={3} text="Phagosome–lysosome fusion is blocked" sub="bacilli survive and multiply inside the macrophage" color={C.crimson} />
    </SceneFade>
  );
}

/* 4 — Th1 / IFN-γ activation */
function Th1() {
  const f = useCurrentFrame();
  const t = useSpringAt(0);
  const m = useSpringAt(8);
  const act = lerp(f, [30, 55], [0, 1]);
  const arrows = (y, label, delay, color, dir = 1) => {
    const p = ((f - delay) % 24) / 24;
    const show = f > delay;
    const x0 = dir > 0 ? 420 : 760;
    const x1 = dir > 0 ? 760 : 420;
    return (
      <g opacity={show ? 1 : 0}>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={color} strokeWidth={3} strokeDasharray="10 8" opacity={0.6} />
        <path d={dir > 0 ? `M${x1} ${y} l-16 -10 l0 20 z` : `M${x1} ${y} l16 -10 l0 20 z`} fill={color} />
        {[0, 0.33, 0.66].map((o) => {
          const q = (p + o) % 1;
          return <circle key={o} cx={x0 + (x1 - x0) * q} cy={y} r={7} fill={color} />;
        })}
        <text x={590} y={y - 18} textAnchor="middle" fill={color} fontFamily={MONO} fontSize={22} fontWeight={700}>
          {label}
        </text>
      </g>
    );
  };
  const mColor = `rgba(${Math.round(124 + (14 - 124) * act)},${Math.round(58 + (165 - 58) * act)},${Math.round(237 + (164 - 237) * act)},`;
  return (
    <SceneFade dur={SCENE}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        {/* Th1 cell */}
        <g transform={`translate(300 320) scale(${t})`}>
          <circle r={100} fill="rgba(241,228,211,.12)" stroke={C.cyan} strokeWidth={3} />
          <circle r={62} fill="rgba(241,228,211,.25)" />
          <text y={-6} textAnchor="middle" fill="white" fontSize={30} fontWeight={600}>
            CD4⁺
          </text>
          <text y={28} textAnchor="middle" fill="white" fontFamily={MONO} fontSize={22}>
            Th1
          </text>
        </g>
        {/* Macrophage */}
        <g transform={`translate(900 320) scale(${m})`}>
          <path d={blob(0, 0, 130, f, 9)} fill={`${mColor}.18)`} stroke={`${mColor}1)`} strokeWidth={3} />
          <ellipse cx={-30} cy={-20} rx={44} ry={30} fill={`${mColor}.4)`} />
          <text y={150 + 20} textAnchor="middle" fill="white" fontFamily={MONO} fontSize={20}>
            {act > 0.5 ? 'ACTIVATED MACROPHAGE' : 'MACROPHAGE · MHC-II'}
          </text>
          {act > 0.3 &&
            Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2 + f * 0.04;
              const rr = 150 + ((f * 2 + i * 13) % 50);
              return <circle key={i} cx={Math.cos(a) * rr} cy={Math.sin(a) * rr} r={4} fill={C.teal} opacity={act * (1 - ((f * 2 + i * 13) % 50) / 50)} />;
            })}
        </g>
        {arrows(250, 'IFN-γ', 10, C.cyan, 1)}
        {arrows(400, 'IL-12', 20, '#a78bfa', -1)}
        <g opacity={act}>
          <text x={900} y={560} textAnchor="middle" fill={C.teal} fontFamily={MONO} fontSize={20}>
            NO · ROS · phagolysosome maturation
          </text>
          <text x={900} y={150} textAnchor="middle" fill={C.cream} fontFamily={MONO} fontSize={20}>
            TNF-α → recruits monocytes
          </text>
        </g>
        <text x={300} y={470} textAnchor="middle" fill="rgba(255,255,255,.55)" fontFamily={MONO} fontSize={18}>
          ~3 weeks after infection
        </text>
      </svg>
      <Caption step={4} text="Th1 cells activate macrophages" sub="IL-12 → IFN-γ → killing · TNF-α maintains the granuloma" />
    </SceneFade>
  );
}

/* 5 — granuloma assembles + caseation */
function Granuloma() {
  const f = useCurrentFrame();
  const r = rng(11);
  const cells = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    return { a, sx: r() * 1280, sy: r() * 720, d: i * 1.2 };
  });
  const lymph = Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * Math.PI * 2 + r() * 0.1, rr: 225 + r() * 30, d: 20 + i * 0.5 }));
  const cas = lerp(f, [36, 60], [0, 1]);
  return (
    <SceneFade dur={SCENE}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <g transform="translate(640 330)">
          <path d={blob(0, 0, 95, f * 0.5, 8, 5)} fill={`rgba(253,233,201,${0.15 + cas * 0.75})`} stroke={C.cream} strokeWidth={2} />
          {cells.map((c, i) => {
            const t = lerp(f - c.d, [0, 24], [0, 1], Easing.out(Easing.back(1.4)));
            const tx = Math.cos(c.a) * 150;
            const ty = Math.sin(c.a) * 150;
            const x = c.sx - 640 + (tx - (c.sx - 640)) * t;
            const y = c.sy - 330 + (ty - (c.sy - 330)) * t;
            return <ellipse key={i} cx={x} cy={y} rx={26} ry={11} transform={`rotate(${(c.a * 180) / Math.PI + 90} ${x} ${y})`} fill="rgba(236,72,153,.45)" stroke="#f9a8d4" strokeWidth={1.5} />;
          })}
          {lymph.map((l, i) => {
            const o = lerp(f - l.d, [0, 10], [0, 1]);
            return <circle key={i} cx={Math.cos(l.a) * l.rr} cy={Math.sin(l.a) * l.rr} r={9} fill="rgba(124,58,237,.7)" opacity={o} />;
          })}
          <text y={8} textAnchor="middle" fill={C.ink} fontFamily={MONO} fontSize={18} fontWeight={700} opacity={cas}>
            CASEOUS NECROSIS
          </text>
        </g>
        <g opacity={lerp(f, [44, 56], [0, 1])} fontFamily={MONO} fontSize={18}>
          <text x={950} y={210} fill="#f9a8d4">epithelioid cells</text>
          <text x={950} y={250} fill="#a78bfa">lymphocyte cuff</text>
          <text x={950} y={290} fill={C.cream}>caseous centre</text>
        </g>
      </svg>
      <Caption step={5} text="A granuloma walls off the bacilli" sub="the same hypersensitivity causes caseous necrosis" color={C.cream} />
    </SceneFade>
  );
}

/* 6 — Ghon complex */
function Ghon() {
  const f = useCurrentFrame();
  const draw = lerp(f, [0, 28], [1, 0], Easing.inOut(Easing.cubic));
  const focus = useSpringAt(18, { damping: 10 });
  const node = useSpringAt(30, { damping: 10 });
  const link = lerp(f, [34, 50], [1, 0]);
  const title = useSpringAt(46);
  return (
    <SceneFade dur={SCENE} outF={6}>
      <svg viewBox="0 0 1280 720" width="100%" height="100%">
        <path
          d="M560 100 C 500 105 440 170 410 260 C 385 340 372 430 380 520 C 420 548 500 542 580 522 C 612 514 640 520 662 532 C 668 452 660 384 642 346 C 632 324 640 302 646 282 C 640 200 610 110 560 100 Z"
          fill="rgba(241,228,211,.06)"
          stroke={C.cyan}
          strokeWidth={3}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={draw}
        />
        {/* oblique fissure */}
        <path d="M600 190 C 540 300 470 380 390 440" fill="none" stroke="rgba(241,228,211,.4)" strokeWidth={2} strokeDasharray="8 6" opacity={1 - draw} />
        {/* Ghon focus — subpleural */}
        <g transform={`translate(410 370) scale(${focus})`}>
          <circle r={26} fill={C.cream} stroke="#f5c27a" strokeWidth={3} />
          <circle r={44} fill="none" stroke={C.cream} strokeWidth={1.5} opacity={0.5} />
        </g>
        {/* hilar node */}
        <g transform={`translate(640 330) scale(${node})`}>
          <ellipse rx={26} ry={20} fill={C.violet} stroke="#c4b5fd" strokeWidth={3} />
        </g>
        <path d="M430 360 C 500 330 560 340 615 330" fill="none" stroke={C.cream} strokeWidth={3} strokeDasharray="6 6" pathLength={1} strokeDashoffset={link} />
        <g fontFamily={MONO} fontSize={20} opacity={lerp(f, [26, 36], [0, 1])}>
          <line x1={400} y1={340} x2={300} y2={250} stroke="white" strokeWidth={1.5} />
          <text x={140} y={240} fill="white">Ghon focus</text>
          <text x={140} y={266} fill="rgba(255,255,255,.5)" fontSize={16}>subpleural, 1–1.5 cm</text>
          <line x1={660} y1={320} x2={760} y2={240} stroke="white" strokeWidth={1.5} />
          <text x={770} y={238} fill="white">Hilar lymph node</text>
        </g>
        <g transform={`translate(1000 400) scale(${title})`} style={{ transformOrigin: 'center' }}>
          <rect x={-190} y={-64} width={380} height={128} rx={22} fill="rgba(253,233,201,.1)" stroke={C.cream} strokeWidth={2} />
          <text y={-6} textAnchor="middle" fill={C.cream} fontSize={40} fontWeight={600}>
            = Ghon complex
          </text>
          <text y={36} textAnchor="middle" fill="rgba(255,255,255,.6)" fontFamily={MONO} fontSize={18}>
            mostly contained → latent TB
          </text>
        </g>
      </svg>
      <Caption step={6} text="Primary complex — then latency or reactivation" sub="reactivation → apex, cavitation, spread" color={C.cream} />
    </SceneFade>
  );
}

function Stepper() {
  const f = useCurrentFrame();
  const cur = Math.min(STEPS.length - 1, Math.floor(f / SCENE));
  return (
    <div style={{ position: 'absolute', top: 40, left: 64, right: 64, display: 'flex', gap: 10 }}>
      {STEPS.map((s, i) => {
        const p = i < cur ? 1 : i === cur ? (f % SCENE) / SCENE : 0;
        return (
          <div key={s} style={{ flex: 1 }}>
            <div style={{ height: 5, borderRadius: 4, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p * 100}%`, background: C.cyan }} />
            </div>
            <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 15, letterSpacing: 1.5, color: i === cur ? C.cyan : 'rgba(255,255,255,.35)', textTransform: 'uppercase' }}>
              {String(i + 1).padStart(2, '0')} {s}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PathogenesisFlow() {
  const scenes = [Cough, Airway, Macrophage, Th1, Granuloma, Ghon];
  return (
    <ScanBg>
      {scenes.map((S, i) => (
        <Sequence key={i} from={i * SCENE} durationInFrames={SCENE}>
          <S />
        </Sequence>
      ))}
      <AbsoluteFill>
        <Stepper />
      </AbsoluteFill>
    </ScanBg>
  );
}
