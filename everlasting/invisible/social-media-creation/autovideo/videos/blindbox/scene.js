// 盲盒集齐问题：画面
// 美术方向：打烊后的玩具店橱窗。暗暖背景、木质展示柜、12 个代码画的小公仔。

const PAL = ['#ff9eb5', '#ffc48a', '#ffe58f', '#b8eea0', '#8fe3d9', '#8ec5ff',
  '#b9a7ff', '#f5a8ff', '#ff8f80', '#a6dcff', '#d6f5c8', '#f2d2bd'];
const GOLD = '#ffd56b';
const INK = '#2a1f2d';
const CREAM = '#fbf3e4';
const HID = 12; // 隐藏款的编号

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255];
  const tgt = k > 0 ? 255 : 0, a = Math.abs(k);
  const [r, g, b] = c.map(v => Math.round(v + (tgt - v) * a));
  return `rgb(${r},${g},${b})`;
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }

// ---------- 背景 ----------
const BOKEH = (() => {
  const rnd = mulberry32(7);
  const cols = ['#ffb86b', '#ff8fa3', '#9ad1ff', '#ffd98a'];
  return Array.from({ length: 28 }, () => ({
    x: rnd() * W, y: rnd() * H, r: 30 + rnd() * 110, c: cols[Math.floor(rnd() * 4)],
    a: 0.04 + rnd() * 0.07, vx: (rnd() - 0.5) * 6, vy: (rnd() - 0.5) * 4, ph: rnd() * 6,
  }));
})();

function drawBackground(ctx, t) {
  const g = ctx.createRadialGradient(960, 420, 80, 960, 540, 1250);
  g.addColorStop(0, '#33243d');
  g.addColorStop(0.55, '#1f1527');
  g.addColorStop(1, '#0d0912');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const b of BOKEH) {
    const x = (b.x + b.vx * t + W) % W, y = (b.y + b.vy * t + H) % H;
    const a = b.a * (0.75 + 0.25 * Math.sin(t * 0.6 + b.ph));
    const rg = ctx.createRadialGradient(x, y, 0, x, y, b.r);
    rg.addColorStop(0, rgba(b.c, a));
    rg.addColorStop(1, rgba(b.c, 0));
    ctx.fillStyle = rg;
    circle(ctx, x, y, b.r);
    ctx.fill();
  }
}

