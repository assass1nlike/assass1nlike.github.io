// 果酱实验与选择过载：画面
// 美术方向：打烊后的食品店。深梅子色的夜，头顶吊灯的暖光，一罐罐果酱像小灯一样发光；
// 路过的人是一个个小圆头的人形，停下的人被灯照亮，买了的人变成一罐金色的果酱。
// 元分析部分用论文 Table 1 的 63 个真实效应量（meta.py → meta.json → DATA.meta）。

const CREAM = '#fbf1e6';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,241,230,0.62)';
const FAINT = 'rgba(251,241,230,0.35)';
const WARM = '#ff8a6b';   // 选项多 → 更糟
const COOL = '#7fd1c7';   // 选项多 → 更好
const JAM = ['#e0475b', '#f39a3d', '#7a5cd6', '#c2185b', '#f6c453', '#9bc53d', '#ff6f59', '#5b8def',
  '#b5179e', '#ffb347', '#e76f51', '#8e44ad', '#d62839', '#f4a261', '#43aa8b', '#ff9f1c',
  '#9d4edd', '#ef476f', '#ffd166', '#06a77d', '#c44536', '#f28482', '#6a4c93', '#e9c46a'];
const META = DATA.meta;

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, k) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, k)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function glowDot(ctx, x, y, r, color, a) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
}
function shuffled(n, seed) {
  const rnd = mulberry32(seed), a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 数字滚动
const roll = (t, a, b, v) => Math.round(v * ramp(t, a, b, easeOut));
const pop = (t, a, d = 0.35) => ramp(t, a, a + d, easeBack);

// ---------- 背景：夜里的食品店，吊灯暖光、果酱色的光斑 ----------
const BOKEH = (() => {
  const rnd = mulberry32(5);
  return Array.from({ length: 46 }, (_, i) => ({ x: rnd() * W, y: 120 + rnd() * (H - 200), r: 20 + rnd() * 60, c: JAM[i % JAM.length], ph: rnd() * 6, v: 0.05 + rnd() * 0.1 }));
})();
const LAMPS = [360, 960, 1560];
const warmth = t => ramp(t, TL.music.end - 7, TL.music.end - 3);

function drawBackground(ctx, t) {
  const w = warmth(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#2a1a2c', '#3a2430', w));
  g.addColorStop(0.55, mix('#1d1222', '#2a1a22', w));
  g.addColorStop(1, '#0f0912');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of BOKEH) {
    const x = b.x + Math.sin(t * b.v + b.ph) * 40, y = b.y + Math.cos(t * b.v * 0.8 + b.ph) * 20;
    glowDot(ctx, x, y, b.r, b.c, (0.035 + 0.05 * lv) * (0.7 + 0.3 * Math.sin(t * 0.5 + b.ph)));
  }
  // 吊灯照下来的光锥
  for (let i = 0; i < LAMPS.length; i++) {
    const x = LAMPS[i] + Math.sin(t * 0.4 + i * 2) * 6;
    const a = (0.035 + 0.04 * lv) * (1 + 0.8 * w);
    const lg = ctx.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, rgba('#ffcf8a', a * 1.6)); lg.addColorStop(1, rgba('#ffcf8a', 0));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 330, H); ctx.lineTo(x - 330, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < LAMPS.length; i++) {
    const x = LAMPS[i] + Math.sin(t * 0.4 + i * 2) * 6;
    ctx.strokeStyle = 'rgba(255,220,170,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(LAMPS[i], 0); ctx.lineTo(x, 34); ctx.stroke();
    ctx.fillStyle = '#3b2a30';
    ctx.beginPath(); ctx.moveTo(x - 34, 52); ctx.quadraticCurveTo(x, 18, x + 34, 52); ctx.closePath(); ctx.fill();
    glowDot(ctx, x, 56, 60, '#ffd9a0', 0.35 + 0.2 * lv);
  }
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 果酱罐：(x, y) 是罐底中点，s=1 时约 60×100 ----------
function drawJar(ctx, x, y, s, color, o = {}) {
  const { alpha = 1, glow = 0, lid = '#e8505b', lit = 1 } = o;
  if (alpha <= 0.002 || s <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -46, 110, color, 0.5 * glow);
  // 玻璃
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, -30, -80, 60, 80, 13); ctx.fill();
  // 果酱
  const jg = ctx.createLinearGradient(0, -70, 0, 0);
  jg.addColorStop(0, mix(color, '#ffffff', 0.18)); jg.addColorStop(1, mix(color, '#1a0a10', 0.35));
  ctx.fillStyle = jg;
  roundRect(ctx, -26, -68, 52, 64, 10); ctx.fill();
  if (lit < 1) { ctx.fillStyle = `rgba(20,12,22,${0.7 * (1 - lit)})`; roundRect(ctx, -30, -80, 60, 80, 13); ctx.fill(); }
  // 标签
  ctx.fillStyle = 'rgba(251,241,230,0.92)';
  roundRect(ctx, -19, -48, 38, 24, 4); ctx.fill();
  ctx.fillStyle = rgba(color, 0.9); circle(ctx, 0, -36, 5); ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  roundRect(ctx, -24, -70, 6, 46, 3); ctx.fill();
  // 格子布盖子
  ctx.save();
  roundRect(ctx, -35, -96, 70, 20, 7); ctx.clip();
  ctx.fillStyle = '#fbf1e6'; ctx.fillRect(-35, -96, 70, 20);
  ctx.fillStyle = rgba(lid, 0.85);
  for (let i = -35; i < 35; i += 14) ctx.fillRect(i, -96, 7, 20);
  ctx.fillStyle = rgba(lid, 0.45);
  for (let j = -96; j < -76; j += 10) ctx.fillRect(-35, j, 70, 5);
  ctx.restore();
  ctx.fillStyle = mix(lid, '#000000', 0.3);
  ctx.fillRect(-31, -79, 62, 4);
  if (lit < 1) { ctx.fillStyle = `rgba(20,12,22,${0.6 * (1 - lit)})`; roundRect(ctx, -35, -96, 70, 20, 7); ctx.fill(); }
  ctx.restore();
}

// ---------- 小人：(x, y) 是身体底边中点，r 为大小 ----------
function drawPerson(ctx, x, y, r, color, alpha = 1) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.95, r * 0.95, 0, Math.PI, Math.PI * 2); ctx.fill();
  circle(ctx, x, y - r * 1.45, r * 0.58); ctx.fill();
  ctx.restore();
}

