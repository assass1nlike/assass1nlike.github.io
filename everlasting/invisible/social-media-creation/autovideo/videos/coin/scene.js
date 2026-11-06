// 抛硬币：画面
// 美术方向：深夜台灯下的“硬币星空”。墨蓝底，头顶一盏暖灯；硬币一面是笑脸太阳（正面，金色），
// 一面是睡着的月亮（反面，银蓝色），这样一眼就能看出哪面朝上。
// 没有人声：字幕出现的那一拍，画面跟着变；17.41 / 34.76 / 95.50 起势处放大字和大转场。

const CREAM = '#fbf3e4';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,243,228,0.62)';
const SILVER = '#b9c8e2';
const SKIN = '#f3d2b8';
const SKIN_D = '#d9a888';
const SLEEVE = '#35606e';
const INK = '#2a2230';
const FACE = {
  sun: { hi: '#ffe7a3', base: '#f2b84b', lo: '#b97a26', rim: '#9c6420', mark: '#fff2c9' },
  moon: { hi: '#eef3fb', base: '#bccbe3', lo: '#7d8fae', rim: '#63738f', mark: '#f7faff' },
};
// 论文数据（Bartoš 等，2025，JASA；arXiv:2310.04153）
const PAPER = { flips: 350757, same: 178079, heads: 175421, people: 48, coins: 44, ciLo: 50.60, ciHi: 50.94 };
const SIM = DATA.sim;
const PEOPLE = DATA.people.people;
const other = f => (f === 'sun' ? 'moon' : 'sun');
const fmt = n => Math.round(n).toLocaleString('en-US');
const pct = (a, b, d = 1) => (100 * a / b).toFixed(d);

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
// 淡入 a→a+d，淡出 b-d→b
const vis = (t, a, b, d = 0.35) => (b === undefined ? ramp(t, a, a + d) : window01(t, a, b, d));
const pop = (t, a, d = 0.4) => clamp(ramp(t, a, a + d, easeBack), 0, 1.2);
function withAlpha(ctx, a, fn) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a; fn(); ctx.restore();
}
function tag(ctx, str, x, y, a = 1, align = 'center') {
  text(ctx, str, x, y, { size: 30, family: 'Sans', weight: 400, color: 'rgba(251,243,228,0.5)', alpha: a, align });
}

// ---------- 背景：墨蓝夜色，头顶暖灯，远处一颗颗小硬币像星星 ----------
const STARS = (() => {
  const rnd = mulberry32(5);
  return Array.from({ length: 80 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.4, ph: rnd() * 6, sp: 0.5 + rnd(),
    coin: rnd() < 0.18, vy: 3 + rnd() * 6, spin: 0.6 + rnd() * 1.4 }));
})();
const endWarm = t => ramp(t, lineAt('end', 5), lineAt('end', 6) + 1.5);

function drawBackground(ctx, t) {
  const w = endWarm(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#14233a', '#2b2438', w));
  g.addColorStop(0.55, mix('#0d1828', '#1d1828', w));
  g.addColorStop(1, mix('#060b14', '#0f0b14', w));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // 头顶的灯
  glowDot(ctx, 960, -120, 900, '#ffc982', 0.13 + 0.07 * lv + 0.08 * w);
  // 光锥
  const cg = ctx.createLinearGradient(0, 0, 0, H);
  cg.addColorStop(0, rgba('#ffd9a0', 0.05 + 0.04 * lv)); cg.addColorStop(1, rgba('#ffd9a0', 0));
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.moveTo(820, 0); ctx.lineTo(1100, 0); ctx.lineTo(1500, H); ctx.lineTo(420, H); ctx.closePath(); ctx.fill();
  for (const s of STARS) {
    const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    if (s.coin) {
      const y = (s.y - s.vy * t + H * 20) % H;
      const k = Math.abs(Math.cos(t * s.spin + s.ph));
      ctx.fillStyle = rgba(Math.sin(t * s.spin + s.ph) > 0 ? '#ffd890' : '#cfdcf2', 0.10 + 0.08 * tw);
      ctx.beginPath(); ctx.ellipse(s.x, y, s.r * 3.4, s.r * 3.4 * Math.max(0.12, k), 0, 0, Math.PI * 2); ctx.fill();
    } else {
      glowDot(ctx, s.x, s.y, s.r * 3.5, '#ffe6bd', (0.10 + 0.22 * lv) * tw);
    }
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 540, 480, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 硬币 ----------
// 一面的图案，画在半径 r 的圆里
function drawFace(ctx, r, face) {
  const P = FACE[face];
  const g = ctx.createRadialGradient(-0.35 * r, -0.4 * r, 0.1 * r, 0, 0, r * 1.05);
  g.addColorStop(0, P.hi); g.addColorStop(0.55, P.base); g.addColorStop(1, P.lo);
  ctx.fillStyle = g; circle(ctx, 0, 0, r); ctx.fill();
  ctx.strokeStyle = rgba(P.mark, 0.55); ctx.lineWidth = Math.max(1, r * 0.05);
  circle(ctx, 0, 0, r * 0.84); ctx.stroke();
  // 边缘的一圈小点
  ctx.fillStyle = rgba(P.mark, 0.45);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    circle(ctx, Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.022); ctx.fill();
  }
  if (face === 'sun') {
    ctx.fillStyle = rgba(P.mark, 0.85);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.13) * r * 0.47, Math.sin(a - 0.13) * r * 0.47);
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.lineTo(Math.cos(a + 0.13) * r * 0.47, Math.sin(a + 0.13) * r * 0.47);
      ctx.closePath(); ctx.fill();
    }
    circle(ctx, 0, 0, r * 0.4); ctx.fill();
    ctx.fillStyle = P.rim;
    for (const sx of [-1, 1]) { circle(ctx, sx * 0.13 * r, -0.06 * r, r * 0.045); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,110,0.45)';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 0.24 * r, 0.08 * r, r * 0.07, r * 0.04, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = P.rim; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0.04 * r, 0.11 * r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    // 月牙：亮圆上再盖一个底色圆
    ctx.fillStyle = rgba(P.mark, 0.92);
    circle(ctx, -0.04 * r, 0, r * 0.5); ctx.fill();
    ctx.fillStyle = g; circle(ctx, 0.2 * r, -0.12 * r, r * 0.42); ctx.fill();
    ctx.strokeStyle = P.rim; ctx.lineWidth = Math.max(1, r * 0.035); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-0.3 * r, -0.02 * r, 0.06 * r, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(-0.24 * r, 0.16 * r, 0.07 * r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = rgba(P.mark, 0.9);
    for (const [sx, sy, sr] of [[0.42, -0.32, 0.07], [0.5, 0.12, 0.045]]) star(ctx, sx * r, sy * r, sr * r);
  }
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
// 绕水平轴翻转的硬币。phi=0：top 那面正对镜头；cos(phi)<0 时看到另一面。tilt 是画面内的倾斜（摆动）
function drawCoin(ctx, x, y, r, o = {}) {
  const { phi = 0, top = 'sun', tilt = 0, alpha = 1, glow = 0 } = o;
  if (alpha <= 0.002 || r <= 0) return;
  const c = Math.cos(phi), s = Math.sin(phi);
  const face = c >= 0 ? top : other(top);
  const ky = Math.max(0.035, Math.abs(c));
  const th = r * 0.14 * Math.abs(s);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(tilt);
  if (glow > 0) glowDot(ctx, 0, 0, r * 2.3, FACE[face].base, 0.45 * glow);
  const P = FACE[face];
  ctx.fillStyle = P.rim;
  ctx.beginPath(); ctx.ellipse(0, th, r, r * ky, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-r, 0, 2 * r, th);
  // 侧边的齿纹
  if (th > 2) {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 18; i++) {
      const xx = -r + (2 * r * i) / 18, yy = r * ky * Math.sqrt(Math.max(0, 1 - (xx / r) ** 2));
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + th); ctx.stroke();
    }
  }
  ctx.save(); ctx.scale(1, ky); drawFace(ctx, r, face); ctx.restore();
  ctx.restore();
}
// 抛起的轨迹：从 t0 起 dur 秒，最高 h 像素，转 n 整圈（land='other' 时多转半圈）
const REST = 1.12;  // 躺在手心里时的翻转角（看得到正面，略扁）
function toss(t, t0, dur, h, n, land = 'same') {
  const u = prog(t, t0, t0 + dur);
  const total = n * 2 * Math.PI + (land === 'same' ? 0 : Math.PI);
  return { dy: -4 * h * u * (1 - u), phi: REST + total * u, flying: u > 0 && u < 1 };
}