function drawOverlay(ctx, t) {
  const a = Math.max(1 - prog(t, 0, 0.6), prog(t, TL.duration - 1.8, TL.duration - 0.2));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
  const v = ctx.createRadialGradient(960, 540, 500, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ---------- 公仔 ----------
// (x, y) 是脚底中心，s 是缩放（头半径 34s）
function drawFigure(ctx, idx, x, y, s, o = {}) {
  const { alpha = 1, ghost = false, glow = 0, tilt = 0 } = o;
  if (alpha <= 0.002 || s <= 0) return;
  const r = 34 * s;
  const base = idx === HID ? GOLD : PAL[idx];
  const GF = 'rgba(255,236,214,0.07)';
  const f = c => (ghost ? GF : c);
  const hy = -1.05 * r - 0.85 * r;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  if (glow > 0) {
    const g = ctx.createRadialGradient(0, hy * 0.7, 0, 0, hy * 0.7, 3 * r);
    g.addColorStop(0, rgba(idx === HID ? GOLD : '#ffe2b8', 0.55 * glow));
    g.addColorStop(1, rgba('#ffe2b8', 0));
    ctx.fillStyle = g;
    circle(ctx, 0, hy * 0.7, 3 * r);
    ctx.fill();
  }
  const dark = shade(base, -0.22);
  // 头后面的配饰
  if (idx === HID && !ghost) {
    ctx.fillStyle = 'rgba(255,250,235,0.92)';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sg * 0.95 * r, -1.05 * r, 0.55 * r, 0.26 * r, sg * -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (idx === 0) {
    ctx.fillStyle = f(dark);
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * 0.9 * r, hy - 0.3 * r);
      ctx.lineTo(sg * 0.62 * r, hy - 1.2 * r);
      ctx.lineTo(sg * 0.12 * r, hy - 0.82 * r);
      ctx.closePath();
      ctx.fill();
    }
  } else if (idx === 1) {
    for (const sg of [-1, 1]) {
      ctx.save();
      ctx.translate(sg * 0.4 * r, hy - 1.2 * r);
      ctx.rotate(sg * 0.18);
      ctx.fillStyle = f(base);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.22 * r, 0.62 * r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f('#ffc2d1');
      ctx.beginPath(); ctx.ellipse(0, 0.05 * r, 0.11 * r, 0.45 * r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  } else if (idx === 4) {
    for (const sg of [-1, 1]) {
      ctx.fillStyle = f(dark); circle(ctx, sg * 0.72 * r, hy - 0.68 * r, 0.34 * r); ctx.fill();
      ctx.fillStyle = f(shade(base, 0.35)); circle(ctx, sg * 0.72 * r, hy - 0.68 * r, 0.17 * r); ctx.fill();
    }
  }
  // 身体
  const bg = ctx.createLinearGradient(0, -1.1 * r, 0, 0);
  bg.addColorStop(0, base); bg.addColorStop(1, dark);
  ctx.fillStyle = ghost ? GF : bg;
  roundRect(ctx, -0.62 * r, -1.1 * r, 1.24 * r, 1.1 * r, 0.42 * r);
  ctx.fill();
  ctx.fillStyle = f(shade(base, -0.1));
  for (const sg of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sg * 0.64 * r, -0.62 * r, 0.16 * r, 0.27 * r, sg * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // 头
  const hg = ctx.createRadialGradient(-0.3 * r, hy - 0.35 * r, 0.1 * r, 0, hy, r);
  hg.addColorStop(0, shade(base, 0.3)); hg.addColorStop(1, base);
  ctx.fillStyle = ghost ? GF : hg;
  circle(ctx, 0, hy, r);
  ctx.fill();
  // 头上面的配饰
  if (idx === 2) {
    ctx.strokeStyle = f('#5fbf6a'); ctx.lineWidth = 0.09 * r;
    ctx.beginPath(); ctx.moveTo(0, hy - 0.95 * r); ctx.lineTo(0, hy - 1.42 * r); ctx.stroke();
    ctx.fillStyle = f('#6fd17a');
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(sg * 0.24 * r, hy - 1.46 * r, 0.26 * r, 0.12 * r, sg * -0.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (idx === 3) {
    ctx.fillStyle = f(GOLD);
    ctx.beginPath();
    ctx.moveTo(-0.48 * r, hy - 0.82 * r);
    [[-0.48, -1.32], [-0.24, -1.05], [0, -1.42], [0.24, -1.05], [0.48, -1.32], [0.48, -0.82]]
      .forEach(([a, b]) => ctx.lineTo(a * r, hy + b * r));
    ctx.closePath(); ctx.fill();
    if (!ghost) { ctx.fillStyle = '#ff6f91'; circle(ctx, 0, hy - 1.0 * r, 0.08 * r); ctx.fill(); }
  } else if (idx === 5) {
    ctx.fillStyle = f('#fff3c4');
    ctx.beginPath(); ctx.moveTo(-0.14 * r, hy - 0.9 * r); ctx.lineTo(0.14 * r, hy - 0.9 * r); ctx.lineTo(0, hy - 1.62 * r); ctx.closePath(); ctx.fill();
  } else if (idx === 6) {
    ctx.fillStyle = f('#ff6f91');
    ctx.save(); ctx.translate(0.6 * r, hy - 0.62 * r);
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sg * 0.38 * r, -0.22 * r); ctx.lineTo(sg * 0.38 * r, 0.22 * r); ctx.closePath(); ctx.fill();
    }
    circle(ctx, 0, 0, 0.1 * r); ctx.fill();
    ctx.restore();
  } else if (idx === 7) {
    ctx.strokeStyle = f(INK); ctx.lineWidth = 0.06 * r;
    ctx.beginPath(); ctx.moveTo(0, hy - 0.98 * r); ctx.quadraticCurveTo(0.05 * r, hy - 1.35 * r, 0.28 * r, hy - 1.55 * r); ctx.stroke();
    ctx.fillStyle = f('#ff6f91'); circle(ctx, 0.28 * r, hy - 1.55 * r, 0.15 * r); ctx.fill();
  } else if (idx === 8) {
    ctx.fillStyle = f(shade(base, -0.35));
    ctx.beginPath(); ctx.ellipse(0, hy - 0.22 * r, 1.03 * r, 0.9 * r, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f(shade(base, 0.45));
    roundRect(ctx, -1.05 * r, hy - 0.32 * r, 2.1 * r, 0.24 * r, 0.1 * r); ctx.fill();
    circle(ctx, 0, hy - 1.15 * r, 0.2 * r); ctx.fill();
  } else if (idx === 9 || idx === HID) {
    ctx.strokeStyle = f(GOLD); ctx.lineWidth = 0.1 * r;
    ctx.beginPath(); ctx.ellipse(0, hy - 1.32 * r, 0.55 * r, 0.15 * r, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (idx === 10) {
    ctx.fillStyle = f('#e84a5f');
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sg * 0.25 * r, hy - 0.92 * r); ctx.lineTo(sg * 0.62 * r, hy - 0.72 * r);
      ctx.quadraticCurveTo(sg * 0.62 * r, hy - 1.2 * r, sg * 0.5 * r, hy - 1.38 * r); ctx.closePath(); ctx.fill();
    }
  } else if (idx === 11) {
    ctx.fillStyle = f('#ffd23f');
    star(ctx, -0.58 * r, hy - 0.62 * r, 0.24 * r, 0.1 * r);
    ctx.fill();
  }
  if (!ghost) {
    // 脸
    ctx.fillStyle = INK;
    for (const sg of [-1, 1]) { circle(ctx, sg * 0.34 * r, hy + 0.08 * r, 0.1 * r); ctx.fill(); }
    ctx.fillStyle = '#fff';
    for (const sg of [-1, 1]) { circle(ctx, sg * 0.34 * r - 0.03 * r, hy + 0.05 * r, 0.035 * r); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,110,140,0.42)';
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sg * 0.57 * r, hy + 0.32 * r, 0.15 * r, 0.09 * r, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 0.055 * r; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, hy + 0.2 * r, 0.12 * r, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,236,214,0.30)'; ctx.lineWidth = Math.max(1.5, 2.2 * s); ctx.setLineDash([6 * s, 6 * s]);
    circle(ctx, 0, hy, r); ctx.stroke();
    roundRect(ctx, -0.62 * r, -1.1 * r, 1.24 * r, 1.1 * r, 0.42 * r); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
const FIG_H = 3.4; // 公仔总高约为头半径的 3.4 倍

function star(ctx, x, y, R, r, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < 2 * n; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r : R;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function sparkle(ctx, x, y, R, a, color = '#fff6d8') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color;
  star(ctx, x, y, R, R * 0.18, 4); ctx.fill();
  ctx.restore();
}
function burst(ctx, x, y, k, seed, color = GOLD, n = 14, R = 110) {
  if (k <= 0 || k >= 1) return;
  const rnd = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const ang = rnd() * Math.PI * 2, d = R * (0.5 + rnd() * 0.6) * easeOut(k);
    sparkle(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, 6 + rnd() * 10, 1 - k, i % 3 ? '#fff6d8' : color);
  }
}

// ---------- 盲盒 ----------
// (x, y) 是盒底中心
function drawBox(ctx, x, y, w, o = {}) {
  const { lid = 0, alpha = 1, color = '#ff9eb5', scale = 1, mark = '?' } = o;
  if (alpha <= 0.002 || scale <= 0.001) return;
  const h = w * 0.95;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 4, w * 0.62, w * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(-w / 2, -h, w / 2, 0);
  g.addColorStop(0, '#fbf1e2'); g.addColorStop(1, '#e3cdb2');
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, -h, w, h, w * 0.06); ctx.fill();
  ctx.fillStyle = rgba(color.startsWith('#') ? color : '#ff9eb5', 0.9);
  ctx.fillRect(-w / 2, -h * 0.16, w, h * 0.08);
  circle(ctx, 0, -h * 0.55, w * 0.25); ctx.fill();
  text(ctx, mark, 0, -h * 0.55 + w * 0.13, { size: w * 0.36, family: 'Head', weight: 900, color: '#fff' });
  if (lid < 1) {
    ctx.save();
    ctx.translate(lid * w * 0.35, -h - lid * w * 0.75);
    ctx.rotate(lid * 0.8);
    ctx.globalAlpha *= 1 - lid;
    ctx.fillStyle = '#fff6ea';
    roundRect(ctx, -w * 0.55, -w * 0.17, w * 1.1, w * 0.19, w * 0.04); ctx.fill();
    ctx.fillStyle = rgba(color, 0.9);
    ctx.fillRect(-w * 0.55, -w * 0.05, w * 1.1, w * 0.04);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- 展示柜 ----------
const SW = 170, SH = 200, GAP = 16, PAD = 26;
const CW = 4 * SW + 3 * GAP + 2 * PAD, CH = 3 * SH + 2 * GAP + 2 * PAD;
function slot(cab, i) {
  const { cx, cy, sc } = cab;
  const c = i % 4, r = Math.floor(i / 4);
  const x = cx - (CW * sc) / 2 + (PAD + c * (SW + GAP)) * sc;
  const y = cy - (CH * sc) / 2 + (PAD + r * (SH + GAP)) * sc;
  return { x, y, w: SW * sc, h: SH * sc, bx: x + (SW * sc) / 2, by: y + (SH - 16) * sc, fs: 1.05 * sc };
}

function drawCabinet(ctx, cab, o = {}) {
  const { cx, cy, sc } = cab;
  const lit = o.lit || Array(12).fill(0);
  const pop = o.pop || Array(12).fill(0);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50 * sc; ctx.shadowOffsetY = 18 * sc;
  const wg = ctx.createLinearGradient(0, cy - (CH * sc) / 2, 0, cy + (CH * sc) / 2);
  wg.addColorStop(0, '#553b33'); wg.addColorStop(1, '#2e1f1f');
  ctx.fillStyle = wg;
  roundRect(ctx, cx - (CW * sc) / 2, cy - (CH * sc) / 2, CW * sc, CH * sc, 20 * sc); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,214,170,0.18)'; ctx.lineWidth = 2;
  roundRect(ctx, cx - (CW * sc) / 2 + 3, cy - (CH * sc) / 2 + 3, CW * sc - 6, CH * sc - 6, 18 * sc); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const s = slot(cab, i);
    ctx.save();
    roundRect(ctx, s.x, s.y, s.w, s.h, 10 * sc);
    ctx.clip();
    const rg = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
    rg.addColorStop(0, '#170f19'); rg.addColorStop(1, '#2b1f29');
    ctx.fillStyle = rg; ctx.fillRect(s.x, s.y, s.w, s.h);
    if (lit[i] > 0) {
      const sp = ctx.createRadialGradient(s.bx, s.y - 10 * sc, 0, s.bx, s.y, s.h * 1.15);
      sp.addColorStop(0, `rgba(255,214,160,${0.42 * lit[i]})`);
      sp.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = sp; ctx.fillRect(s.x, s.y, s.w, s.h);
    }
    ctx.fillStyle = '#4e3832';
    ctx.fillRect(s.x, s.by, s.w, s.y + s.h - s.by);
    ctx.restore();
    if (lit[i] < 1) drawFigure(ctx, i, s.bx, s.by, s.fs, { ghost: true, alpha: (1 - lit[i]) * (o.ghostAlpha ?? 1) });
    if (lit[i] > 0) drawFigure(ctx, i, s.bx, s.by, s.fs * (1 + 0.16 * pop[i]), { alpha: lit[i], glow: pop[i] });
    if (o.ring && o.ring.idx === i && o.ring.k > 0) {
      ctx.save();
      ctx.globalAlpha *= o.ring.k * (0.55 + 0.45 * Math.sin(o.ring.t * 6));
      ctx.strokeStyle = GOLD; ctx.lineWidth = 5 * sc; ctx.shadowColor = GOLD; ctx.shadowBlur = 24;
      roundRect(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 12 * sc); ctx.stroke();
      ctx.restore();
    }
  }
  const gl = ctx.createLinearGradient(cx - (CW * sc) / 2, cy - (CH * sc) / 2, cx + (CW * sc) / 2, cy + (CH * sc) / 2);
  gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.42, 'rgba(255,255,255,0.05)');
  gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = gl;
  roundRect(ctx, cx - (CW * sc) / 2, cy - (CH * sc) / 2, CW * sc, CH * sc, 20 * sc); ctx.fill();
  ctx.restore();
}
const lerpCab = (a, b, k) => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), sc: lerp(a.sc, b.sc, k) });
const quad = (p0, c, p1, k) => [
  (1 - k) * (1 - k) * p0[0] + 2 * (1 - k) * k * c[0] + k * k * p1[0],
  (1 - k) * (1 - k) * p0[1] + 2 * (1 - k) * k * c[1] + k * k * p1[1]];