// 货架前的人（背影），带一圈暖色轮廓光
function drawShopper(ctx, x, y, t) {
  glowDot(ctx, x, y - 160, 300, '#ffcf8a', 0.10 + 0.04 * barPulse(t));
  ctx.save();
  ctx.fillStyle = '#2b1d33';
  ctx.strokeStyle = 'rgba(255,200,140,0.45)'; ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(255,190,120,0.5)'; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.ellipse(x, y + 40, 160, 170, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
  circle(ctx, x, y - 200, 76); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- 试吃摊：cx 为中心，ty 为桌面高度，n = 6 或 24 ----------
// show(i) 返回第 i 罐的出现程度 0..1
function drawBooth(ctx, cx, ty, n, s, o = {}) {
  const { alpha = 1, show = () => 1, sign = '果酱试吃', cloth = '#d94a5a', glow = 0.6, lit = 1 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, ty); ctx.scale(s, s);
  glowDot(ctx, 0, -120, 420, '#ffcf8a', 0.16 * glow);
  // 招牌
  ctx.fillStyle = '#5a3a2e';
  ctx.fillRect(-196, -330, 8, 330); ctx.fillRect(188, -330, 8, 330);
  roundRect(ctx, -150, -372, 300, 74, 14); ctx.fillStyle = '#f4e3c8'; ctx.fill();
  ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, sign, 0, -322, { size: 44, family: 'Head', weight: 900, color: '#6b2a2a' });
  // 罐子
  if (n === 6) {
    for (let i = 0; i < 6; i++) {
      const k = show(i);
      drawJar(ctx, (i - 2.5) * 76, 0, 0.9 * clamp(k), JAM[i * 4 % 24], { alpha: clamp(k * 2), lid: JAM[(i * 4 + 7) % 24], lit });
    }
  } else {
    for (let r = 0; r < 3; r++) {
      const y = -r * 64;
      if (r > 0) { ctx.fillStyle = '#6b4636'; ctx.fillRect(-200, y - 2, 400, 8); }
      for (let c = 0; c < 8; c++) {
        const i = r * 8 + c, k = show(i);
        drawJar(ctx, (c - 3.5) * 50, y, 0.56 * clamp(k), JAM[i], { alpha: clamp(k * 2), lid: JAM[(i + 9) % 24], lit });
      }
    }
  }
  // 桌子 + 格子桌布
  ctx.save();
  roundRect(ctx, -230, 0, 460, 150, [6, 6, 16, 16]); ctx.clip();
  ctx.fillStyle = '#fbf1e6'; ctx.fillRect(-230, 0, 460, 150);
  ctx.fillStyle = rgba(cloth, 0.8);
  for (let i = -230; i < 230; i += 30) ctx.fillRect(i, 0, 15, 150);
  ctx.fillStyle = rgba(cloth, 0.45);
  for (let j = 0; j < 150; j += 30) ctx.fillRect(-230, j, 460, 15);
  const sh = ctx.createLinearGradient(0, 0, 0, 150);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(20,8,16,0.45)');
  ctx.fillStyle = sh; ctx.fillRect(-230, 0, 460, 150);
  ctx.restore();
  ctx.restore();
}

// ---------- 人群格子 ----------
function gridXY(i, cols, cx, y0, cell) {
  const c = i % cols, r = Math.floor(i / cols);
  return [cx - (cols - 1) * cell / 2 + c * cell, y0 + r * cell];
}
const PEOPLE_COL = ['#8a7f9e', '#7f8aa0', '#9a8ea3', '#8b8597'];
const STOP24 = new Set(shuffled(242, 7).slice(0, 145));   // 原文：242 人路过 24 种，145 人停下
const STOP6 = new Set(shuffled(260, 8).slice(0, 104));    // 原文：260 人路过 6 种，104 人停下
const BUY24 = new Set(shuffled(145, 9).slice(0, 4));      // 停下的 145 人中 4 人购买
const BUY6 = new Set(shuffled(104, 10).slice(0, 31));     // 停下的 104 人中 31 人购买

// ---------- 场景 ----------
const SCENES = {};

// 开头：一面越摆越满的果酱货架，前面站着一个人
SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2);
  const planks = [330, 520, 710], per = 15, gap = 92;
  const total = planks.length * per;
  const order = shuffled(total, 3);
  const z = 1 + 0.06 * ramp(t, t2, s.end, x => x);
  ctx.save();
  ctx.translate(960, 560); ctx.scale(z, z); ctx.translate(-960, -560);
  planks.forEach((py, r) => {
    ctx.fillStyle = '#4a2f2a'; ctx.fillRect(220, py, 1480, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(220, py + 16, 1480, 10);
  });
  const spot = ramp(t, t2, t2 + 1.0);
  for (let k = 0; k < total; k++) {
    const i = order[k];
    const r = Math.floor(i / per), c = i % per;
    // 罐子越来越快地摆上去
    const ta = 0.3 + 6.5 * Math.pow(k / total, 0.7) * 0.62;
    const kk = pop(t, ta, 0.3);
    const x = 960 + (c - (per - 1) / 2) * gap, y = planks[r];
    const isMe = r === 1 && c === 7;
    drawJar(ctx, x, y, 0.92 * clamp(kk), JAM[i % 24], { alpha: clamp(kk * 2), lid: JAM[(i + 5) % 24], lit: isMe ? 1 : 1 - 0.65 * spot, glow: isMe ? spot : 0 });
  }
  ctx.restore();
  // 犹豫的人（背影）
  const px = 960, py = 1010;
  drawShopper(ctx, px, py, t);
  const kq = ramp(t, t1, t1 + 0.4) * (1 - ramp(t, t2 + 0.6, t2 + 1.2));
  const QP = [[-220, 800], [220, 790], [-340, 890]];
  for (let i = 0; i < 3; i++) {
    const tq = beatAfter(t1, i), k = pop(t, tq);
    text(ctx, '?', px + QP[i][0], QP[i][1] + Math.sin(t * 3 + i) * 5, { size: 100, family: 'Head', weight: 900, color: GOLD, alpha: clamp(k) * kq, shadow: 20 });
  }
  const kn = ramp(t, 0.6, 1.5) * (1 - ramp(t, t2 - 0.4, t2));
  const shown = Math.min(total, Math.round(total * clamp((t - 0.3) / (6.5 * 0.62))));
  richText(ctx, [['货架上：', DIM], [String(shown), GOLD], [' 种', DIM]], 1650, 200, { size: 44, family: 'Serif', weight: 700, align: 'right', alpha: kn });
};