// ---------- 手 ----------
// 手心朝上的手，(x, y) 是手心中点
function drawHand(ctx, x, y, s, o = {}) {
  const { alpha = 1 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  // 袖子
  const sg = ctx.createLinearGradient(0, 40, 0, 220);
  sg.addColorStop(0, SLEEVE); sg.addColorStop(1, 'rgba(29,58,69,0)');
  ctx.fillStyle = sg;
  roundRect(ctx, -88, 52, 176, 170, 40); ctx.fill();
  ctx.fillStyle = '#e9c48c';
  roundRect(ctx, -92, 44, 184, 30, 14); ctx.fill();
  // 手指（远端）
  ctx.fillStyle = SKIN_D;
  [[-60, -46], [-22, -58], [16, -58], [52, -48]].forEach(([fx, fy]) => { roundRect(ctx, fx - 17, fy - 14, 34, 50, 17); ctx.fill(); });
  // 手掌
  const pg = ctx.createRadialGradient(-20, -10, 10, 0, 0, 110);
  pg.addColorStop(0, '#f8dfca'); pg.addColorStop(1, SKIN);
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.ellipse(0, 4, 98, 48, 0, 0, Math.PI * 2); ctx.fill();
  roundRect(ctx, -70, 10, 140, 50, 22); ctx.fill();
  // 大拇指
  ctx.save(); ctx.translate(92, -6); ctx.rotate(-0.6);
  ctx.fillStyle = SKIN; roundRect(ctx, -18, -48, 36, 74, 18); ctx.fill();
  ctx.restore();
  // 掌纹
  ctx.strokeStyle = 'rgba(190,130,105,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-50, 8); ctx.quadraticCurveTo(-5, 26, 46, 4); ctx.stroke();
  ctx.restore();
}
// 手背朝上、盖下来的手
function drawCoverHand(ctx, x, y, s, alpha = 1) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  const sg = ctx.createLinearGradient(0, -260, 0, -40);
  sg.addColorStop(0, '#1d3a45'); sg.addColorStop(1, '#6a3d4a');
  ctx.fillStyle = sg; roundRect(ctx, -84, -300, 168, 250, 40); ctx.fill();
  ctx.fillStyle = '#e9c48c'; roundRect(ctx, -90, -76, 180, 28, 14); ctx.fill();
  const hg = ctx.createLinearGradient(0, -60, 0, 60);
  hg.addColorStop(0, '#f6d7bf'); hg.addColorStop(1, SKIN_D);
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(0, 0, 112, 62, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(160,100,80,0.35)'; ctx.lineWidth = 3;
  for (const fx of [-48, -16, 16, 48]) { ctx.beginPath(); ctx.moveTo(fx, 30); ctx.lineTo(fx * 1.1, 58); ctx.stroke(); }
  ctx.restore();
}

// ---------- 小人 ----------
const PCOLS = ['#e98a74', '#7cc6c0', '#f0b86a', '#9fb0e6', '#d79bd0', '#8fcf8a', '#f2a3a8', '#c7b08a'];
function drawPerson(ctx, x, y, s, col, o = {}) {
  const { alpha = 1, glow = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -50, 90, col, 0.5 * glow);
  const bg = ctx.createLinearGradient(0, -50, 0, 0);
  bg.addColorStop(0, col); bg.addColorStop(1, mix(col, '#000000', 0.3));
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 0, 36, 44, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = SKIN; circle(ctx, 0, -64, 25); ctx.fill();
  ctx.fillStyle = '#3a2b33';
  ctx.beginPath(); ctx.arc(0, -68, 26, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  for (const sx of [-9, 9]) { circle(ctx, sx, -62, 3.2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,120,140,0.4)';
  for (const sx of [-15, 15]) { ctx.beginPath(); ctx.ellipse(sx, -55, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// 两张“选项”小卡片
function drawChoice(ctx, x, y, str, a, glow = 0, tilt = 0) {
  withAlpha(ctx, a, () => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    if (glow > 0) glowDot(ctx, 0, 0, 260, '#ffc45e', 0.5 * glow);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.fillStyle = mix('#f6efe2', '#ffe3a3', glow);
    roundRect(ctx, -120, -70, 240, 140, 22); ctx.fill();
    ctx.shadowColor = 'transparent';
    text(ctx, str, 0, 24, { size: 66, family: 'Head', weight: 900, color: INK });
    ctx.restore();
  });
}

// 横向的“五五开”对比板：左太阳、右月亮
function drawSplit(ctx, cx, y, a, lText, rText, o = {}) {
  const { q = 0, tilt = 0, lCap = '正面', rCap = '反面' } = o;
  withAlpha(ctx, a, () => {
    ctx.save(); ctx.translate(cx, y); ctx.rotate(tilt);
    ctx.fillStyle = 'rgba(20,30,48,0.7)';
    roundRect(ctx, -460, -110, 920, 220, 40); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,160,0.25)'; ctx.lineWidth = 2; ctx.stroke();
    drawCoin(ctx, -375, 0, 56, { top: 'sun' });
    drawCoin(ctx, 375, 0, 56, { top: 'moon' });
    text(ctx, lCap, -170, -30, { size: 36, family: 'Serif', color: DIM });
    text(ctx, rCap, 170, -30, { size: 36, family: 'Serif', color: DIM });
    text(ctx, lText, -170, 52, { size: 76, family: 'Head', weight: 900, color: GOLD });
    text(ctx, rText, 170, 52, { size: 76, family: 'Head', weight: 900, color: SILVER });
    if (q > 0) text(ctx, '?', 0, 40, { size: 120 * (0.9 + 0.1 * barPulse(TL_T)), family: 'Head', weight: 900, color: CREAM, alpha: q, shadow: 20 });
    ctx.restore();
  });
}
let TL_T = 0; // 当前时刻，给不方便传 t 的小函数用

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  TL_T = t;
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2);
  const hx = 960, hy = 740;
  const kc = vis(t, 0.3) * (1 - ramp(t, t2 - 0.2, t2 + 0.3));
  drawChoice(ctx, 560, 420, '去', kc * pop(t, 0.4), 0, -0.06);
  drawChoice(ctx, 1360, 420, '不去', kc * pop(t, 0.7), 0, 0.05);
  drawHand(ctx, hx, hy, 1.15, { alpha: vis(t, 0.1, undefined, 0.6) });
  const f = toss(t, beatAfter(t1, 1), TL.music.beat * 2.2, 380, 4);
  drawCoin(ctx, hx, hy - 34 + f.dy, 66, { phi: f.phi, glow: 0.4 + 0.3 * barPulse(t) });
  const kb = ramp(t, t2, t2 + 0.5, easeOut);
  drawSplit(ctx, 960, 330 - 30 * (1 - kb), kb, '50%', '50%', { q: ramp(t, t2 + 0.6, t2 + 1.0) });
};

SCENES.model = (ctx, t, s) => {
  TL_T = t;
  const t0 = s.start, t1 = lineAt('model', 1), t2 = lineAt('model', 2), t3 = lineAt('model', 3);
  const kY = vis(t, t0, t1 + 0.2, 0.5);
  text(ctx, '2007', 960, 420, { size: 300, family: 'Head', weight: 900, color: 'rgba(255,226,170,0.12)', alpha: kY });
  text(ctx, 'Diaconis · Holmes · Montgomery', 960, 520, { size: 46, family: 'Serif', weight: 400, color: DIM, alpha: kY, spacing: 2 });
  // 慢镜头里晃着转的硬币
  const kc = ramp(t, t1 - 0.3, t1 + 0.5);
  if (kc <= 0) return;
  withAlpha(ctx, kc, () => {
    const cy = 450 + Math.sin(t * 1.3) * 10;
    const wob = 0.3 * ramp(t, t1, t1 + 1);
    const tilt = wob * Math.sin((t - t1) * 2.6);
    const phi = (t - t1) * 2.4;
    const face = Math.cos(phi) >= 0 ? 'sun' : 'moon';
    const hl = ramp(t, t2, t2 + 0.4) * (face === 'sun' ? 1 : 0);
    // 旋转轴
    ctx.save(); ctx.translate(960, cy); ctx.rotate(tilt);
    ctx.strokeStyle = 'rgba(255,230,190,0.45)'; ctx.lineWidth = 3; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(-330, 0); ctx.lineTo(330, 0); ctx.stroke();
    ctx.restore();
    // 轴的摆动范围
    ctx.strokeStyle = rgba('#ffd27a', 0.3 * ramp(t, t1, t1 + 1)); ctx.lineWidth = 2;
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(960, cy, 330, sg > 0 ? -0.3 : Math.PI - 0.3, sg > 0 ? 0.3 : Math.PI + 0.3); ctx.stroke(); }
    drawCoin(ctx, 960, cy, 160, { phi, tilt, glow: 0.25 + 0.6 * hl });
    tag(ctx, '示意', 1690, 860, 1);
    // 抛前朝上的那面
    const kt = ramp(t, t2, t2 + 0.4, easeOut);
    if (kt > 0) {
      drawCoin(ctx, 420, 450, 56, { top: 'sun', alpha: kt });
      text(ctx, '抛前朝上', 420, 560, { size: 40, family: 'Serif', color: GOLD, alpha: kt });
    }
    // 朝上时间
    const kb = ramp(t, t3, t3 + 0.3);
    if (kb > 0) {
      const x0 = 520, wid = 880, y = 760, fill = ramp(t, t3, t3 + 1.6, x => x);
      const share = 0.53;
      withAlpha(ctx, kb, () => {
        text(ctx, '在空中朝上的时间', 960, y - 30, { size: 36, family: 'Serif', color: DIM });
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, x0, y, wid, 44, 22); ctx.fill();
        ctx.save(); roundRect(ctx, x0, y, wid * fill, 44, 22); ctx.clip();
        ctx.fillStyle = FACE.sun.base; ctx.fillRect(x0, y, wid * share, 44);
        ctx.fillStyle = FACE.moon.base; ctx.fillRect(x0 + wid * share, y, wid * (1 - share), 44);
        ctx.restore();
        drawCoin(ctx, x0 - 50, y + 22, 26, { top: 'sun' });
        drawCoin(ctx, x0 + wid + 50, y + 22, 26, { top: 'moon' });
        text(ctx, '更久一点', x0 + wid * share / 2, y + 100, { size: 34, family: 'Serif', color: GOLD, alpha: ramp(t, t3 + 1.2, t3 + 1.6) });
      });
    }
  });
};

