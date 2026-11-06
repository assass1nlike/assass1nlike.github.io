// 棉花糖实验：画面
// 美术方向：深夜的小木桌，一盏吊灯，盘子里一颗棉花糖。可可紫的暗底，焦糖色的灯光，
// 原研究用琥珀色，重做的研究用薄荷绿，“妈妈有大学学历”的一组用淡紫。
// 数字全部来自论文原文（见每处注释），示意性的画面会在画面上标“示意”。

const CREAM = '#fff4e6';
const GOLD = '#ffd27a';
const DIM = 'rgba(255,244,230,0.62)';
const FAINT = 'rgba(255,244,230,0.35)';
const AMBER = '#f2a65a';
const MINT = '#7fd6bd';
const LAV = '#bfa8f0';
const SKIN = '#f6d8c2';
const HAIR = '#3b2420';

// 原研究：Shoda, Mischel & Peake (1990)，诊断条件下的 35 个孩子，等待时间与 SAT 的相关
const R_MATH = 0.57, R_VERB = 0.42, N_SAT = 35, N_ORIG = 653, N_FOLLOW = 185;
// 重做：Watts, Duncan & Quan (2018)，表 2、表 4（母亲无大学学历的子样本，15 岁成绩）
const N_ALL = 918, N_ND = 552, N_D = 366;
const R_NEW = 0.24, R_CTRL = 0.08, R_BEH = -0.06;
const STEPS = [0, 0.35, 0.46, 0.65];               // 相对“不到 20 秒”组的 15 岁成绩差（标准差），表 4 第 4 列
const STEP_LAB = ['不到 20 秒', '20 秒～2 分', '2～7 分', '等满 7 分'];
const MEAN_D = 5.38, MEAN_ND = 3.99;                // 平均等待分钟数，表 2
const FULL_D = 68, FULL_ND = 45;                    // 等满 7 分钟的比例（%），表 2

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, k) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function glowDot(ctx, x, y, r, color, a) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
}
const pop = (t, a, d = 0.45) => ramp(t, a, a + d, easeBack);
const fadeIn = (t, a, d = 0.5) => ramp(t, a, a + d);

// ---------- 背景：可可紫，吊灯的暖光，糖粉一样的光点 ----------
const SUGAR = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 80 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.4, v: 5 + rnd() * 12, ph: rnd() * 6, pink: rnd() < 0.4 }));
})();
const warmth = t => ramp(t, TL.music.end - 8, TL.music.end - 3);

function drawBackground(ctx, t) {
  const w = warmth(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#2b1824', '#3f2328', w));
  g.addColorStop(0.55, mix('#1d1018', '#2b161b', w));
  g.addColorStop(1, mix('#0d070b', '#150a0c', w));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, 960, 120, 900, '#ffb877', 0.07 + 0.06 * lv + 0.08 * w);
  for (const d of SUGAR) {
    const y = (d.y - d.v * t + H * 20) % H, x = d.x + Math.sin(t * 0.25 + d.ph) * 18;
    glowDot(ctx, x, y, d.r * 4, d.pink ? '#ffc7d6' : '#ffe2b8', (0.12 + 0.26 * lv) * (0.6 + 0.4 * Math.sin(t * 0.9 + d.ph)));
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 520, 460, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 物件 ----------
// 棉花糖：(x, y) 是底面中心，s 缩放（s = 1 时宽 68、高 46）
const TMP = document.createElement('canvas');
TMP.width = 420; TMP.height = 420;
function mallowBody(c, s, o) {
  const w = 34 * s, h = 46 * s, ry = 11 * s;
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.beginPath(); c.ellipse(0, 3 * s, w * 1.25, ry * 1.2, 0, 0, Math.PI * 2); c.fill();
  const g = c.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, '#e2b4c2'); g.addColorStop(0.32, '#fff5f6'); g.addColorStop(0.7, '#fbe3e9'); g.addColorStop(1, '#d9a5b6');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-w, -h); c.lineTo(-w, 0); c.ellipse(0, 0, w, ry, 0, Math.PI, 0, true);
  c.lineTo(w, -h); c.ellipse(0, -h, w, ry, 0, 0, Math.PI, true); c.closePath(); c.fill();
  const tg = c.createRadialGradient(-w * 0.25, -h - ry * 0.3, 0, 0, -h, w);
  tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#fbe6ec');
  c.fillStyle = tg;
  c.beginPath(); c.ellipse(0, -h, w, ry, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(190,120,145,0.35)'; c.lineWidth = Math.max(1, 1.2 * s); c.stroke();
  // 糖粉
  c.fillStyle = 'rgba(255,255,255,0.7)';
  for (const [px, py] of [[-0.5, -0.4], [0.2, -0.7], [0.55, -0.25], [-0.15, -0.15], [0.35, -0.55]]) { circle(c, px * w, py * h, 1.3 * s); c.fill(); }
  if (o.bite > 0) {
    c.globalCompositeOperation = 'destination-out';
    const k = clamp(o.bite);
    for (const [bx, by, br] of [[0.75, -1.0, 0.5], [0.35, -1.15, 0.38], [1.0, -0.6, 0.4]]) {
      circle(c, bx * w, by * h + ry * 0.4, br * w * k); c.fill();
    }
  }
  c.restore();
}
function drawMallow(ctx, x, y, s, o = {}) {
  const { alpha = 1, glow = 0, bite = 0, ghost = false } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glow > 0) glowDot(ctx, x, y - 26 * s, 120 * s, '#ffd6e2', 0.5 * glow);
  if (ghost) {
    const w = 34 * s, h = 46 * s, ry = 11 * s;
    ctx.translate(x, y);
    ctx.setLineDash([8, 7]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,220,230,0.75)';
    ctx.fillStyle = 'rgba(255,220,230,0.08)';
    ctx.beginPath(); ctx.moveTo(-w, -h); ctx.lineTo(-w, 0); ctx.ellipse(0, 0, w, ry, 0, Math.PI, 0, true);
    ctx.lineTo(w, -h); ctx.ellipse(0, -h, w, ry, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -h, w, ry, 0, 0, Math.PI); ctx.stroke();
  } else if (bite > 0) {
    const c = TMP.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, TMP.width, TMP.height);
    c.translate(210, 300);
    mallowBody(c, s, o);
    ctx.drawImage(TMP, x - 210, y - 300);
  } else {
    ctx.translate(x, y);
    mallowBody(ctx, s, o);
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, s, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 10 * s, 150 * s, 38 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9dbcf';
  ctx.beginPath(); ctx.ellipse(x, y, 150 * s, 38 * s, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, y - 30 * s, 0, y + 30 * s);
  g.addColorStop(0, '#fffaf4'); g.addColorStop(1, '#efe2d6');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 112 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 小木桌：后沿在 top，前沿在 940
function drawTable(ctx, t, top = 660, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const front = 940;
  const g = ctx.createLinearGradient(0, top, 0, front);
  g.addColorStop(0, '#6a3f2c'); g.addColorStop(1, '#4e2d20');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(260, top); ctx.lineTo(1660, top); ctx.lineTo(2020, front); ctx.lineTo(-100, front); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(30,12,6,0.22)'; ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const y = top + 30 + i * 38;
    ctx.beginPath(); ctx.moveTo(-100, y); ctx.bezierCurveTo(500, y + 10 * Math.sin(i), 1300, y - 12 * Math.cos(i), 2020, y + 6); ctx.stroke();
  }
  glowDot(ctx, 960, top + 110, 720, '#ffbf80', 0.26 + 0.08 * musicLevel(t));
  ctx.restore();
  ctx.fillStyle = '#2c160f';
  ctx.fillRect(-100, front, W + 200, H - front);
  ctx.fillStyle = 'rgba(255,190,130,0.18)'; ctx.fillRect(-100, front, W + 200, 3);
  ctx.restore();
}

