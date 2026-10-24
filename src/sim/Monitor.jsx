import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import useCanvas from './useCanvas';
import { banner, vitals } from './simData';
import { beep, getCtx } from './audio';

const g = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));

/** ECG lead II from Gaussian P-QRS-T waves (time since beat start, seconds) */
function ecg(u) {
  return 0.11 * g(u, 0.08, 0.022) - 0.1 * g(u, 0.2, 0.008) + 1.0 * g(u, 0.222, 0.0095) - 0.24 * g(u, 0.246, 0.01) + 0.28 * g(u, 0.45, 0.048);
}
/** plethysmograph: steep upstroke + dicrotic notch, ~0.25 s after R */
function pleth(u) {
  return g(u, 0.14, 0.055) + 0.38 * g(u, 0.34, 0.07);
}

const CH = [
  { key: 'ecg', label: 'II', color: '#4ADE80', gain: 1, scale: '1 mV' },
  { key: 'pleth', label: 'Pleth', color: '#FACC15', gain: 1 },
  { key: 'resp', label: 'Resp', color: '#E5E7EB', gain: 1 },
];

export default function Monitor({ onSeen }) {
  const [sound, setSound] = useState(false);
  const [alarmsOn, setAlarmsOn] = useState(true);
  const [nums, setNums] = useState({ hr: vitals.hr, spo2: vitals.spo2, rr: vitals.rr });
  const [nibp, setNibp] = useState({ state: 'done', sys: vitals.sys, dia: vitals.dia, at: new Date() });
  const [clock, setClock] = useState(new Date());
  const soundRef = useRef(sound);
  soundRef.current = sound;

  useEffect(() => {
    onSeen?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // gently drifting numerics like a real monitor
  useEffect(() => {
    const id = setInterval(() => {
      setNums({
        hr: vitals.hr + Math.round((Math.random() - 0.5) * 4),
        spo2: vitals.spo2 + (Math.random() < 0.2 ? -1 : 0),
        rr: vitals.rr + Math.round((Math.random() - 0.5) * 2),
      });
      setClock(new Date());
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // simulation state kept outside React for 60 fps drawing
  const sim = useRef({ t: 0, beatStart: 0, rri: 60 / vitals.hr, x: 0, bufs: null, beeped: false });

  const canvasRef = useCanvas((ctx, w, h, dt) => {
    const s = sim.current;
    const rows = CH.length;
    const rowH = h / rows;
    const W = Math.floor(w);
    if (!s.bufs || s.bufs[0].length !== W) {
      s.bufs = CH.map(() => new Float32Array(W).fill(NaN));
      s.x = 0;
    }
    const speed = Math.max(90, w / 6); // px per second (~25 mm/s look)
    const steps = Math.max(1, Math.round(speed * dt));
    for (let i = 0; i < steps; i++) {
      s.t += 1 / speed;
      if (s.t - s.beatStart >= s.rri) {
        s.beatStart += s.rri;
        s.rri = (60 / vitals.hr) * (1 + 0.035 * Math.sin(s.t * 0.35) + (Math.random() - 0.5) * 0.02);
        s.beeped = false;
      }
      const u = s.t - s.beatStart;
      if (!s.beeped && u >= 0.222) {
        s.beeped = true;
        if (soundRef.current) beep(vitals.spo2);
      }
      const prevBeat = s.beatStart - s.rri;
      const pu = u - 0.25 >= 0 ? u - 0.25 : s.t - prevBeat - 0.25;
      const respPhase = (s.t % (60 / vitals.rr)) / (60 / vitals.rr);
      const respV = respPhase < 0.42 ? 0.5 - 0.5 * Math.cos((respPhase / 0.42) * Math.PI) : 0.5 + 0.5 * Math.cos(((respPhase - 0.42) / 0.58) * Math.PI);
      const wander = 0.03 * Math.sin(s.t * 1.7);
      s.bufs[0][s.x] = ecg(u) + wander + (Math.random() - 0.5) * 0.015;
      s.bufs[1][s.x] = pleth(pu) * (1 + 0.06 * respV);
      s.bufs[2][s.x] = respV;
      s.x = (s.x + 1) % W;
      // erase ahead of the write head
      for (let k = 1; k < 14; k++) s.bufs.forEach((b) => (b[(s.x + k) % W] = NaN));
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    CH.forEach((c, r) => {
      const top = r * rowH;
      const buf = s.bufs[r];
      const mid = top + rowH * (c.key === 'ecg' ? 0.62 : 0.75);
      const amp = rowH * (c.key === 'ecg' ? 0.5 : 0.55);
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 3;
      ctx.beginPath();
      let pen = false;
      for (let x = 0; x < W; x++) {
        const v = buf[x];
        if (Number.isNaN(v)) {
          pen = false;
          continue;
        }
        const y = mid - v * amp;
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = c.color;
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(c.label, 8, top + 16);
      if (c.scale) {
        ctx.fillRect(8, mid - amp, 2, amp);
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(c.scale, 14, mid - amp + 9);
      }
      if (r > 0) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, top, w, 1);
      }
    });
  });

  const startNibp = () => {
    setNibp((n) => ({ ...n, state: 'measuring' }));
    setTimeout(() => {
      setNibp({ state: 'done', sys: vitals.sys + Math.round((Math.random() - 0.5) * 6), dia: vitals.dia + Math.round((Math.random() - 0.5) * 4), at: new Date() });
    }, 3500);
  };

  const rrHigh = nums.rr > 20;
  const map = Math.round((nibp.sys + 2 * nibp.dia) / 3);
  const tempC = ((vitals.tempF - 32) * 5) / 9;
  const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-full flex-col gap-4">
      {/* monitor bezel */}
      <div className="rounded-[22px] bg-[#2a2c2e] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_30px_60px_-30px_rgba(0,0,0,.8)]">
        <div className="overflow-hidden rounded-xl bg-black">
          {/* status bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5 text-[12px] text-white/70">
            <span>
              <span className="text-white">{banner.name}</span> · Bed OPD-3 · Adult
            </span>
            <span className={`rounded px-2 py-0.5 font-semibold ${alarmsOn && rrHigh ? 'animate-pulse bg-amber-400 text-black' : 'text-white/40'}`}>
              {alarmsOn ? (rrHigh ? '** RR HIGH' : 'No alarms') : 'ALARMS PAUSED'}
            </span>
            <span className="tabular-nums">{hhmm(clock)}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]">
            <canvas ref={canvasRef} className="h-[300px] w-full md:h-[360px]" aria-label="Live ECG, plethysmograph and respiration waveforms" />
            {/* numerics */}
            <div className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10 md:grid-cols-1 md:border-l md:border-t-0">
              <Num label="HR" unit="bpm" color="text-mon-ecg" value={nums.hr} sub="50 – 120" />
              <Num label="SpO₂" unit="%" color="text-mon-spo2" value={nums.spo2} sub={`PR ${nums.hr}`} />
              <Num label="RR" unit="rpm" color="text-mon-resp" value={nums.rr} sub="8 – 20" alarm={alarmsOn && rrHigh} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10">
            <div className="bg-black px-4 py-3">
              <div className="flex items-center justify-between text-[12px] text-mon-bp">
                <span className="font-semibold">NIBP mmHg</span>
                <span className="text-white/40">{nibp.state === 'measuring' ? 'Measuring…' : `Manual ${hhmm(nibp.at)}`}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-3 font-mono text-mon-bp">
                <span className="text-[2.2rem] leading-none tabular-nums">{nibp.state === 'measuring' ? '---/--' : `${nibp.sys}/${nibp.dia}`}</span>
                <span className="text-lg text-mon-bp/70">({nibp.state === 'measuring' ? '--' : map})</span>
              </div>
            </div>
            <div className="bg-black px-4 py-3">
              <div className="text-[12px] font-semibold text-mon-temp">Temp</div>
              <div className="mt-1 flex items-baseline gap-3 font-mono text-mon-temp">
                <span className="text-[2.2rem] leading-none tabular-nums">{tempC.toFixed(1)}</span>
                <span className="text-sm">°C · {vitals.tempF} °F</span>
              </div>
            </div>
          </div>
        </div>
        {/* hard keys */}
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          <Key onClick={startNibp} disabled={nibp.state === 'measuring'}>
            Start NIBP
          </Key>
          <Key
            onClick={() => {
              getCtx();
              setSound((s) => !s);
            }}
          >
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} QRS tone
          </Key>
          <Key onClick={() => setAlarmsOn((a) => !a)}>
            {alarmsOn ? <Bell size={14} /> : <BellOff size={14} />} {alarmsOn ? 'Pause alarms' : 'Resume alarms'}
          </Key>
          <span className="ml-auto hidden text-[11px] text-white/30 sm:block">Simulated · SpO₂ value assumed</span>
        </div>
      </div>

      <Interpret />
    </div>
  );
}

function Num({ label, unit, color, value, sub, alarm }) {
  return (
    <div className={`bg-black px-4 py-3 ${alarm ? 'animate-pulse' : ''}`}>
      <div className={`flex justify-between text-[12px] font-semibold ${color}`}>
        <span>{label}</span>
        <span className="font-normal opacity-60">{unit}</span>
      </div>
      <div className={`mt-1 font-mono text-[2.6rem] leading-none tabular-nums md:text-[3.2rem] ${alarm ? 'text-amber-400' : color}`}>{value}</div>
      <div className="mt-1 text-[11px] text-white/35">{sub}</div>
    </div>
  );
}

function Key({ children, ...p }) {
  return (
    <button {...p} className="flex items-center gap-1.5 rounded-md border border-black/40 bg-[#3a3d40] px-3 py-1.5 text-[12px] font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,.12)] hover:bg-[#46494c] disabled:opacity-40">
      {children}
    </button>
  );
}

function Interpret() {
  const rows = [
    ['Tachypnoea', 'RR 24/min — increased work of breathing from lung involvement'],
    ['Low-grade fever', '37.8 °C (100 °F) — typical evening rise of TB'],
    ['Heart rate high-normal', '98/min — fever and anaemia (Hb 10.2 g/dL)'],
    ['BP normal', 'Haemodynamically stable — suitable for outpatient care'],
  ];
  return (
    <div className="rounded-2xl border border-sim-line bg-sim-panel p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sim-dim">Interpretation</p>
      <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[14px] font-medium text-sim-text">{k}</dt>
            <dd className="text-[13px] text-sim-dim">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