// ---------- 演示拆盒 ----------
const CAB_C = { cx: 960, cy: 455, sc: 0.92 };
const CAB_L = { cx: 560, cy: 520, sc: 0.95 };
const STAGE = { x: 1400, y: 560, w: 150 };
const PILE = { cx: 1450, by: 935, dx: 56, dy: 46, s: 0.44 };
let DEMO = null;
const SFX = [];

function pilePos(j) {
  let row = 0, cap = 10;
  while (j >= cap) { j -= cap; row++; cap--; }
  return [PILE.cx + (j - (cap - 1) / 2) * PILE.dx, PILE.by - row * PILE.dy];
}

function setup() {
  const seq = DATA.sim.demo_sequence;
  const firsts = [], seen = new Set();
  seq.forEach((x, i) => { if (!seen.has(x)) { seen.add(x); firsts.push(i); } });
  const fast = sceneOf('fast'), last = sceneOf('last');
  const t6 = cue('fast', '前');
  const phases = [
    [0, firsts[5], fast.start + 0.35, t6 + 0.1],
    [firsts[5] + 1, firsts[10], t6 + 0.55, cue('slow', '手里')],
    [firsts[10] + 1, seq.length - 2, cue('slow', '每拆') - 0.1, last.start + 0.05],
  ];
  const times = [];
  for (const [a, b, t0, t1] of phases) {
    const n = b - a + 1;
    for (let k = 0; k < n; k++) times[a + k] = t0 + ((t1 - t0) * k) / n;
  }
  times[seq.length - 1] = cue('last', '最后') - 0.2;
  let dup = 0, got = 0;
  const draws = seq.map((fig, i) => {
    const t = times[i];
    const interval = i + 1 < seq.length ? times[i + 1] - t : 1.2;
    const d = clamp(interval * 1.2, 0.45, i + 1 < seq.length ? 0.9 : 1.1);
    const isNew = firsts.includes(i);
    const dr = { t, d, land: t + d, fig, isNew, i, dupIdx: isNew ? -1 : dup++, order: isNew ? got++ : -1 };
    SFX.push({ t: t + 0.2 * d, kind: 'pop', gain: 0.5 });
    SFX.push(isNew ? { t: dr.land, kind: 'ding', gain: 0.55, n: dr.order } : { t: dr.land, kind: 'tap', gain: 0.45 });
    return dr;
  });
  DEMO = { seq, firsts, draws, missing: seq[seq.length - 1] };
  setupSfx();
}

function demoState(t) {
  const lit = Array(12).fill(0), pop = Array(12).fill(0);
  let opened = 0, got = 0, dups = 0;
  for (const d of DEMO.draws) {
    if (t >= d.t) opened++;
    if (t >= d.land) {
      if (d.isNew) { lit[d.fig] = 1; got++; pop[d.fig] = Math.sin(Math.PI * prog(t, d.land, d.land + 0.35)); }
      else dups++;
    }
  }
  return { lit, pop, opened, got, dups };
}