SCENES.setup = (ctx, t, s) => {
  const t0 = lineAt('setup', 0), t1 = lineAt('setup', 1), t2 = lineAt('setup', 2), t3 = lineAt('setup', 3);
  const ky = ramp(t, t0, t0 + 0.6) * (1 - ramp(t, t1 - 0.3, t1 + 0.2));
  const sy = 0.9 + 0.1 * ramp(t, t0, t0 + 0.8, easeOut);
  ctx.save(); ctx.translate(960, 520); ctx.scale(sy, sy);
  text(ctx, '2000', 0, 0, { size: 260, family: 'Head', weight: 900, color: GOLD, alpha: ky, shadow: 40 });
  ctx.restore();
  text(ctx, 'Iyengar & Lepper · 心理学论文', 960, 640, { size: 44, family: 'Serif', weight: 700, color: DIM, alpha: ky, spacing: 2 });
  const kb = ramp(t, t1, t1 + 0.7, easeOut);
  text(ctx, '加州 · 一家高档超市', 960, 150, { size: 54, family: 'Serif', weight: 700, color: CREAM, alpha: kb });
  if (kb <= 0) return;
  const n = t >= t3 ? 24 : 6;
  const show = n === 6
    ? i => pop(t, beatAfter(t2, Math.floor(i * 2 / 3)), 0.3)
    : i => pop(t, beatAfter(t3, Math.floor(i / 6)) + (i % 6) * 0.05, 0.3);
  const swap = t >= t3 ? ramp(t, t3 - 0.01, t3 + 0.2) : 1 - ramp(t, t3 - 0.25, t3);
  drawBooth(ctx, 900, 700 + (1 - kb) * 80, n, 1.15, { alpha: kb * Math.max(0.6, swap), show });
  // 右侧的数量标签
  if (t > t2) {
    const v = t >= t3 ? '24' : '6';
    const k = t >= t3 ? pop(t, t3) : pop(t, t2);
    richText(ctx, [[v, GOLD], [' 种', CREAM]], 1520, 560, { size: 120 * (0.8 + 0.2 * clamp(k)), family: 'Head', weight: 900, alpha: clamp(k), shadow: 24 });
  }
};

// 两个摊子并排，路过的人和停下的人
const COLS = 22, CELL = 27;
function crowd(ctx, t, cx, y0, N, stopSet, tIn, tStop, o = {}) {
  const { alpha = 1 } = o;
  for (let i = 0; i < N; i++) {
    const [x, y] = gridXY(i, COLS, cx, y0, CELL);
    const ta = tIn + (i % COLS) * 0.03 + Math.floor(i / COLS) * 0.05;
    const k = ramp(t, ta, ta + 0.3);
    if (k <= 0) continue;
    const st = stopSet.has(i);
    const ts = tStop + ((i * 37) % 97) / 97 * 1.0;
    const lit = st ? ramp(t, ts, ts + 0.25) : 0;
    const col = lit > 0 ? mix('#8a7f9e', '#ffc46b', lit) : PEOPLE_COL[i % 4];
    if (lit > 0) glowDot(ctx, x, y - 8, 22, '#ffc46b', 0.35 * lit);
    drawPerson(ctx, x, y + 6 + (1 - k) * 10, 9.5, col, alpha * k * (st ? 1 : 1 - 0.45 * ramp(t, tStop + 0.6, tStop + 1.4)));
  }
}
SCENES.stop = (ctx, t, s) => {
  const L = n => lineAt('stop', n);
  const XL = 500, XR = 1420;
  const kin = ramp(t, s.start, s.start + 0.8, easeOut);
  const z = 1.08 - 0.08 * kin;
  ctx.save();
  ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960, -540);
  drawBooth(ctx, XL, 330, 24, 0.62, { alpha: kin, glow: 0.6 + 0.4 * barPulse(t) * ramp(t, L(1), L(1) + 0.5) });
  drawBooth(ctx, XR, 330, 6, 0.62, { alpha: kin, glow: 0.6 + 0.4 * barPulse(t) * ramp(t, L(3), L(3) + 0.5) });
  richText(ctx, [['24', GOLD], [' 种', CREAM]], XL, 470, { size: 50, family: 'Head', weight: 900, alpha: kin });
  richText(ctx, [['6', GOLD], [' 种', CREAM]], XR, 470, { size: 50, family: 'Head', weight: 900, alpha: kin });
  ctx.restore();
  const y0 = 535;
  crowd(ctx, t, XL, y0, 242, STOP24, L(0), L(1));
  crowd(ctx, t, XR, y0, 260, STOP6, L(2), L(3));
  // 计数
  const cnt = (cx, tIn, tStop, N, S) => {
    const a = ramp(t, tIn, tIn + 0.4);
    if (a <= 0) return;
    const parts = [['路过 ', DIM], [String(roll(t, tIn, tIn + 1.2, N)), CREAM], [' 人', DIM]];
    if (t > tStop) parts.push(['　停下 ', DIM], [String(roll(t, tStop, tStop + 1.2, S)), GOLD], [' 人', DIM]);
    richText(ctx, parts, cx, 905, { size: 46, family: 'Serif', weight: 700, alpha: a });
  };
  cnt(XL, L(0), L(1), 242, 145);
  cnt(XR, L(2), L(3), 260, 104);
  // 60% 对 40%
  const kp = pop(t, L(4), 0.45);
  if (kp > 0) {
    for (const [cx, v] of [[XL, '60%'], [XR, '40%']]) {
      ctx.save(); ctx.globalAlpha *= clamp(kp);
      roundRect(ctx, cx - 190, 600, 380, 170, 30); ctx.fillStyle = 'rgba(24,14,26,0.82)'; ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.5); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      text(ctx, v, cx, 728, { size: 130 * (0.85 + 0.15 * clamp(kp)), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kp), shadow: 24 });
    }
    text(ctx, '停下来试吃的比例', 960, 700, { size: 36, family: 'Serif', weight: 700, color: DIM, alpha: clamp(kp) });
  }
};

