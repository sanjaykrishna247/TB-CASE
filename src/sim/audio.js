/**
 * Tiny Web Audio engine — every sound is synthesised (no audio files):
 *  - breath sounds (vesicular / bronchial) with optional fine crackles
 *  - percussion notes (resonant / dull)
 *  - monitor beep
 * Browsers only allow audio after a user click, so call getCtx() from a handler.
 */
let ctx = null;
let master = null;
let noise = null;

export function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.8;
    // "stethoscope" tone: chest-piece cuts the highs
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    master.connect(lp).connect(ctx.destination);
    // 3 s of white noise, reused by everything
    noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const setVolume = (v) => master && (master.gain.value = v);

/** analyser tapped off the master bus (for the live waveform display) */
let analyser = null;
export function getAnalyser() {
  getCtx();
  if (!analyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.connect(analyser);
  }
  return analyser;
}

function noiseSource(t, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.start(t, Math.random() * 2);
  src.stop(t + dur + 0.05);
  return src;
}

/** one breath phase: filtered noise with a smooth swell */
function phase(t, dur, { gain, freq, q, peakAt = 0.5 }) {
  const src = noiseSource(t, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + dur * peakAt);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master);
}

/** fine crackles: short, high-pitched, explosive clicks (late inspiration) */
function crackles(t, dur, count = 12) {
  for (let i = 0; i < count; i++) {
    const at = t + dur * (0.45 + Math.random() * 0.5);
    const src = noiseSource(at, 0.012);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700 + Math.random() * 500;
    const g = ctx.createGain();
    const amp = 0.5 + Math.random() * 0.6;
    g.gain.setValueAtTime(amp, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.006 + Math.random() * 0.006);
    src.connect(hp).connect(g).connect(master);
  }
}

/**
 * Loop breath sounds at the patient's respiratory rate.
 * type: 'vesicular' | 'bronchial';  returns a stop() function.
 */
export function startBreathing(type = 'vesicular', { rr = 24, withCrackles = false } = {}) {
  getCtx();
  const cycle = 60 / rr;
  let next = ctx.currentTime + 0.05;
  const schedule = () => {
    while (next < ctx.currentTime + 0.6) {
      if (type === 'bronchial') {
        // harsh, hollow; expiration as long and loud as inspiration, with a gap between
        phase(next, cycle * 0.38, { gain: 0.55, freq: 950, q: 0.9, peakAt: 0.4 });
        phase(next + cycle * 0.46, cycle * 0.42, { gain: 0.6, freq: 1050, q: 0.9, peakAt: 0.35 });
      } else {
        // soft, low rustle; long inspiration, short faint expiration, no gap
        phase(next, cycle * 0.5, { gain: 0.45, freq: 260, q: 0.7, peakAt: 0.75 });
        phase(next + cycle * 0.5, cycle * 0.2, { gain: 0.12, freq: 220, q: 0.7, peakAt: 0.2 });
      }
      if (withCrackles) crackles(next, cycle * 0.38);
      next += cycle;
    }
  };
  schedule();
  const id = setInterval(schedule, 200);
  return () => clearInterval(id);
}

/** percussion note: resonant (air-filled lung) vs dull (consolidation) */
export function percuss(kind = 'resonant') {
  getCtx();
  const t = ctx.currentTime + 0.01;
  const dull = kind === 'dull';
  const decay = dull ? 0.07 : 0.32;
  const src = noiseSource(t, decay + 0.1);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = dull ? 320 : 130;
  bp.Q.value = dull ? 1.5 : 5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(dull ? 1.2 : 1.6, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(bp).connect(g).connect(master);
  // tap of the finger
  const osc = ctx.createOscillator();
  osc.frequency.value = dull ? 260 : 110;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.4, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.8);
  osc.connect(og).connect(master);
  osc.start(t);
  osc.stop(t + decay);
}

/** monitor QRS beep (pitch tracks SpO2 like real monitors) */
export function beep(spo2 = 95) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 600 + (spo2 - 85) * 25;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}