function drawStageBox(ctx, t, d, cab) {
  const k = (t - d.t) / d.d;
  const appear = easeBack(clamp(k / 0.18));
  const lid = easeOut(prog(k, 0.2, 0.4));
  const rise = easeOut(prog(k, 0.28, 0.55));
  const boxA = 1 - prog(k, 0.55, 0.8);
  const fly = easeInOut(prog(k, 0.55, 1));
  const boxH = STAGE.w * 0.95;
  const s0 = 1.15;
  const p0 = [STAGE.x, lerp(STAGE.y + 60, STAGE.y - boxH - 14, rise)];
  let target, ts;
  if (d.isNew) { const s = slot(cab, d.fig); target = [s.bx, s.by]; ts = s.fs; }
  else { target = pilePos(d.dupIdx); ts = PILE.s; }
  if (k > 0.28) {
    ctx.save();
    if (fly <= 0) { ctx.beginPath(); ctx.rect(0, 0, W, STAGE.y - boxH * appear); ctx.clip(); }
    const ctl = [(p0[0] + target[0]) / 2, Math.min(p0[1], target[1]) - (d.isNew ? 220 : 120)];
    const p = fly > 0 ? quad(p0, ctl, target, fly) : p0;
    drawFigure(ctx, d.fig, p[0], p[1], lerp(s0, ts, fly), { glow: d.isNew ? 1 - fly : 0, tilt: Math.sin(fly * Math.PI) * (d.isNew ? 0.25 : -0.35) });
    ctx.restore();
  }
  drawBox(ctx, STAGE.x, STAGE.y, STAGE.w, { lid, alpha: boxA, scale: appear, color: PAL[(d.i * 5) % 12] });
  if (d.isNew && rise > 0.6 && fly < 0.3) burst(ctx, p0[0], p0[1] - 60, prog(k, 0.4, 0.75), d.i * 13 + 1, PAL[d.fig], 10, 100);
  if (d === DEMO.draws[DEMO.draws.length - 1]) burst(ctx, target[0], target[1] - 60, prog(t, d.land, d.land + 0.9), 99, GOLD, 22, 170);
}

function drawHud(ctx, t, st, cab, a = 1) {
  if (a <= 0) return;
  const y = cab.cy - (CH * cab.sc) / 2 - 38;
  richText(ctx, [['已拆 ', CREAM], [String(st.opened), GOLD], [' 个', CREAM]], cab.cx - 30, y,
    { size: 54, family: 'Head', weight: 900, align: 'right', alpha: a, shadow: 12 });
  const x0 = cab.cx + 10;
  text(ctx, '集齐', x0, y, { size: 38, family: 'Serif', weight: 700, color: CREAM, align: 'left', alpha: a });
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.globalAlpha *= a;
    const lit = st.lit[DEMO.seq[DEMO.firsts[i]]] > 0;
    ctx.fillStyle = lit ? PAL[DEMO.seq[DEMO.firsts[i]]] : 'rgba(255,236,214,0.16)';
    circle(ctx, x0 + 98 + i * 26, y - 13, 9); ctx.fill();
    ctx.restore();
  }
}

function drawDemo(ctx, t, a = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  const st = demoState(t);
  const ringK = st.got === 11 ? ramp(t, cue('slow', '手里'), cue('slow', '手里') + 0.4) : 0;
  drawCabinet(ctx, CAB_L, { lit: st.lit, pop: st.pop, ring: { idx: DEMO.missing, k: ringK, t } });
  // 重复的堆
  for (const d of DEMO.draws) {
    if (!d.isNew && t >= d.land) {
      const [x, y] = pilePos(d.dupIdx);
      drawFigure(ctx, d.fig, x, y, PILE.s * (1 + 0.2 * Math.sin(Math.PI * prog(t, d.land, d.land + 0.25))));
    }
  }
  if (st.dups > 0) {
    richText(ctx, [['重复 ', 'rgba(251,243,228,0.75)'], [String(st.dups), GOLD], [' 个', 'rgba(251,243,228,0.75)']],
      1850, 760, { size: 40, family: 'Serif', weight: 700, align: 'right' });
  }
  for (const d of DEMO.draws) if (t >= d.t && t <= d.land + 1) drawStageBox(ctx, t, d, CAB_L);
  drawHud(ctx, t, st, CAB_L);
  // “1/12”
  const kq = ramp(t, cue('slow', '十二分之一') - 0.1, cue('slow', '十二分之一') + 0.3) * (1 - ramp(t, sceneOf('last').start, sceneOf('last').start + 0.3));
  if (kq > 0) {
    const s = slot(CAB_L, DEMO.missing);
    text(ctx, '1/12', s.bx, s.y + s.h / 2 + 22, { size: 62 * (0.8 + 0.2 * easeBack(kq)), family: 'Head', weight: 900, color: GOLD, alpha: kq, shadow: 18 });
  }
  ctx.restore();
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  const t1 = cue('hook', '一个一个');
  const lit = Array.from({ length: 12 }, (_, i) => {
    const on = ramp(t, 0.35 + i * 0.13, 0.6 + i * 0.13, easeOut);
    return on * (1 - ramp(t, t1, t1 + 0.6));
  });
  const pop = Array.from({ length: 12 }, (_, i) => Math.sin(Math.PI * prog(t, 0.35 + i * 0.13, 0.75 + i * 0.13)));
  drawCabinet(ctx, CAB_C, { lit, pop });
  const kb = ramp(t, t1 + 0.2, t1 + 0.7, easeBack);
  const bob = Math.sin(t * 2.4) * 6;
  drawBox(ctx, 960, 945 + bob * kb, 118, { scale: kb, color: PAL[0] });
  const tq = cue('hook', '平均要买');
  richText(ctx, [['集齐 ', CREAM], ['12', GOLD], [' 款，要买几个？', CREAM]], 960, 92,
    { size: 64, family: 'Head', weight: 900, alpha: ramp(t, tq - 0.2, tq + 0.3), shadow: 16 });
};