// 优惠券
function drawCoupon(ctx, x, y, w, rot, alpha = 1) {
  if (alpha <= 0) return;
  const h = w * 0.5;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#f7e7c6';
  roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.04); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(160,90,60,0.5)'; ctx.setLineDash([w * 0.025, w * 0.02]); ctx.lineWidth = w * 0.008;
  ctx.beginPath(); ctx.moveTo(w * 0.18, -h / 2 + 8); ctx.lineTo(w * 0.18, h / 2 - 8); ctx.stroke();
  ctx.setLineDash([]);
  text(ctx, '果酱', -w * 0.14, -h * 0.08, { size: w * 0.09, family: 'Serif', weight: 700, color: '#7a3b2e' });
  text(ctx, '立减 $1', -w * 0.14, h * 0.22, { size: w * 0.14, family: 'Head', weight: 900, color: '#c2334a' });
  text(ctx, '7天', w * 0.335, h * 0.08, { size: w * 0.08, family: 'Head', weight: 900, color: '#7a3b2e' });
  ctx.restore();
}
SCENES.coupon = (ctx, t, s) => {
  const t0 = lineAt('coupon', 0), t1 = lineAt('coupon', 1);
  const total = 145 + 104;
  const rnd = mulberry32(31);
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2 + rnd() * 0.15;
    const tx = 960 + Math.cos(ang) * (720 + rnd() * 60), ty = 470 + Math.sin(ang) * 330, rot = (rnd() - 0.5) * 0.8;
    const ta = t0 + i * 0.045, k = ramp(t, ta, ta + 0.5, easeOut);
    drawCoupon(ctx, lerp(960, tx, k), lerp(470, ty, k), 170, rot * k, k * (1 - 0.6 * ramp(t, t1, t1 + 0.5)));
  }
  const kc = ramp(t, t0 + 0.2, t0 + 0.8, easeOut);
  drawCoupon(ctx, 960, 470 + (1 - kc) * 60, 520, -0.03, kc);
  richText(ctx, [['发出 ', DIM], [String(roll(t, t0, t0 + 1.6, total)), GOLD], [' 张', DIM]], 960, 690, { size: 52, family: 'Serif', weight: 700, alpha: kc });
  const kq = pop(t, t1, 0.4);
  if (kq > 0) {
    text(ctx, '一周内', 960, 260, { size: 64, family: 'Head', weight: 900, color: CREAM, alpha: clamp(kq), shadow: 20 });
    text(ctx, '?', 1300, 420, { size: 200 * (0.7 + 0.3 * clamp(kq)), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kq), shadow: 30 });
  }
};

// 停下的人里，谁买了
const RC = 15, RCELL = 34;
function buyers(ctx, t, cx, y0, N, buySet, tBuy, o = {}) {
  const { dimOthers = 0 } = o;
  for (let i = 0; i < N; i++) {
    const [x, y] = gridXY(i, RC, cx, y0, RCELL);
    const b = buySet.has(i);
    if (b) {
      const k = ramp(t, tBuy + (i % 7) * 0.06, tBuy + 0.4 + (i % 7) * 0.06, easeBack);
      if (k > 0.001) {
        drawJar(ctx, x, y + 18, 0.46 * clamp(k, 0, 1.3), '#ffb84d', { glow: 1, lid: '#e0475b' });
        continue;
      }
    }
    const fade = b ? 1 : 1 - 0.6 * dimOthers;
    drawPerson(ctx, x, y + 8, 11, '#ffc46b', 0.85 * fade);
  }
}
SCENES.reveal = (ctx, t, s) => {
  const L = n => lineAt('reveal', n);
  const XL = 500, XR = 1420, y0 = 270;
  const kOut = ramp(t, L(6) - 0.4, L(6) + 0.3);
  const kin = ramp(t, s.start, s.start + 0.6, easeOut);
  if (kOut < 1) {
    ctx.save(); ctx.globalAlpha *= (1 - kOut) * kin;
    richText(ctx, [['24', GOLD], [' 种那边', CREAM]], XL, 190, { size: 56, family: 'Head', weight: 900 });
    richText(ctx, [['6', GOLD], [' 种那边', CREAM]], XR, 190, { size: 56, family: 'Head', weight: 900 });
    const kR = ramp(t, L(2) - 0.2, L(2) + 0.4);
    buyers(ctx, t, XL, y0, 145, BUY24, L(1), { dimOthers: ramp(t, L(1), L(1) + 0.8) });
    ctx.save(); ctx.globalAlpha *= kR;
    buyers(ctx, t, XR, y0, 104, BUY6, L(3), { dimOthers: ramp(t, L(3), L(3) + 0.8) });
    ctx.restore();
    const c1 = ramp(t, L(1), L(1) + 0.4), c2 = ramp(t, L(3), L(3) + 0.4);
    richText(ctx, [['停下 145 人 · 买了 ', DIM], [String(roll(t, L(1), L(1) + 0.8, 4)), GOLD], [' 人', DIM]], XL, 700, { size: 44, family: 'Serif', weight: 700, alpha: c1 });
    richText(ctx, [['停下 104 人 · 买了 ', DIM], [String(roll(t, L(3), L(3) + 1.0, 31)), GOLD], [' 人', DIM]], XR, 700, { size: 44, family: 'Serif', weight: 700, alpha: c2 });
    const kp = pop(t, L(4), 0.5);
    const pulse = 1 + 0.04 * barPulse(t) * ramp(t, L(5), L(5) + 0.4);
    if (kp > 0) {
      ctx.save(); ctx.translate(XL, 860); ctx.scale(pulse, pulse);
      text(ctx, '3%', 0, 0, { size: 150 * (0.8 + 0.2 * clamp(kp)), family: 'Head', weight: 900, color: CREAM, alpha: clamp(kp), shadow: 24 });
      ctx.restore();
      ctx.save(); ctx.translate(XR, 860); ctx.scale(pulse, pulse);
      text(ctx, '30%', 0, 0, { size: 150 * (0.8 + 0.2 * clamp(kp)), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kp), shadow: 24 });
      ctx.restore();
      text(ctx, '购买比例', 960, 830, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: clamp(kp) });
    }
    ctx.restore();
  }
  // 论文
  const kP = ramp(t, L(6) - 0.1, L(6) + 0.6, easeOut);
  const kMany = ramp(t, L(7), L(7) + 1.0);
  if (kP > 0) {
    const sc = 1 - 0.35 * ramp(t, L(7), L(7) + 0.8);
    const yy = lerp(500, 460, ramp(t, L(7), L(7) + 0.8));
    // 到处都在讲：引号气泡
    if (kMany > 0) {
      const SPOTS = [[360, 210], [1560, 230], [300, 480], [1620, 470], [420, 760], [1500, 760], [800, 860], [1140, 140], [1180, 860], [760, 130]];
      for (let i = 0; i < SPOTS.length; i++) {
        const [x, y] = SPOTS[i], ta = L(7) + 0.2 + i * 0.3;
        const k = pop(t, ta, 0.35);
        if (k <= 0) continue;
        const big = t > L(8) ? 1 : 0;
        ctx.save(); ctx.globalAlpha *= clamp(k) * (0.55 + 0.45 * big);
        ctx.translate(x, y); ctx.scale(clamp(k, 0, 1.2), clamp(k, 0, 1.2));
        roundRect(ctx, -170, -40, 340, 72, 36); ctx.fillStyle = 'rgba(251,241,230,0.12)'; ctx.fill();
        ctx.strokeStyle = rgba(GOLD, 0.4); ctx.lineWidth = 2; ctx.stroke();
        text(ctx, i % 2 ? '少即是多' : '选择越多越不想买', 0, 10, { size: 32, family: 'Serif', weight: 700, color: CREAM });
        ctx.restore();
      }
    }
    ctx.save(); ctx.globalAlpha *= kP;
    ctx.translate(960, yy); ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#f6eddc';
    roundRect(ctx, -380, -230, 760, 460, 10); ctx.fill();
    ctx.shadowColor = 'transparent';
    text(ctx, 'When Choice Is Demotivating:', 0, -120, { size: 46, family: 'Serif', weight: 700, color: '#2b1d24' });
    text(ctx, 'Can One Desire Too Much of a Good Thing?', 0, -62, { size: 34, family: 'Serif', weight: 400, color: '#2b1d24' });
    text(ctx, '选择让人泄气', 0, 40, { size: 76, family: 'Head', weight: 900, color: '#b8323f' });
    ctx.fillStyle = 'rgba(43,29,36,0.18)';
    for (let i = 0; i < 3; i++) ctx.fillRect(-300, 100 + i * 26, 600 - i * 120, 8);
    text(ctx, 'Iyengar & Lepper · 2000 · JPSP', 0, 205, { size: 28, family: 'Sans', weight: 400, color: 'rgba(43,29,36,0.7)' });
    ctx.restore();
  }
};

