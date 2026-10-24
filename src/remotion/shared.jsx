import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const C = {
  bg: '#17110F', // warm near-black
  ink: '#1E1917',
  teal: '#E0A33A', // saffron (primary accent in animations)
  cyan: '#F1E4D3', // ivory (lines, labels)
  crimson: '#E0533F',
  cream: '#F6DDB4',
  violet: '#8E6BB0',
  white: '#FFFFFF',
};

export const FONT = 'Inter, system-ui, sans-serif';
export const SERIF = 'Fraunces, Georgia, serif';
export const MONO = 'Inter, system-ui, sans-serif'; // labels use the body font (keeps the look calm)

/** Clamp helper around interpolate */
export const lerp = (f, inR, outR, ease) =>
  interpolate(f, inR, outR, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

/** Spring that starts at `delay` frames */
export function useSpringAt(delay = 0, config = { damping: 14, mass: 0.7 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

/** Dark scan background with grid + vignette */
export function ScanBg({ children, glow = '#B8432F' }) {
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${glow}1f, transparent 62%)` }} />
      {children}
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 180px 40px rgba(0,0,0,.65)', pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
}

/** Bottom caption with step number; fades/slides in on each scene */
export function Caption({ step, text, sub, color = C.cyan }) {
  const frame = useCurrentFrame();
  const o = lerp(frame, [0, 12], [0, 1]);
  const y = lerp(frame, [0, 12], [20, 0]);
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 48,
        opacity: o,
        transform: `translateY(${y}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
      }}
    >
      {step != null && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: color,
            color: C.bg,
            display: 'grid',
            placeItems: 'center',
            fontSize: 30,
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {step}
        </div>
      )}
      <div>
        <div style={{ color: C.cyan, fontFamily: SERIF, fontSize: 38, fontWeight: 500, letterSpacing: -0.5 }}>{text}</div>
        {sub && <div style={{ color: 'rgba(241,228,211,.6)', fontFamily: MONO, fontSize: 20, marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  );
}

/** Small mono tag top-left */
export function Tag({ children }) {
  return (
    <div style={{ position: 'absolute', left: 64, top: 44, fontFamily: FONT, fontWeight: 600, fontSize: 17, letterSpacing: 3, color: C.teal, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

/** Fade a whole scene in and out over its own duration */
export function SceneFade({ dur, children, inF = 10, outF = 10 }) {
  const frame = useCurrentFrame();
  const o = Math.min(lerp(frame, [0, inF], [0, 1]), lerp(frame, [dur - outF, dur], [1, 0]));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

/** Deterministic pseudo-random generator (stable across renders) */
export function rng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