SCENES.case = (ctx, t, s) => {
  const tBox = cue('case', '端'), tOpen = cue('case', '保证'), tSingle = cue('case', '可要是'), tSim = cue('case', '我们让');
  const move = ramp(t, tSingle, tSingle + 0.9);
  const cab = lerpCab(CAB_C, CAB_L, move);
  const reveal = ramp(t, tOpen, tOpen + 0.5) * (1 - ramp(t, tSingle - 0.2, tSingle + 0.4));
  const lit = Array.from({ length: 12 }, (_, i) => clamp(reveal * 1.6 - i * 0.05));
  const pop = Array.from({ length: 12 }, (_, i) => Math.sin(Math.PI * prog(t, tOpen + i * 0.03, tOpen + 0.4 + i * 0.03)));
  drawCabinet(ctx, cab, { lit, pop });
  for (let i = 0; i < 12; i++) {
    const sl = slot(cab, i);
    const ap = ramp(t, tBox + i * 0.06, tBox + 0.3 + i * 0.06, easeBack);
    const lid = ramp(t, tOpen + i * 0.03, tOpen + 0.3 + i * 0.03, easeOut);
    const fade = 1 - ramp(t, tOpen + 0.15 + i * 0.03, tOpen + 0.5 + i * 0.03);
    drawBox(ctx, sl.bx, sl.by, 112 * cab.sc, { scale: ap, lid, alpha: fade, color: PAL[i] });
  }
  const la = window01(t, tBox, tSingle + 0.2, 0.35);
  richText(ctx, [['整盒买：', CREAM], ['12', GOLD], [' 个各不相同', CREAM]], 960, 92, { size: 58, family: 'Head', weight: 900, alpha: la, shadow: 16 });
  // 单买
  const kb = ramp(t, tSingle + 0.5, tSingle + 1.0, easeBack);
  drawBox(ctx, STAGE.x, STAGE.y + Math.sin(t * 2.4) * 5, STAGE.w, { scale: kb, color: PAL[5] });
  text(ctx, '一次只买一个', STAGE.x, STAGE.y + 70, { size: 40, color: CREAM, alpha: kb * (1 - ramp(t, tSim - 0.2, tSim + 0.2)) });
  richText(ctx, [['每个都是 ', CREAM], ['1/12', GOLD], [' 的运气', CREAM]], STAGE.x, STAGE.y + 124,
    { size: 40, alpha: kb * (1 - ramp(t, tSim - 0.2, tSim + 0.2)) });
  // 模拟 10 万遍
  const ks = ramp(t, tSim, tSim + 0.4);
  if (ks > 0) {
    const n = Math.round(100000 * ramp(t, tSim + 0.1, cue('case', '10 万') + 0.6, k => k * k));
    richText(ctx, [['模拟 ', CREAM], [n.toLocaleString('en-US'), GOLD], [' 遍', CREAM]], STAGE.x, STAGE.y + 110,
      { size: 54, family: 'Head', weight: 900, alpha: ks, shadow: 14 });
    const rnd = mulberry32(5);
    for (let i = 0; i < 70; i++) {
      const sp = 500 + rnd() * 900, y = 120 + rnd() * 760, ph = rnd() * 3;
      const x = W + 80 - ((t - tSim + ph) * sp) % (W * 0.75);
      const a = ks * 0.5 * (1 - ramp(t, s.end - 0.6, s.end));
      if (x > 1000) drawBox(ctx, x, y, 26 + rnd() * 20, { alpha: a, color: PAL[i % 12] });
    }
  }
};

SCENES.fast = (ctx, t) => drawDemo(ctx, t);
SCENES.slow = (ctx, t) => drawDemo(ctx, t);

SCENES.last = (ctx, t, s) => {
  const tChart = cue('last', '平均要单独');
  drawDemo(ctx, t, 1 - ramp(t, tChart - 0.3, tChart + 0.2));
  const ka = ramp(t, tChart - 0.1, tChart + 0.4);
  if (ka <= 0) return;
  ctx.save();
  ctx.globalAlpha *= ka;
  const ex = DATA.sim.step_expect;
  const bw = 64, gap = 26, x0 = 960 - (12 * bw + 11 * gap) / 2, by = 820, ppx = 46;
  text(ctx, '集到第几款，平均要再拆几个', 960, 112, { size: 52, family: 'Head', weight: 900, color: CREAM, shadow: 14 });
  const tb = cue('last', '比前');
  for (let i = 0; i < 12; i++) {
    const g = ramp(t, tChart + 0.1 + i * 0.09, tChart + 0.6 + i * 0.09, easeOut);
    const h = ex[i] * ppx * g, x = x0 + i * (bw + gap);
    const col = PAL[DEMO.seq[DEMO.firsts[i]]];
    ctx.save();
    if (i === 11) { ctx.shadowColor = GOLD; ctx.shadowBlur = 30 * ramp(t, tb, tb + 0.5); }
    const bgr = ctx.createLinearGradient(0, by - h, 0, by);
    bgr.addColorStop(0, col); bgr.addColorStop(1, shade(col, -0.35));
    ctx.fillStyle = bgr;
    roundRect(ctx, x, by - h, bw, Math.max(h, 1), [8, 8, 0, 0]); ctx.fill();
    ctx.restore();
    const v = ex[i] >= 10 ? ex[i].toFixed(0) : (Math.round(ex[i] * 10) / 10).toString();
    text(ctx, v, x + bw / 2, by - h - 14, { size: i === 11 ? 48 : 32, family: i === 11 ? 'Head' : 'Serif', weight: 900, color: i === 11 ? GOLD : CREAM, alpha: g });
    text(ctx, `${i + 1}`, x + bw / 2, by + 42, { size: 30, family: 'Serif', weight: 700, color: 'rgba(251,243,228,0.7)', alpha: g });
    drawFigure(ctx, DEMO.seq[DEMO.firsts[i]], x + bw / 2, by + 118, 0.36, { alpha: g });
  }
  text(ctx, '第几款', x0 - 30, by + 42, { size: 26, family: 'Sans', weight: 400, color: 'rgba(251,243,228,0.55)', align: 'right' });
  // 前 6 款的括号
  const kbk = ramp(t, tb, tb + 0.5);
  if (kbk > 0) {
    const xa = x0, xb = x0 + 6 * bw + 5 * gap, yb = by - ex[5] * ppx - 70;
    ctx.save(); ctx.globalAlpha *= kbk;
    ctx.strokeStyle = CREAM; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xa, yb + 16); ctx.lineTo(xa, yb); ctx.lineTo(xb, yb); ctx.lineTo(xb, yb + 16); ctx.stroke();
    ctx.restore();
    richText(ctx, [['前 6 款加起来 ', CREAM], [DATA.sim.first6_expect.toFixed(1), GOLD], [' 个', CREAM]], (xa + xb) / 2, yb - 22,
      { size: 42, family: 'Serif', weight: 700, alpha: kbk });
  }
  ctx.restore();
};