// 德国重做
SCENES.redo = (ctx, t, s) => {
  const t0 = lineAt('redo', 0), t1 = lineAt('redo', 1);
  const k = ramp(t, t0, t0 + 0.7, easeOut);
  text(ctx, '德国 · 一家高档超市', 960, 200, { size: 56, family: 'Serif', weight: 700, color: CREAM, alpha: k });
  text(ctx, 'Scheibehenne（2008，博士论文）', 960, 260, { size: 34, family: 'Serif', weight: 400, color: DIM, alpha: k });
  // 重做：6 种和 24 种每拍切换
  let n = 6;
  if (t >= t1) n = Math.floor((t - t1) / TL.music.beat) % 2 ? 6 : 24;
  drawBooth(ctx, 960, 760 + (1 - k) * 60, n, 1.0, { alpha: k, cloth: '#4f7fd9', sign: '果酱试吃' });
  if (t >= t1) {
    const kk = pop(t, t1);
    richText(ctx, [[String(n), GOLD], [' 种', CREAM]], 1450, 560, { size: 110, family: 'Head', weight: 900, alpha: clamp(kk), shadow: 20 });
  }
};

// 一样的设定，504 人；然后收集 63 组结果
const ITEM_ZH = {
  'Monetary gambles': '赌局', Chocolates: '巧克力', 'Various products': '各类商品', Wallpapers: '壁纸', Camcorders: '摄像机',
  'Jelly beans': '软糖', 'Mobile phones': '手机', 'Food dishes': '菜品', 'Vacation packages': '度假套餐', 'Candy bars': '糖果棒',
  Pencils: '铅笔', 'mp3 player': 'MP3', Jam: '果酱', Sundaes: '圣代', 'Dating partner': '约会对象', Coffee: '咖啡',
  Magazines: '杂志', 'Gift boxes': '礼盒', 'Red wine': '红酒', Charities: '慈善机构', 'Classical music': '古典乐',
  Restaurants: '餐厅', 'Mutual funds': '基金', Pens: '笔', Perfume: '香水', 'Sun cream': '防晒霜',
};
const GER = META.studies.findIndex(x => x.author === 'Scheibehenne' && x.item === 'Jam');
SCENES.pile = (ctx, t, s) => {
  const L = n => lineAt('pile', n);
  const kA = 1 - ramp(t, L(3) - 0.3, L(3) + 0.3);
  if (kA > 0) {
    ctx.save(); ctx.globalAlpha *= kA;
    const kb = ramp(t, s.start, s.start + 0.6, easeOut);
    drawBooth(ctx, 560, 400, 6, 0.6, { alpha: kb, cloth: '#4f7fd9' });
    drawBooth(ctx, 1360, 400, 24, 0.6, { alpha: kb, cloth: '#4f7fd9' });
    richText(ctx, [['6', GOLD], [' 种', CREAM]], 560, 530, { size: 50, family: 'Head', weight: 900, alpha: kb });
    richText(ctx, [['24', GOLD], [' 种', CREAM]], 1360, 530, { size: 50, family: 'Head', weight: 900, alpha: kb });
    // 504 人
    const N = META.studies[GER].n;
    for (let i = 0; i < N; i++) {
      const [x, y] = gridXY(i, 42, 960, 640, 20);
      const ta = L(1) + (i % 42) * 0.015 + Math.floor(i / 42) * 0.03;
      const k = ramp(t, ta, ta + 0.25);
      if (k > 0) drawPerson(ctx, x, y + 6, 6.5, i % 2 ? '#ffc46b' : '#e9a85c', 0.8 * k);
    }
    richText(ctx, [[String(roll(t, L(1), L(1) + 1.2, N)), GOLD], [' 人', CREAM]], 960, 600, { size: 46, family: 'Serif', weight: 700, alpha: ramp(t, L(1), L(1) + 0.3) });
    const ke = pop(t, L(2), 0.4);
    if (ke > 0) {
      text(ctx, '≈', 960, 440, { size: 200 * clamp(ke), family: 'Head', weight: 900, color: GOLD, shadow: 30 });
      richText(ctx, [['差别（效应量）：', DIM], [META.studies[GER].d.toFixed(2), GOLD]], 960, 210, { size: 46, family: 'Serif', weight: 700, alpha: clamp(ke) });
    }
    ctx.restore();
  }
  // 各种实验的卡片：从四面八方飞来，堆到一起
  const kC = ramp(t, L(3) - 0.2, L(3) + 0.4);
  if (kC <= 0) return;
  const st = META.studies, order = shuffled(st.length, 12);
  const rnd = mulberry32(44);
  for (let k = 0; k < st.length; k++) {
    const i = order[k], sx = rnd(), sy = rnd(), rot = (rnd() - 0.5) * 0.5;
    // 先零散出现几张，再一起飞进来
    const early = k < 6;
    const ta = early ? L(3) + k * 0.3 : L(4) + (k - 6) * 0.035;
    const ka = ramp(t, ta, ta + 0.4, easeOut);
    if (ka <= 0) continue;
    const startX = early ? 300 + sx * 1320 : (sx < 0.5 ? -150 : W + 150), startY = early ? 220 + sy * 520 : 100 + sy * 800;
    const c = k % 9, r = Math.floor(k / 9);
    const gx = 960 + (c - 4) * 182, gy = 210 + r * 84;
    const kg = early ? ramp(t, L(4), L(4) + 0.8, easeInOut) : ka;
    const x = early ? lerp(startX, gx, kg) : lerp(startX, gx, ka), y = early ? lerp(startY, gy, kg) : lerp(startY, gy, ka);
    const sc = early ? lerp(1.25, 1, kg) * clamp(ka) : 1;
    ctx.save(); ctx.globalAlpha *= kC * clamp(ka * 1.5);
    ctx.translate(x, y); ctx.rotate(rot * (1 - (early ? kg : ka) * 0.85)); ctx.scale(sc, sc);
    roundRect(ctx, -82, -32, 164, 64, 10); ctx.fillStyle = '#f6eddc'; ctx.fill();
    circle(ctx, -56, 0, 13); ctx.fillStyle = JAM[i % 24]; ctx.fill();
    text(ctx, ITEM_ZH[st[i].item] || st[i].item, 14, 11, { size: 28, family: 'Serif', weight: 700, color: '#2b1d24' });
    ctx.restore();
  }
  const kT = ramp(t, L(4), L(4) + 0.6);
  text(ctx, 'Scheibehenne, Greifeneder & Todd · 2010 · 元分析', 960, 880, { size: 34, family: 'Serif', weight: 400, color: DIM, alpha: kT });
};