SCENES.claim = (ctx, t, s) => {
  TL_T = t;
  const t0 = s.start, t1 = lineAt('claim', 1), t2 = lineAt('claim', 2), t3 = lineAt('claim', 3);
  // 起势：大字
  const kb = ramp(t, t0, t0 + 0.45, easeOut) * (1 - ramp(t, t1 - 0.4, t1 + 0.1));
  if (kb > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + t * 0.08;
      ctx.fillStyle = rgba('#ffd27a', 0.05 * kb);
      ctx.beginPath(); ctx.moveTo(960, 560);
      ctx.lineTo(960 + Math.cos(a - 0.06) * 1300, 560 + Math.sin(a - 0.06) * 1300);
      ctx.lineTo(960 + Math.cos(a + 0.06) * 1300, 560 + Math.sin(a + 0.06) * 1300); ctx.fill();
    }
    ctx.restore();
    text(ctx, '他们的模型算出', 960, 330, { size: 46, family: 'Serif', color: DIM, alpha: kb });
    text(ctx, '落回抛前那一面的概率', 960, 410, { size: 64, family: 'Serif', color: CREAM, alpha: kb });
    ctx.save();
    ctx.translate(960, 640);
    const sc = 0.9 + 0.1 * easeOut(prog(t, t0, t0 + 1)) + 0.015 * barPulse(t);
    ctx.scale(sc, sc);
    text(ctx, '约 51%', 0, 0, { size: 230, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  // 一根 0~100% 的条：51 对 49
  const kr = ramp(t, t1 - 0.2, t1 + 0.5, easeOut);
  if (kr > 0) {
    const up = ramp(t, t2 - 0.3, t2 + 0.4);
    const y = lerp(520, 250, up), x0 = 360, wid = 1200;
    withAlpha(ctx, kr * (1 - 0.3 * ramp(t, t3, t3 + 0.6)), () => {
      ctx.fillStyle = FACE.sun.base; roundRect(ctx, x0, y, wid * 0.51, 70, [35, 0, 0, 35]); ctx.fill();
      ctx.fillStyle = FACE.moon.base; roundRect(ctx, x0 + wid * 0.51, y, wid * 0.49, 70, [0, 35, 35, 0]); ctx.fill();
      ctx.strokeStyle = CREAM; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(x0 + wid / 2, y - 26); ctx.lineTo(x0 + wid / 2, y + 96); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '一半', x0 + wid / 2 - 14, y + 136, { size: 36, family: 'Serif', color: CREAM, align: 'right' });
      text(ctx, '51%', x0 + wid * 0.51 + 14, y - 34, { size: 52, family: 'Head', weight: 900, color: GOLD, align: 'left' });
      drawCoin(ctx, x0 - 60, y + 35, 34, { top: 'sun' });
      drawCoin(ctx, x0 + wid + 60, y + 35, 34, { top: 'moon' });
    });
  }
  // 27 次慢镜头
  const kf = vis(t, t2, t3 + 0.4, 0.35);
  if (kf > 0) {
    withAlpha(ctx, kf, () => {
      for (let i = 0; i < 27; i++) {
        const r = Math.floor(i / 9), c = i % 9;
        const x = 960 + (c - 4) * 150, y = 470 + r * 120;
        const k = ramp(t, t2 + i * 0.045, t2 + i * 0.045 + 0.25, easeBack);
        if (k <= 0) continue;
        ctx.save(); ctx.globalAlpha *= clamp(k);
        ctx.fillStyle = 'rgba(10,14,24,0.85)'; roundRect(ctx, x - 64, y - 46, 128, 92, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,230,190,0.25)';
        for (let h = 0; h < 5; h++) { ctx.fillRect(x - 56 + h * 25, y - 42, 10, 5); ctx.fillRect(x - 56 + h * 25, y + 37, 10, 5); }
        drawCoin(ctx, x, y, 26, { phi: i * 1.7 + t * 0.6, tilt: 0.2 * Math.sin(i) });
        ctx.restore();
      }
      text(ctx, '高速摄像机拍下的抛掷', 960, 860, { size: 36, family: 'Serif', color: DIM });
    });
  }
  // 要很多很多次：硬币雨
  const kr2 = ramp(t, t3 - 0.1, t3 + 0.3);
  if (kr2 > 0) {
    const rnd = mulberry32(17);
    for (let i = 0; i < 260; i++) {
      const st = t3 + rnd() * 3.6, x = 120 + rnd() * 1680, yEnd = 560 + rnd() * 330, r = 14 + rnd() * 14, sp = rnd() * 6, face = rnd() < 0.5 ? 'sun' : 'moon';
      if (t < st) continue;
      const u = clamp((t - st) / 0.7);
      const y = lerp(-60, yEnd, u * u);
      drawCoin(ctx, x, y, r, { top: face, phi: u < 1 ? sp + (t - st) * 9 : REST, alpha: kr2 });
    }
  }
};

// 阿姆斯特丹运河边的房子
function drawHouses(ctx, a) {
  withAlpha(ctx, a, () => {
    const rnd = mulberry32(31);
    let x = 120;
    while (x < 1800) {
      const w = 90 + rnd() * 60, h = 170 + rnd() * 110, base = 330;
      ctx.fillStyle = mix('#1b2c40', '#24364c', rnd());
      ctx.beginPath();
      ctx.moveTo(x, base); ctx.lineTo(x, base - h); ctx.lineTo(x + w * 0.2, base - h); ctx.lineTo(x + w * 0.2, base - h - 26);
      ctx.lineTo(x + w * 0.5, base - h - 56); ctx.lineTo(x + w * 0.8, base - h - 26); ctx.lineTo(x + w * 0.8, base - h); ctx.lineTo(x + w, base - h); ctx.lineTo(x + w, base);
      ctx.closePath(); ctx.fill();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
        if (rnd() < 0.35) continue;
        ctx.fillStyle = rgba('#ffcf7a', 0.35 + 0.4 * rnd());
        ctx.fillRect(x + w * (0.22 + c * 0.38), base - h + 26 + r * 50, w * 0.18, 26);
      }
      x += w + 6;
    }
    ctx.fillStyle = 'rgba(120,170,200,0.12)'; ctx.fillRect(0, 334, W, 6);
  });
}
const GRID48 = i => ({ x: 960 + ((i % 12) - 5.5) * 128, y: 520 + Math.floor(i / 12) * 125 });
SCENES.team = (ctx, t, s) => {
  TL_T = t;
  const t0 = s.start, t1 = lineAt('team', 1);
  drawHouses(ctx, vis(t, t0, undefined, 0.6));
  text(ctx, 'University of Amsterdam', 960, 400, { size: 40, family: 'Serif', weight: 400, color: DIM, alpha: vis(t, t0 + 0.2), spacing: 3 });
  for (let i = 0; i < 48; i++) {
    const tb = beatAfter(t0, Math.floor(i / 6));
    const k = ramp(t, tb, tb + 0.35, easeBack);
    if (k <= 0) continue;
    const { x, y } = GRID48(i);
    drawPerson(ctx, x, y + 60 + 20 * (1 - clamp(k)), 0.9, PCOLS[i % 8], { alpha: clamp(k) });
    if (t > t1) {
      const tb2 = beatAfter(t1, (i * 7) % 4);
      const u = ((t - tb2) % (TL.music.beat * 2)) / (TL.music.beat * 2);
      const on = t > tb2;
      const dy = on ? -4 * 46 * u * (1 - u) : 0;
      drawCoin(ctx, x + 28, y - 26 + dy, 13, { phi: on ? REST + u * 4 * Math.PI : REST, top: i % 2 ? 'sun' : 'moon', alpha: ramp(t, t1, t1 + 0.3) });
    }
  }
};