SCENES.total = (ctx, t, s) => {
  const t0 = s.start + 0.15, tDup = cue('total', '其中'), tPrice = cue('total', '按一个');
  const seq = DEMO.seq, firstSet = new Set(DEMO.firsts);
  const cols = 10, tile = 74, gap = 14;
  const gx = 960 - (cols * tile + (cols - 1) * gap) / 2, gy = 250;
  const kd = ramp(t, tDup, tDup + 0.6);
  const n = seq.length;
  for (let i = 0; i < n; i++) {
    const k = ramp(t, t0 + i * 0.07, t0 + 0.3 + i * 0.07, easeBack);
    if (k <= 0) continue;
    const x = gx + (i % cols) * (tile + gap), y = gy + Math.floor(i / cols) * (tile + gap);
    const isNew = firstSet.has(i);
    const dim = isNew ? 0 : kd;
    ctx.save();
    ctx.translate(x + tile / 2, y + tile / 2); ctx.scale(k, k);
    ctx.globalAlpha *= 1 - 0.6 * dim;
    ctx.fillStyle = isNew ? rgba(PAL[seq[i]], 0.22 + 0.2 * kd) : 'rgba(255,236,214,0.08)';
    roundRect(ctx, -tile / 2, -tile / 2, tile, tile, 12); ctx.fill();
    if (isNew && kd > 0) { ctx.strokeStyle = rgba(PAL[seq[i]], kd); ctx.lineWidth = 3; ctx.stroke(); }
    drawFigure(ctx, seq[i], 0, tile / 2 - 6, 0.5);
    if (dim > 0) { ctx.fillStyle = `rgba(30,22,36,${0.55 * dim})`; roundRect(ctx, -tile / 2, -tile / 2, tile, tile, 12); ctx.fill(); }
    ctx.restore();
  }
  const cnt = Math.round(n * ramp(t, t0, t0 + n * 0.07 + 0.3, x => x));
  richText(ctx, [[String(cnt), GOLD], [' 个', CREAM]], 960, 170, { size: 96, family: 'Head', weight: 900, alpha: ramp(t, t0 - 0.1, t0 + 0.3), shadow: 18 });
  const ly = gy + 4 * (tile + gap) + 40;
  richText(ctx, [['新款 ', CREAM], ['12', GOLD], ['      重复 ', 'rgba(251,243,228,0.6)'], [String(n - 12), GOLD]], 960, ly,
    { size: 44, family: 'Serif', weight: 700, alpha: kd });
  const kp = ramp(t, tPrice, tPrice + 0.5);
  richText(ctx, [['37 个 × 69 元 ≈ ', CREAM], ['2500 多元', GOLD]], 960, ly + 110,
    { size: 64, family: 'Head', weight: 900, alpha: kp, shadow: 16 });
};

SCENES.spread = (ctx, t, s) => {
  const hist = DATA.sim.solo_hist, total = DATA.sim.trials;
  const lo = 12, hi = 100;
  const px0 = 250, px1 = 1690, by = 800, hmax = 470;
  const bw = (px1 - px0) / (hi - lo + 1);
  const peak = Math.max(...hist);
  const tHalf = cue('spread', '有一半'), tTen = cue('spread', '每 10'), t12 = cue('spread', '12 个正好');
  const k0 = s.start + 0.2;
  text(ctx, '10 万次模拟：集齐一套用了几个', 960, 112, { size: 52, family: 'Head', weight: 900, color: CREAM, shadow: 14, alpha: ramp(t, k0, k0 + 0.4) });
  const kh = ramp(t, tHalf, tHalf + 0.5), kt = ramp(t, tTen, tTen + 0.5);
  for (let v = lo; v <= hi; v++) {
    const g = ramp(t, k0 + (v - lo) * 0.018, k0 + 0.5 + (v - lo) * 0.018, easeOut);
    const h = ((hist[v] || 0) / peak) * hmax * g;
    let col = 'rgba(255,236,214,0.42)';
    if (v > 34) col = `rgba(255,${Math.round(lerp(236, 190, kh))},${Math.round(lerp(214, 120, kh))},${lerp(0.42, 0.85, kh)})`;
    if (v >= 55 && kt > 0) col = `rgba(255,${Math.round(lerp(190, 120, kt))},${Math.round(lerp(120, 130, kt))},${lerp(0.85, 0.95, kt)})`;
    ctx.fillStyle = col;
    roundRect(ctx, px0 + (v - lo) * bw + 1.5, by - h, bw - 3, Math.max(h, 0.5), [3, 3, 0, 0]); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,236,214,0.35)'; ctx.fillRect(px0, by, px1 - px0, 2);
  for (const v of [12, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    text(ctx, String(v), px0 + (v - lo + 0.5) * bw, by + 40, { size: 28, family: 'Serif', weight: 700, color: 'rgba(251,243,228,0.6)' });
  }
  text(ctx, '个', px1 + 30, by + 40, { size: 28, family: 'Serif', weight: 700, color: 'rgba(251,243,228,0.6)' });
  // 平均线
  const mx = px0 + (DATA.sim.solo.mean - lo + 0.5) * bw, km = ramp(t, k0 + 0.8, k0 + 1.3);
  ctx.save(); ctx.globalAlpha *= km; ctx.strokeStyle = CREAM; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, by); ctx.lineTo(mx, by - hmax - 40); ctx.stroke(); ctx.restore();
  richText(ctx, [['平均 ', CREAM], ['37', GOLD]], mx, by - hmax - 56, { size: 38, family: 'Serif', weight: 700, alpha: km });
  const ge = k => hist.slice(k).reduce((a, b) => a + b, 0) / total;
  richText(ctx, [['买了 34 个还没集齐：', CREAM], [`${Math.round(ge(35) * 100)}%`, '#ffbe78']], 1180, 380,
    { size: 40, family: 'Serif', weight: 700, alpha: kh, align: 'left' });
  richText(ctx, [['要买 55 个以上：', CREAM], [`${(ge(55) * 100).toFixed(1)}%`, '#ff7f8a']], 1180, 440,
    { size: 40, family: 'Serif', weight: 700, alpha: kt, align: 'left' });
  const k12 = ramp(t, t12, t12 + 0.5);
  if (k12 > 0) {
    const x = px0 + 0.5 * bw;
    ctx.save(); ctx.globalAlpha *= k12; ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, by - 8); ctx.lineTo(x + 40, by - 150); ctx.stroke();
    circle(ctx, x, by - 4, 7); ctx.fillStyle = GOLD; ctx.fill(); ctx.restore();
    richText(ctx, [['正好 12 个：', CREAM], [`${hist[12]}`, GOLD], [' 次', CREAM]], x + 30, by - 170,
      { size: 40, family: 'Serif', weight: 700, alpha: k12, align: 'left' });
  }
  text(ctx, `最多的一次：${DATA.sim.solo.max} 个`, px1, by - 60, { size: 30, family: 'Serif', weight: 700, color: 'rgba(251,243,228,0.55)', align: 'right', alpha: ramp(t, t12 + 1, t12 + 1.5) });
};

