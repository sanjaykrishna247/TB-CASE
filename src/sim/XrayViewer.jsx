import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Contrast, Eye, Move, Ruler, RotateCcw, SunMedium, ZoomIn, HeartPulse } from 'lucide-react';
import { generateXray, PIXEL_MM, XR_H, XR_W } from './xrayGen';
import { banner } from './simData';

const TOOLS = [
  { id: 'wl', label: 'Window / level', icon: SunMedium, hint: 'Drag: ←→ contrast, ↑↓ brightness' },
  { id: 'pan', label: 'Pan', icon: Move, hint: 'Drag to move' },
  { id: 'zoom', label: 'Zoom', icon: ZoomIn, hint: 'Drag ↑↓ or scroll' },
  { id: 'measure', label: 'Measure', icon: Ruler, hint: 'Drag across a structure' },
];

export default function XrayViewer({ onDone }) {
  const xr = useMemo(() => generateXray(), []);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [tool, setTool] = useState('wl');
  const [view, setView] = useState({ zoom: 1, px: 0, py: 0, contrast: 1.05, bright: 1.05, invert: false });
  const [ann, setAnn] = useState(false);
  const [ctr, setCtr] = useState(false);
  const [measures, setMeasures] = useState([]);
  const drag = useRef(null);

  // fit image to the viewport
  const layout = useCallback(() => {
    const c = canvasRef.current;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const fit = Math.min(w / XR_W, h / XR_H) * 0.96;
    return { w, h, s: fit * view.zoom, ox: w / 2 - (XR_W * fit * view.zoom) / 2 + view.px, oy: h / 2 - (XR_H * fit * view.zoom) / 2 + view.py };
  }, [view]);

  const toImg = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const L = layout();
    return { x: (e.clientX - r.left - L.ox) / L.s, y: (e.clientY - r.top - L.oy) / L.s };
  };

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const L = layout();
    ctx.save();
    ctx.filter = `contrast(${view.contrast}) brightness(${view.bright})${view.invert ? ' invert(1)' : ''}`;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(xr.canvas, L.ox, L.oy, XR_W * L.s, XR_H * L.s);
    ctx.restore();

    const P = (x, y) => [L.ox + x * L.s, L.oy + y * L.s];
    ctx.font = '600 13px Inter, sans-serif';
    if (ann) {
      const [lx, ly] = P(xr.lesion.x, xr.lesion.y);
      ctx.strokeStyle = '#FACC15';
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(lx, ly, xr.lesion.r * L.s, xr.lesion.r * 0.8 * L.s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const [cx, cy] = P(xr.cavity.x, xr.cavity.y);
      ctx.strokeStyle = '#F87171';
      ctx.beginPath();
      ctx.moveTo(cx + 120 * L.s, cy - 120 * L.s);
      ctx.lineTo(cx + xr.cavity.r * 0.8 * L.s, cy - xr.cavity.r * 0.8 * L.s);
      ctx.stroke();
      ctx.fillStyle = '#F87171';
      ctx.fillText('Thick-walled cavity', cx + 124 * L.s, cy - 124 * L.s);
      ctx.fillStyle = '#FACC15';
      ctx.fillText('Patchy consolidation — left upper zone', lx - xr.lesion.r * L.s, ly + xr.lesion.r * 0.8 * L.s + 20);
    }
    if (ctr) {
      // cardiothoracic ratio at the widest heart level
      const yH = 760;
      const heart = [XR_W / 2 - 110, XR_W / 2 + 180];
      const thorax = [XR_W / 2 - 348, XR_W / 2 + 352];
      ctx.lineWidth = 2;
      [
        [heart, '#4ADE80', -14],
        [thorax, '#E5E7EB', 14],
      ].forEach(([[a, b2], col, dy]) => {
        const [x1, y1] = P(a, yH);
        const [x2] = P(b2, yH);
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(x1, y1 + dy);
        ctx.lineTo(x2, y1 + dy);
        ctx.moveTo(x1, y1 + dy - 6);
        ctx.lineTo(x1, y1 + dy + 6);
        ctx.moveTo(x2, y1 + dy - 6);
        ctx.lineTo(x2, y1 + dy + 6);
        ctx.stroke();
      });
      const ratio = (heart[1] - heart[0]) / (thorax[1] - thorax[0]);
      const [tx, ty] = P(XR_W / 2 - 340, 815);
      ctx.fillStyle = '#4ADE80';
      ctx.fillText(`CTR ${ratio.toFixed(2)} — normal (< 0.5)`, tx, ty);
    }
    measures.forEach((m) => {
      const [x1, y1] = P(m.a.x, m.a.y);
      const [x2, y2] = P(m.b.x, m.b.y);
      ctx.strokeStyle = '#38BDF8';
      ctx.fillStyle = '#38BDF8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      [
        [x1, y1],
        [x2, y2],
      ].forEach(([x, y]) => ctx.fillRect(x - 3, y - 3, 6, 6));
      const cm = (Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y) * PIXEL_MM) / 10;
      ctx.fillText(`${cm.toFixed(1)} cm`, x2 + 8, y2 - 8);
    });
  }, [view, ann, ctr, measures, xr, layout]);

  useEffect(() => {
    draw();
  }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  // wheel zoom (non-passive so the page doesn't scroll)
  useEffect(() => {
    const c = canvasRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      setView((v) => ({ ...v, zoom: Math.min(6, Math.max(0.6, v.zoom * (e.deltaY < 0 ? 1.1 : 0.9))) }));
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, []);

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, v: view, a: toImg(e) };
    if (tool === 'measure') setMeasures((m) => [...m, { a: drag.current.a, b: drag.current.a }]);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (tool === 'wl') setView({ ...d.v, contrast: Math.min(3, Math.max(0.3, d.v.contrast + dx / 300)), bright: Math.min(2.2, Math.max(0.3, d.v.bright - dy / 300)) });
    else if (tool === 'pan') setView({ ...d.v, px: d.v.px + dx, py: d.v.py + dy });
    else if (tool === 'zoom') setView({ ...d.v, zoom: Math.min(6, Math.max(0.6, d.v.zoom * (1 - dy / 250))) });
    else if (tool === 'measure') {
      const b = toImg(e);
      setMeasures((m) => [...m.slice(0, -1), { a: d.a, b }]);
    }
  };
  const up = () => (drag.current = null);

  const ww = Math.round(1500 / view.contrast);
  const wl = Math.round(-600 + (1 - view.bright) * 500);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <div className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-sim-line bg-black">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-sim-line bg-sim-panel px-2 py-2">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.hint} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] ${tool === t.id ? 'bg-saffron text-black' : 'text-sim-dim hover:bg-white/5 hover:text-sim-text'}`}>
              <t.icon size={14} /> <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-sim-line" />
          <button onClick={() => setView((v) => ({ ...v, invert: !v.invert }))} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] ${view.invert ? 'bg-white/10 text-sim-text' : 'text-sim-dim hover:text-sim-text'}`}>
            <Contrast size={14} /> <span className="hidden sm:inline">Invert</span>
          </button>
          <button onClick={() => setCtr((v) => !v)} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] ${ctr ? 'bg-white/10 text-sim-text' : 'text-sim-dim hover:text-sim-text'}`}>
            <HeartPulse size={14} /> <span className="hidden sm:inline">CTR</span>
          </button>
          <button
            onClick={() => {
              setView({ zoom: 1, px: 0, py: 0, contrast: 1.05, bright: 1.05, invert: false });
              setMeasures([]);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-sim-dim hover:text-sim-text"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
        {/* image */}
        <div ref={wrapRef} className="relative flex-1">
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full touch-none ${tool === 'pan' ? 'cursor-grab' : tool === 'measure' ? 'cursor-crosshair' : tool === 'zoom' ? 'cursor-zoom-in' : 'cursor-ns-resize'}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label="Chest X-ray, PA view"
          />
          {/* DICOM-style overlay */}
          <div className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] leading-tight text-white/75">
            <div>{banner.name}</div>
            <div>ID {banner.uhid}</div>
            <div>
              {banner.age}Y {banner.sex}
            </div>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 text-right font-mono text-[11px] leading-tight text-white/75">
            <div>CR · CHEST PA ERECT</div>
            <div>{today}</div>
            <div>Img 1/1</div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] leading-tight text-white/75">
            <div>
              W: {ww} L: {wl}
            </div>
            <div>Zoom {Math.round(view.zoom * 100)}%</div>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 text-right font-mono text-[11px] leading-tight text-white/75">
            <div>kVp 120 · mAs 2.5</div>
            <div>Simulated image</div>
          </div>
        </div>
      </div>

      {/* report */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Read the film</p>
          <ol className="mt-3 space-y-2 text-[13.5px] text-sim-dim">
            <li>1. Check name, side marker (R) and projection (PA).</li>
            <li>2. Compare both upper zones — drag on the image to adjust contrast.</li>
            <li>3. Measure the ring shadow in the left upper zone.</li>
            <li>4. Check heart size (CTR), angles and diaphragm.</li>
          </ol>
          <button
            onClick={() => {
              setAnn((a) => !a);
              onDone?.();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-saffron py-2.5 text-[14px] font-semibold text-black hover:brightness-110"
          >
            <Eye size={16} /> {ann ? 'Hide findings' : 'Show findings'}
          </button>
        </div>
        <div className={`flex-1 rounded-2xl border border-sim-line bg-sim-panel p-5 transition ${ann ? '' : 'opacity-40 blur-[3px]'}`} aria-hidden={!ann}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Radiology report</p>
          <dl className="mt-3 space-y-2.5 text-[13.5px]">
            <Rep k="Left upper zone" v="Patchy consolidation with a thick-walled cavity (~3 cm); fibrotic strands to the hilum" hl />
            <Rep k="Right lung" v="Clear" />
            <Rep k="Hila" v="Left hilum mildly prominent" />
            <Rep k="Heart" v="Normal size (CTR ≈ 0.42)" />
            <Rep k="CP angles / diaphragm" v="Sharp / normal" />
          </dl>
          <p className="mt-4 border-t border-sim-line pt-3 text-[14px] text-sim-text">
            <span className="font-semibold text-saffron">Impression: </span>
            Cavitating left upper lobe lesion — consistent with post-primary pulmonary tuberculosis.
          </p>
        </div>
      </div>
    </div>
  );
}

function Rep({ k, v, hl }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="text-sim-dim">{k}</dt>
      <dd className={hl ? 'font-medium text-mon-bp' : 'text-sim-text'}>{v}</dd>
    </div>
  );
}