// 一大片翻转中的小硬币
function coinField(ctx, t, a) {
  if (a <= 0) return;
  const rnd = mulberry32(41);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 18; c++) {
    const ph = rnd() * 6, sp = 2 + rnd() * 3;
    drawCoin(ctx, 90 + c * 103 + (r % 2) * 50, 90 + r * 105, 26, { phi: ph + t * sp, top: rnd() < 0.5 ? 'sun' : 'moon', alpha: a * 0.22 });
  }
}
const COINS44 = (() => {
  const rnd = mulberry32(44), metals = [['#f2b84b', '#b97a26'], ['#c9d3e3', '#7d8fae'], ['#d98b5f', '#8f4f2f'], ['#e7d7a0', '#a8955a']];
  return Array.from({ length: 44 }, (_, i) => ({ r: 17 + rnd() * 12, m: metals[Math.floor(rnd() * 4)], bi: rnd() < 0.25 }));
})();
function drawMiniCoin(ctx, x, y, c, a) {
  withAlpha(ctx, a, () => {
    const g = ctx.createRadialGradient(x - c.r * 0.4, y - c.r * 0.4, 1, x, y, c.r);
    g.addColorStop(0, '#fff6dc'); g.addColorStop(0.35, c.m[0]); g.addColorStop(1, c.m[1]);
    ctx.fillStyle = g; circle(ctx, x, y, c.r); ctx.fill();
    if (c.bi) { ctx.fillStyle = '#c9d3e3'; circle(ctx, x, y, c.r * 0.6); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; circle(ctx, x, y, c.r * 0.8); ctx.stroke();
  });
}
// 笔记本：每一行“抛前 → 落地”
const LOG = [['sun', 'sun'], ['sun', 'moon'], ['moon', 'moon'], ['moon', 'moon'], ['moon', 'sun']];
function drawLog(ctx, t, x, y, rows, a) {
  withAlpha(ctx, a, () => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.02);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#f4ecdc'; roundRect(ctx, -230, -250, 460, 500, 18); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(120,150,190,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-200, -140 + i * 70); ctx.lineTo(200, -140 + i * 70); ctx.stroke(); }
    text(ctx, '抛前', -95, -175, { size: 40, family: 'Serif', color: INK });
    text(ctx, '落地', 95, -175, { size: 40, family: 'Serif', color: INK });
    for (let i = 0; i < LOG.length; i++) {
      const kr = clamp(rows - i);
      if (kr <= 0) break;
      const yy = -105 + i * 70;
      drawCoin(ctx, -95, yy, 24, { top: LOG[i][0], alpha: clamp(kr * 3) });
      text(ctx, '→', 0, yy + 12, { size: 36, family: 'Serif', color: 'rgba(42,34,48,0.6)', alpha: clamp(kr * 3) });
      const kl = clamp(kr * 2 - 1);
      if (kl > 0) {
        drawCoin(ctx, 95, yy, 24, { top: LOG[i][1], alpha: kl });
        if (LOG[i][0] === LOG[i][1]) text(ctx, '同', 165, yy + 12, { size: 30, family: 'Sans', weight: 700, color: '#c47a1c', alpha: kl });
      }
    }
    ctx.restore();
  });
}

