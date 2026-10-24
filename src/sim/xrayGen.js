/**
 * Procedural PA chest radiograph (grey-scale "attenuation" painting):
 * bright = dense (bone, heart, soft tissue), dark = air (lungs).
 * The patient's LEFT is on the image's RIGHT (standard PA view).
 * Includes a left-upper-lobe patchy consolidation with a thick-walled cavity.
 */
export const XR_W = 1000;
export const XR_H = 1150;
export const PIXEL_MM = 0.38; // ≈ 38 cm field of view

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function layer() {
  const c = document.createElement('canvas');
  c.width = XR_W;
  c.height = XR_H;
  return c;
}

function blurInto(dst, src, px, alpha = 1, op = 'source-over') {
  const ctx = dst.getContext('2d');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.filter = px ? `blur(${px}px)` : 'none';
  ctx.drawImage(src, 0, 0);
  ctx.restore();
}

const CX = XR_W / 2;

// lung outlines (image coordinates)
function rightLung(p) {
  // patient's right = image left
  p.moveTo(CX - 60, 230);
  p.bezierCurveTo(CX - 70, 165, CX - 140, 140, CX - 190, 170);
  p.bezierCurveTo(CX - 290, 230, CX - 330, 420, CX - 345, 640);
  p.bezierCurveTo(CX - 352, 760, CX - 345, 820, CX - 335, 855); // costophrenic angle
  p.bezierCurveTo(CX - 260, 790, CX - 160, 760, CX - 70, 790); // right dome (higher)
  p.bezierCurveTo(CX - 90, 700, CX - 70, 560, CX - 62, 470);
  p.closePath();
}
function leftLung(p) {
  p.moveTo(CX + 58, 235);
  p.bezierCurveTo(CX + 70, 170, CX + 140, 145, CX + 190, 175);
  p.bezierCurveTo(CX + 290, 235, CX + 335, 430, CX + 350, 660);
  p.bezierCurveTo(CX + 356, 780, CX + 350, 850, CX + 338, 890);
  p.bezierCurveTo(CX + 270, 830, CX + 200, 815, CX + 175, 830); // left dome (lower)
  p.bezierCurveTo(CX + 150, 760, CX + 110, 620, CX + 80, 520); // cardiac border
  p.bezierCurveTo(CX + 66, 430, CX + 60, 330, CX + 58, 235);
  p.closePath();
}

