import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Droplet, Lightbulb, Play, RotateCcw, Shuffle, Square } from 'lucide-react';

/**
 * ZN-stained sputum smear under a light microscope.
 * World = 2400×2400 px slide region painted once; the eyepiece shows a
 * circular field at the chosen objective, blurred by distance from focus.
 */
const WORLD = 2400;
const OBJ = {
  10: { scale: 0.18, focus: 38, label: '10×' },
  40: { scale: 0.48, focus: 46, label: '40×' },
  100: { scale: 1, focus: 54, label: '100× oil' },
};

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function paintSlide() {
  const r = rng(7);
  const c = document.createElement('canvas');
  c.width = WORLD;
  c.height = WORLD;
  const x = c.getContext('2d');
  // methylene-blue background
  x.fillStyle = '#c9dbef';
  x.fillRect(0, 0, WORLD, WORLD);
  // mucus streaks
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(80,120,190,${0.05 + r() * 0.08})`;
    x.lineWidth = 20 + r() * 70;
    x.lineCap = 'round';
    x.beginPath();
    const sx = r() * WORLD;
    const sy = r() * WORLD;
    x.moveTo(sx, sy);
    x.bezierCurveTo(sx + (r() - 0.5) * 600, sy + (r() - 0.5) * 600, sx + (r() - 0.5) * 700, sy + (r() - 0.5) * 700, sx + (r() - 0.5) * 900, sy + (r() - 0.5) * 900);
    x.stroke();
  }
  // cells: pus cells (lobed nuclei), macrophages, epithelial cells
  for (let i = 0; i < 230; i++) {
    const cx = r() * WORLD;
    const cy = r() * WORLD;
    const kind = r();
    if (kind < 0.12) {
      // squamous epithelial cell
      const R = 140 + r() * 70;
      x.fillStyle = 'rgba(150,180,225,.45)';
      x.beginPath();
      x.ellipse(cx, cy, R, R * (0.7 + r() * 0.3), r() * 3, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = 'rgba(40,70,160,.8)';
      x.beginPath();
      x.arc(cx, cy, 16, 0, Math.PI * 2);
      x.fill();
    } else {
      const R = kind < 0.75 ? 48 + r() * 14 : 70 + r() * 25; // neutrophil vs macrophage
      x.fillStyle = 'rgba(140,170,220,.42)';
      x.beginPath();
      x.arc(cx, cy, R, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = 'rgba(35,60,150,.85)';
      const lobes = kind < 0.75 ? 3 : 1;
      for (let k = 0; k < lobes; k++) {
        x.beginPath();
        x.arc(cx + (lobes > 1 ? Math.cos(k * 2.1) * R * 0.38 : 0), cy + (lobes > 1 ? Math.sin(k * 2.1) * R * 0.38 : 0), lobes > 1 ? R * 0.33 : R * 0.55, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  // debris
  for (let i = 0; i < 4000; i++) {
    x.fillStyle = `rgba(40,70,150,${0.15 + r() * 0.35})`;
    x.fillRect(r() * WORLD, r() * WORLD, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  // acid-fast bacilli: slender, slightly curved, beaded red rods (some in small clumps)
  const rods = [];
  const addRod = (bx, by) => {
    const len = 22 + r() * 18;
    const a = r() * Math.PI;
    const bend = (r() - 0.5) * 6;
    rods.push({ x: bx, y: by, a, len });
    x.save();
    x.translate(bx, by);
    x.rotate(a);
    x.strokeStyle = 'rgba(205,20,70,.9)';
    x.lineWidth = 3.4;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(-len / 2, 0);
    x.quadraticCurveTo(0, bend, len / 2, 0);
    x.stroke();
    x.fillStyle = 'rgba(150,0,45,.95)';
    for (let k = 0; k < 5; k++) {
      const t = k / 4;
      x.beginPath();
      x.arc(-len / 2 + t * len, bend * 0.5 * (1 - Math.abs(t - 0.5) * 2), 1.6, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
  };
  for (let i = 0; i < 78; i++) {
    const bx = 120 + r() * (WORLD - 240);
    const by = 120 + r() * (WORLD - 240);
    const n = r() < 0.3 ? 2 + Math.floor(r() * 3) : 1;
    for (let k = 0; k < n; k++) addRod(bx + (r() - 0.5) * 40, by + (r() - 0.5) * 40);
  }
  return { canvas: c, rods };
}

// RNTCP / NTEP smear grading (per field at 1000×)
function grade(avg, fields) {
  if (fields === 0) return null;
  if (avg === 0) return { g: 'Negative', d: 'No AFB seen' };
  if (avg > 10) return { g: '3+', d: '> 10 AFB per field' };
  if (avg >= 1) return { g: '2+', d: '1–10 AFB per field' };
  if (avg >= 0.1) return { g: '1+', d: '10–99 AFB per 100 fields' };
  return { g: 'Scanty', d: '1–9 AFB per 100 fields' };
}

const FIELDS_NEEDED = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export default function Microscope({ onDone }) {
  const slide = useMemo(() => paintSlide(), []);
  const ref = useRef(null);
  const [obj, setObj] = useState(10);
  const [oil, setOil] = useState(false);
  const [focus, setFocus] = useState(30);
  const [light, setLight] = useState(1);
  const [pos, setPos] = useState({ x: WORLD / 2, y: WORLD / 2 });
  const [marked, setMarked] = useState(new Set());
  const [fields, setFields] = useState([]); // AFB count per recorded field
  const [auto, setAuto] = useState(null); // status text while the automated run is going
  const drag = useRef(null);
  const moved = useRef(false);
  const run = useRef({ cancelled: false });
  const posRef = useRef(pos);
  posRef.current = pos;

  const O = OBJ[obj];
  const blur = Math.abs(focus - O.focus) / 3 + (obj === 100 && !oil ? 6 : 0);

  const geom = useCallback(() => {
    const c = ref.current;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const R = Math.min(w, h) / 2 - 6;
    return { w, h, R, cx: w / 2, cy: h / 2 };
  }, []);

  const draw = useCallback(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { w, h, R, cx, cy } = geom();
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#050505';
    x.fillRect(0, 0, w, h);
    x.save();
    x.beginPath();
    x.arc(cx, cy, R, 0, Math.PI * 2);
    x.clip();
    const s = O.scale * (R / 300);
    x.filter = `blur(${blur.toFixed(1)}px) brightness(${light * (obj === 100 && !oil ? 0.7 : 1)})`;
    x.drawImage(slide.canvas, cx - pos.x * s, cy - pos.y * s, WORLD * s, WORLD * s);
    x.filter = 'none';
    // detected / counted bacilli
    x.strokeStyle = 'rgba(34,197,94,.95)';
    x.fillStyle = 'rgba(34,197,94,.95)';
    x.lineWidth = 2;
    x.font = '600 12px Inter, sans-serif';
    let n = 0;
    marked.forEach((i) => {
      const rd = slide.rods[i];
      const px = cx + (rd.x - pos.x) * s;
      const py = cy + (rd.y - pos.y) * s;
      const rr = (rd.len / 2 + 9) * s;
      x.beginPath();
      x.arc(px, py, rr, 0, Math.PI * 2);
      x.stroke();
      x.fillText(String(++n), px + rr + 2, py - rr + 4);
    });
    // eyepiece vignette + pointer
    const vg = x.createRadialGradient(cx, cy, R * 0.6, cx, cy, R);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.65)');
    x.fillStyle = vg;
    x.fillRect(cx - R, cy - R, R * 2, R * 2);
    x.strokeStyle = 'rgba(0,0,0,.55)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + R * 0.45, cy - R * 0.02);
    x.stroke();
    x.restore();
    x.strokeStyle = '#1c1c1c';
    x.lineWidth = 6;
    x.beginPath();
    x.arc(cx, cy, R + 2, 0, Math.PI * 2);
    x.stroke();
  }, [O, blur, light, oil, obj, pos, marked, slide, geom]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [draw]);
  useEffect(() => () => (run.current.cancelled = true), []);

  const scaleNow = (o = obj) => OBJ[o].scale * (geom().R / 300);

  /** indices of bacilli inside the current field of view at 100× */
  const rodsInField = (p = posRef.current) => {
    const R = geom().R / scaleNow(100) - 12;
    const out = [];
    slide.rods.forEach((rd, i) => Math.hypot(rd.x - p.x, rd.y - p.y) < R && out.push(i));
    return out;
  };

  /* ───── manual interaction ───── */
  const down = (e) => {
    if (auto) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, p: pos };
    moved.current = false;
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    const s = scaleNow();
    setPos({ x: Math.min(WORLD - 60, Math.max(60, d.p.x - dx / s)), y: Math.min(WORLD - 60, Math.max(60, d.p.y - dy / s)) });
  };
  const up = (e) => {
    const wasDrag = moved.current;
    drag.current = null;
    if (auto || wasDrag || obj !== 100 || blur > 3) return;
    const r = ref.current.getBoundingClientRect();
    const { cx, cy } = geom();
    const s = scaleNow();
    const wx = pos.x + (e.clientX - r.left - cx) / s;
    const wy = pos.y + (e.clientY - r.top - cy) / s;
    const hit = slide.rods.findIndex((rd) => Math.hypot(rd.x - wx, rd.y - wy) < rd.len / 2 + 10);
    if (hit >= 0) setMarked((m) => new Set(m).add(hit));
  };

  // pick a representative field (1–10 AFB, as in this 2+ smear) so the slide never reads falsely negative
  const randomField = () => {
    let p;
    for (let k = 0; k < 40; k++) {
      p = { x: 340 + Math.random() * (WORLD - 680), y: 340 + Math.random() * (WORLD - 680) };
      const n = rodsInField(p).length;
      if (n >= 2 && n <= 9) break;
    }
    return p;
  };

  // manual record: every AFB in the field is detected and counted (no need to click each one)
  const recordField = async () => {
    const found = rodsInField();
    setMarked(new Set(found));
    const next = [...fields, found.length];
    setFields(next);
    if (next.length >= FIELDS_NEEDED) onDone?.();
    await sleep(900);
    setMarked(new Set());
    setPos(randomField());
  };

  /* ───── fully automated run ───── */
  const tween = (ms, fn) =>
    new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        if (run.current.cancelled) return resolve();
        const t = Math.min(1, (now - t0) / ms);
        fn(ease(t));
        t < 1 ? requestAnimationFrame(step) : resolve();
      };
      requestAnimationFrame(step);
    });

  const autoRun = async () => {
    run.current = { cancelled: false };
    const live = () => !run.current.cancelled;
    setFields([]);
    setMarked(new Set());
    setOil(false);
    setObj(10);
    setFocus(30);
    setAuto('Low-power scan (10×) — locating a thick, well-stained area…');
    const start = { ...posRef.current };
    const scanTo = randomField();
    await tween(1200, (t) => setFocus(30 + t * 8));
    await tween(1600, (t) => setPos({ x: start.x + (scanTo.x - start.x) * t, y: start.y + (scanTo.y - start.y) * t }));
    if (!live()) return;
    setAuto('Switching to 40×…');
    setObj(40);
    await tween(700, (t) => setFocus(38 + t * 8));
    if (!live()) return;
    setAuto('Placing a drop of immersion oil · switching to 100× oil objective');
    await sleep(600);
    setOil(true);
    setObj(100);
    setFocus(40);
    await sleep(300);
    setAuto('Fine focusing…');
    await tween(1100, (t) => setFocus(40 + t * 14));
    const counts = [];
    for (let f = 1; f <= FIELDS_NEEDED && live(); f++) {
      setAuto(`Field ${f} / ${FIELDS_NEEDED} · moving stage`);
      const from = { ...posRef.current };
      const to = randomField();
      setMarked(new Set());
      await tween(650, (t) => setPos({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }));
      const found = rodsInField(to);
      setAuto(`Field ${f} / ${FIELDS_NEEDED} · counting acid-fast bacilli`);
      const m = new Set();
      for (const i of found) {
        if (!live()) return;
        m.add(i);
        setMarked(new Set(m));
        await sleep(140);
      }
      counts.push(found.length);
      setFields([...counts]);
      await sleep(450);
    }
    if (!live()) return;
    setAuto(null);
    onDone?.();
  };
  const stopAuto = () => {
    run.current.cancelled = true;
    setAuto(null);
  };

  const avg = fields.length ? fields.reduce((a, b) => a + b, 0) / fields.length : 0;
  const result = fields.length >= FIELDS_NEEDED ? grade(avg, fields.length) : null;
  const status =
    auto ||
    (obj !== 100 ? 'Scan at low power, then switch to 100× oil immersion — or press Auto run.' : !oil ? 'Add a drop of immersion oil — without it the 100× image is dim and blurred.' : blur > 3 ? 'Turn the fine focus until the field is sharp.' : 'Sharp. Red beaded rods are acid-fast bacilli. Record the field to count them.');

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)]">
      <div className="flex flex-col rounded-2xl border border-sim-line bg-sim-panel p-4">
        <div className="relative aspect-square max-h-[620px] w-full">
          <canvas
            ref={ref}
            className={`absolute inset-0 h-full w-full touch-none ${auto ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => (drag.current = null)}
            aria-label="Microscope field of a Ziehl–Neelsen stained sputum smear"
          />
          <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-white/70">
            {O.label} · stage X {Math.round(pos.x / 24)} Y {Math.round(pos.y / 24)}
          </span>
          {auto && <span className="pointer-events-none absolute right-2 top-2 animate-pulse rounded bg-saffron px-2 py-1 text-[11px] font-semibold text-black">AUTO</span>}
        </div>
        <p className={`mt-3 text-center text-[13px] ${auto ? 'text-saffron' : 'text-sim-dim'}`}>{status}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          {auto ? (
            <button onClick={stopAuto} className="flex w-full items-center justify-center gap-2 rounded-lg bg-mon-bp py-3 text-[14px] font-semibold text-black">
              <Square size={15} /> Stop automated run
            </button>
          ) : (
            <button onClick={autoRun} className="flex w-full items-center justify-center gap-2 rounded-lg bg-saffron py-3 text-[14px] font-semibold text-black hover:brightness-110">
              {result ? <RotateCcw size={15} /> : <Play size={15} />} {result ? 'Run again' : 'Auto run — scan, focus, count & grade'}
            </button>
          )}
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Manual controls</p>
          <div className={`mt-2 grid grid-cols-3 gap-2 ${auto ? 'pointer-events-none opacity-40' : ''}`}>
            {Object.entries(OBJ).map(([k, o]) => (
              <button key={k} onClick={() => setObj(+k)} className={`rounded-lg py-2 text-[13px] font-semibold ${obj === +k ? 'bg-ivory text-black' : 'bg-sim-panel2 text-sim-text hover:bg-white/10'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <div className={auto ? 'pointer-events-none opacity-40' : ''}>
            <button onClick={() => setOil((o) => !o)} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium ${oil ? 'bg-amber-200/15 text-amber-200' : 'bg-sim-panel2 text-sim-dim hover:text-sim-text'}`}>
              <Droplet size={14} /> {oil ? 'Immersion oil applied' : 'Apply immersion oil'}
            </button>
            <label className="mt-4 block text-[12px] text-sim-dim">
              Fine focus
              <input type="range" min="0" max="100" value={focus} onChange={(e) => setFocus(+e.target.value)} className="mt-1 w-full accent-[#E0A33A]" />
            </label>
            <label className="mt-2 block text-[12px] text-sim-dim">
              <Lightbulb size={12} className="mr-1 inline" />
              Light intensity
              <input type="range" min="0.5" max="1.4" step="0.02" value={light} onChange={(e) => setLight(+e.target.value)} className="mt-1 w-full accent-[#E0A33A]" />
            </label>
            <button onClick={recordField} disabled={obj !== 100 || blur > 3} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-sim-panel2 py-2.5 text-[13px] font-medium text-sim-text hover:bg-white/10 disabled:opacity-30">
              <Shuffle size={14} /> Record this field &amp; move stage
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-2xl border border-sim-line bg-sim-panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Count</p>
            <span className="text-[12px] text-sim-dim">
              {fields.length} / {FIELDS_NEEDED} fields
            </span>
          </div>
          {/* per-field bars */}
          <div className="mt-3 flex h-16 items-end gap-1.5">
            {Array.from({ length: FIELDS_NEEDED }, (_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-sm bg-mon-bp/80 transition-all duration-300" style={{ height: fields[i] != null ? `${Math.max(6, fields[i] * 6)}px` : '2px', opacity: fields[i] != null ? 1 : 0.2 }} />
                <span className="text-[10px] text-sim-dim">{fields[i] ?? '·'}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-sim-dim">
            In view now: <span className="font-semibold text-sim-text">{marked.size}</span> AFB · mean so far <span className="font-semibold text-sim-text">{avg.toFixed(1)}</span> / field
          </p>
          {result && (
            <div className="mt-4 rounded-xl bg-mon-bp/10 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mon-bp">Smear result</p>
              <p className="mt-1 font-serif text-2xl text-sim-text">
                {result.g === 'Negative' ? 'No AFB seen' : `AFB seen · ${result.g}`}
              </p>
              <p className="text-[13px] text-sim-dim">
                {result.d} (mean {avg.toFixed(1)} per field)
              </p>
            </div>
          )}
          <table className="mt-4 w-full text-[12px] text-sim-dim">
            <tbody>
              {[
                ['> 10 / field', '3+'],
                ['1–10 / field', '2+'],
                ['10–99 / 100 fields', '1+'],
                ['1–9 / 100 fields', 'Scanty'],
              ].map(([a, b]) => (
                <tr key={b} className={`border-t border-sim-line ${result?.g === b ? 'font-semibold text-saffron' : ''}`}>
                  <td className="py-1.5">{a}</td>
                  <td className="py-1.5 text-right">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-sim-dim/70">Grading per NTEP. Real reporting examines 50–100 fields; 10 are used here.</p>
        </div>
      </div>
    </div>
  );
}