SCENES.flips = (ctx, t, s) => {
  TL_T = t;
  const L = n => lineAt('flips', n);
  const t0 = s.start;
  // A：350,757 次
  const kA = ramp(t, t0, t0 + 0.4, easeOut) * (1 - ramp(t, L(1) - 0.35, L(1) + 0.1));
  coinField(ctx, t, kA);
  if (kA > 0) {
    text(ctx, '他们一共抛了', 960, 360, { size: 50, family: 'Serif', color: DIM, alpha: kA });
    const n = PAPER.flips * easeOut(prog(t, t0, t0 + 2.6));
    ctx.save(); ctx.translate(960, 610);
    const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    richText(ctx, [[fmt(n), GOLD], [' 次', CREAM]], 0, 0, { size: 230, family: 'Head', weight: 900, alpha: kA, shadow: 40 });
    ctx.restore();
  }
  // B：48 人、44 种硬币
  const kB = vis(t, L(1) - 0.1, L(2) + 0.2, 0.35);
  if (kB > 0) {
    withAlpha(ctx, kB, () => {
      for (let i = 0; i < 48; i++) {
        const k = ramp(t, L(1) + i * 0.02, L(1) + i * 0.02 + 0.3, easeBack);
        drawPerson(ctx, 330 + (i % 8) * 76, 500 + Math.floor(i / 8) * 76, 0.55, PCOLS[i % 8], { alpha: clamp(k) });
      }
      for (let i = 0; i < 44; i++) {
        const k = ramp(t, L(1) + 0.3 + i * 0.02, L(1) + 0.6 + i * 0.02, easeBack);
        drawMiniCoin(ctx, 1110 + (i % 11) * 62, 470 + Math.floor(i / 11) * 82, COINS44[i], clamp(k));
      }
      richText(ctx, [['48', GOLD], [' 个人', CREAM]], 596, 340, { size: 76, family: 'Head', weight: 900 });
      richText(ctx, [['44', GOLD], [' 种硬币', CREAM]], 1420, 340, { size: 76, family: 'Head', weight: 900 });
    });
  }
  // C：12 小时
  const kC = vis(t, L(2) - 0.1, L(3) + 0.1, 0.3);
  if (kC > 0) {
    withAlpha(ctx, kC, () => {
      const cx = 960, cy = 500, r = 210, u = ramp(t, L(2), L(2) + 1.8);
      glowDot(ctx, cx, cy, r * 1.6, '#ffd27a', 0.18);
      ctx.fillStyle = '#f4ecdc'; circle(ctx, cx, cy, r); ctx.fill();
      ctx.strokeStyle = '#3a2f3a'; ctx.lineWidth = 10; circle(ctx, cx, cy, r); ctx.stroke();
      // 走过的扇形
      ctx.fillStyle = rgba('#f2b84b', 0.45);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r * 0.88, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2 + 1e-4); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        ctx.fillStyle = '#3a2f3a'; circle(ctx, cx + Math.sin(a) * r * 0.8, cy - Math.cos(a) * r * 0.8, 7); ctx.fill();
      }
      const ah = -Math.PI / 2 + u * Math.PI * 2, am = -Math.PI / 2 + u * Math.PI * 24;
      ctx.strokeStyle = '#3a2f3a'; ctx.lineCap = 'round';
      ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ah) * r * 0.5, cy + Math.sin(ah) * r * 0.5); ctx.stroke();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am) * r * 0.75, cy + Math.sin(am) * r * 0.75); ctx.stroke();
      richText(ctx, [[String(Math.round(12 * u)), GOLD], [' 小时', CREAM]], 960, 830, { size: 70, family: 'Head', weight: 900 });
    });
  }
  // D~F：先看清哪面朝上，抛、接，录像
  const kD = vis(t, L(3) - 0.1, L(6) + 0.1, 0.3);
  if (kD > 0) {
    withAlpha(ctx, kD, () => {
      const hx = 700, hy = 740;
      drawHand(ctx, hx, hy, 1.05);
      // 每两拍抛一次：第 0 次从 L(4) 开始
      const per = TL.music.beat * 2;
      let phi = REST, dy = 0, top = 'sun', rows = ramp(t, L(3) + 0.3, L(3) + 0.6) * 0.5;
      for (let k = 0; k < LOG.length; k++) {
        const tk = L(4) + k * per;
        if (t < tk) break;
        top = LOG[k][0];
        const f = toss(t, tk, per * 0.85, 300, 3, LOG[k][0] === LOG[k][1] ? 'same' : 'other');
        phi = f.phi; dy = f.dy;
        rows = k + 0.5 + 0.5 * ramp(t, tk + per * 0.85, tk + per * 0.85 + 0.15);
        if (k === 0) rows = Math.max(rows, 0.5);
      }
      drawCoin(ctx, hx, hy - 32 + dy, 62, { top, phi, glow: 0.3 });
      const kp = vis(t, L(3), L(4) + 0.1, 0.3);
      if (kp > 0) {
        text(ctx, '抛前朝上', hx, 600, { size: 44, family: 'Serif', color: GOLD, alpha: kp });
        ctx.strokeStyle = rgba('#ffd27a', kp); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(hx, 620); ctx.lineTo(hx, 700); ctx.stroke();
      }
      drawLog(ctx, t, 1260, 500, rows, ramp(t, L(3), L(3) + 0.4));
      tag(ctx, '示意', 1260, 790, 1);
      // 录像
      const kR = ramp(t, L(5), L(5) + 0.3);
      if (kR > 0) {
        withAlpha(ctx, kR, () => {
          ctx.strokeStyle = CREAM; ctx.lineWidth = 6; ctx.lineCap = 'round';
          const [x0, y0, x1, y1, l] = [300, 140, 1620, 920, 70];
          for (const [cx, cy, dx, dy2] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
            ctx.beginPath(); ctx.moveTo(cx + dx * l, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy2 * l); ctx.stroke();
          }
          const blink = Math.floor((t - L(5)) / 0.5) % 2 === 0 ? 1 : 0.25;
          ctx.fillStyle = rgba('#ff5a5a', blink); circle(ctx, 370, 205, 16); ctx.fill();
          text(ctx, 'REC', 400, 220, { size: 44, family: 'Sans', weight: 700, color: CREAM, align: 'left' });
          const sec = 3 * 3600 + 27 * 60 + 41 + (t - L(5));
          const tc = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, Math.floor(sec) % 60].map(v => String(v).padStart(2, '0')).join(':');
          text(ctx, tc, 1560, 220, { size: 40, family: 'Sans', weight: 400, color: CREAM, align: 'right' });
        });
      }
    });
  }
  // G~I：结果柱子
  const kG = ramp(t, L(6) - 0.1, L(6) + 0.4);
  if (kG > 0) {
    const base = 820, ppu = 9.2; // 每 1% 的像素
    const morph = ramp(t, L(8), L(8) + 0.8);
    const big = ramp(t, L(9) - 0.1, L(9) + 0.45, easeOut);
    const grow = ramp(t, L(6), L(6) + 1.4, easeOut);
    const vals = [lerp(100 * PAPER.heads / PAPER.flips, 100 * PAPER.same / PAPER.flips, morph),
      lerp(100 * (PAPER.flips - PAPER.heads) / PAPER.flips, 100 * (PAPER.flips - PAPER.same) / PAPER.flips, morph)];
    withAlpha(ctx, kG * (1 - big), () => {
      [760, 1160].forEach((x, i) => {
        const h = vals[i] * ppu * grow;
        const col = i === 0 ? (morph > 0.5 ? GOLD : FACE.sun.base) : (morph > 0.5 ? '#7d8fae' : FACE.moon.base);
        const g = ctx.createLinearGradient(0, base - h, 0, base);
        g.addColorStop(0, col); g.addColorStop(1, rgba(i === 0 ? '#f2b84b' : '#bccbe3', 0.25));
        ctx.fillStyle = g; roundRect(ctx, x - 110, base - h, 220, h, [16, 16, 0, 0]); ctx.fill();
        const kv = ramp(t, L(7), L(7) + 0.3);
        text(ctx, `${vals[i].toFixed(1)}%`, x, base - h - 30, { size: 64, family: 'Head', weight: 900, color: i === 0 ? GOLD : CREAM, alpha: Math.max(kv, morph) });
        const cnt = [lerp(PAPER.heads, PAPER.same, morph), lerp(PAPER.flips - PAPER.heads, PAPER.flips - PAPER.same, morph)][i];
        text(ctx, `${fmt(cnt)} 次`, x, base - h - 100, { size: 34, family: 'Serif', color: DIM, alpha: Math.max(kv, morph) });
        // 底部标签
        const la = 1 - morph, lb = morph;
        drawCoin(ctx, x - 70, base + 50, 22, { top: i === 0 ? 'sun' : 'moon', alpha: la });
        text(ctx, i === 0 ? '正面' : '反面', x + 10, base + 62, { size: 38, family: 'Serif', color: CREAM, alpha: la });
        text(ctx, i === 0 ? '落回抛前那面' : '落到另一面', x, base + 62, { size: 38, family: 'Serif', color: i === 0 ? GOLD : CREAM, alpha: lb });
      });
      ctx.fillStyle = 'rgba(251,243,228,0.35)'; ctx.fillRect(560, base, 800, 2);
      // 50% 参考线
      ctx.strokeStyle = 'rgba(251,243,228,0.3)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(560, base - 50 * ppu); ctx.lineTo(1360, base - 50 * ppu); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '50%', 1380, base - 50 * ppu + 12, { size: 32, family: 'Serif', color: DIM, align: 'left' });
    });
    if (big > 0) {
      text(ctx, '落回抛前那一面', 960, 340, { size: 60, family: 'Serif', color: CREAM, alpha: big });
      ctx.save(); ctx.translate(960, 600);
      const sc = 0.88 + 0.12 * big + 0.012 * barPulse(t); ctx.scale(sc, sc);
      text(ctx, `${pct(PAPER.same, PAPER.flips)}%`, 0, 0, { size: 280, family: 'Head', weight: 900, color: GOLD, alpha: big, shadow: 50 });
      ctx.restore();
      text(ctx, `${fmt(PAPER.same)} / ${fmt(PAPER.flips)}`, 960, 720, { size: 46, family: 'Serif', color: DIM, alpha: ramp(t, L(9) + 0.5, L(9) + 1) });
    }
  }
};