// ---------- 森林图（真实数据） ----------
const SORTED = META.studies.map((x, i) => ({ ...x, i })).sort((a, b) => a.d - b.d || a.s2 - b.s2);
const JAMI = SORTED.findIndex(x => x.author === 'Iyengar and Lepper' && x.item === 'Jam');
const FX = d => 1010 + d * 340;
const FY = r => 150 + r * 10.6;
const AXIS_Y = 840;
const dotR = x => 3.5 + 2.2 * Math.sqrt(1 / x.s2 / 8);
function drawAxis(ctx, y, alpha, o = {}) {
  const { ticks = [-1.5, -1, -0.5, 0, 0.5, 1], label = true } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = FAINT; ctx.fillRect(FX(-2.1), y, FX(1.6) - FX(-2.1), 2);
  for (const v of ticks) {
    ctx.fillRect(FX(v) - 1, y, 2, 12);
    text(ctx, v === 0 ? '0' : (v > 0 ? v.toString() : '−' + (-v)), FX(v), y + 46, { size: 30, family: 'Sans', weight: 400, color: DIM });
  }
  if (label) text(ctx, '效应量 d', FX(1.6), y + 46, { size: 30, family: 'Serif', weight: 700, color: DIM, align: 'right' });
  ctx.restore();
}
SCENES.forest = (ctx, t, s) => {
  const L = n => lineAt('forest', n);
  const kin = ramp(t, s.start, s.start + 0.6);
  // 两侧底色
  const kR = ramp(t, L(2), L(2) + 0.6), kL = ramp(t, L(3), L(3) + 0.6);
  ctx.fillStyle = rgba(WARM, 0.07 * kR); ctx.fillRect(FX(0), 120, FX(1.6) - FX(0), AXIS_Y - 120);
  ctx.fillStyle = rgba(COOL, 0.07 * kL); ctx.fillRect(FX(-2.1), 120, FX(0) - FX(-2.1), AXIS_Y - 120);
  // 0 线
  ctx.fillStyle = rgba('#fbf1e6', 0.35 * kin); ctx.fillRect(FX(0) - 1, 130, 2, AXIS_Y - 130);
  drawAxis(ctx, AXIS_Y, kin);
  text(ctx, '50 个实验 · 63 组对比 · 5036 人', 960, 105, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: kin * (1 - kR) });
  // 点：随节拍分批出现
  const tDots = L(0) + 0.2;
  const jamHi = ramp(t, L(4), L(4) + 0.5);
  SORTED.forEach((x, r) => {
    const ta = tDots + (r / SORTED.length) * 3.6;
    const k = ramp(t, ta, ta + 0.3, easeBack);
    if (k <= 0) return;
    const y = FY(r), cx = FX(x.d), se = Math.sqrt(x.s2) * 1.96;
    const col = x.d > 0 ? mix('#fbf1e6', WARM, kR) : x.d < 0 ? mix('#fbf1e6', COOL, kL) : '#fbf1e6';
    const isJam = r === JAMI;
    const a = clamp(k) * (isJam ? 1 : 1 - 0.55 * jamHi * (1 - ramp(t, L(5), L(5) + 0.4)));
    ctx.save(); ctx.globalAlpha *= a;
    ctx.strokeStyle = rgba(col.startsWith('#') ? col : '#fbf1e6', 0.45); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(Math.max(FX(-2.1), cx - se * 340), y); ctx.lineTo(Math.min(FX(1.6), cx + se * 340), y); ctx.stroke();
    circle(ctx, cx, y, dotR(x) * clamp(k, 0, 1.3)); ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  });
  // 方向标注
  if (kR > 0) {
    text(ctx, '选项多 → 反而更糟', FX(0.8), 190, { size: 48, family: 'Head', weight: 900, color: WARM, alpha: kR, shadow: 16 });
    text(ctx, '（选择过载）', FX(0.8), 240, { size: 32, family: 'Serif', weight: 700, color: DIM, alpha: kR });
  }
  if (kL > 0) {
    text(ctx, '选项多 → 更好', FX(-1.2), 700, { size: 48, family: 'Head', weight: 900, color: COOL, alpha: kL, shadow: 16 });
  }
  // 果酱实验
  if (jamHi > 0) {
    const x = SORTED[JAMI], cx = FX(x.d), cy = FY(JAMI);
    ctx.save(); ctx.globalAlpha *= jamHi * (1 - 0.5 * ramp(t, L(5), L(5) + 0.4));
    glowDot(ctx, cx, cy, 60, GOLD, 0.5 + 0.3 * beatPulse(t));
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; circle(ctx, cx, cy, 20 + 4 * beatPulse(t)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 24, cy - 14); ctx.lineTo(cx + 90, cy - 70); ctx.stroke();
    richText(ctx, [['果酱实验 ', CREAM], [x.d.toFixed(2), GOLD]], cx + 100, cy - 80, { size: 40, family: 'Head', weight: 900, align: 'left', shadow: 14 });
    ctx.restore();
  }
  // 往左更多
  const kc = pop(t, L(5), 0.4);
  if (kc > 0) {
    const nNeg = META.n_negative, nPos = META.n_positive, nZero = META.n_zero;
    richText(ctx, [['往左 ', COOL], [String(nNeg), GOLD], [' 组', COOL]], FX(-1.2), 600, { size: 58, family: 'Head', weight: 900, alpha: clamp(kc), shadow: 16 });
    richText(ctx, [['往右 ', WARM], [String(nPos), GOLD], [' 组', WARM]], FX(0.8), 310, { size: 58, family: 'Head', weight: 900, alpha: clamp(kc), shadow: 16 });
    richText(ctx, [['正好为 0：', DIM], [String(nZero), GOLD], [' 组', DIM]], FX(0.8), 370, { size: 34, family: 'Serif', weight: 700, alpha: clamp(kc) });
  }
};