SCENES.hidden = (ctx, t, s) => {
  const tH = cue('hidden', '隐藏款'), tP = cue('hidden', '一百四十四分之一'), tAll = cue('hidden', '连它'),
    tN = cue('hidden', '平均要买'), tM = cue('hidden', '一万块');
  const mv = ramp(t, tAll, tAll + 0.9);
  const cab = lerpCab({ cx: 960, cy: 600, sc: 0.72 }, { cx: 470, cy: 600, sc: 0.62 }, mv);
  drawCabinet(ctx, cab, { lit: Array(12).fill(1) });
  // 第 13 格
  const kh = ramp(t, tH - 0.2, tH + 0.4, easeBack);
  const sw = SW * cab.sc * 1.1, sh = SH * cab.sc * 1.1;
  const hx = cab.cx, hyTop = cab.cy - (CH * cab.sc) / 2 - sh - 30;
  if (kh > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(kh);
    ctx.shadowColor = GOLD; ctx.shadowBlur = 30 + 10 * Math.sin(t * 3);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.fillStyle = '#1b121d';
    roundRect(ctx, hx - sw / 2, hyTop, sw, sh, 12); ctx.fill(); ctx.stroke();
    ctx.restore();
    const got = ramp(t, tN + 0.9, tN + 1.3);
    drawFigure(ctx, HID, hx, hyTop + sh - 16 * cab.sc, 1.05 * cab.sc * 1.1 * kh, { ghost: true, alpha: clamp(kh) * (1 - got) });
    drawFigure(ctx, HID, hx, hyTop + sh - 16 * cab.sc, 1.05 * cab.sc * 1.1 * (1 + 0.2 * Math.sin(Math.PI * got)), { alpha: got, glow: 0.8 });
    for (let i = 0; i < 5; i++) sparkle(ctx, hx + Math.cos(t * 1.3 + i * 1.26) * sw * 0.7, hyTop + sh / 2 + Math.sin(t * 1.3 + i * 1.26) * sh * 0.6, 9, clamp(kh) * (0.5 + 0.5 * Math.sin(t * 4 + i)));
  }
  const kp = ramp(t, tP - 0.1, tP + 0.4, easeBack);
  const px = lerp(1420, 470, mv), py = lerp(330, 90, mv);
  text(ctx, '1/144', px, py, { size: lerp(120, 64, mv) * (0.7 + 0.3 * clamp(kp)), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kp), shadow: 22 });
  text(ctx, '隐藏款', lerp(1420, 470, mv), lerp(410, 140, mv) + 10, { size: 40, color: CREAM, alpha: clamp(kp) * (1 - mv) });
  // 148 个盒子
  const kw = ramp(t, tN - 0.3, tN + 0.1);
  if (kw > 0) {
    const N = Math.round(DATA.sim.hidden_all.mean), cols = 14, cell = 50;
    const gx = 1000, gy = 230;
    const shown = Math.round(N * ramp(t, tN - 0.6, tN + 0.9, k => k * k));
    for (let i = 0; i < shown; i++) {
      const x = gx + (i % cols) * cell + cell / 2, y = gy + Math.floor(i / cols) * cell + cell;
      const last = i === N - 1;
      drawBox(ctx, x, y, 34, { color: last ? GOLD : PAL[(i * 7) % 12], alpha: 0.9, mark: last ? '★' : '?' });
    }
    richText(ctx, [[String(shown), GOLD], [' 个', CREAM]], gx + (cols * cell) / 2, 170, { size: 84, family: 'Head', weight: 900, alpha: kw, shadow: 16 });
    const km = ramp(t, tM - 0.1, tM + 0.4);
    richText(ctx, [[`${N} × 69 元 ≈ `, CREAM], ['1 万多元', GOLD]], gx + (cols * cell) / 2, 860, { size: 54, family: 'Head', weight: 900, alpha: km, shadow: 14 });
  }
};

SCENES.friends = (ctx, t, s) => {
  const tSwap = cue('friends', '找人换'), tTwo = cue('friends', '两个人'), t29 = cue('friends', '29'),
    tThree = cue('friends', '三个人'), t25 = cue('friends', '25'), tWhy = cue('friends', '因为');
  const k3 = ramp(t, tThree - 0.2, tThree + 0.6);
  const cabs2 = [{ cx: 620, cy: 330, sc: 0.46 }, { cx: 1300, cy: 330, sc: 0.46 }];
  const cabs3 = [{ cx: 420, cy: 330, sc: 0.42 }, { cx: 960, cy: 330, sc: 0.42 }, { cx: 1500, cy: 330, sc: 0.42 }];
  // 每个柜子缺的格子，和它重复多出来的（正好是别人缺的）
  const miss2 = [[2, 7, 10], [0, 5, 9]];
  const miss3 = [[1, 8], [4, 11], [3, 6]];
  const scheme = (cabs, miss, tStart, a) => {
    if (a <= 0) return;
    const n = cabs.length;
    const flights = [];
    miss.forEach((m, j) => m.forEach((fig, q) => {
      const from = (j + 1) % n; // 由下一个人把重复的给他
      flights.push({ fig, from, to: j, t0: tStart + (flights.length) * 0.28, q });
    }));
    cabs.forEach((cab, j) => {
      const lit = Array(12).fill(1);
      miss[j].forEach(f => { lit[f] = 0; });
      const pop = Array(12).fill(0);
      flights.forEach(fl => {
        if (fl.to === j) { const k = prog(t, fl.t0 + 0.6, fl.t0 + 0.7); lit[fl.fig] = k; pop[fl.fig] = Math.sin(Math.PI * prog(t, fl.t0 + 0.6, fl.t0 + 0.95)); }
      });
      drawCabinet(ctx, cab, { lit, pop, alpha: a });
      text(ctx, ['你', '朋友 A', '朋友 B'][j], cab.cx, cab.cy - (CH * cab.sc) / 2 - 22, { size: 34, color: CREAM, alpha: a });
    });
    // 每个人脚下多出来的重复
    flights.forEach(fl => {
      const src = cabs[fl.from], dst = slot(cabs[fl.to], fl.fig);
      const p0 = [src.cx + (fl.q - 1) * 52 + (fl.to * 13) % 26 - 13, src.cy + (CH * src.sc) / 2 + 80];
      const k = easeInOut(prog(t, fl.t0, fl.t0 + 0.65));
      if (k >= 1) return;
      const p = quad(p0, [(p0[0] + dst.bx) / 2, Math.min(p0[1], dst.by) - 200], [dst.bx, dst.by], k);
      drawFigure(ctx, fl.fig, p[0], p[1], lerp(0.4, dst.fs, k), { alpha: a, glow: k > 0 ? 0.6 : 0 });
    });
    return flights;
  };
  scheme(cabs2, miss2, tSwap - 0.1, 1 - k3);
  scheme(cabs3, miss3, tWhy, k3);
  // 每人要买几个
  const fr = DATA.sim.friends;
  const rows = [[1, 0], [2, t29 - 0.6], [3, t25 - 0.5]];
  const bx0 = 640, bl = 900, ry0 = 660, rh = 64;
  rows.forEach(([k, tk], i) => {
    const g = ramp(t, Math.max(tTwo - 0.4, tk), Math.max(tTwo - 0.4, tk) + 0.7, easeOut);
    if (g <= 0) return;
    const v = fr[k].per_person_mean, y = ry0 + i * rh;
    text(ctx, `${k} 个人`, bx0 - 24, y + 14, { size: 36, color: CREAM, align: 'right', alpha: clamp(g * 2) });
    ctx.fillStyle = i === 0 ? 'rgba(255,236,214,0.35)' : rgba(PAL[i === 1 ? 5 : 3], 0.9);
    roundRect(ctx, bx0, y - 18, (v / fr[1].per_person_mean) * bl * g, 40, 8); ctx.fill();
    const label = k === 3 ? '25.5' : String(Math.round(v));
    richText(ctx, [['每人 ', CREAM], [label, GOLD], [' 个', CREAM]], bx0 + (v / fr[1].per_person_mean) * bl * g + 20, y + 14,
      { size: 36, family: 'Serif', weight: 700, align: 'left', alpha: clamp(g * 2) });
  });
};