SCENES.match = (ctx, t, s) => {
  TL_T = t;
  const t0 = s.start, t1 = lineAt('match', 1);
  const lo = 49.8, hi = 51.3, x0 = 330, x1 = 1590, y = 560;
  const X = v => lerp(x0, x1, (v - lo) / (hi - lo));
  const ka = ramp(t, t0 - 0.1, t0 + 0.4);
  withAlpha(ctx, ka, () => {
    ctx.fillStyle = 'rgba(251,243,228,0.4)'; ctx.fillRect(x0, y, x1 - x0, 3);
    for (const v of [50, 50.5, 51]) {
      ctx.fillRect(X(v) - 1.5, y - 12, 3, 27);
      text(ctx, `${v.toFixed(1)}%`, X(v), y + 70, { size: 36, family: 'Serif', color: DIM });
    }
    // 五五开
    ctx.strokeStyle = SILVER; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(X(50), y - 260); ctx.lineTo(X(50), y); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, '五五开', X(50), y - 280, { size: 44, family: 'Serif', color: SILVER });
    // 模型预测
    const kp = ramp(t, t0 + 0.2, t0 + 0.7, easeOut);
    withAlpha(ctx, kp, () => {
      ctx.strokeStyle = '#ffb36b'; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.moveTo(X(51), y - 260); ctx.lineTo(X(51), y); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '模型预测 约 51%', X(51), y - 280, { size: 44, family: 'Serif', color: '#ffb36b' });
    });
    // 实测
    const km = ramp(t, t0 + 0.9, t0 + 1.5, easeOut);
    withAlpha(ctx, km, () => {
      const lift = 120;
      ctx.fillStyle = rgba('#ffd27a', 0.35);
      roundRect(ctx, X(PAPER.ciLo), y - lift - 14, X(PAPER.ciHi) - X(PAPER.ciLo), 28, 14); ctx.fill();
      const mx = X(100 * PAPER.same / PAPER.flips);
      glowDot(ctx, mx, y - lift, 70, '#ffd27a', 0.5 + 0.2 * barPulse(t));
      ctx.fillStyle = GOLD; circle(ctx, mx, y - lift, 18); ctx.fill();
      text(ctx, `实测 ${pct(PAPER.same, PAPER.flips)}%`, mx, y - lift - 50, { size: 54, family: 'Head', weight: 900, color: GOLD });
      tag(ctx, '浅色条：95% 可信区间', mx, y + 130, 1);
    });
    // 很接近
    const kc = ramp(t, t1, t1 + 0.5);
    if (kc > 0) {
      const a = X(100 * PAPER.same / PAPER.flips) + 26, b = X(51) - 8, yy = y - 120;
      ctx.strokeStyle = rgba('#ffd27a', kc); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a, yy); ctx.lineTo(lerp(a, b, kc), yy); ctx.stroke();
      if (kc > 0.95) { ctx.beginPath(); ctx.moveTo(b - 14, yy - 10); ctx.lineTo(b, yy); ctx.lineTo(b - 14, yy + 10); ctx.stroke(); }
    }
  });
};