// 平均：所有点落到一条线上，再收拢成一个菱形
const LINE_Y = 560;
const MEAN = META.paper.mean, LO = META.paper.lo, HI = META.paper.hi;
function diamond(ctx, cx, y, lo, hi, h, color, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.moveTo(lo, y); ctx.lineTo(cx, y - h); ctx.lineTo(hi, y); ctx.lineTo(cx, y + h); ctx.closePath(); ctx.fill();
  ctx.restore();
}
SCENES.avg = (ctx, t, s) => {
  const t0 = lineAt('avg', 0), t1 = lineAt('avg', 1);
  const kd = ramp(t, t0, t0 + 1.4, easeInOut);     // 落到一条线上
  const kc = ramp(t, t1, t1 + 1.6, easeInOut);     // 收拢
  ctx.fillStyle = rgba('#fbf1e6', 0.35); ctx.fillRect(FX(0) - 1, lerp(130, LINE_Y - 120, kd), 2, lerp(AXIS_Y - 130, 240, kd));
  drawAxis(ctx, lerp(AXIS_Y, LINE_Y + 120, kd), 1);
  SORTED.forEach((x, r) => {
    const y0 = FY(r), cx0 = FX(x.d);
    const lag = (r % 7) * 0.03;
    const k1 = clamp(kd * 1.2 - lag), k2 = clamp(kc * 1.2 - lag);
    const yy = lerp(y0, LINE_Y + Math.sin(r * 2.3) * 26, k1);
    const xx = lerp(cx0, FX(MEAN), easeIn(k2));
    const col = x.d > 0 ? WARM : x.d < 0 ? COOL : '#fbf1e6';
    circle(ctx, xx, lerp(yy, LINE_Y, k2), dotR(x) * (1 - 0.5 * k2)); ctx.fillStyle = rgba(col, 0.9 * (1 - k2)); ctx.fill();
  });
  const dk = ramp(t, t1 + 1.0, t1 + 1.8, easeBack);
  diamond(ctx, FX(MEAN), LINE_Y, FX(LO), FX(HI), 26 * clamp(dk, 0, 1.3), GOLD, clamp(dk));
  text(ctx, '?', FX(MEAN), LINE_Y - 90, { size: 110, family: 'Head', weight: 900, color: GOLD, alpha: clamp(dk) * (0.7 + 0.3 * beatPulse(t)), shadow: 20 });
};