SCENES.end = (ctx, t, s) => {
  const tM = cue('end', '人多');
  const cab = { cx: 960, cy: 470, sc: 0.92 };
  const fly = easeInOut(prog(t, tM + 0.2, tM + 1.4));
  const land = prog(t, tM + 1.4, tM + 1.8);
  const lit = Array(12).fill(1);
  const m = DEMO.missing;
  lit[m] = land > 0 ? 1 : 0;
  const pop = Array(12).fill(0); pop[m] = Math.sin(Math.PI * land);
  const ringK = ramp(t, s.start + 0.3, s.start + 0.8) * (1 - (land > 0 ? 1 : 0));
  drawCabinet(ctx, cab, { lit, pop, ring: { idx: m, k: ringK, t } });
  if (fly > 0 && land <= 0) {
    const dst = slot(cab, m);
    const p = quad([2050, 300], [1600, -60], [dst.bx, dst.by], fly);
    drawFigure(ctx, m, p[0], p[1], lerp(0.7, dst.fs, fly), { glow: 0.8, tilt: (1 - fly) * 0.6 });
  }
  if (land > 0) burst(ctx, slot(cab, m).bx, slot(cab, m).by - 60, prog(t, tM + 1.4, tM + 2.4), 77, GOLD, 24, 180);
  const glowAll = ramp(t, tM + 1.6, tM + 2.6);
  if (glowAll > 0) {
    const g = ctx.createRadialGradient(960, 470, 100, 960, 470, 700);
    g.addColorStop(0, `rgba(255,214,160,${0.12 * glowAll})`); g.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 3);
  const cab = { cx: 960, cy: 400, sc: 1.0 };
  const lit = Array(12).fill(1);
  lit[8] = 0;
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawCabinet(ctx, cab, { lit, ring: { idx: 8, k: 1, t: Math.PI / 12 } });
  ctx.restore();
  const g = ctx.createLinearGradient(0, 380, 0, H);
  g.addColorStop(0, 'rgba(13,9,18,0)'); g.addColorStop(0.45, 'rgba(13,9,18,0.82)'); g.addColorStop(1, 'rgba(13,9,18,0.95)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  richText(ctx, [['一套 ', CREAM], ['12', GOLD], [' 款盲盒', CREAM]], 960, 690, { size: 120, family: 'Head', weight: 900, shadow: 30 });
  richText(ctx, [['集齐要买', CREAM], ['几个', '#ff8fa3'], ['？', CREAM]], 960, 860, { size: 150, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '电脑拆了 10 万遍', 960, 960, { size: 46, family: 'Sans', weight: 700, color: '#ff8fa3', spacing: 6 });
}

// ---------- 音效事件（除演示拆盒以外的部分） ----------
function setupSfx() {
  const add = (t, kind, gain = 0.5, extra = {}) => SFX.push({ t, kind, gain, ...extra });
  for (let i = 0; i < 12; i++) add(0.35 + i * 0.13, 'tick', 0.35, { n: i });
  add(cue('hook', '一个一个') + 0.25, 'pop', 0.5);
  const tb = cue('case', '端'), to = cue('case', '保证');
  for (let i = 0; i < 12; i++) add(tb + i * 0.06, 'tick', 0.25, { n: i });
  for (let i = 0; i < 12; i++) add(to + i * 0.03, 'pop', 0.18);
  add(to + 0.3, 'chime', 0.5);
  add(cue('case', '可要是') + 0.55, 'pop', 0.45);
  add(cue('case', '我们让'), 'whoosh', 0.45);
  add(cue('slow', '十二分之一'), 'shine', 0.45);
  add(DEMO.draws[DEMO.draws.length - 1].land, 'chime', 0.6);
  const tc = cue('last', '平均要单独');
  for (let i = 0; i < 12; i++) add(tc + 0.1 + i * 0.09, 'tick', 0.25, { n: i });
  const t0 = sceneOf('total').start + 0.15;
  for (let i = 0; i < DEMO.seq.length; i++) add(t0 + i * 0.07, 'tick', 0.18, { n: i % 12 });
  add(cue('total', '按一个'), 'coin', 0.5);
  add(sceneOf('spread').start + 0.2, 'whoosh', 0.35);
  add(cue('hidden', '隐藏款') - 0.2, 'shine', 0.5);
  add(cue('hidden', '一百四十四分之一'), 'pop', 0.4);
  add(cue('hidden', '平均要买') - 0.6, 'whoosh', 0.4);
  add(cue('hidden', '平均要买') + 0.9, 'chime', 0.5);
  add(cue('hidden', '一万块'), 'coin', 0.5);
  const ts = cue('friends', '找人换') - 0.1;
  for (let i = 0; i < 6; i++) add(ts + i * 0.28 + 0.65, 'ding', 0.35, { n: i + 4 });
  const tw = cue('friends', '因为');
  for (let i = 0; i < 6; i++) add(tw + i * 0.28 + 0.65, 'ding', 0.35, { n: i + 6 });
  const tm = cue('end', '人多');
  add(tm + 0.2, 'whoosh', 0.35);
  add(tm + 1.4, 'chime', 0.6);
}