SCENES.bet = (ctx, t, s) => {
  TL_T = t;
  const L = n => lineAt('bet', n);
  const t0 = s.start;
  const x0 = 300, x1 = 1440, yTop = 200, yBot = 840, vLo = -400, vHi = 550;
  const N = SIM.same.band.p50.length;
  const X = i => lerp(x0, x1, i / (N - 1));
  const Y = v => lerp(yBot, yTop, (v - vLo) / (vHi - vLo));
  const ka = ramp(t, t0 - 0.1, t0 + 0.4);
  withAlpha(ctx, ka, () => {
    // 坐标
    ctx.fillStyle = 'rgba(251,243,228,0.12)';
    for (const v of [-200, 200, 400]) ctx.fillRect(x0, Y(v), x1 - x0, 1.5);
    for (const v of [-200, 0, 200, 400]) text(ctx, v > 0 ? `+${v}` : String(v), x0 - 20, Y(v) + 12, { size: 32, family: 'Serif', color: DIM, align: 'right' });
    ctx.fillStyle = 'rgba(251,243,228,0.5)'; ctx.fillRect(x0, Y(0) - 1, x1 - x0, 3);
    text(ctx, '赢了多少块', x0 - 20, yTop - 40, { size: 32, family: 'Serif', color: DIM, align: 'right' });
    for (const [i, lab] of [[0, '0'], [(N - 1) / 2, '5,000'], [N - 1, '10,000 局']]) text(ctx, lab, X(i), yBot + 50, { size: 32, family: 'Serif', color: DIM });
  });
  // 规则卡
  const kr = ramp(t, L(2), L(2) + 0.4, easeOut);
  withAlpha(ctx, kr, () => {
    ctx.fillStyle = 'rgba(20,30,48,0.85)'; roundRect(ctx, 360, 190, 470, 150, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,160,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    richText(ctx, [['猜对 ', CREAM], ['+1', GOLD]], 595, 250, { size: 44, family: 'Serif' });
    richText(ctx, [['猜错 ', CREAM], ['−1', SILVER]], 595, 312, { size: 44, family: 'Serif' });
  });
  // 路径：从 L(1) 起慢慢画出来
  const rev = ramp(t, L(1) + 0.2, L(4) - 0.1, x => x);
  const kSame = ramp(t, L(3) - 0.2, L(3) + 0.4);
  const n = Math.max(1, Math.floor(rev * (N - 1)));
  const line = (arr, col, w, a) => {
    if (a <= 0) return;
    ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = w; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(X(0), Y(arr[0]));
    for (let i = 1; i <= n; i++) ctx.lineTo(X(i), Y(arr[i]));
    ctx.stroke(); ctx.globalAlpha = 1;
  };
  ctx.save();
  for (const p of SIM.fair.paths) line(p, SILVER, 1.6, 0.16 * ka);
  line(SIM.fair.band.p50, SILVER, 5, 0.9 * ka);
  for (const p of SIM.same.paths) line(p, GOLD, 1.6, 0.2 * kSame);
  ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
  line(SIM.same.band.p50, GOLD, 6, kSame);
  ctx.restore();
  // 图例
  const kd0 = 1 - ramp(t, L(5) - 0.2, L(5) + 0.2);
  withAlpha(ctx, ka * kd0, () => {
    ctx.fillStyle = SILVER; ctx.fillRect(1490, 640, 40, 6);
    text(ctx, '随便押', 1545, 655, { size: 36, family: 'Serif', color: SILVER, align: 'left' });
    text(ctx, '（公平硬币）', 1545, 700, { size: 30, family: 'Serif', color: 'rgba(185,200,226,0.7)', align: 'left' });
  });
  withAlpha(ctx, kSame * kd0, () => {
    ctx.fillStyle = GOLD; ctx.fillRect(1490, 270, 40, 6);
    text(ctx, '押抛前', 1545, 285, { size: 36, family: 'Serif', color: GOLD, align: 'left' });
    text(ctx, '朝上那面', 1545, 330, { size: 36, family: 'Serif', color: GOLD, align: 'left' });
  });
  withAlpha(ctx, ka * ramp(t, L(1), L(1) + 0.5), () => {
    tag(ctx, `细线：随机抽出的 60 个人   粗线：${SIM.players} 人的中位数   模拟`, 870, 950 - 30, 1);
  });
  // 平均多赚
  const km = ramp(t, L(4), L(4) + 0.4, easeBack);
  if (km > 0) {
    const yv = Y(SIM.same.band.p50[N - 1]);
    withAlpha(ctx, clamp(km), () => {
      glowDot(ctx, X(N - 1), yv, 60, '#ffd27a', 0.6);
      text(ctx, `平均 +${Math.round(SIM.same.mean_final)}`, X(N - 1) - 20, yv - 40, { size: 60, family: 'Head', weight: 900, color: GOLD, align: 'right', shadow: 20 });
    });
  }
  // 终点：1000 个人各自停在哪
  const kd = ramp(t, L(5), L(5) + 0.6);
  if (kd > 0) {
    const rnd = mulberry32(9);
    withAlpha(ctx, kd, () => {
      ctx.fillStyle = 'rgba(10,16,28,0.6)'; roundRect(ctx, 1470, 160, 400, 720, 24); ctx.fill();
      SIM.same.finals.forEach((v, i) => {
        const x = 1500 + rnd() * 120, y = Y(v);
        ctx.fillStyle = v > 0 ? rgba('#ffd27a', 0.55) : 'rgba(185,200,226,0.45)';
        circle(ctx, x, y, 3.2); ctx.fill();
      });
      ctx.fillStyle = 'rgba(251,243,228,0.5)'; ctx.fillRect(1490, Y(0) - 1, 150, 3);
      text(ctx, String(SIM.same.ahead), 1760, Y(200), { size: 84, family: 'Head', weight: 900, color: GOLD });
      text(ctx, '人赚了', 1760, Y(200) + 56, { size: 36, family: 'Serif', color: CREAM });
      text(ctx, String(SIM.players - SIM.same.ahead), 1760, Y(-160), { size: 60, family: 'Head', weight: 900, color: SILVER });
      text(ctx, '人没赚', 1760, Y(-160) + 46, { size: 34, family: 'Serif', color: SILVER });
    });
  }
};

// 论文表 1：每个人落回原面的比例
const SWARM = (() => {
  const lo = 48, hi = 61, x0 = 260, x1 = 1660, base = 700, bin = 0.25;
  const X = p => lerp(x0, x1, (p - lo) / (hi - lo));
  const stacks = {};
  return { X, base, lo, hi, dots: PEOPLE.map(d => ({ p: 100 * d.same / d.flips, flips: d.flips }))
    .sort((a, b) => a.p - b.p)
    .map(d => {
      const k = Math.round(d.p / bin);
      const n = stacks[k] = (stacks[k] || 0) + 1;
      return { ...d, x: X(k * bin), y: base - 18 - (n - 1) * 34, r: 7 + 9 * Math.sqrt(d.flips / 20100) };
    }) };
})();
SCENES.people = (ctx, t, s) => {
  TL_T = t;
  const L = n => lineAt('people', n);
  const t0 = s.start;
  // 优势对比
  const kE = ramp(t, t0 - 0.1, t0 + 0.4) * (1 - ramp(t, L(1) - 0.3, L(1) + 0.1));
  if (kE > 0) {
    withAlpha(ctx, kE, () => {
      text(ctx, '每押 1000 块，平均能多赢几块', 960, 250, { size: 48, family: 'Serif', color: DIM });
      const rows = [['21 点里的赌场', 5], ['押抛前那面的你', Math.round(1000 * SIM.edge)], ['轮盘里的赌场', 27]];
      rows.forEach(([lab, v], i) => {
        const y = 400 + i * 150, w = v / 27 * 760 * ramp(t, t0 + i * 0.15, t0 + 0.8 + i * 0.15, easeOut);
        text(ctx, lab, 640, y + 14, { size: 46, family: 'Serif', color: i === 1 ? GOLD : CREAM, align: 'right' });
        ctx.fillStyle = i === 1 ? GOLD : rgba('#b9c8e2', 0.6); roundRect(ctx, 680, y - 30, Math.max(1, w), 60, 30); ctx.fill();
        text(ctx, `${v} 块`, 704 + w, y + 18, { size: 54, family: 'Head', weight: 900, color: i === 1 ? GOLD : CREAM, align: 'left' });
      });
      tag(ctx, '赌场数字：论文引用的对最优策略玩家（21 点，6 副牌）和单零轮盘', 960, 860, 1);
    });
  }
  // 48 个人
  const kS = ramp(t, L(1) - 0.1, L(1) + 0.4) * (1 - ramp(t, L(4) - 0.3, L(4) + 0.1));
  if (kS > 0) {
    const { X, base } = SWARM;
    withAlpha(ctx, kS, () => {
      text(ctx, '每个人落回抛前那面的比例', 960, 200, { size: 44, family: 'Serif', color: DIM });
      ctx.fillStyle = 'rgba(251,243,228,0.4)'; ctx.fillRect(X(48), base, X(61) - X(48), 3);
      for (const v of [48, 50, 52, 54, 56, 58, 60]) text(ctx, `${v}%`, X(v), base + 56, { size: 32, family: 'Serif', color: DIM });
      ctx.strokeStyle = SILVER; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(50), base); ctx.lineTo(X(50), 300); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '五五开', X(50), 285, { size: 34, family: 'Serif', color: SILVER });
      const kz = ramp(t, L(2), L(2) + 0.4), kx = ramp(t, L(3), L(3) + 0.4);
      const top = SWARM.dots[SWARM.dots.length - 1];
      SWARM.dots.forEach((d, i) => {
        const k = ramp(t, L(1) + i * 0.03, L(1) + i * 0.03 + 0.3, easeBack);
        const near = Math.abs(d.p - 50) <= 0.5;
        const dim = Math.max(kz * (near ? 0 : 0.6), kx * (d === top ? 0 : 0.6));
        ctx.fillStyle = rgba(near && kz > 0 && kx < 0.5 ? '#e9f0fb' : '#f2b84b', clamp(k) * (1 - dim));
        circle(ctx, d.x, d.y, d.r * clamp(k)); ctx.fill();
      });
      if (kx > 0) {
        glowDot(ctx, top.x, top.y, 80, '#ffd27a', 0.6 * kx);
        text(ctx, `${top.p.toFixed(1)}%`, top.x, top.y - 70, { size: 70, family: 'Head', weight: 900, color: GOLD, alpha: kx, shadow: 20 });
        text(ctx, `抛了 ${fmt(top.flips)} 次`, top.x, top.y - 150, { size: 34, family: 'Serif', color: CREAM, alpha: kx, align: 'center' });
      }
      tag(ctx, '一个点是一个人，点越大抛得越多 · 数据：论文表 1', 960, 870, 1);
    });
  }
  // 越练越少（示意）
  const kP = ramp(t, L(4) - 0.1, L(4) + 0.4);
  if (kP > 0) {
    const x0 = 360, x1 = 1560, yb = 780, yt = 300, plo = 49.6, phi = 51.8;
    const X = n => lerp(x0, x1, n / 20000), Y = p => lerp(yb, yt, (p - plo) / (phi - plo));
    const curve = n => 50 + 1.48 * Math.exp(-n / 3500);
    withAlpha(ctx, kP, () => {
      text(ctx, '落回抛前那面的比例，随练习的变化', 960, 220, { size: 44, family: 'Serif', color: DIM });
      ctx.fillStyle = 'rgba(251,243,228,0.4)'; ctx.fillRect(x0, yb, x1 - x0, 3);
      for (const n of [0, 5000, 10000, 15000, 20000]) text(ctx, n ? `${fmt(n)} 次` : '0', X(n), yb + 50, { size: 32, family: 'Serif', color: DIM });
      ctx.strokeStyle = SILVER; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, Y(50)); ctx.lineTo(x1, Y(50)); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '50%', x0 - 16, Y(50) + 12, { size: 32, family: 'Serif', color: SILVER, align: 'right' });
      const u = ramp(t, L(4), L(5) + 1.2, x => x);
      ctx.save();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.shadowColor = GOLD; ctx.shadowBlur = 18;
      ctx.beginPath();
      for (let i = 0; i <= 200 * u; i++) { const nn = i * 100; i ? ctx.lineTo(X(nn), Y(curve(nn))) : ctx.moveTo(X(nn), Y(curve(nn))); }
      ctx.stroke(); ctx.restore();
      text(ctx, '起初约 51.5%', X(0) + 20, Y(curve(0)) - 26, { size: 40, family: 'Serif', color: GOLD, align: 'left' });
      const k10 = ramp(t, L(5), L(5) + 0.5);
      if (k10 > 0) {
        ctx.strokeStyle = rgba('#fbf3e4', 0.6 * k10); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(X(10000), yb); ctx.lineTo(X(10000), Y(51)); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, '约 10 小时', X(10000), Y(51) - 20, { size: 40, family: 'Serif', color: CREAM, alpha: k10 });
      }
      tag(ctx, '示意：曲线形状按论文描述的趋势画出，不是逐点数据', 960, 900, 1);
    });
  }
};