// 结尾：0.02 → 要看情况 → 货架前的你
const CONDS = [
  ['选项难比较', 'choice set complexity'],
  ['决定本身难做', 'decision task difficulty'],
  ['不清楚想要什么', 'preference uncertainty'],
  ['只想快点选完', 'effort-minimizing goal'],
];
function condIcon(ctx, i, x, y, k, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = CREAM; ctx.fillStyle = CREAM; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (i === 0) {
    drawJar(ctx, -48, 40, 0.75, JAM[0], { lid: JAM[9] });
    drawJar(ctx, 48, 40, 0.75, JAM[2], { lid: JAM[14] });
    text(ctx, '≠', 0, 10, { size: 56, family: 'Head', weight: 900, color: GOLD });
  } else if (i === 1) {
    // 沙漏
    ctx.beginPath(); ctx.moveTo(-36, -50); ctx.lineTo(36, -50); ctx.lineTo(-36, 50); ctx.lineTo(36, 50); ctx.closePath(); ctx.stroke();
    const sand = (t * 0.4) % 1;
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(-26 * (1 - sand), -42 + 40 * sand); ctx.lineTo(26 * (1 - sand), -42 + 40 * sand); ctx.lineTo(0, -4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-26 * sand, 44); ctx.lineTo(26 * sand, 44); ctx.lineTo(0, 44 - 36 * sand); ctx.closePath(); ctx.fill();
  } else if (i === 2) {
    // 思考气泡
    ctx.beginPath(); ctx.ellipse(0, -10, 62, 46, 0, 0, Math.PI * 2); ctx.stroke();
    circle(ctx, -40, 50, 9); ctx.stroke(); circle(ctx, -56, 70, 5); ctx.stroke();
    text(ctx, '?', 0, 12, { size: 64, family: 'Head', weight: 900, color: GOLD });
  } else {
    // 快进
    for (const dx of [-30, 18]) { ctx.beginPath(); ctx.moveTo(dx - 20, -40); ctx.lineTo(dx + 26, 0); ctx.lineTo(dx - 20, 40); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = GOLD; ctx.fillRect(56, -40, 10, 80);
  }
  ctx.restore();
}
SCENES.end = (ctx, t, s) => {
  const L = n => lineAt('end', n);
  // 第一段：0.02
  const kA = 1 - ramp(t, L(2) - 0.3, L(2) + 0.3);
  if (kA > 0) {
    ctx.save(); ctx.globalAlpha *= kA;
    const k0 = ramp(t, s.start, s.start + 0.6, easeOut);
    const sc = 0.9 + 0.1 * k0 + 0.015 * barPulse(t);
    ctx.save(); ctx.translate(960, 400); ctx.scale(sc, sc);
    text(ctx, MEAN.toFixed(2), 0, 0, { size: 250, family: 'Head', weight: 900, color: GOLD, shadow: 40 });
    ctx.restore();
    text(ctx, '63 组结果的平均效应', 960, 150, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: k0 });
    ctx.fillStyle = rgba('#fbf1e6', 0.35); ctx.fillRect(FX(0) - 1, LINE_Y - 30, 2, 150);
    drawAxis(ctx, LINE_Y + 120, 1);
    diamond(ctx, FX(MEAN), LINE_Y + 40, FX(LO), FX(HI), 22, GOLD, 1);
    text(ctx, `95% 置信区间：${LO < 0 ? '−' : ''}${Math.abs(LO).toFixed(2)} ～ ${HI.toFixed(2)}`, FX(MEAN), LINE_Y + 100, { size: 30, family: 'Serif', weight: 700, color: DIM, alpha: k0 });
    // 果酱实验那一点：它确实发生过
    const kj = ramp(t, L(1), L(1) + 0.5);
    if (kj > 0) {
      const jx = FX(SORTED[JAMI].d), jy = LINE_Y + 40;
      glowDot(ctx, jx, jy, 60, '#ff8a6b', 0.5 * kj);
      circle(ctx, jx, jy, 12 * kj); ctx.fillStyle = WARM; ctx.fill();
      text(ctx, '果酱实验：确实测到了', jx, jy - 40, { size: 34, family: 'Serif', weight: 700, color: CREAM, alpha: kj });
    }
    ctx.restore();
  }
  // 第二段：要看情况
  const kB = ramp(t, L(2) - 0.2, L(2) + 0.5) * (1 - ramp(t, L(6) - 0.4, L(6) + 0.2));
  if (kB > 0) {
    ctx.save(); ctx.globalAlpha *= kB;
    text(ctx, '什么时候会发生？', 960, 210, { size: 66, family: 'Head', weight: 900, color: CREAM, shadow: 20 });
    text(ctx, 'Chernev, Böckenholt & Goodman · 2015 · 元分析（99 组观测，7202 人）', 960, 268, { size: 30, family: 'Serif', weight: 400, color: DIM });
    const hot = ramp(t, L(5), L(5) + 0.5);
    CONDS.forEach(([zh, en], i) => {
      const x = 960 + (i - 1.5) * 400, y = 560;
      const tOn = i < 2 ? L(3) + i * TL.music.beat * 2 : L(4) + (i - 2) * TL.music.beat * 2;
      const kOn = ramp(t, tOn, tOn + 0.4, easeBack);
      const lit = clamp(kOn);
      ctx.save();
      ctx.translate(x, y + (1 - lit) * 20);
      glowDot(ctx, 0, 0, 260, '#ffb84d', (0.12 + 0.18 * hot * (0.7 + 0.3 * barPulse(t))) * lit);
      roundRect(ctx, -175, -200, 350, 400, 26);
      ctx.fillStyle = `rgba(40,24,40,${0.6 + 0.3 * lit})`; ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.2 + 0.5 * lit); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.globalAlpha *= 0.35 + 0.65 * lit;
      condIcon(ctx, i, 0, -60, lit, t);
      text(ctx, zh, 0, 110, { size: 44, family: 'Head', weight: 900, color: lit > 0.5 ? GOLD : CREAM });
      text(ctx, en, 0, 160, { size: 24, family: 'Sans', weight: 400, color: DIM });
      ctx.restore();
    });
    ctx.restore();
  }
  // 第三段：货架前的你
  const kC = ramp(t, L(6) - 0.2, L(6) + 0.8);
  if (kC > 0) {
    ctx.save(); ctx.globalAlpha *= kC;
    const planks = [330, 520, 710], per = 15, gap = 92;
    const focus = ramp(t, L(8), L(8) + 1.2);
    const zz = 1.04 - 0.04 * ramp(t, L(6), s.end, x => x);
    ctx.save(); ctx.translate(960, 560); ctx.scale(zz, zz); ctx.translate(-960, -560);
    planks.forEach(py => {
      ctx.fillStyle = '#4a2f2a'; ctx.fillRect(220, py, 1480, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(220, py + 16, 1480, 10);
    });
    for (let r = 0; r < 3; r++) for (let c = 0; c < per; c++) {
      const i = r * per + c, x = 960 + (c - (per - 1) / 2) * gap;
      const me = r === 1 && c === 9;
      drawJar(ctx, x, planks[r], 0.92, JAM[i % 24], { lid: JAM[(i + 5) % 24], lit: me ? 1 : 1 - 0.7 * focus, glow: me ? focus * (0.8 + 0.2 * barPulse(t)) : 0 });
    }
    ctx.restore();
    const px = 900, py = 1010;
    drawShopper(ctx, px, py, t);
    // 视线
    if (focus > 0) {
      const me = [960 + (9 - 7) * gap * zz, 520 - 50];
      ctx.save();
      ctx.strokeStyle = rgba(GOLD, 0.7 * focus); ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.moveTo(px + 40, py - 260); ctx.quadraticCurveTo(px + 160, 560, me[0] - 20, me[1] + 40); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 30);
  const planks = [250, 430], per = 13, gap = 104;
  planks.forEach((py, r) => {
    ctx.fillStyle = '#4a2f2a'; ctx.fillRect(200, py, 1520, 16);
    for (let c = 0; c < per; c++) {
      const i = r * per + c;
      drawJar(ctx, 960 + (c - (per - 1) / 2) * gap, py, 1.0, JAM[i % 24], { lid: JAM[(i + 5) % 24], glow: 0.45 });
    }
  });
  const g = ctx.createLinearGradient(0, 380, 0, H);
  g.addColorStop(0, 'rgba(15,9,18,0)'); g.addColorStop(0.35, 'rgba(15,9,18,0.88)'); g.addColorStop(1, 'rgba(15,9,18,0.96)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  richText(ctx, [['选择越多', CREAM], ['，', CREAM], ['越不想买？', GOLD]], 960, 720, { size: 150, family: 'Head', weight: 900, shadow: 30 });
  richText(ctx, [['著名的果酱实验，放进 ', CREAM], ['50', GOLD], [' 个实验里再看', CREAM]], 960, 860, { size: 64, family: 'Serif', weight: 700, shadow: 20 });
  text(ctx, '选择过载 · 一个经典实验和一份元分析', 960, 960, { size: 40, family: 'Sans', weight: 700, color: '#ff8a6b', spacing: 4 });
}