export function generateXray() {
  const r = rng(42);
  const out = layer();
  const o = out.getContext('2d');
  o.fillStyle = '#000';
  o.fillRect(0, 0, XR_W, XR_H);

  // 1 ── soft tissue body (neck, shoulders, chest wall, abdomen)
  const body = layer();
  let b = body.getContext('2d');
  b.fillStyle = '#6a6a6a';
  b.beginPath();
  b.moveTo(CX - 80, 0);
  b.lineTo(CX + 80, 0);
  b.bezierCurveTo(CX + 85, 80, CX + 120, 120, CX + 330, 150);
  b.bezierCurveTo(CX + 470, 170, CX + 500, 260, CX + 480, 420);
  b.bezierCurveTo(CX + 440, 700, CX + 430, 950, CX + 420, XR_H);
  b.lineTo(CX - 420, XR_H);
  b.bezierCurveTo(CX - 430, 950, CX - 440, 700, CX - 480, 420);
  b.bezierCurveTo(CX - 500, 260, CX - 470, 170, CX - 330, 150);
  b.bezierCurveTo(CX - 120, 120, CX - 85, 80, CX - 80, 0);
  b.fill();
  // humeral heads at the edges
  b.fillStyle = '#9a9a9a';
  [CX - 455, CX + 455].forEach((x) => {
    b.beginPath();
    b.ellipse(x, 230, 60, 70, 0, 0, Math.PI * 2);
    b.fill();
  });
  blurInto(out, body, 34);

  // 2 ── lungs: dark air spaces, slightly lighter towards the bases
  const lungs = layer();
  b = lungs.getContext('2d');
  const lg = b.createLinearGradient(0, 160, 0, 880);
  lg.addColorStop(0, '#2a2a2a');
  lg.addColorStop(0.55, '#303030');
  lg.addColorStop(1, '#474747');
  b.fillStyle = lg;
  b.beginPath();
  rightLung(b);
  b.fill();
  b.beginPath();
  leftLung(b);
  b.fill();
  blurInto(out, lungs, 14);

  // 3 ── mediastinum, heart, aortic knob
  const med = layer();
  b = med.getContext('2d');
  b.fillStyle = '#a8a8a8';
  b.beginPath();
  b.moveTo(CX - 62, 230);
  b.lineTo(CX + 58, 235);
  b.bezierCurveTo(CX + 66, 330, CX + 70, 380, CX + 108, 395); // aortic knob
  b.bezierCurveTo(CX + 125, 420, CX + 100, 450, CX + 92, 480);
  b.bezierCurveTo(CX + 120, 560, CX + 160, 700, CX + 185, 835); // left ventricle
  b.lineTo(CX - 75, 815);
  b.bezierCurveTo(CX - 110, 720, CX - 105, 610, CX - 72, 540); // right atrium
  b.bezierCurveTo(CX - 66, 430, CX - 62, 330, CX - 62, 230);
  b.fill();
  blurInto(out, med, 16, 0.8);
  // trachea air column + main bronchi
  const tr = layer();
  b = tr.getContext('2d');
  b.strokeStyle = '#000';
  b.lineCap = 'round';
  b.lineWidth = 34;
  b.beginPath();
  b.moveTo(CX + 4, 0);
  b.lineTo(CX + 6, 420);
  b.stroke();
  b.lineWidth = 20;
  b.beginPath();
  b.moveTo(CX + 6, 420);
  b.lineTo(CX - 80, 490);
  b.moveTo(CX + 6, 420);
  b.lineTo(CX + 95, 500);
  b.stroke();
  blurInto(out, tr, 7, 0.55);

  // 4 ── spine (vertebral bodies seen through the mediastinum)
  const sp = layer();
  b = sp.getContext('2d');
  for (let y = 40; y < XR_H; y += 52) {
    b.fillStyle = '#ffffff';
    b.beginPath();
    b.roundRect(CX - 34, y, 68, 42, 10);
    b.fill();
    b.fillStyle = '#ffffff';
    b.beginPath();
    b.ellipse(CX - 30, y + 18, 8, 11, 0, 0, Math.PI * 2);
    b.ellipse(CX + 30, y + 18, 8, 11, 0, 0, Math.PI * 2);
    b.fill();
  }
  blurInto(out, sp, 5, 0.1);

  // 5 ── ribs (posterior: near-horizontal from the spine, curving down laterally) + anterior ribs
  const ribs = layer();
  b = ribs.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const y = 175 + i * 64;
    const spread = 300 + Math.min(i, 5) * 12;
    for (const s of [-1, 1]) {
      b.lineWidth = 15 + i * 0.6;
      b.beginPath();
      b.moveTo(CX + s * 42, y);
      b.bezierCurveTo(CX + s * 140, y - 26, CX + s * (spread - 40), y - 6, CX + s * spread, y + 70 + i * 4);
      b.stroke();
    }
  }
  blurInto(out, ribs, 3.5, 0.11);
  // cortical edges make ribs read as bone
  const ribEdge = layer();
  b = ribEdge.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = 175 + i * 64;
    const spread = 300 + Math.min(i, 5) * 12;
    for (const s of [-1, 1]) {
      for (const off of [-8, 8]) {
        b.beginPath();
        b.moveTo(CX + s * 42, y + off);
        b.bezierCurveTo(CX + s * 140, y - 26 + off, CX + s * (spread - 40), y - 6 + off, CX + s * spread, y + 70 + i * 4 + off);
        b.stroke();
      }
    }
  }
  blurInto(out, ribEdge, 1.2, 0.07);
  const ant = layer();
  b = ant.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineWidth = 12;
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      b.beginPath();
      b.moveTo(CX + s * 330, 250 + i * 70);
      b.bezierCurveTo(CX + s * 260, 280 + i * 72, CX + s * 170, 330 + i * 74, CX + s * 90, 360 + i * 76);
      b.stroke();
    }
  }
  blurInto(out, ant, 4, 0.07);

  // 6 ── clavicles + scapular borders
  const cl = layer();
  b = cl.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineCap = 'round';
  b.lineWidth = 24;
  for (const s of [-1, 1]) {
    b.beginPath();
    b.moveTo(CX + s * 45, 205);
    b.bezierCurveTo(CX + s * 130, 185, CX + s * 200, 150, CX + s * 330, 160);
    b.stroke();
  }
  blurInto(out, cl, 3, 0.26);
  const sc = layer();
  b = sc.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineWidth = 6;
  for (const s of [-1, 1]) {
    b.beginPath();
    b.moveTo(CX + s * 390, 200);
    b.bezierCurveTo(CX + s * 360, 330, CX + s * 380, 460, CX + s * 410, 520);
    b.stroke();
  }
  blurInto(out, sc, 4, 0.12);

  // 7 ── pulmonary vessels branching from the hila
  const ves = layer();
  b = ves.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineCap = 'round';
  const branch = (x, y, ang, len, w, depth, side) => {
    if (depth === 0 || w < 0.6) return;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    b.lineWidth = w;
    b.beginPath();
    b.moveTo(x, y);
    b.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * 12, (y + y2) / 2 + (r() - 0.5) * 12, x2, y2);
    b.stroke();
    const n = 2;
    for (let k = 0; k < n; k++) branch(x2, y2, ang + (k ? 1 : -1) * (0.25 + r() * 0.35), len * (0.68 + r() * 0.15), w * 0.68, depth - 1, side);
  };
  for (const [hx, hy, s] of [
    [CX - 90, 500, -1],
    [CX + 105, 490, 1],
  ]) {
    for (const a of [-1.15, -0.55, 0.05, 0.55, 1.05]) {
      const ang = s < 0 ? Math.PI - a : a;
      branch(hx, hy, ang, 70 + r() * 25, 6.5, 6, s);
    }
  }
  b.globalCompositeOperation = 'destination-in';
  b.beginPath();
  rightLung(b);
  leftLung(b);
  b.fill();
  blurInto(out, ves, 2.2, 0.11);
  // hilar shadows
  const hil = layer();
  b = hil.getContext('2d');
  b.fillStyle = '#fff';
  b.beginPath();
  b.ellipse(CX - 92, 505, 32, 58, 0.2, 0, Math.PI * 2);
  b.ellipse(CX + 108, 495, 30, 55, -0.2, 0, Math.PI * 2);
  b.fill();
  blurInto(out, hil, 10, 0.18);

  // 8 ── gastric bubble under the left dome
  const gb = layer();
  b = gb.getContext('2d');
  b.fillStyle = '#000';
  b.beginPath();
  b.ellipse(CX + 245, 905, 62, 38, 0.1, 0, Math.PI * 2);
  b.fill();
  blurInto(out, gb, 10, 0.45);

  // 9 ── LEFT UPPER LOBE lesion (image right, upper zone)
  const lx = CX + 175;
  const ly = 330;
  const les = layer();
  b = les.getContext('2d');
  b.fillStyle = '#fff';
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = lx + Math.cos(a) * d * 125;
    const y = ly + Math.sin(a) * d * 95 + 10;
    b.globalAlpha = 0.3 + r() * 0.5;
    b.beginPath();
    b.arc(x, y, 8 + r() * 30, 0, Math.PI * 2);
    b.fill();
  }
  // fibrotic strands towards the hilum
  b.globalAlpha = 0.5;
  b.strokeStyle = '#fff';
  b.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    b.beginPath();
    b.moveTo(lx - 20 + r() * 30, ly + 40);
    b.quadraticCurveTo(lx - 60, ly + 110, CX + 110 + r() * 20, 470 + r() * 30);
    b.stroke();
  }
  b.globalCompositeOperation = 'destination-in';
  b.globalAlpha = 1;
  b.beginPath();
  leftLung(b);
  b.fill();
  blurInto(out, les, 9, 0.5);
  // thick-walled cavity
  const cav = layer();
  b = cav.getContext('2d');
  b.strokeStyle = '#fff';
  b.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    b.lineWidth = 10 + r() * 8;
    b.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) {
      const rr = 36 + Math.sin(a * 3 + k) * 4 + (r() - 0.5) * 3;
      const px = lx + 18 + Math.cos(a) * rr * 1.1;
      const py = ly - 18 + Math.sin(a) * rr * 0.92;
      a === 0 ? b.moveTo(px, py) : b.lineTo(px, py);
    }
    b.stroke();
  }
  blurInto(out, cav, 3.5, 0.3);
  const lum = layer();
  b = lum.getContext('2d');
  b.fillStyle = '#000';
  b.beginPath();
  b.ellipse(lx + 18, ly - 16, 27, 22, 0.3, 0, Math.PI * 2);
  b.fill();
  blurInto(out, lum, 3, 0.45);

  // 10 ── lead "R" marker, quantum noise, vignette
  o.save();
  o.fillStyle = 'rgba(255,255,255,.9)';
  o.font = 'bold 44px Arial';
  o.fillText('R', 70, 110);
  o.strokeStyle = 'rgba(255,255,255,.9)';
  o.lineWidth = 3;
  o.strokeRect(60, 68, 52, 54);
  o.restore();

  const img = o.getImageData(0, 0, XR_W, XR_H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() + r() + r() - 1.5) * 16;
    const v = Math.max(0, Math.min(255, d[i] + n));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  o.putImageData(img, 0, 0);
  const vg = o.createRadialGradient(CX, XR_H * 0.45, XR_W * 0.35, CX, XR_H * 0.5, XR_W * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  o.fillStyle = vg;
  o.fillRect(0, 0, XR_W, XR_H);

  return { canvas: out, lesion: { x: lx + 10, y: ly - 5, r: 140 }, cavity: { x: lx + 18, y: ly - 18, r: 40 } };
}