SCENES.caveat = (ctx, t, s) => {
  TL_T = t;
  const t0 = s.start, t1 = lineAt('caveat', 1);
  const ka = ramp(t, t0 - 0.1, t0 + 0.4);
  withAlpha(ctx, ka, () => {
    // 取景框
    ctx.strokeStyle = 'rgba(251,243,228,0.7)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const [x0, y0, x1, y1, l] = [560, 230, 1360, 850, 60];
    for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(cx + dx * l, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + dy * l); ctx.stroke();
    }
    const blink = Math.floor((t - t0) / 0.5) % 2 === 0 ? 1 : 0.25;
    ctx.fillStyle = rgba('#ff5a5a', blink); circle(ctx, 620, 290, 13); ctx.fill();
    text(ctx, 'REC', 645, 303, { size: 36, family: 'Sans', weight: 700, color: CREAM, align: 'left' });
    drawPerson(ctx, 960, 800, 2.4, PCOLS[0]);
    const per = TL.music.beat * 2, u = ((t - t0) % per) / per;
    drawCoin(ctx, 1080, 640 - 4 * 150 * u * (1 - u), 30, { phi: REST + u * 4 * Math.PI });
    // 想法气泡
    const kb = ramp(t, t0 + 0.3, t0 + 0.7, easeBack);
    withAlpha(ctx, clamp(kb), () => {
      ctx.fillStyle = 'rgba(246,239,226,0.95)';
      ctx.beginPath(); ctx.ellipse(1180, 380, 150, 80, 0, 0, Math.PI * 2); ctx.fill();
      circle(ctx, 1060, 480, 18); ctx.fill(); circle(ctx, 1025, 520, 10); ctx.fill();
      text(ctx, '51%…', 1180, 402, { size: 64, family: 'Head', weight: 900, color: INK });
    });
    const kq = ramp(t, t1, t1 + 0.4, easeBack);
    if (kq > 0) {
      for (const [qx, qy, qs] of [[760, 420, 90], [700, 600, 60], [1260, 640, 70]]) {
        text(ctx, '?', qx, qy + Math.sin(t * 2 + qx) * 6, { size: qs * clamp(kq), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kq) });
      }
    }
  });
};

SCENES.end = (ctx, t, s) => {
  TL_T = t;
  const L = n => lineAt('end', n);
  const t0 = s.start;
  const hx = 960, hy = 740;
  // A：起势，大硬币飞上来
  const kA = 1 - ramp(t, L(2) - 0.4, L(2) + 0.1);
  if (kA > 0) {
    withAlpha(ctx, kA, () => {
      const u = ramp(t, t0, t0 + 1.4, easeOut);
      const burst = ramp(t, t0, t0 + 0.3) * (1 - ramp(t, t0 + 0.6, t0 + 2.2));
      if (burst > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        glowDot(ctx, 960, 470, 900, '#ffd27a', 0.35 * burst);
        ctx.restore();
      }
      // 落到手心，再被盖住
      const land = ramp(t, L(1) - 0.6, L(1) + 0.2, easeInOut);
      const cy = lerp(lerp(1300, 470, u), hy - 34, land);
      const r = lerp(lerp(120, 250, u), 66, land);
      const phi = (1 - u) * 18;
      drawHand(ctx, hx, hy, 1.15, { alpha: land });
      drawCoin(ctx, hx, cy, r, { phi: lerp(phi, REST, land), glow: 0.6 * (1 - land) + 0.3 });
      const kc = ramp(t, L(1), L(1) + 0.6, easeOut);
      drawCoverHand(ctx, hx, lerp(300, hy - 60, kc), 1.15, kc);
    });
  }
  // B：回到开头的选择
  const kB = ramp(t, L(2) - 0.2, L(2) + 0.4);
  if (kB <= 0) return;
  withAlpha(ctx, kB, () => {
    const warm = endWarm(t);
    drawChoice(ctx, 560, 420, '去', pop(t, L(2)) * (1 - 0.0 * warm), warm, -0.06);
    drawChoice(ctx, 1360, 420, '不去', pop(t, L(2) + 0.2) * (1 - 0.35 * warm), 0, 0.05);
    drawHand(ctx, hx, hy, 1.15);
    // 抛起，在最高处停住
    const tt = L(5) + 0.1;
    let dy = 0, phi = REST;
    if (t > tt) {
      const up = ramp(t, tt, tt + 1.6, easeOut);
      dy = -440 * up;
      const w = 14 * (1 - up);
      phi = REST + (t - tt) * w;
      phi = lerp(phi, Math.round(phi / (2 * Math.PI)) * 2 * Math.PI, ramp(t, tt + 1.1, tt + 2.2));
    }
    const kSplit = vis(t, L(3) - 0.1, L(5) + 0.2, 0.4);
    const tilt = -0.035 * ramp(t, L(4), L(4) + 0.8, easeOut);
    drawSplit(ctx, 960, 210, kSplit, `${pct(PAPER.same, PAPER.flips)}%`, `${(100 - Number(pct(PAPER.same, PAPER.flips))).toFixed(1)}%`,
      { tilt, lCap: '抛前那面', rCap: '另一面' });
    const rCoin = lerp(66, 110, ramp(t, tt + 0.6, tt + 2.2));
    drawCoin(ctx, hx, hy - 34 + dy, rCoin, { phi, glow: 0.4 + 0.9 * warm + 0.15 * barPulse(t) });
    if (warm > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, hx, hy - 34 + dy, 520, '#ffcf7a', 0.22 * warm);
      ctx.restore();
    }
  });
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 40);
  coinField(ctx, 3.3, 0.8);
  const g = ctx.createRadialGradient(960, 330, 60, 960, 420, 900);
  g.addColorStop(0, 'rgba(255,210,140,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawCoin(ctx, 960, 300, 200, { phi: 0.55, tilt: -0.12, glow: 1 });
  ctx.strokeStyle = 'rgba(255,220,160,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const [a, b] of [[-1.2, -0.7], [-1.3, -0.8]]) { ctx.beginPath(); ctx.arc(960, 300, 260 + (a + 1.3) * 120, Math.PI + a, Math.PI + b); ctx.stroke(); }
  const sh = ctx.createLinearGradient(0, 520, 0, H);
  sh.addColorStop(0, 'rgba(6,11,20,0)'); sh.addColorStop(0.3, 'rgba(6,11,20,0.85)'); sh.addColorStop(1, 'rgba(6,11,20,0.95)');
  ctx.fillStyle = sh; ctx.fillRect(0, 520, W, H - 520);
  text(ctx, '抛硬币不是五五开？', 960, 700, { size: 120, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  richText(ctx, [['更容易落回', CREAM], ['抛前那面', GOLD]], 960, 860, { size: 130, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, `48 人抛了 ${fmt(PAPER.flips)} 次 · 同面 ${pct(PAPER.same, PAPER.flips)}%`, 960, 965, { size: 46, family: 'Sans', weight: 700, color: GOLD, spacing: 2 });
}