// 吊灯
function drawLamp(ctx, t, x = 960, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = 'rgba(30,18,22,0.9)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 70); ctx.stroke();
  const lv = musicLevel(t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createLinearGradient(0, 120, 0, 700);
  cone.addColorStop(0, `rgba(255,196,130,${0.13 + 0.06 * lv})`); cone.addColorStop(1, 'rgba(255,196,130,0)');
  ctx.fillStyle = cone;
  ctx.beginPath(); ctx.moveTo(x - 70, 125); ctx.lineTo(x + 70, 125); ctx.lineTo(x + 560, 700); ctx.lineTo(x - 560, 700); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#3a2430';
  ctx.beginPath(); ctx.moveTo(x - 28, 70); ctx.lineTo(x + 28, 70); ctx.lineTo(x + 78, 128); ctx.lineTo(x - 78, 128); ctx.closePath(); ctx.fill();
  glowDot(ctx, x, 132, 90, '#ffd9a0', 0.8);
  ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.ellipse(x, 128, 40, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 孩子：(x, y) 是躯干底边中点（通常被桌沿挡住），age 0 = 4 岁半，1 = 15 岁，2 = 26 岁
function drawKid(ctx, x, y, s, o = {}) {
  const { shirt = MINT, look = 0, lookY = 0.4, mouth = 'smile', cover = 0, age = 0, alpha = 1, glow = 0, blink = 0, card = 0 } = o;
  if (alpha <= 0.002) return;
  const a1 = clamp(age), a2 = clamp(age - 1);
  const hr = lerp(lerp(64, 50, a1), 47, a2);
  const th = lerp(lerp(92, 150, a1), 168, a2);
  const sw = lerp(lerp(72, 98, a1), 108, a2);
  const hy = -th - hr * 0.82;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, hy + 40, 260, shirt, 0.42 * glow);
  // 躯干
  const sg = ctx.createLinearGradient(0, -th, 0, 0);
  sg.addColorStop(0, shirt); sg.addColorStop(1, mix(shirt, '#000000', 0.35));
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(-sw, 0); ctx.lineTo(-sw, -th * 0.45);
  ctx.quadraticCurveTo(-sw, -th, -sw * 0.35, -th); ctx.lineTo(sw * 0.35, -th);
  ctx.quadraticCurveTo(sw, -th, sw, -th * 0.45); ctx.lineTo(sw, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix(shirt, '#ffffff', 0.35);
  ctx.beginPath(); ctx.ellipse(0, -th + 4, 24, 9, 0, 0, Math.PI); ctx.fill();
  // 脖子、头
  ctx.fillStyle = SKIN; ctx.fillRect(-12, -th - 14, 24, 20);
  for (const ex of [-1, 1]) { circle(ctx, ex * hr * 0.98, hy + hr * 0.08, hr * 0.17); ctx.fill(); }
  circle(ctx, 0, hy, hr); ctx.fill();
  // 头发
  ctx.fillStyle = HAIR;
  ctx.beginPath(); ctx.arc(0, hy - hr * 0.06, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-hr, hy - hr * 0.1);
  ctx.quadraticCurveTo(-hr * 0.5, hy + hr * 0.05, -hr * 0.1, hy - hr * 0.35);
  ctx.quadraticCurveTo(hr * 0.35, hy - hr * 0.05, hr, hy - hr * 0.15);
  ctx.lineTo(hr, hy - hr * 0.5); ctx.lineTo(-hr, hy - hr * 0.5); ctx.closePath(); ctx.fill();
  if (a1 < 1) { // 小孩的呆毛
    ctx.strokeStyle = HAIR; ctx.lineWidth = 6 * (1 - a1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, hy - hr * 1.05); ctx.quadraticCurveTo(hr * 0.35, hy - hr * 1.45, hr * 0.12, hy - hr * 1.5); ctx.stroke();
  }
  // 五官
  const ey = hy + hr * 0.12;
  ctx.fillStyle = '#2d1c1f';
  for (const ex of [-1, 1]) {
    const px = ex * hr * 0.36 + look * hr * 0.07, py = ey + lookY * hr * 0.06;
    ctx.beginPath(); ctx.ellipse(px, py, hr * 0.085, hr * 0.12 * Math.max(0.12, 1 - blink), 0, 0, Math.PI * 2); ctx.fill();
    if (blink < 0.5) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; circle(ctx, px + hr * 0.03, py - hr * 0.04, hr * 0.03); ctx.fill(); ctx.fillStyle = '#2d1c1f'; }
  }
  ctx.fillStyle = 'rgba(255,128,150,0.38)';
  for (const ex of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex * hr * 0.56, hy + hr * 0.38, hr * 0.15, hr * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#a5585c'; ctx.fillStyle = '#a5585c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const my = hy + hr * 0.5;
  ctx.beginPath();
  if (mouth === 'smile') { ctx.arc(0, my - hr * 0.08, hr * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  else if (mouth === 'o') { ctx.ellipse(0, my, hr * 0.06, hr * 0.08, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (mouth === 'open') { ctx.arc(0, my - hr * 0.06, hr * 0.15, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  else { ctx.moveTo(-hr * 0.1, my); ctx.lineTo(hr * 0.1, my); ctx.stroke(); }
  // 手：捂眼睛（cover）或举着成绩单（card）
  const handTo = (k, tx, ty) => {
    for (const ex of [-1, 1]) {
      const sx = ex * sw * 0.82, sy = -th * 0.55;
      const hx = lerp(ex * sw * 0.9, ex * tx, k), hyy = lerp(-14, ty, k);
      ctx.strokeStyle = mix(shirt, '#000000', 0.12); ctx.lineWidth = 26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex * sw * 1.05, lerp(sy, hyy, 0.5), hx, hyy); ctx.stroke();
      ctx.fillStyle = SKIN; circle(ctx, hx, hyy, 17); ctx.fill();
    }
  };
  if (cover > 0) handTo(easeInOut(clamp(cover)), hr * 0.36, ey);
  if (card > 0) {
    const k = easeOut(clamp(card));
    const cy = lerp(-10, -th * 0.55, k);
    ctx.save(); ctx.translate(0, cy); ctx.rotate(-0.05);
    ctx.globalAlpha *= clamp(card * 2);
    ctx.fillStyle = '#fbf3e6'; roundRect(ctx, -70, -50, 140, 96, 8); ctx.fill();
    ctx.fillStyle = '#c9a17b'; ctx.fillRect(-52, -28, 70, 8); ctx.fillRect(-52, -8, 100, 6); ctx.fillRect(-52, 8, 86, 6);
    text(ctx, 'A', 40, 34, { size: 34, family: 'Head', weight: 900, color: '#e05f6f' });
    ctx.restore();
    handTo(k, 64, cy + 10);
  }
  ctx.restore();
}

// 厨房计时器：frac 为已经过的比例，marks 为刻度数
function drawTimer(ctx, x, y, r, frac, o = {}) {
  const { marks = 7, color = GOLD, alpha = 1, label = null } = o;
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#d8c1a8'; roundRect(ctx, x - r * 0.18, y - r - r * 0.2, r * 0.36, r * 0.26, 6); ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#fbefe2'; circle(ctx, x, y, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#d8c1a8'; ctx.lineWidth = r * 0.07; circle(ctx, x, y, r * 0.96); ctx.stroke();
  const f = clamp(frac);
  if (f > 0) {
    ctx.fillStyle = rgba(color, 0.85);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.84, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#7a5a48'; ctx.lineWidth = Math.max(2, r * 0.03);
  for (let i = 0; i < marks; i++) {
    const a = -Math.PI / 2 + i / marks * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74); ctx.stroke();
  }
  const ha = -Math.PI / 2 + f * Math.PI * 2;
  ctx.strokeStyle = '#4a2f2a'; ctx.lineWidth = Math.max(3, r * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ha) * r * 0.7, y + Math.sin(ha) * r * 0.7); ctx.stroke();
  ctx.fillStyle = '#4a2f2a'; circle(ctx, x, y, r * 0.07); ctx.fill();
  ctx.restore();
  if (label) text(ctx, label, x, y + r + 58, { size: Math.max(34, r * 0.32), family: 'Head', weight: 900, color: CREAM, alpha, shadow: 12 });
}

// 服务铃
function drawBell(ctx, x, y, s, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 60, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b3a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 56, 13, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(-44, 0, 44, 0);
  g.addColorStop(0, '#b07a2a'); g.addColorStop(0.35, '#ffe2a0'); g.addColorStop(1, '#a06a22');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -4, 44, 44, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9a650'; ctx.fillRect(-4, -60, 8, 14); circle(ctx, 0, -62, 8); ctx.fill();
  ctx.restore();
}

// 一群孩子的小头像：用于样本量
function drawHead(ctx, x, y, r, color, alpha) {
  if (alpha <= 0.01) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  circle(ctx, x, y - r * 0.55, r * 0.62); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 0.9, r * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
}
function gridPos(i, cols, x0, y0, cell) { return [x0 + (i % cols) * cell, y0 + Math.floor(i / cols) * cell]; }

// 糖棍一样的条：相关强度
function drawStick(ctx, t, x, y, len, h, color, o = {}) {
  const { alpha = 1, glow = 1 } = o;
  if (len <= 1 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.shadowColor = rgba(color, 0.7); ctx.shadowBlur = 26 * glow;
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, mix(color, '#ffffff', 0.3)); g.addColorStop(1, mix(color, '#000000', 0.15));
  ctx.fillStyle = g; roundRect(ctx, x, y - h / 2, len, h, h / 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  const off = (t * 30) % 44;
  for (let sx = x - h - 44 + off; sx < x + len + h; sx += 44) {
    ctx.beginPath(); ctx.moveTo(sx, y + h / 2); ctx.lineTo(sx + 18, y + h / 2); ctx.lineTo(sx + 18 + h, y - h / 2); ctx.lineTo(sx + h, y - h / 2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawGhostStick(ctx, x, y, len, h, color, alpha) {
  if (alpha <= 0 || len <= 1) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.setLineDash([10, 8]); ctx.strokeStyle = rgba(color, 0.7); ctx.lineWidth = 2.5;
  roundRect(ctx, x, y - h / 2, len, h, h / 2); ctx.stroke();
  ctx.restore();
}
// 横轴：从 x0 起，len 像素对应 0～max
function drawAxis(ctx, x0, y, len, max, ticks, alpha, label) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(255,244,230,0.28)'; ctx.fillRect(x0, y, len, 2);
  for (const v of ticks) {
    const x = x0 + v / max * len;
    ctx.fillRect(x - 1, y - 8, 2, 16);
    text(ctx, String(v), x, y + 44, { size: 30, family: 'Sans', weight: 400, color: DIM });
  }
  if (label) text(ctx, label, x0 + len, y + 92, { size: 30, family: 'Sans', weight: 400, color: DIM, align: 'right' });
  ctx.restore();
}

// ---------- 场景 ----------
const SCENES = {};
const TABLE_TOP = 660, PLATE_Y = 790;

SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2);
  const z = 1 + 0.06 * ramp(t, t2, s.end + 1, x => x);
  ctx.save();
  ctx.translate(960, 600); ctx.scale(z, z); ctx.translate(-960, -600);
  drawLamp(ctx, t);
  const kk = fadeIn(t, 0.2, 1.2);
  const dart = t > t2 ? Math.sin((t - t2) * 3.2) : 0;
  drawKid(ctx, 960, TABLE_TOP + 10, 1.3, { alpha: kk, look: dart * 0.9, lookY: 1, mouth: t > t2 + 2.5 ? 'o' : 'smile', blink: Math.max(0, 1 - Math.abs(t - 3.4) * 12) });
  drawTable(ctx, t, TABLE_TOP);
  drawBell(ctx, 520, 820, 1.1, fadeIn(t, t1, 0.6));
  drawPlate(ctx, 960, PLATE_Y, 1.1);
  const drop = ramp(t, 0.35, 1.0, easeBack);
  drawMallow(ctx, 960, PLATE_Y + 6 - (1 - drop) * 280, 1.9, { alpha: clamp(drop * 3), glow: 0.4 + 0.3 * barPulse(t) });
  // 现在 1 颗 / 等一等 2 颗
  const k2 = pop(t, beatAfter(t1, 1));
  if (k2 > 0) {
    drawPlate(ctx, 1380, 845, 0.8, clamp(k2));
    drawMallow(ctx, 1345, 850, 1.2, { alpha: clamp(k2), ghost: true });
    drawMallow(ctx, 1415, 850, 1.2, { alpha: clamp(k2), ghost: true });
    text(ctx, '等到大人回来：2 颗', 1400, 615, { size: 46, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(k2), shadow: 12 });
    text(ctx, '摇铃叫大人：只有 1 颗', 520, 615, { size: 46, family: 'Serif', weight: 700, color: DIM, alpha: clamp(pop(t, beatAfter(t1, 2))), shadow: 12 });
  }
  ctx.restore();
  // 计时器在一旁转
  const kt = pop(t, t2);
  if (kt > 0) drawTimer(ctx, 1520, 330, 110, (t - t2) / 30, { alpha: clamp(kt), marks: 12 });
};

// 653 个孩子的网格：右侧
const ORIG_COLS = 33, ORIG_CELL = 27, ORIG_X0 = 820, ORIG_Y0 = 230;
const FOLLOW = (() => {  // 回访到的 185 个：位置随机（示意），人数是原文数字
  const rnd = mulberry32(5), idx = [...Array(N_ORIG).keys()];
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return new Set(idx.slice(0, N_FOLLOW));
})();
function drawSchool(ctx, t, x, y, s, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s);
  glowDot(ctx, 0, -120, 380, '#ffbf80', 0.18 + 0.08 * musicLevel(t));
  // 树
  ctx.fillStyle = '#2f2a2c';
  for (const tx of [-260, 250]) { ctx.fillRect(tx - 7, -110, 14, 110); circle(ctx, tx, -150, 62); ctx.fill(); circle(ctx, tx + 30, -120, 44); ctx.fill(); }
  ctx.fillStyle = '#5a3a3a'; ctx.fillRect(-190, -210, 380, 210);
  ctx.fillStyle = '#7a3f3a';
  ctx.beginPath(); ctx.moveTo(-225, -205); ctx.lineTo(0, -330); ctx.lineTo(225, -205); ctx.closePath(); ctx.fill();
  for (const [wx, wy] of [[-130, -160], [-45, -160], [45, -160], [130, -160], [-130, -85], [130, -85]]) {
    glowDot(ctx, wx, wy, 60, '#ffd28a', 0.3);
    ctx.fillStyle = '#ffd99a'; roundRect(ctx, wx - 26, wy - 24, 52, 48, 6); ctx.fill();
  }
  ctx.fillStyle = '#3a2422'; roundRect(ctx, -32, -100, 64, 100, [30, 30, 0, 0]); ctx.fill();
  ctx.restore();
}
SCENES.setup = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('setup', 1), t2 = lineAt('setup', 2), t3 = lineAt('setup', 3);
  const mv = ramp(t, t1 - 0.3, t1 + 0.6);
  const sx = lerp(960, 430, mv), ss = lerp(1.15, 0.9, mv);
  drawSchool(ctx, t, sx, lerp(700, 640, mv), ss, fadeIn(t, t0 - 0.2, 0.8) * (1 - ramp(t, t3 - 0.3, t3 + 0.3)));
  text(ctx, '斯坦福大学校园里的幼儿园', sx, lerp(800, 720, mv), { size: lerp(48, 38, mv), family: 'Serif', weight: 700, color: CREAM, alpha: fadeIn(t, t0 + 0.2) * (1 - ramp(t, t3 - 0.3, t3 + 0.3)), shadow: 12 });
  // 653 个孩子
  if (t > t1 - 0.2) {
    ctx.save();
    for (let i = 0; i < N_ORIG; i++) {
      const [x, y] = gridPos(i, ORIG_COLS, ORIG_X0, ORIG_Y0, ORIG_CELL);
      const ti = t1 + (i % ORIG_COLS) * 0.025 + Math.floor(i / ORIG_COLS) * 0.03;
      const k = ramp(t, ti, ti + 0.3);
      const kept = FOLLOW.has(i);
      const dim = kept ? 0 : ramp(t, t2, t2 + 0.8);
      const col = kept && t > t2 ? mix('#f2c9a0', AMBER, ramp(t, t2, t2 + 0.6)) : '#f2c9a0';
      drawHead(ctx, x, y + (1 - k) * 20, 9.5, col, k * (0.85 - 0.68 * dim));
    }
    ctx.restore();
    const n = Math.round(N_ORIG * clamp((t - t1) / 1.2));
    richText(ctx, [[String(n), GOLD], [' 个孩子', CREAM]], 1265, 180, { size: 54, family: 'Head', weight: 900, alpha: fadeIn(t, t1) * (1 - ramp(t, t2, t2 + 0.4)), shadow: 12 });
    richText(ctx, [['回访到 ', CREAM], [String(N_FOLLOW), GOLD], [' 个', CREAM]], 1265, 180, { size: 54, family: 'Head', weight: 900, alpha: fadeIn(t, t2 + 0.2), shadow: 12 });
  }
  // SAT 成绩单
  const kc = pop(t, t3, 0.6);
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(kc);
    ctx.translate(430, 520 + (1 - clamp(kc)) * 40); ctx.rotate(-0.05);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#fbf3e6'; roundRect(ctx, -170, -210, 340, 420, 14); ctx.fill();
    ctx.shadowColor = 'transparent';
    text(ctx, 'SAT', 0, -120, { size: 90, family: 'Head', weight: 900, color: '#4a2f2a' });
    text(ctx, '美国大学入学考试', 0, -68, { size: 30, family: 'Sans', weight: 700, color: '#8a6a58' });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
      ctx.strokeStyle = '#b89a86'; ctx.lineWidth = 2; circle(ctx, -105 + c * 70, -10 + r * 42, 12); ctx.stroke();
      if ((r * 3 + c) % 4 === 1) { ctx.fillStyle = '#4a2f2a'; circle(ctx, -105 + c * 70, -10 + r * 42, 9); ctx.fill(); }
    }
    ctx.restore();
  }
};

// 相关图的公共布局
const AX0 = 560, AXLEN = 1080;
const RX = v => AX0 + v * AXLEN;
function rowLabel(ctx, str, y, color, alpha, sub) {
  text(ctx, str, AX0 - 40, y + 14, { size: 44, family: 'Head', weight: 900, color, align: 'right', alpha });
  if (sub) text(ctx, sub, AX0 - 40, y + 52, { size: 26, family: 'Sans', weight: 400, color: DIM, align: 'right', alpha });
}
function valueAt(ctx, v, x, y, color, alpha, size = 64) {
  text(ctx, v.toFixed(2), x + 28, y + size * 0.36, { size, family: 'Head', weight: 900, color, align: 'left', alpha, shadow: 14 });
}

SCENES.claim = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('claim', 1), t2 = lineAt('claim', 2), t3 = lineAt('claim', 3), t4 = lineAt('claim', 4);
  // 起势：中央大字
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, t1 - 0.5, t1));
  if (kb > 0) {
    drawTimer(ctx, 960, 300, 120, prog(t, t0, t1), { alpha: kb, marks: 12, color: AMBER });
    ctx.save();
    ctx.translate(960, 600); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.015 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '等得越久', 0, 0, { size: 110, family: 'Head', weight: 900, color: CREAM, alpha: kb, shadow: 30 });
    text(ctx, 'SAT 越高', 0, 190, { size: 170, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  const kc = fadeIn(t, t1 - 0.4, 0.6);
  if (kc <= 0) return;
  ctx.save(); ctx.globalAlpha *= kc;
  text(ctx, '原研究：学前等待时间和 SAT 的相关', 960, 170, { size: 42, family: 'Serif', weight: 700, color: CREAM });
  text(ctx, 'Shoda, Mischel & Peake (1990)', 960, 222, { size: 30, family: 'Sans', weight: 400, color: DIM });
  drawAxis(ctx, AX0, 640, AXLEN, 1, [0, 0.5, 1], 1, '相关系数');
  const rows = [[R_MATH, 360, '数学', t1], [R_VERB, 500, '语言', t2]];
  for (const [v, y, lab, ts] of rows) {
    const k = ramp(t, ts, ts + 1.0, easeOut);
    rowLabel(ctx, lab, y, CREAM, fadeIn(t, ts - 0.2, 0.4));
    drawStick(ctx, t, AX0, y, v * AXLEN * k, 64, AMBER);
    if (k > 0) valueAt(ctx, v * k, AX0 + v * AXLEN * k, y, GOLD, clamp(k * 2), 72);
  }
  // 只有 35 个孩子
  const kn = fadeIn(t, t3, 0.4);
  if (kn > 0) {
    ctx.save();
    for (let i = 0; i < N_SAT; i++) {
      const tb = t3 + i * 0.03;
      drawHead(ctx, 420 + i * 30, 830, 12, AMBER, ramp(t, tb, tb + 0.25) * 0.95);
    }
    ctx.restore();
    richText(ctx, [[String(N_SAT), GOLD], [' 个孩子', CREAM]], 420 + N_SAT * 30 + 20, 845, { size: 46, family: 'Head', weight: 900, align: 'left', alpha: kn });
    const kf = fadeIn(t, t4, 0.5);
    text(ctx, '都来自斯坦福大学社区的家庭', 960, 905, { size: 36, family: 'Sans', weight: 400, color: DIM, alpha: kf });
  }
  ctx.restore();
};

SCENES.turn = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('turn', 1);
  text(ctx, '2018', 960, 560, { size: 320, family: 'Head', weight: 900, color: 'rgba(255,226,180,0.12)', alpha: fadeIn(t, t0, 0.6) });
  text(ctx, 'Watts, Duncan & Quan', 960, 640, { size: 42, family: 'Serif', weight: 400, color: DIM, alpha: fadeIn(t, t0 + 0.4, 0.6), spacing: 3 });
  // 新的一批孩子从底部探出头
  const kp = fadeIn(t, t1 - 0.2, 0.8);
  if (kp > 0) {
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const x = 100 + i * 75, d = (i * 37) % 11 / 11;
      const k = ramp(t, t1 + d * 0.8, t1 + d * 0.8 + 0.5, easeBack);
      drawHead(ctx, x, 1100 - 260 * k + Math.sin(t * 2 + i) * 3, 26, i % 5 === 2 ? LAV : MINT, 0.85 * clamp(k));
    }
    ctx.restore();
  }
};

// 918 个孩子：552 个（母亲无大学学历）+ 366 个
const NEW_COLS = 34, NEW_CELL = 25, NEW_X0 = 930, NEW_Y0 = 230;
function newSlot(i, split) {
  // split = 0：一整块；split = 1：552 在左、366 在右
  const a = gridPos(i, NEW_COLS, NEW_X0, NEW_Y0, NEW_CELL);
  let b;
  if (i < N_ND) b = gridPos(i, 28, 330, 320, 22);
  else b = gridPos(i - N_ND, 22, 1100, 320, 22);
  return [lerp(a[0], b[0], split), lerp(a[1], b[1], split)];
}
const NEW_FROM = (() => {
  const rnd = mulberry32(9);
  return Array.from({ length: N_ALL }, () => { const a = rnd() * Math.PI * 2; return [960 + Math.cos(a) * 1300, 540 + Math.sin(a) * 900, rnd()]; });
})();

SCENES.redo = (ctx, t, s) => {
  const L = n => lineAt('redo', n);
  const t0 = s.start;
  // 起势：大字 + 孩子从四周涌来
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, L(1) - 0.5, L(1)));
  const crowdA = fadeIn(t, t0, 0.6) * (1 - ramp(t, L(2) - 0.4, L(2))) + ramp(t, L(5) - 0.4, L(5)) * (1 - ramp(t, L(7) - 0.4, L(7)));
  if (crowdA > 0) {
    const split = ramp(t, L(5), L(5) + 1.2);
    const hi = ramp(t, L(5) + 0.4, L(5) + 1.2);
    ctx.save();
    for (let i = 0; i < N_ALL; i++) {
      const [fx, fy, d] = NEW_FROM[i];
      const k = ramp(t, t0 + d * 1.6, t0 + d * 1.6 + 1.2, easeOut);
      const [gx, gy] = newSlot(i, split);
      const bright = t < L(1) ? 0.35 : 0.9;
      const nd = i < N_ND;
      const col = nd ? MINT : mix(MINT, LAV, hi);
      const a = (nd ? bright : bright * (1 - 0.55 * hi)) * crowdA;
      drawHead(ctx, lerp(fx, gx, k), lerp(fy, gy, k), 9, col, a * clamp(k * 2));
    }
    ctx.restore();
  }
  if (kb > 0) {
    ctx.save();
    ctx.translate(960, 540); const sc = 0.9 + 0.1 * easeOut(prog(t, t0, t0 + 1.2)) + 0.015 * barPulse(t); ctx.scale(sc, sc);
    ctx.fillStyle = `rgba(20,10,16,${0.55 * kb})`; roundRect(ctx, -620, -190, 1240, 360, 40); ctx.fill();
    text(ctx, '换一批孩子', 0, -20, { size: 150, family: 'Head', weight: 900, color: CREAM, alpha: kb, shadow: 30 });
    text(ctx, '重做一遍', 0, 130, { size: 130, family: 'Head', weight: 900, color: MINT, alpha: kb, shadow: 30 });
    ctx.restore();
  }
  // 918
  const kn = fadeIn(t, L(1) - 0.2, 0.4) * (1 - ramp(t, L(2) - 0.4, L(2)));
  if (kn > 0) {
    const n = Math.round(N_ALL * ramp(t, L(1), L(1) + 1.0, x => x));
    text(ctx, String(n), 480, 520, { size: 220, family: 'Head', weight: 900, color: GOLD, alpha: kn, shadow: 30 });
    text(ctx, '个孩子', 480, 610, { size: 54, family: 'Head', weight: 900, color: CREAM, alpha: kn });
    text(ctx, '美国 NICHD 早期儿童照护与青少年发展研究', 480, 680, { size: 28, family: 'Sans', weight: 400, color: DIM, alpha: kn });
  }
  // 4 岁半，等棉花糖；最多 7 分钟；15 岁看成绩
  const kt = ramp(t, L(2) - 0.4, L(2) + 0.2) * (1 - ramp(t, L(5) - 0.5, L(5)));
  if (kt > 0) {
    ctx.save(); ctx.globalAlpha *= kt;
    drawLamp(ctx, t, 960);
    const age = ramp(t, L(4), L(4) + 1.2);
    const card = ramp(t, L(4) + 0.8, L(4) + 1.6);
    drawKid(ctx, 960, TABLE_TOP + 10, 1.25, { shirt: MINT, age, lookY: 1 - 1.4 * age, look: age > 0 ? 0 : Math.sin(t * 2.5) * 0.6, mouth: age > 0.5 ? 'smile' : 'line', card, cover: ramp(t, L(3) + 0.6, L(3) + 1.2) * (1 - ramp(t, L(4) - 0.2, L(4) + 0.3)) });
    drawTable(ctx, t, TABLE_TOP);
    drawPlate(ctx, 960, PLATE_Y, 1.1, 1 - ramp(t, L(4), L(4) + 0.6));
    drawMallow(ctx, 960, PLATE_Y + 6, 1.9, { alpha: 1 - ramp(t, L(4), L(4) + 0.6), glow: 0.3 + 0.2 * barPulse(t) });
    const ageLab = age < 0.5 ? '4 岁半' : '15 岁';
    text(ctx, ageLab, 420, 330, { size: 110, family: 'Head', weight: 900, color: GOLD, shadow: 20, alpha: age < 0.5 ? 1 - ramp(t, L(4) - 0.1, L(4) + 0.5) * 2 : ramp(t, L(4) + 0.5, L(4) + 0.9) });
    text(ctx, age < 0.5 ? '在实验室里等' : '看数学和阅读成绩', 420, 400, { size: 34, family: 'Sans', weight: 700, color: DIM, alpha: age < 0.5 ? 1 - ramp(t, L(4) - 0.1, L(4) + 0.5) * 2 : ramp(t, L(4) + 0.5, L(4) + 0.9) });
    const k7 = pop(t, L(3)) * (1 - ramp(t, L(4), L(4) + 0.5));
    if (k7 > 0) {
      const f = ramp(t, L(3) + 0.3, L(4), x => x);
      drawTimer(ctx, 1480, 360, 130, f, { marks: 7, alpha: clamp(k7), color: MINT });
      richText(ctx, [['最多 ', CREAM], ['7', GOLD], [' 分钟', CREAM]], 1480, 570, { size: 54, family: 'Head', weight: 900, alpha: clamp(k7), shadow: 12 });
      text(ctx, '原研究要等 15～20 分钟', 1480, 620, { size: 28, family: 'Sans', weight: 400, color: DIM, alpha: clamp(k7) });
    }
    ctx.restore();
  }
  // 552 / 366 标签
  const ks = fadeIn(t, L(5) + 0.8, 0.5) * (1 - ramp(t, L(7) - 0.4, L(7)));
  if (ks > 0) {
    richText(ctx, [[String(N_ND), GOLD]], 627, 260, { size: 90, family: 'Head', weight: 900, alpha: ks, shadow: 16 });
    text(ctx, String(N_D), 1331, 260, { size: 60, family: 'Head', weight: 900, color: rgba(LAV, 0.8), alpha: ks });
    const kl = fadeIn(t, L(6), 0.5);
    text(ctx, '妈妈没有大学学历', 627, 830, { size: 46, family: 'Head', weight: 900, color: MINT, alpha: ks * kl });
    text(ctx, '妈妈有大学学历', 1331, 830, { size: 36, family: 'Serif', weight: 700, color: rgba(LAV, 0.85), alpha: ks * kl });
  }
  // 15 岁成绩的阶梯
  const kg = fadeIn(t, L(7) - 0.3, 0.5);
  if (kg > 0) {
    ctx.save(); ctx.globalAlpha *= kg;
    const base = 800, ppu = 640, bw = 200;
    const focus = ramp(t, L(9) - 0.2, L(9) + 0.5);
    text(ctx, '15 岁成绩：比等不到 20 秒的孩子高多少', 960, 150, { size: 42, family: 'Serif', weight: 700, color: CREAM, alpha: 1 - 0.6 * focus });
    text(ctx, '单位：标准差 · 母亲无大学学历的 552 人 · 未考虑家庭等其他因素', 960, 200, { size: 26, family: 'Sans', weight: 400, color: DIM, alpha: 1 - 0.6 * focus });
    ctx.fillStyle = 'rgba(255,244,230,0.3)'; ctx.fillRect(400, base, 1120, 2);
    for (let i = 0; i < 4; i++) {
      const x = 560 + i * 266;
      const tb = beatAfter(L(7), i);
      const k = ramp(t, tb, tb + 0.8, easeOut);
      const h = Math.max(6, STEPS[i] * ppu * k);
      ctx.save(); ctx.globalAlpha *= 1 - 0.8 * focus;
      const g = ctx.createLinearGradient(0, base - h, 0, base);
      g.addColorStop(0, MINT); g.addColorStop(1, rgba(MINT, 0.25));
      ctx.fillStyle = g; roundRect(ctx, x - bw / 2, base - h, bw, h, [12, 12, 0, 0]); ctx.fill();
      // 桌上的棉花糖数量随等待长短示意
      text(ctx, STEP_LAB[i], x, base + 52, { size: 34, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(k * 3) });
      if (i > 0) text(ctx, '+' + (STEPS[i] * clamp(k * 1.1)).toFixed(2), x, base - h - 24, { size: 60, family: 'Head', weight: 900, color: i === 3 ? GOLD : CREAM, alpha: clamp(k * 2), shadow: 14 });
      else text(ctx, '基准', x, base - 30, { size: 40, family: 'Head', weight: 900, color: DIM, alpha: clamp(k * 3) });
      ctx.restore();
    }
    // 每多等 1 分钟
    if (focus > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(22,11,18,${0.72 * focus})`; roundRect(ctx, 460, 290, 1000, 330, 36); ctx.fill();
      ctx.restore();
      richText(ctx, [['每多等 ', CREAM], ['1', GOLD], [' 分钟', CREAM]], 960, 405, { size: 64, family: 'Head', weight: 900, alpha: focus });
      const kv = pop(t, L(10));
      richText(ctx, [['约 +', GOLD], ['0.1', GOLD], [' 个标准差', CREAM]], 960, 540, { size: 96, family: 'Head', weight: 900, alpha: clamp(kv), shadow: 24 });
    }
    ctx.restore();
  }
};

// 相关对比：原研究 vs 重做
function drawCompare(ctx, t, o) {
  const { origA = 1, newLen = 0, half = 0, alpha = 1 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  drawAxis(ctx, AX0, 740, AXLEN, 1, [0, 0.5, 1], 1, '相关系数');
  rowLabel(ctx, '原研究', 330, AMBER, origA, 'SAT 数学 / 语言');
  drawStick(ctx, t, AX0, 300, R_MATH * AXLEN, 44, AMBER, { alpha: origA, glow: 0.4 });
  drawStick(ctx, t, AX0, 370, R_VERB * AXLEN, 44, AMBER, { alpha: origA, glow: 0.4 });
  valueAt(ctx, R_MATH, RX(R_MATH), 300, rgba(AMBER, 1), origA, 48);
  valueAt(ctx, R_VERB, RX(R_VERB), 370, rgba(AMBER, 1), origA, 48);
  if (half > 0) {
    ctx.save(); ctx.globalAlpha *= half;
    ctx.strokeStyle = 'rgba(255,244,230,0.75)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
    for (const [v, y] of [[R_MATH, 300], [R_VERB, 370]]) { ctx.beginPath(); ctx.moveTo(RX(v / 2), y - 34); ctx.lineTo(RX(v / 2), 600); ctx.stroke(); }
    ctx.restore();
    text(ctx, '一半', (RX(R_MATH / 2) + RX(R_VERB / 2)) / 2, 248, { size: 34, family: 'Head', weight: 900, color: CREAM, alpha: half });
  }
  rowLabel(ctx, '重做', 560, MINT, 1, '15 岁成绩');
  drawStick(ctx, t, AX0, 560, newLen * AXLEN, 70, MINT);
  if (newLen > 0.005) valueAt(ctx, newLen, RX(newLen), 560, GOLD, 1, 80);
  ctx.restore();
}

SCENES.reveal = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('reveal', 1);
  const k = ramp(t, t1 + 0.1, t1 + 1.4, easeOut);
  drawCompare(ctx, t, { origA: fadeIn(t, t0 - 0.2, 0.6), newLen: R_NEW * k, alpha: 1 });
  text(ctx, '✓', RX(R_MATH) + 230, 330, { size: 90, family: 'Sans', weight: 700, color: MINT, alpha: pop(t, beatAfter(t0, 1)) * (1 - ramp(t, t1, t1 + 0.4)) });
};

SCENES.gap = (ctx, t, s) => {
  const L = n => lineAt('gap', n);
  // 一半左右
  const kc = 1 - ramp(t, L(1) - 0.4, L(1));
  if (kc > 0) drawCompare(ctx, t, { origA: 1, newLen: R_NEW, half: fadeIn(t, L(0), 0.6), alpha: kc });
  const kg = fadeIn(t, L(1) - 0.2, 0.6);
  if (kg <= 0) return;
  ctx.save(); ctx.globalAlpha *= kg;
  const cols = [
    { x: 560, color: LAV, head: '妈妈有大学学历', mean: MEAN_D, full: FULL_D },
    { x: 1360, color: MINT, head: '妈妈没有大学学历', mean: MEAN_ND, full: FULL_ND },
  ];
  cols.forEach((c, j) => {
    text(ctx, c.head, c.x, 160, { size: 46, family: 'Head', weight: 900, color: c.color, shadow: 12 });
    // 平均等待时长
    const km = ramp(t, L(2), L(2) + 1.6, easeOut);
    const kTimer = fadeIn(t, L(1) + 0.2, 0.5);
    drawTimer(ctx, c.x - 150, 330, 100, c.mean / 7 * km, { marks: 7, color: c.color, alpha: kTimer });
    if (km > 0) {
      text(ctx, '平均等了', c.x + 90, 300, { size: 32, family: 'Sans', weight: 700, color: DIM, align: 'left', alpha: km });
      richText(ctx, [[(c.mean * km).toFixed(1), GOLD], [' 分钟', CREAM]], c.x + 90, 375, { size: 64, family: 'Head', weight: 900, align: 'left', alpha: km });
    }
    // 100 颗小棉花糖：亮着的是等满 7 分钟的
    const tg = j === 0 ? L(3) : L(5);
    const kgrid = fadeIn(t, L(3) - 0.2, 0.5);
    if (kgrid > 0) {
      const gx0 = c.x - 250, gy0 = 520, cell = 36;
      const lit = ramp(t, tg + 0.1, tg + 1.3, x => x) * c.full;
      for (let i = 0; i < 100; i++) {
        const x = gx0 + (i % 10) * cell, y = gy0 + Math.floor(i / 10) * cell;
        const on = i < lit;
        ctx.globalAlpha = kg * kgrid * (on ? 1 : 0.22);
        ctx.fillStyle = on ? '#fff0f3' : '#c9b6c0';
        roundRect(ctx, x, y, cell - 9, cell - 6, 6); ctx.fill();
        if (on) { ctx.fillStyle = rgba(c.color, 0.55); ctx.fillRect(x, y + cell - 14, cell - 9, 6); }
      }
      ctx.globalAlpha = kg;
      const kp = fadeIn(t, tg + 0.1, 0.4);
      text(ctx, Math.round(lit) + '%', c.x + 250, gy0 + 200, { size: 110, family: 'Head', weight: 900, color: j === 0 ? CREAM : GOLD, alpha: kp, shadow: 20 });
      text(ctx, '等满了 7 分钟', c.x + 250, gy0 + 260, { size: 32, family: 'Sans', weight: 700, color: DIM, alpha: kp });
    }
  });
  ctx.restore();
};

// 把家庭算进去：相关条被“压”短
const CX0 = 560, CLEN = 1000, CMAX = 0.3;
const CX = v => CX0 + v / CMAX * CLEN;
const TAGS = [['家庭收入', 1, 0], ['妈妈学历', 1, 1], ['养育环境', 2, 0], ['早期认知能力', 3, 0]];
SCENES.control = (ctx, t, s) => {
  const L = n => lineAt('control', n);
  const kin = fadeIn(t, s.start - 0.2, 0.6);
  const shrink = ramp(t, L(5), L(5) + 1.4, easeInOut);
  const v = lerp(R_NEW, R_CTRL, shrink);
  ctx.save(); ctx.globalAlpha *= kin;
  text(ctx, '15 岁成绩和等待时间的相关', 960, 150, { size: 42, family: 'Serif', weight: 700, color: CREAM });
  text(ctx, '母亲无大学学历的 552 人', 960, 200, { size: 28, family: 'Sans', weight: 400, color: DIM });
  drawAxis(ctx, CX0, 760, CLEN, CMAX, [0, 0.1, 0.2, 0.3], 1, '相关系数（这张图放大了刻度）');
  rowLabel(ctx, '重做', 640, MINT, 1);
  drawGhostStick(ctx, CX0, 640, CX(R_NEW) - CX0, 90, MINT, shrink);
  drawStick(ctx, t, CX0, 640, CX(v) - CX0, 90, MINT);
  const hot = ramp(t, L(4), L(4) + 0.3) * (1 - shrink) + shrink;
  text(ctx, v.toFixed(2), CX(v) + 30, 640 + 36, { size: 90 + 20 * hot, family: 'Head', weight: 900, color: GOLD, align: 'left', shadow: 20 });
  // 标签：一个个落到条上
  TAGS.forEach(([lab, li, sub], i) => {
    const tb = beatAfter(L(li), sub * 2 + 1);
    const k = ramp(t, tb, tb + 0.5, easeBack);
    if (k <= 0) return;
    const x = CX0 + 100 + i * 265, y = lerp(250, 470, clamp(k)) + Math.sin(t * 1.4 + i) * 3;
    const press = shrink;
    ctx.save(); ctx.globalAlpha *= clamp(k * 2) * (1 - 0.4 * press);
    font(ctx, 40, 'Head', 900);
    const w = ctx.measureText(lab).width + 48;
    ctx.fillStyle = rgba(LAV, 0.22); roundRect(ctx, x - w / 2, y - 46, w, 72, 36); ctx.fill();
    ctx.strokeStyle = rgba(LAV, 0.8); ctx.lineWidth = 2; ctx.stroke();
    text(ctx, lab, x, y + 6, { size: 40, family: 'Head', weight: 900, color: CREAM });
    ctx.strokeStyle = rgba(LAV, 0.4); ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, 590); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
};

SCENES.shrink = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('shrink', 1);
  ctx.save(); ctx.globalAlpha *= 1 - ramp(t, s.end - 0.5, s.end);
  text(ctx, '15 岁成绩和等待时间的相关', 960, 150, { size: 42, family: 'Serif', weight: 700, color: CREAM });
  text(ctx, '母亲无大学学历的 552 人', 960, 200, { size: 28, family: 'Sans', weight: 400, color: DIM });
  drawAxis(ctx, CX0, 760, CLEN, CMAX, [0, 0.1, 0.2, 0.3], 1, '相关系数（这张图放大了刻度）');
  const up = ramp(t, t1, t1 + 0.6);
  const y = lerp(640, 470, up);
  rowLabel(ctx, '成绩', y, MINT, 1);
  drawGhostStick(ctx, CX0, y, CX(R_NEW) - CX0, 90, MINT, 1);
  drawStick(ctx, t, CX0, y, CX(R_CTRL) - CX0, 90, MINT);
  text(ctx, R_CTRL.toFixed(2), CX(R_CTRL) + 30, y + 36, { size: 90, family: 'Head', weight: 900, color: GOLD, align: 'left', shadow: 20 });
  // 被拿走的三分之二
  const kb = pop(t, t0 + 0.1);
  if (kb > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(kb);
    const xa = CX(R_CTRL) + 8, xb = CX(R_NEW);
    ctx.strokeStyle = CREAM; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xa, y - 70); ctx.lineTo(xa, y - 82); ctx.lineTo(xb, y - 82); ctx.lineTo(xb, y - 70); ctx.stroke();
    text(ctx, '− 2/3', (xa + xb) / 2 + 40, y - 106, { size: 64, family: 'Head', weight: 900, color: GOLD, shadow: 14 });
    ctx.restore();
  }
  // 行为问题
  const kh = fadeIn(t, t1 + 0.2, 0.5);
  if (kh > 0) {
    ctx.save(); ctx.globalAlpha *= kh;
    rowLabel(ctx, '行为问题', 640, rgba(LAV, 1), kh);
    ctx.fillStyle = rgba(LAV, 0.8); roundRect(ctx, CX0 - 2, 640 - 30, 6, 60, 3); ctx.fill();
    text(ctx, '15 岁时几乎为 0，不显著', CX0 + 40, 652, { size: 40, family: 'Head', weight: 900, color: CREAM, align: 'left' });
    ctx.restore();
  }
  ctx.restore();
};

SCENES.end = (ctx, t, s) => {
  const L = n => lineAt('end', n);
  const t0 = s.start;
  // 起势：中央大字
  const kb = ramp(t, t0, t0 + 0.6, easeOut) * (1 - ramp(t, L(1) - 0.5, L(1)));
  if (kb > 0) {
    ctx.save();
    ctx.translate(960, 520); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.4)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '那几分钟的等待，测出的', 0, -150, { size: 64, family: 'Serif', weight: 700, color: DIM, alpha: kb });
    text(ctx, '很大一部分是家庭', 0, 40, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    text(ctx, '和更早的认知能力', 0, 170, { size: 80, family: 'Head', weight: 900, color: CREAM, alpha: ramp(t, t0 + 0.8, t0 + 1.4) * kb, shadow: 24 });
    ctx.restore();
  }
  // 追到 26 岁：三个年龄
  const ka = fadeIn(t, L(1) - 0.3, 0.6) * (1 - ramp(t, L(3) - 0.5, L(3)));
  if (ka > 0) {
    ctx.save(); ctx.globalAlpha *= ka;
    const xs = [460, 960, 1460], ages = [0, 1, 2], labs = ['4 岁半', '15 岁', '26 岁'];
    const by = 700;
    ctx.fillStyle = 'rgba(255,244,230,0.25)'; ctx.fillRect(300, by, 1320, 2);
    xs.forEach((x, i) => {
      const k = pop(t, beatAfter(L(1), i));
      drawKid(ctx, x, by, [1.05, 0.95, 0.95][i], { shirt: MINT, age: ages[i], alpha: clamp(k), lookY: 0, mouth: 'smile' });
      richText(ctx, [[labs[i].replace(/\D+/g, ''), GOLD], [labs[i].replace(/\d+/g, ''), CREAM]], x, by + 80, { size: 54, family: 'Head', weight: 900, alpha: clamp(k) });
    });
    text(ctx, '同一批孩子中的 702 人 · Sperber 等 (2024)', 1460, by + 135, { size: 28, family: 'Sans', weight: 400, color: DIM, alpha: pop(t, beatAfter(L(1), 2)) });
    // 预测断开
    const kq = fadeIn(t, L(2), 0.6);
    if (kq > 0) {
      ctx.strokeStyle = rgba(CREAM, 0.6); ctx.lineWidth = 4; ctx.setLineDash([14, 14]);
      ctx.beginPath(); ctx.moveTo(560, 250); ctx.quadraticCurveTo(960, 120, 1360, 250); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '?', 960, 225, { size: 110, family: 'Head', weight: 900, color: GOLD, alpha: kq, shadow: 20 });
      text(ctx, '学历、收入、健康、冲动行为……调整其他因素后几乎都不显著', 960, 320, { size: 38, family: 'Sans', weight: 700, color: DIM, alpha: kq });
    }
    ctx.restore();
  }
  // 回到小桌：糖可以吃了
  const kt = fadeIn(t, L(3) - 0.4, 0.8);
  if (kt > 0) {
    const tEat = L(7);
    const z = 1.04 - 0.04 * ramp(t, L(3), s.end, x => x);
    ctx.save(); ctx.globalAlpha *= kt;
    ctx.translate(960, 600); ctx.scale(z, z); ctx.translate(-960, -600);
    drawLamp(ctx, t);
    const timerA = 1 - ramp(t, L(4) + 0.4, L(5));
    const relax = ramp(t, L(5), L(5) + 0.8);
    const bite = ramp(t, beatAfter(tEat, 1), beatAfter(tEat, 1) + 0.35);
    drawKid(ctx, 960, TABLE_TOP + 10, 1.3, { shirt: mix(MINT, '#ffb38a', relax), lookY: 1, mouth: bite > 0 ? 'smile' : t > L(6) ? 'open' : 'smile', glow: 0.3 * relax + 0.3 * warmth(t) });
    drawTable(ctx, t, TABLE_TOP);
    drawPlate(ctx, 960, PLATE_Y, 1.1);
    drawMallow(ctx, 960, PLATE_Y + 6, 1.9, { glow: 0.4 + 0.6 * ramp(t, L(6), L(6) + 1) + 0.2 * barPulse(t), bite });
    drawTimer(ctx, 1520, 330, 110, 0.6, { marks: 7, alpha: timerA, color: MINT });
    ctx.restore();
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 30);
  ctx.save();
  ctx.translate(430, 60);
  drawLamp(ctx, 30);
  drawKid(ctx, 960, TABLE_TOP + 10, 1.3, { shirt: MINT, lookY: 1, mouth: 'o' });
  drawTable(ctx, 30, TABLE_TOP);
  drawPlate(ctx, 960, PLATE_Y, 1.1);
  drawMallow(ctx, 960, PLATE_Y + 6, 1.9, { glow: 1 });
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(13,7,11,0.95)'); g.addColorStop(0.45, 'rgba(13,7,11,0.75)'); g.addColorStop(0.75, 'rgba(13,7,11,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, '忍住不吃棉花糖', 110, 360, { size: 120, family: 'Head', weight: 900, color: CREAM, align: 'left', shadow: 30 });
  richText(ctx, [['长大', CREAM], ['更成功', GOLD], ['吗？', CREAM]], 110, 540, { size: 150, family: 'Head', weight: 900, align: 'left', shadow: 30 });
  text(ctx, '换 918 个孩子，重做一遍', 115, 670, { size: 60, family: 'Sans', weight: 700, color: MINT, align: 'left', spacing: 3, shadow: 16 });
}
