// 旁观者：画面
// 美术方向：深夜街角的监控画面。蓝绿色夜色、便利店暖光和路灯；路人是圆滚滚的小豆子。
// 出手帮忙的人会亮起金色的光。结尾监控关掉，整条街暖起来。

const CREAM = '#fbf3e4';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,243,228,0.62)';
const CAMUI = '#bfeee0';
const REC = '#ff6b6b';
const A_COL = '#f2907c';   // 冲突的一方
const B_COL = '#b39cf0';   // 冲突的另一方
const YOU = '#7fdcc4';
const CROWD = ['#7d8db0', '#8a9bb8', '#6f8799', '#9a8fb0', '#7fa3a0', '#a08f9a', '#8c98a8', '#9fa7c2'];

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, k) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, clamp(k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function glowDot(ctx, x, y, r, color, a) {
  if (a <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, Math.min(1, a))); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
}
const pop = (t, a, d = 0.4) => clamp(ramp(t, a, a + d, easeBack), 0, 1.2);

// ---------- 背景 ----------
const BOKEH = (() => {
  const rnd = mulberry32(5), cols = ['#ffc978', '#7fdcc4', '#ff8fa3', '#9ab8ff'];
  return Array.from({ length: 30 }, () => ({ x: rnd() * W, y: rnd() * H, r: 30 + rnd() * 100, c: cols[Math.floor(rnd() * 4)], a: 0.03 + rnd() * 0.05, v: (rnd() - 0.5) * 8, ph: rnd() * 6 }));
})();
function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#13202c'); g.addColorStop(0.6, '#0e1822'); g.addColorStop(1, '#080e15');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  for (const b of BOKEH) {
    const x = (b.x + b.v * t + W * 4) % W;
    glowDot(ctx, x, b.y, b.r, b.c, b.a * (0.7 + 0.6 * lv) * (0.8 + 0.2 * Math.sin(t * 0.7 + b.ph)));
  }
}
function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 小豆子 ----------
// (x, y) 是脚底中心，s 为缩放（s=1 时约 110 高）
function drawBean(ctx, x, y, s, col, o = {}) {
  const { alpha = 1, mood = 'calm', look = 0, arms = null, dir = 1, glow = 0, lean = 0, bob = 0, fill = 1, ring = 0 } = o;
  if (alpha <= 0.003 || s <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(0, 2, 42, 11, 0, 0, Math.PI * 2); ctx.fill();
  if (ring > 0) {
    ctx.strokeStyle = rgba(GOLD, 0.8 * clamp(ring)); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 2, 56 * ring, 16 * ring, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (glow > 0) glowDot(ctx, 0, -55, 150, '#ffcf6e', 0.55 * glow);
  ctx.rotate(lean);
  ctx.translate(0, -bob);
  const dark = mix(col, '#101522', 0.35), light = mix(col, '#ffffff', 0.3);
  // 手臂（画在身体后面）
  const arm = (x0, y0, x1, y1) => {
    ctx.strokeStyle = dark; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = col; circle(ctx, x1, y1, 9); ctx.fill();
  };
  if (arms === 'out') { arm(-24, -58, -66, -74); arm(24, -58, 66, -74); }
  else if (arms === 'push') { arm(20 * dir, -60, 72 * dir, -66); arm(18 * dir, -48, 70 * dir, -50); }
  else if (arms === 'reach') { arm(22 * dir, -58, 70 * dir, -60); }
  else if (arms === 'pat') { arm(22 * dir, -62, 58 * dir, -86); }
  else if (arms === 'calm') { arm(-24, -56, -54, -84); arm(24, -56, 54, -84); }
  // 身体
  const draw = (fillA) => {
    const g = ctx.createLinearGradient(0, -110, 0, 0);
    g.addColorStop(0, light); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.globalAlpha *= fillA;
    roundRect(ctx, -34, -110, 68, 106, 34); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-14, -3, 13, 6, 0, 0, Math.PI * 2); ctx.ellipse(14, -3, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(-12, -88, 9, 14, -0.4, 0, Math.PI * 2); ctx.fill();
  };
  if (fill >= 1) draw(1);
  else {
    ctx.save(); draw(0.22); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-60, -110 + 110 * (1 - fill), 120, 120); ctx.clip(); draw(1); ctx.restore();
    ctx.strokeStyle = rgba(CREAM, 0.5); ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]);
    roundRect(ctx, -34, -110, 68, 106, 34); ctx.stroke(); ctx.setLineDash([]);
  }
  if (fill >= 1) {
    // 脸
    const ex = look * 7;
    ctx.fillStyle = '#1b2030';
    if (mood === 'happy') {
      ctx.strokeStyle = '#1b2030'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const sx of [-13, 13]) { ctx.beginPath(); ctx.arc(sx + ex, -70, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    } else {
      for (const sx of [-13, 13]) { ctx.beginPath(); ctx.ellipse(sx + ex, -72, 4.8, 6.4, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#ffffff';
      for (const sx of [-13, 13]) { circle(ctx, sx + ex + 1.6, -74.5, 1.7); ctx.fill(); }
    }
    ctx.strokeStyle = '#1b2030'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    if (mood === 'angry') {
      ctx.beginPath(); ctx.moveTo(-21 + ex, -86); ctx.lineTo(-7 + ex, -80); ctx.moveTo(21 + ex, -86); ctx.lineTo(7 + ex, -80); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, -52, 7, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    } else if (mood === 'worried') {
      ctx.beginPath(); ctx.moveTo(-20 + ex, -81); ctx.lineTo(-8 + ex, -86); ctx.moveTo(20 + ex, -81); ctx.lineTo(8 + ex, -86); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ex, -56, 3.5, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(ex, -60, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,130,150,0.38)';
    for (const sx of [-23, 23]) { ctx.beginPath(); ctx.ellipse(sx + ex, -60, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
// 生气符号（四段弧）
function angerMark(ctx, x, y, r, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#ff6f6f'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const ang = k * Math.PI / 2 + Math.PI / 4;
    const cx = x + Math.cos(ang) * r * 0.75, cy = y + Math.sin(ang) * r * 0.75;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, ang + Math.PI * 0.6, ang + Math.PI * 1.4); ctx.stroke();
  }
  ctx.restore();
}
// 吵架时两人中间的锯齿线
function zigzag(ctx, x, y, w, a, t) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const dy of [-16, 16]) {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = x - w / 2 + (w * i) / 6, py = y + dy + (i % 2 ? -9 : 9) * (0.8 + 0.3 * Math.sin(t * 20 + i));
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function star(ctx, x, y, r, a, col = '#ffe08a') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function bubble(ctx, x, y, str, o = {}) {
  const { size = 30, alpha = 1, col = CREAM, ink = '#1d2433' } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  font(ctx, size, 'Sans', 700);
  const w = ctx.measureText(str).width + size * 1.1, h = size * 1.7;
  ctx.fillStyle = col;
  roundRect(ctx, x - w / 2, y - h, w, h, h / 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x + 6, y - 2); ctx.lineTo(x - 6, y + 14); ctx.fill();
  ctx.restore();
  text(ctx, str, x, y - h / 2 + size * 0.36, { size, family: 'Sans', weight: 700, color: ink, alpha });
}
// 按 y 排序画一群人
function drawPeople(ctx, list) {
  list.slice().sort((a, b) => a.y - b.y).forEach(p => {
    if (p.pre) p.pre(ctx);
    drawBean(ctx, p.x, p.y, p.s ?? depthScale(p.y), p.col, p);
    if (p.post) p.post(ctx);
  });
}
const depthScale = y => 0.62 + (y - 480) / 420 * 0.4;

// ---------- 街角 ----------
const CAT = { x: 300, y: 468 };
function drawStreet(ctx, t, o = {}) {
  const { warm = 0, lamp = 1 } = o;
  const lv = musicLevel(t);
  // 楼
  const sky = ctx.createLinearGradient(0, 0, 0, 430);
  sky.addColorStop(0, mix('#111a25', '#2a1f2a', warm)); sky.addColorStop(1, mix('#18232f', '#2e2430', warm));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 430);
  // 左边的便利店
  ctx.fillStyle = mix('#1d2836', '#33283a', warm); ctx.fillRect(100, 90, 700, 340);
  const wg = ctx.createLinearGradient(0, 220, 0, 410);
  wg.addColorStop(0, rgba('#ffd59a', 0.75)); wg.addColorStop(1, rgba('#ffb86b', 0.4));
  ctx.fillStyle = wg; ctx.fillRect(160, 225, 400, 185);
  ctx.fillStyle = 'rgba(40,40,60,0.35)';
  for (let r = 0; r < 3; r++) ctx.fillRect(175, 262 + r * 52, 370, 7);
  const shelfCols = ['#ff9eb5', '#8fe3d9', '#ffe58f', '#9ab8ff'];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
    ctx.fillStyle = rgba(shelfCols[(i + r) % 4], 0.55); roundRect(ctx, 182 + i * 40, 236 + r * 52, 26, 26, 5); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(160, 225, 400, 4);
  // 遮阳棚
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#e9e2cf' : '#4f9e95';
    ctx.beginPath(); ctx.moveTo(140 + i * 46, 168); ctx.lineTo(186 + i * 46, 168); ctx.lineTo(186 + i * 46, 205);
    ctx.arc(163 + i * 46, 205, 23, 0, Math.PI); ctx.closePath(); ctx.fill();
  }
  // 门
  ctx.fillStyle = '#0f151e'; roundRect(ctx, 610, 240, 130, 190, [10, 10, 0, 0]); ctx.fill();
  ctx.fillStyle = rgba('#ffd59a', 0.35); ctx.fillRect(628, 258, 94, 120);
  // 招牌 24h
  const fl = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 2.3);
  glowDot(ctx, 675, 172, 110, '#ff8fa3', 0.35 * fl);
  text(ctx, '24h', 675, 190, { size: 50, family: 'Head', weight: 900, color: '#ffc2cf', alpha: fl });
  // 小巷
  ctx.fillStyle = '#0c131b'; ctx.fillRect(800, 150, 290, 280);
  glowDot(ctx, 945, 300, 160, '#9ab8ff', 0.1 + 0.05 * lv);
  // 右边的楼
  ctx.fillStyle = mix('#1a2431', '#2f2534', warm); ctx.fillRect(1090, 40, 790, 390);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) {
    const x = 1140 + i * 122, y = 80 + j * 110;
    const k = (i * 7 + j * 3) % 5;
    const lit = k === 1 || k === 3 || warm > 0.2 + k * 0.15;
    ctx.fillStyle = lit ? rgba('#ffcf8a', 0.55 + 0.25 * warm) : '#0f1620';
    roundRect(ctx, x, y, 84, 70, 6); ctx.fill();
    if (lit) { ctx.fillStyle = 'rgba(80,50,40,0.25)'; ctx.fillRect(x + 40, y, 4, 70); }
  }
  // 路沿
  ctx.fillStyle = '#3a4655'; ctx.fillRect(0, 430, W, 18);
  // 地面
  const gg = ctx.createLinearGradient(0, 448, 0, H);
  gg.addColorStop(0, mix('#283444', '#3a3040', warm)); gg.addColorStop(1, mix('#1a2430', '#281f2a', warm));
  ctx.fillStyle = gg; ctx.fillRect(0, 448, W, H - 448);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 448, W, H - 448); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(960 + i * 90, 448); ctx.lineTo(960 + i * 260, H); ctx.stroke(); }
  for (let k = 0; k < 9; k++) { const y = 448 + Math.pow(k / 8, 1.5) * 640; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // 店里的光洒到地上
  ctx.fillStyle = rgba('#ffcf8a', 0.09 + 0.05 * warm);
  ctx.beginPath(); ctx.moveTo(150, 448); ctx.lineTo(740, 448); ctx.lineTo(900, 700); ctx.lineTo(20, 700); ctx.closePath(); ctx.fill();
  // 路灯光圈
  ctx.save(); ctx.translate(1560, 790); ctx.scale(1, 0.3);
  glowDot(ctx, 0, 0, 380, '#ffc978', (0.26 + 0.1 * lv) * lamp + 0.1 * warm);
  ctx.restore();
  ctx.restore();
  // 猫
  drawCat(ctx, CAT.x, CAT.y, 1, t);
  // 路灯
  ctx.fillStyle = '#2b3542'; ctx.fillRect(1652, 170, 14, 620);
  ctx.strokeStyle = '#2b3542'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(1659, 180); ctx.quadraticCurveTo(1650, 130, 1590, 140); ctx.stroke();
  ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.ellipse(1585, 152, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createLinearGradient(0, 150, 0, 800);
  cone.addColorStop(0, rgba('#ffc978', 0.16 * lamp + 0.05 * warm)); cone.addColorStop(1, rgba('#ffc978', 0));
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(1560, 155); ctx.lineTo(1610, 155); ctx.lineTo(1860, 800); ctx.lineTo(1260, 800); ctx.closePath(); ctx.fill();
  glowDot(ctx, 1585, 152, 140, '#ffd59a', 0.5 * lamp);
  ctx.restore();
}
function drawCat(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#0d1118';
  ctx.beginPath(); ctx.ellipse(0, -20, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
  circle(ctx, 0, -50, 16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-14, -58); ctx.lineTo(-10, -76); ctx.lineTo(-2, -62); ctx.moveTo(14, -58); ctx.lineTo(10, -76); ctx.lineTo(2, -62); ctx.fill();
  ctx.strokeStyle = '#0d1118'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  const sw = Math.sin(t * 1.6) * 8;
  ctx.beginPath(); ctx.moveTo(18, -6); ctx.quadraticCurveTo(46, -4, 40 + sw * 0.3, -30 + sw); ctx.stroke();
  const blink = (t % 4.3) < 0.15 ? 0.15 : 1;
  ctx.fillStyle = '#ffe27a';
  for (const sx of [-6, 6]) { ctx.beginPath(); ctx.ellipse(sx, -51, 3, 3.5 * blink, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// 监控画面的边框、REC、时间
function drawCam(ctx, t, o = {}) {
  const { cam = 'CAM 07', place = '街角', alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(60,150,130,0.06)'; ctx.fillRect(0, 0, W, H);
  const top = ctx.createLinearGradient(0, 0, 0, 190);
  top.addColorStop(0, 'rgba(6,12,18,0.75)'); top.addColorStop(1, 'rgba(6,12,18,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, W, 190);
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const roll = (t * 90) % (H + 200) - 100;
  const rg = ctx.createLinearGradient(0, roll - 80, 0, roll + 80);
  rg.addColorStop(0, 'rgba(190,240,225,0)'); rg.addColorStop(0.5, 'rgba(190,240,225,0.035)'); rg.addColorStop(1, 'rgba(190,240,225,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, roll - 80, W, 160);
  ctx.strokeStyle = rgba(CAMUI, 0.7); ctx.lineWidth = 4; ctx.lineCap = 'square';
  const m = 56, L = 70;
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke();
  }
  const on = Math.sin(t * Math.PI * 2 / 1.07) > -0.2;
  if (on) { ctx.fillStyle = REC; circle(ctx, 104, 108, 12); ctx.fill(); }
  text(ctx, 'REC', 128, 120, { size: 34, family: 'Sans', weight: 700, color: CAMUI, align: 'left' });
  text(ctx, `${cam}  ${place}`, 220, 120, { size: 30, family: 'Sans', weight: 400, color: rgba(CAMUI, 0.8), align: 'left' });
  const sec = Math.floor(23 * 3600 + 41 * 60 + 7 + t);
  const hh = String(Math.floor(sec / 3600) % 24).padStart(2, '0'), mm = String(Math.floor(sec / 60) % 60).padStart(2, '0'), ss = String(sec % 60).padStart(2, '0');
  text(ctx, `${hh}:${mm}:${ss}`, W - 100, 120, { size: 34, family: 'Sans', weight: 700, color: CAMUI, align: 'right' });
  ctx.restore();
}

// ---------- 街上的人 ----------
const PAIR = { A: { x: 905, y: 690 }, B: { x: 1015, y: 690 } };
// 围观的一圈人：(x, y) 位置，从 seed 生成
function ringSpots(n, seed, rx = 430, ry = 165, cx = 960, cy = 690) {
  const rnd = mulberry32(seed), out = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.25 - Math.PI / 2;
    const r = 0.88 + rnd() * 0.24;
    out.push({ x: cx + Math.cos(ang) * rx * r, y: Math.min(880, cy + Math.sin(ang) * ry * r), col: CROWD[Math.floor(rnd() * CROWD.length)], ph: rnd() * 6, ang });
  }
  return out;
}
// 吵架的两个人：mode = 'argue' | 'push' | 'calmed'
function pairPeople(t, mode, k = 1) {
  const bA = beatPulse(t, 0.2), bB = beatPulse(t - TL.music.beat / 2, 0.2);
  const A = { x: PAIR.A.x, y: PAIR.A.y, col: A_COL, mood: 'angry', look: 0.8, bob: 6 * bA, lean: 0.06 * bA };
  const B = { x: PAIR.B.x, y: PAIR.B.y, col: B_COL, mood: 'angry', look: -0.8, bob: 6 * bB, lean: -0.06 * bB };
  if (mode === 'push') {
    A.arms = 'push'; A.dir = 1; A.lean = 0.12 * k; A.x += 10 * k;
    B.mood = 'worried'; B.lean = 0.22 * k; B.x += 26 * k; B.bob = 0;
  }
  if (mode === 'calmed') {
    A.x -= 40 * k; A.lean = -0.08 * k; A.bob = 0; B.x += 34 * k; B.mood = 'worried'; B.bob = 0; B.lean = 0;
    if (k > 0.7) A.mood = 'calm';
  }
  return [A, B];
}
function pairFx(ctx, t, mode, a = 1) {
  const s = depthScale(PAIR.A.y);
  if (mode === 'argue') {
    zigzag(ctx, 960, PAIR.A.y - 95 * s, 46, a, t);
    angerMark(ctx, PAIR.A.x - 40, PAIR.A.y - 120 * s, 16, a * (0.6 + 0.4 * beatPulse(t, 0.25)));
    angerMark(ctx, PAIR.B.x + 40, PAIR.B.y - 120 * s, 16, a * (0.6 + 0.4 * beatPulse(t - 0.27, 0.25)));
  } else if (mode === 'push') {
    star(ctx, 978, PAIR.A.y - 60 * s, 26 + 8 * beatPulse(t), a);
    angerMark(ctx, PAIR.A.x - 40, PAIR.A.y - 120 * s, 18, a);
  }
}

// 街景镜头：以 (cx, cy) 为中心放大 z 倍
function streetCam(ctx, z, cx = 960, cy = 700) { ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); }

// ---------- 场景 ----------
const SCENES = {};

const HOOK_RING = ringSpots(12, 3);
SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2), t3 = lineAt('hook', 3);
  const z = 1.22 + 0.06 * ramp(t, 0, s.end, x => x);
  ctx.save(); streetCam(ctx, z);
  drawStreet(ctx, t);
  const people = pairPeople(t, 'argue');
  HOOK_RING.forEach((p, i) => {
    const ti = beatAfter(t1, Math.floor(i / 2)) + (i % 2) * 0.12;
    const k = pop(t, ti, 0.45);
    if (k <= 0) return;
    const lookAt = (960 - p.x) / 300;
    people.push({ x: p.x, y: p.y + (1 - clamp(k)) * 30, col: p.col, alpha: clamp(k * 1.5), look: clamp(lookAt, -1, 1),
      bob: 2 * Math.sin(t * 2 + p.ph), mood: t > t3 ? 'worried' : 'calm' });
  });
  drawPeople(ctx, people);
  pairFx(ctx, t, 'argue', ramp(t, 0.3, 0.8));
  // 问号
  const kq = pop(t, t2, 0.5);
  if (kq > 0) {
    ctx.save(); ctx.translate(960, 470); ctx.scale(kq, kq);
    text(ctx, '?', 0, 0, { size: 130, family: 'Head', weight: 900, color: GOLD, shadow: 30 });
    ctx.restore();
  }
  // 看着的人头上冒出省略号
  if (t > t3) HOOK_RING.forEach((p, i) => {
    if (i % 3) return;
    const sc = depthScale(p.y);
    bubble(ctx, p.x + 20, p.y - 125 * sc, '…', { size: 26, alpha: pop(t, t3 + (i / 3) * 0.15, 0.3) * 0.9 });
  });
  ctx.restore();
  drawCam(ctx, t, { cam: 'CAM 07', place: '市中心 · 街角' });
};

// 1964 年：一栋公寓楼，窗户一扇扇亮起
const SEPIA = '#e8cfa4';
const WIN = (() => {
  const out = [], rnd = mulberry32(19);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) out.push({ i, j, r: rnd() });
  const order = out.map((w, k) => [w.r, k]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  order.forEach((k, n) => { out[k].n = n; });
  return out; // n < 38 的窗户会亮
})();
SCENES.legend = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('legend', 1), t2 = lineAt('legend', 2), t3 = lineAt('legend', 3);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#231b14'); bg.addColorStop(1, '#120d09');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // 楼
  const bx = 760, by = 110, bw = 980, bh = 640;
  ctx.fillStyle = '#3a2c21'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#2c2119'; ctx.fillRect(bx - 20, by - 26, bw + 40, 30);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = by + 12; y < by + bh; y += 24) ctx.fillRect(bx, y, bw, 3);
  const k38 = n => ramp(t, t2 + n * 0.042, t2 + n * 0.042 + 0.2);
  for (const w of WIN) {
    const x = bx + 60 + w.i * 112, y = by + 50 + w.j * 118;
    const lit = w.n < 38 ? k38(w.n) : 0;
    ctx.fillStyle = '#17110c'; ctx.fillRect(x, y, 78, 88);
    if (lit > 0) {
      ctx.fillStyle = rgba('#ffcf86', 0.85 * lit); ctx.fillRect(x, y, 78, 88);
      glowDot(ctx, x + 39, y + 44, 90, '#ffcf86', 0.22 * lit);
      // 窗边的人影
      ctx.fillStyle = rgba('#2a1d14', 0.9 * lit);
      circle(ctx, x + 39, y + 46, 13); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 39, y + 88, 26, 26, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#4a3828'; ctx.lineWidth = 5; ctx.strokeRect(x, y, 78, 88);
    ctx.beginPath(); ctx.moveTo(x + 39, y); ctx.lineTo(x + 39, y + 88); ctx.stroke();
  }
  // 街
  ctx.fillStyle = '#1f1710'; ctx.fillRect(0, 750, W, H - 750);
  ctx.fillStyle = '#4a3828'; ctx.fillRect(0, 750, W, 10);
  const lampA = 1 - 0.5 * ramp(t, t3, t3 + 1.2) * (0.6 + 0.4 * Math.sin(t * 13));
  ctx.fillStyle = '#2c2119'; ctx.fillRect(1240, 520, 10, 300);
  glowDot(ctx, 1245, 515, 120, '#ffcf86', 0.55 * lampA);
  ctx.save(); ctx.translate(1245, 840); ctx.scale(1, 0.25); glowDot(ctx, 0, 0, 260, '#ffcf86', 0.3 * lampA); ctx.restore();
  // 独自走在街上的人
  const kw = ramp(t, t1, t1 + 0.6);
  if (kw > 0) {
    const x = lerp(1050, 1190, ramp(t, t1, t2 + 0.5, x => x));
    drawBean(ctx, x, 850, 0.8, mix('#c9a982', '#8a6a52', ramp(t, t3, t3 + 1.5)), { alpha: kw, mood: t > t2 ? 'worried' : 'calm', bob: 3 * Math.abs(Math.sin(t * 5)) * (t < t2 + 0.5 ? 1 : 0) });
  }
  // 左边的文字
  const kY = ramp(t, t0, t0 + 0.6) * (1 - ramp(t, t2 - 0.3, t2 + 0.2));
  text(ctx, '1964', 370, 450, { size: 190, family: 'Head', weight: 900, color: SEPIA, alpha: kY, shadow: 20 });
  text(ctx, '纽约 · 皇后区', 370, 530, { size: 46, family: 'Serif', weight: 700, color: rgba(SEPIA, 0.75), alpha: kY });
  const k3 = ramp(t, t2, t2 + 0.4);
  if (k3 > 0) {
    const n = Math.round(38 * ramp(t, t2, t2 + 38 * 0.042 + 0.2, x => x));
    text(ctx, '当年的报纸说', 370, 330, { size: 44, family: 'Serif', weight: 700, color: rgba(SEPIA, 0.8), alpha: k3 });
    text(ctx, String(n), 370, 520, { size: 230, family: 'Head', weight: 900, color: GOLD, alpha: k3, shadow: 30 });
    text(ctx, '个邻居看着', 370, 600, { size: 50, family: 'Serif', weight: 700, color: SEPIA, alpha: k3 });
  }
  // 老照片的颗粒和暗角
  ctx.fillStyle = 'rgba(255,220,170,0.03)';
  const rnd = mulberry32(Math.floor(t * 12));
  for (let i = 0; i < 120; i++) ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
};

// 旁观者效应：人越多，每个人身上的“责任”越小
const EFF_N = [1, 2, 3, 5, 8, 12];
const EFF_SPOTS = (() => {
  const rnd = mulberry32(8), out = [];
  for (let i = 0; i < 12; i++) {
    const ang = Math.PI * (0.02 + 0.96 * ((i * 7) % 12) / 11);
    const r = i % 2 ? 1 : 0.72;
    out.push({ x: 960 - Math.cos(ang) * (560 * r + rnd() * 30), y: 660 + Math.sin(ang) * 230 * r + rnd() * 20, col: CROWD[i % CROWD.length], ph: rnd() * 6 });
  }
  return out;
})();
SCENES.effect = (ctx, t, s) => {
  const t0 = s.start, tBook = lineAt('effect', 1), tMore = lineAt('effect', 2), tEach = lineAt('effect', 3), tSay = lineAt('effect', 4);
  const kb = ramp(t, t0, t0 + 0.4, easeOut) * (1 - ramp(t, tBook - 0.4, tBook + 0.1));
  if (kb > 0) {
    glowDot(ctx, 960, 500, 700, '#ffc978', 0.18 * kb + 0.1 * barPulse(t) * kb);
    ctx.save(); ctx.translate(960, 520);
    const sc = 0.9 + 0.1 * easeOut(prog(t, t0, t0 + 1)) + 0.015 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '旁观者效应', 0, 0, { size: 190, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
    text(ctx, 'Bystander Effect', 960, 620, { size: 50, family: 'Serif', weight: 400, color: DIM, alpha: kb * ramp(t, t0 + 0.5, t0 + 1.1), spacing: 6 });
  }
  // 课本
  const kk = ramp(t, tBook - 0.2, tBook + 0.5, easeOut) * (1 - ramp(t, tMore - 0.4, tMore));
  if (kk > 0) {
    ctx.save(); ctx.globalAlpha *= kk; ctx.translate(960, 520 + 40 * (1 - kk));
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#efe6d2'; roundRect(ctx, -520, -280, 1040, 560, 18); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(-6, -280, 12, 560);
    text(ctx, '社会心理学', -260, -190, { size: 34, family: 'Sans', weight: 700, color: '#9a8a70' });
    text(ctx, '旁观者效应', -260, -110, { size: 64, family: 'Head', weight: 900, color: '#3a2f2a' });
    ctx.fillStyle = 'rgba(58,47,42,0.25)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-450, -50 + i * 44, i === 5 ? 220 : 380, 12);
    // 右页：38 扇窗户的小插图
    ctx.fillStyle = '#3a2c21'; ctx.fillRect(90, -200, 360, 300);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) { ctx.fillStyle = (j * 8 + i) < 38 ? '#e8b866' : '#1e1610'; ctx.fillRect(110 + i * 42, -182 + j * 56, 28, 36); }
    text(ctx, '1964 年纽约案', 270, 160, { size: 32, family: 'Serif', weight: 700, color: '#6a5a48' });
    ctx.restore();
  }
  // 一群人围着一个需要帮助的人
  const kc = ramp(t, tMore - 0.3, tMore + 0.2);
  if (kc <= 0) return;
  ctx.save(); ctx.globalAlpha *= kc;
  const step = Math.min(EFF_N.length - 1, Math.max(0, Math.floor((t - tMore) / (TL.music.beat * 0.66))));
  const n = t < tMore ? 1 : EFF_N[step];
  const kr = ramp(t, tEach - 0.2, tEach + 0.4);
  const people = [{ x: 960, y: 640, s: 1.15, col: '#c7b9a4', mood: 'worried', look: 0 }];
  for (let i = 0; i < 12; i++) {
    const p = EFF_SPOTS[i];
    const idx = EFF_N.findIndex(v => v > i);
    const ti = idx < 0 ? Infinity : tMore + Math.max(0, idx) * TL.music.beat * 0.66;
    const k = i === 0 ? 1 : pop(t, ti, 0.35);
    if (k <= 0) continue;
    people.push({ x: p.x, y: p.y, s: 1.0, col: p.col, alpha: clamp(k * 1.5), look: clamp((960 - p.x) / 300, -1, 1), bob: 2 * Math.sin(t * 2 + p.ph),
      mood: t > tSay ? 'worried' : 'calm' });
  }
  glowDot(ctx, 960, 580, 220, '#ff8f80', 0.18 + 0.1 * beatPulse(t));
  drawPeople(ctx, people);
  bubble(ctx, 960, 495, '!', { size: 44, col: '#ff8f80', ink: '#fff' });
  // 一份“该管的责任”被所有人平分
  const kpie = kr * (1 - ramp(t, tSay - 0.3, tSay));
  if (kpie > 0) {
    ctx.save(); ctx.globalAlpha *= kpie;
    const cx = 960, cy = 250, R = 105;
    glowDot(ctx, cx, cy, 200, '#ffc978', 0.2);
    ctx.fillStyle = rgba(GOLD, 0.25); circle(ctx, cx, cy, R); ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 / n); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#13202c'; ctx.lineWidth = 3;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / n; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    text(ctx, '该管的责任', cx - 160, cy + 12, { size: 40, family: 'Serif', weight: 700, color: CREAM, align: 'right' });
    richText(ctx, [['每人只剩 ', CREAM], [`1/${n}`, GOLD]], cx + 160, cy + 14, { size: 44, family: 'Serif', weight: 700, align: 'left' });
    text(ctx, '示意', cx, cy + R + 44, { size: 28, family: 'Sans', weight: 400, color: DIM });
    ctx.restore();
  }
  // “总会有别人管的”
  if (t > tSay) {
    const picks = [1, 4, 7, 10];
    picks.forEach((i, j) => {
      const p = EFF_SPOTS[i];
      bubble(ctx, p.x, p.y - 128, j < 3 ? '别人会管吧' : '……', { size: 30, alpha: pop(t, tSay + j * 0.18, 0.3) });
    });
  }
  ctx.restore();
};

// 报道被质疑
SCENES.doubt = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('doubt', 1);
  const k = ramp(t, t0 - 0.3, t0 + 0.5, easeOut);
  ctx.save(); ctx.globalAlpha *= k;
  ctx.translate(960, 470 + 30 * (1 - k)); ctx.rotate(-0.025);
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#ece2cc'; ctx.fillRect(-500, -270, 1000, 540);
  ctx.shadowColor = 'transparent';
  text(ctx, 'The New York Times', 0, -195, { size: 54, family: 'Serif', weight: 700, color: '#2a2420' });
  ctx.fillStyle = '#2a2420'; ctx.fillRect(-450, -170, 900, 3); ctx.fillRect(-450, -160, 900, 1.5);
  text(ctx, '1964 年 3 月 27 日', 0, -125, { size: 30, family: 'Sans', weight: 400, color: '#5a5046' });
  text(ctx, '38 人目睹，无人报警', 0, -30, { size: 84, family: 'Head', weight: 900, color: '#2a2420' });
  text(ctx, '（报道大意）', 0, 25, { size: 30, family: 'Sans', weight: 400, color: '#8a7e70' });
  ctx.fillStyle = 'rgba(42,36,32,0.25)';
  for (let c = 0; c < 3; c++) for (let i = 0; i < 5; i++) ctx.fillRect(-440 + c * 300, 70 + i * 34, 270 - (i === 4 ? 100 : 0), 12);
  // 盖章
  const ks = ramp(t, t1, t1 + 0.25, easeOut);
  if (ks > 0) {
    ctx.save(); ctx.translate(200, 140); ctx.rotate(0.12);
    const sc = lerp(1.8, 1, ks); ctx.scale(sc, sc); ctx.globalAlpha *= ks;
    ctx.strokeStyle = '#d6453d'; ctx.lineWidth = 9; roundRect(ctx, -250, -80, 500, 160, 18); ctx.stroke();
    ctx.lineWidth = 3; roundRect(ctx, -234, -64, 468, 128, 12); ctx.stroke();
    text(ctx, '多处失实', 0, 38, { size: 104, family: 'Head', weight: 900, color: '#d6453d' });
    ctx.restore();
  }
  ctx.restore();
  // 后来查明的事
  const facts = ['目击者远没有那么多', '有人报了警，有邻居下楼抱住了她'];
  facts.forEach((f, i) => {
    const k = pop(t, t1 + 0.4 + i * 0.45, 0.35);
    if (k <= 0) return;
    const x = [660, 1240][i];
    ctx.save(); ctx.translate(x, 860); ctx.scale(clamp(k), clamp(k));
    ctx.fillStyle = 'rgba(20,28,36,0.85)'; const bw = i ? 640 : 440; roundRect(ctx, -bw / 2, -42, bw, 76, 38); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.6); ctx.lineWidth = 2.5; ctx.stroke();
    text(ctx, f, 0, 10, { size: 36, family: 'Serif', weight: 700, color: CREAM });
    ctx.restore();
  });
  if (ks > 0 && ks < 1) { ctx.fillStyle = `rgba(255,240,220,${0.15 * (1 - ks)})`; ctx.fillRect(0, 0, W, H); }
};

// ---------- 219 段监控 ----------
const CITIES = [
  { name: '阿姆斯特丹', nation: '荷兰', n: 63, cols: 7 },
  { name: '兰开斯特', nation: '英国', n: 95, cols: 11 },
  { name: '开普敦', nation: '南非', n: 61, cols: 7 },
];
const CW = 60, CH = 40, CG = 6, BLOCK_GAP = 70;
const CLIPS = (() => {
  const rnd = mulberry32(42), out = [];
  const total = CITIES.reduce((a, c) => a + c.cols, 0) * (CW + CG) + 2 * BLOCK_GAP;
  let x0 = 960 - total / 2;
  CITIES.forEach((c, ci) => {
    for (let k = 0; k < c.n; k++) {
      const col = k % c.cols, row = Math.floor(k / c.cols);
      out.push({ city: ci, bx: x0 + col * (CW + CG), by: 410 + row * (CH + CG), r: rnd(), crowd: 3 + Math.floor(rnd() * 6), seed: Math.floor(rnd() * 1e6) });
    }
    x0 += c.cols * (CW + CG) + BLOCK_GAP;
  });
  // 合并成一面墙：20 列 × 11 行
  const order = out.map((c, i) => [c.r, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const GC = 22, gx0 = 960 - (GC * (CW + CG) - CG) / 2;
  order.forEach((i, n) => { out[i].gx = gx0 + (n % GC) * (CW + CG); out[i].gy = 488 + Math.floor(n / GC) * (CH + CG); out[i].order = n; });
  // 亮起的顺序随机；只有 199 段（219 × 90.9%）亮起
  const lightOrder = out.map((c, i) => [mulberry32(c.seed)(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  lightOrder.forEach((i, n) => { out[i].lit = n; });
  out.forEach(c => { const rr = mulberry32(c.seed + 7); c.helpers = 1 + Math.floor(rr() * 6); });
  return out;
})();
const N_LIT = Math.round(219 * 0.909); // 199
const ZOOM_CLIP = CLIPS.findIndex(c => c.city === 1 && c.bx > 900 && c.by > 470);
const UNZOOM_CLIP = CLIPS.findIndex(c => c.order === 4 * 22 + 10);

function drawClip(ctx, c, x, y, t, o = {}) {
  const { lit = 0, helpers = 0, alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = mix('#13232b', '#3a2f22', lit * 0.8);
  roundRect(ctx, x, y, CW, CH, 4); ctx.fill();
  if (lit > 0) { ctx.strokeStyle = rgba(GOLD, 0.85 * lit); ctx.lineWidth = 2; ctx.stroke(); }
  const rnd = mulberry32(c.seed);
  ctx.fillStyle = rgba(CAMUI, 0.35);
  for (let i = 0; i < c.crowd; i++) { const px = x + 6 + rnd() * (CW - 12), py = y + 12 + rnd() * (CH - 18); ctx.fillRect(px, py, 3, 4); }
  ctx.fillStyle = A_COL; ctx.fillRect(x + CW / 2 - 5, y + CH / 2, 4, 5);
  ctx.fillStyle = B_COL; ctx.fillRect(x + CW / 2 + 2, y + CH / 2, 4, 5);
  if (helpers > 0) {
    ctx.fillStyle = GOLD;
    for (let i = 0; i < Math.round(c.helpers * helpers); i++) { circle(ctx, x + 8 + i * 7, y + CH - 6, 2.6); ctx.fill(); }
  }
  if (Math.sin(t * 6 + c.seed) > 0) { ctx.fillStyle = REC; circle(ctx, x + 5, y + 5, 2); ctx.fill(); }
  ctx.restore();
}

// 被放大的那一段监控：街上吵架 → 推搡 → 路人上前
const CC_RING = ringSpots(10, 77);
const HELPERS = [ // 上前帮忙的三个人：从围观位置走到哪、做什么
  { from: 3, to: { x: 960, y: 735 }, arms: 'out', look: 0 },      // 挡在中间
  { from: 6, to: { x: 820, y: 700 }, arms: 'reach', dir: 1, look: 1 }, // 拉开
  { from: 1, to: { x: 1110, y: 705 }, arms: 'pat', dir: -1, look: -1 }, // 安慰
];
function ccStreet(ctx, t) {
  const t3 = lineAt('cctv', 3), t4 = lineAt('cctv', 4), t5 = lineAt('cctv', 5), t6 = lineAt('cctv', 6), t7 = lineAt('cctv', 7);
  const tFreeze = t5 + 0.3;
  const tt = t > tFreeze && t < t6 ? tFreeze + ((t - tFreeze) % 0.2) * 0.3 : t; // “一帧帧看”：画面近乎停住
  ctx.save(); streetCam(ctx, 1.2);
  drawStreet(ctx, tt);
  const mode = tt < t4 ? 'argue' : tt < t7 + 0.6 ? 'push' : 'calmed';
  const kp = mode === 'push' ? ramp(tt, t4, t4 + 0.3, easeOut) : ramp(tt, t7 + 0.6, t7 + 1.6);
  const people = pairPeople(tt, mode, kp);
  CC_RING.forEach((p, i) => {
    const h = HELPERS.find(h => h.from === i);
    const q = { x: p.x, y: p.y, col: p.col, look: clamp((960 - p.x) / 300, -1, 1), bob: 2 * Math.sin(tt * 2 + p.ph), mood: tt > t4 ? 'worried' : 'calm' };
    if (h) {
      const hi = HELPERS.indexOf(h);
      const tm = t6 + 0.3 + hi * 0.5;
      const km = ramp(tt, tm, tm + 1.0);
      q.x = lerp(p.x, h.to.x, km); q.y = lerp(p.y, h.to.y, km);
      q.glow = ramp(tt, tm, tm + 0.6);
      if (tt > t7 + hi * TL.music.beat) { q.arms = h.arms; q.dir = h.dir; q.look = h.look; q.mood = 'calm'; }
    }
    people.push(q);
  });
  drawPeople(ctx, people);
  pairFx(ctx, tt, mode, mode === 'calmed' ? 0 : ramp(tt, t3 - 0.3, t3 + 0.3));
  ctx.restore();
  return { tt };
}
function ccOverlay(ctx, t) {
  const t3 = lineAt('cctv', 3), t4 = lineAt('cctv', 4), t5 = lineAt('cctv', 5), t6 = lineAt('cctv', 6), t7 = lineAt('cctv', 7), t8 = lineAt('cctv', 8);
  const kOut = 1 - ramp(t, t8 - 0.2, t8 + 0.3);
  drawCam(ctx, t, { cam: 'CAM 12', place: '兰开斯特 · 市中心', alpha: kOut });
  // 冲突的程度
  const kSev = ramp(t, t3, t3 + 0.5) * (1 - ramp(t, t5 - 0.3, t5));
  if (kSev > 0) {
    ctx.save(); ctx.globalAlpha *= kSev;
    const x0 = 560, x1 = 1360, y = 230;
    ctx.fillStyle = 'rgba(10,16,24,0.55)'; roundRect(ctx, x0 - 70, y - 70, x1 - x0 + 140, 120, 30); ctx.fill();
    const lg = ctx.createLinearGradient(x0, 0, x1, 0); lg.addColorStop(0, '#ffe08a'); lg.addColorStop(1, '#ff6f6f');
    ctx.fillStyle = lg; roundRect(ctx, x0, y - 6, x1 - x0, 12, 6); ctx.fill();
    text(ctx, '吵架', x0, y - 26, { size: 34, family: 'Sans', weight: 700, color: CREAM });
    text(ctx, '推搡', (x0 + x1) / 2, y - 26, { size: 34, family: 'Sans', weight: 700, color: CREAM });
    text(ctx, '动手', x1, y - 26, { size: 34, family: 'Sans', weight: 700, color: CREAM });
    const px = lerp(x0, x1, 0.12 + 0.76 * ramp(t, t4, t4 + 1.4));
    ctx.fillStyle = CREAM; circle(ctx, px, y, 16 + 3 * beatPulse(t)); ctx.fill();
    ctx.restore();
  }
  // 一帧帧地看
  const kF = ramp(t, t5, t5 + 0.3) * (1 - ramp(t, t7 - 0.3, t7));
  if (kF > 0) {
    ctx.save(); ctx.globalAlpha *= kF;
    const f = Math.floor((t - t5) * 6);
    const sx = 140 + ((t - t5) * 520) % 1640;
    ctx.fillStyle = rgba(CAMUI, 0.12); ctx.fillRect(sx - 30, 160, 60, 760);
    ctx.fillStyle = rgba(CAMUI, 0.7); ctx.fillRect(sx - 1.5, 160, 3, 760);
    ctx.fillStyle = 'rgba(10,16,24,0.6)'; roundRect(ctx, 760, 190, 400, 84, 42); ctx.fill();
    // 暂停 / 单帧前进
    ctx.fillStyle = CREAM; ctx.fillRect(810, 212, 12, 40); ctx.fillRect(832, 212, 12, 40);
    ctx.beginPath(); ctx.moveTo(870, 212); ctx.lineTo(900, 232); ctx.lineTo(870, 252); ctx.fill(); ctx.fillRect(904, 212, 8, 40);
    text(ctx, `回放 00:${String(12 + Math.floor(f / 6)).padStart(2, '0')}.${f % 6}`, 1040, 246, { size: 34, family: 'Sans', weight: 700, color: CREAM });
    ctx.restore();
  }
  // 路人：有没有上前
  if (t > t6 && t < t8) CC_RING.forEach((p, i) => {
    const a = ramp(t, t6, t6 + 0.4) * (1 - ramp(t, t7 + 1, t7 + 1.6));
    if (a <= 0 || HELPERS.some(h => h.from === i)) return;
    const s = depthScale(p.y);
    ctx.save(); ctx.globalAlpha *= a * 0.8; ctx.strokeStyle = CAMUI; ctx.lineWidth = 3; ctx.setLineDash([8, 7]);
    ctx.strokeRect(p.x - 46 * s, p.y - 128 * s, 92 * s, 136 * s); ctx.restore();
  });
  // 劝、拦、拉开、安慰
  const acts = [['劝', 'calm'], ['拦', 'out'], ['拉开', 'reach'], ['安慰', 'pat']];
  acts.forEach(([name, arms], i) => {
    const k = pop(t, beatAfter(t7, i), 0.35) * (1 - ramp(t, t8 - 0.3, t8));
    if (k <= 0) return;
    const x = 960 + (i - 1.5) * 260, y = 210;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(30,26,20,0.75)'; roundRect(ctx, -115, -62, 230, 124, 26); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.85); ctx.lineWidth = 3; ctx.stroke();
    drawBean(ctx, -60, 44, 0.48, '#c9b48a', { arms, dir: 1, glow: 0.5, mood: 'calm' });
    text(ctx, name, 30, 18, { size: 50, family: 'Head', weight: 900, color: GOLD });
    ctx.restore();
  });
}

SCENES.cctv = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('cctv', 1), t2 = lineAt('cctv', 2), t3 = lineAt('cctv', 3), t8 = lineAt('cctv', 8), t9 = lineAt('cctv', 9), t10 = lineAt('cctv', 10);
  // 放大到一段监控的进度（0 = 一面墙，1 = 满屏）
  const zin = ramp(t, t3 - 0.6, t3 + 0.3);
  const zout = ramp(t, t8 - 0.2, t8 + 0.9);
  const zoom = zin * (1 - zout);
  const merge = ramp(t, t8 - 0.2, t8 + 0.9); // 城市分块 → 合成一面墙
  const wallA = 1 - zoom;
  const tLight = t8 + 0.7, dLight = 2.6;
  if (wallA > 0.01) {
    ctx.save(); ctx.globalAlpha *= wallA;
    const k0 = n => pop(t, t0 + (n / 219) * 0.9, 0.3);
    const bigA = ramp(t, t0, t0 + 0.3) * (1 - ramp(t, t1 - 0.3, t1 + 0.1));
    CLIPS.forEach((c, i) => {
      const k = clamp(k0(c.order));
      if (k <= 0) return;
      const x = lerp(c.bx, c.gx, merge), y = lerp(c.by, c.gy, merge);
      const lit = c.lit < N_LIT ? ramp(t, tLight + (c.lit / N_LIT) * dLight, tLight + (c.lit / N_LIT) * dLight + 0.2) : 0;
      const helpers = ramp(t, t10, t10 + 0.8);
      const sc = 0.6 + 0.4 * k;
      ctx.save(); ctx.translate(x + CW / 2, y + CH / 2); ctx.scale(sc, sc); ctx.translate(-x - CW / 2, -y - CH / 2);
      drawClip(ctx, c, x, y, t, { lit, helpers: lit > 0 ? helpers : 0, alpha: (1 - 0.6 * bigA) * clamp(k * 2) * (c.lit >= N_LIT ? 1 - 0.45 * ramp(t, tLight + dLight, tLight + dLight + 0.5) : 1) });
      ctx.restore();
    });
    // 219
    if (bigA > 0) {
      glowDot(ctx, 960, 520, 520, '#0a1016', 0.75 * bigA);
      ctx.save(); ctx.translate(960, 560); const sc = 0.88 + 0.12 * easeOut(prog(t, t0, t0 + 0.8)) + 0.015 * barPulse(t); ctx.scale(sc, sc);
      text(ctx, '219', 0, 0, { size: 300, family: 'Head', weight: 900, color: GOLD, alpha: bigA, shadow: 40 });
      ctx.restore();
      text(ctx, '段公共场所冲突的监控录像', 960, 660, { size: 48, family: 'Serif', weight: 700, color: CREAM, alpha: bigA });
    }
    // 城市标签
    const kc = 1 - merge;
    let x0 = CLIPS[0].bx;
    CITIES.forEach((c, ci) => {
      const k = pop(t, beatAfter(t1, ci), 0.35) * kc;
      const w = c.cols * (CW + CG) - CG;
      if (k > 0) {
        text(ctx, c.nation, x0 + w / 2, 300, { size: 34, family: 'Sans', weight: 700, color: DIM, alpha: clamp(k) });
        richText(ctx, [[c.name + ' ', CREAM], [String(c.n), GOLD], [' 段', CREAM]], x0 + w / 2, 356, { size: 44, family: 'Serif', weight: 700, alpha: clamp(k) });
      }
      x0 += w + CG + BLOCK_GAP;
    });
    const kd = ramp(t, t2, t2 + 0.5) * kc;
    text(ctx, '商业街 · 酒吧街 · 广场 · 公园 · 车站外', 960, 890, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: kd });
    // 90.9%
    const kn = ramp(t, tLight, tLight + 0.4);
    if (kn > 0) {
      const v = 90.9 * ramp(t, tLight, tLight + dLight, x => x);
      const sc = 1 + 0.06 * barPulse(t) * ramp(t, tLight + dLight, tLight + dLight + 0.3);
      ctx.save(); ctx.translate(960, 330); ctx.scale(sc, sc);
      text(ctx, `${v.toFixed(1)}%`, 0, 0, { size: 190, family: 'Head', weight: 900, color: GOLD, alpha: kn, shadow: 40 });
      ctx.restore();
      text(ctx, '的冲突里，至少有一个路人出手', 960, 420, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: kn * ramp(t, tLight + dLight - 0.5, tLight + dLight) });
    }
    const kh = ramp(t, t10, t10 + 0.6);
    if (kh > 0) {
      ctx.fillStyle = GOLD; circle(ctx, 790, 452, 7); ctx.fill();
      text(ctx, '= 一个出手的路人（示意）', 810, 463, { size: 32, family: 'Sans', weight: 400, color: DIM, align: 'left', alpha: kh });
    }
    ctx.restore();
  }
  // 放大的那一段
  if (zoom > 0.001) {
    const c0 = CLIPS[ZOOM_CLIP], c1 = CLIPS[UNZOOM_CLIP];
    const from = t < t8 - 0.2 ? { x: c0.bx, y: c0.by } : { x: c1.gx, y: c1.gy };
    const e = easeInOut(zoom);
    const rx = lerp(from.x, 0, e), ry = lerp(from.y, 0, e), rw = lerp(CW, W, e), rh = lerp(CH, H, e);
    ctx.save();
    ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    ctx.translate(rx, ry); ctx.scale(rw / W, rh / H);
    ccStreet(ctx, t);
    ccOverlay(ctx, t);
    ctx.restore();
  }
};

// 三个国家
SCENES.nations = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('nations', 1);
  CITIES.forEach((c, i) => {
    const k = pop(t, beatAfter(t0, i) - 0.2, 0.45);
    if (k <= 0) return;
    const x = 960 + (i - 1) * 600, y = 500 + Math.sin(t * 1.1 + i) * 4;
    ctx.save(); ctx.translate(x, y + 40 * (1 - clamp(k))); ctx.scale(1.18, 1.18); ctx.globalAlpha *= clamp(k * 1.4);
    ctx.fillStyle = '#17222d'; roundRect(ctx, -220, -260, 440, 470, 28); ctx.fill();
    ctx.strokeStyle = rgba(CAMUI, 0.35); ctx.lineWidth = 3; ctx.stroke();
    // 小街景
    ctx.save(); roundRect(ctx, -200, -240, 400, 290, 18); ctx.clip();
    const g = ctx.createLinearGradient(0, -240, 0, 50); g.addColorStop(0, '#1d2a38'); g.addColorStop(1, '#2a3646');
    ctx.fillStyle = g; ctx.fillRect(-200, -240, 400, 290);
    ctx.fillStyle = '#3a4655'; ctx.fillRect(-200, -60, 400, 8);
    ctx.fillStyle = '#2b3542'; ctx.fillRect(140, -200, 8, 200);
    glowDot(ctx, 132, -196, 90, '#ffc978', 0.55 + 0.15 * barPulse(t));
    ctx.save(); ctx.translate(40, 30); ctx.scale(1, 0.3); glowDot(ctx, 0, 0, 220, '#ffc978', 0.3); ctx.restore();
    drawBean(ctx, -40, 20, 0.62, A_COL, { mood: 'angry', look: 1, lean: -0.08 });
    drawBean(ctx, 70, 20, 0.62, B_COL, { mood: 'worried', look: -1 });
    drawBean(ctx, 15, 34, 0.68, '#c9b48a', { arms: 'out', glow: 0.8 + 0.2 * beatPulse(t), mood: 'calm' });
    ctx.restore();
    text(ctx, c.name, 0, 130, { size: 54, family: 'Head', weight: 900, color: CREAM });
    text(ctx, c.nation, 0, 182, { size: 34, family: 'Sans', weight: 700, color: DIM });
    if (i === 2) {
      const kt = pop(t, t1, 0.4);
      if (kt > 0) {
        ctx.save(); ctx.translate(0, -305); ctx.scale(kt, kt);
        ctx.fillStyle = '#e8875a'; roundRect(ctx, -160, -34, 320, 62, 31); ctx.fill();
        text(ctx, '公众安全感更低', 0, 10, { size: 34, family: 'Sans', weight: 700, color: '#2a1810' });
        ctx.restore();
      }
    }
    ctx.restore();
  });
  for (let i = 0; i < 2; i++) {
    const k = pop(t, beatAfter(t0, 3 + i), 0.4);
    text(ctx, '≈', 960 + (i - 0.5) * 600, 540, { size: 130 * clamp(k), family: 'Head', weight: 900, color: GOLD, shadow: 20 });
  }
  text(ctx, '三地之间，有人出手的可能没有明显差别', 960, 880, { size: 44, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t1 + 0.4, t1 + 0.9) });
};

// 人越多，越可能有人出手
const CR_RING = (() => {
  const a = ringSpots(14, 101, 400, 150), b = ringSpots(12, 202, 600, 210);
  return [...a, ...b].map((p, i) => ({ ...p, y: Math.max(500, Math.min(880, p.y)), arrive: i }));
})();
const CR_HELP = new Set([2, 9, 5, 12, 16, 20, 23]); // 依次亮起的出手者（按到场顺序选）
SCENES.crowd = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('crowd', 1), t2 = lineAt('crowd', 2), t3 = lineAt('crowd', 3), t4 = lineAt('crowd', 4), t5 = lineAt('crowd', 5);
  ctx.save(); streetCam(ctx, 1.14);
  drawStreet(ctx, t);
  const people = pairPeople(t, 'argue');
  const arriveAt = i => i < 4 ? t0 - 0.3 + i * 0.1 : i < 25 ? t0 + 0.3 + (i - 4) * ((t4 - t0 - 0.6) / 21) : t4 + 0.2;
  CR_RING.forEach((p, i) => {
    const ta = arriveAt(i);
    const k = ramp(t, ta, ta + 0.6, easeOut);
    if (k <= 0) return;
    const fromX = p.x < 960 ? -120 : W + 120;
    const q = { x: lerp(fromX, p.x, k), y: p.y, col: p.col, look: clamp((960 - p.x) / 300, -1, 1), bob: 4 * Math.abs(Math.sin(t * 7)) * (1 - k) + 2 * Math.sin(t * 2 + p.ph) * k, mood: 'calm' };
    if (CR_HELP.has(i) && t > t1) {
      const tg = Math.max(t1, ta + 0.6) + [...CR_HELP].indexOf(i) * 0.12;
      const kg = ramp(t, tg, tg + 0.5);
      q.glow = kg; q.x = lerp(q.x, lerp(p.x, 960, 0.35), kg); q.y = lerp(q.y, lerp(p.y, 690, 0.35), kg);
      if (kg > 0.5) q.arms = 'calm';
    }
    if (i === 25) { q.post = c => { const sc = depthScale(q.y); bubble(c, q.x, q.y - 120 * sc, '+1', { size: 34, col: GOLD, alpha: ramp(t, t4 + 0.5, t4 + 0.8) }); }; }
    people.push(q);
  });
  drawPeople(ctx, people);
  pairFx(ctx, t, 'argue', 1 - 0.6 * ramp(t, t1, t1 + 1));
  // 问号 → 翻过来
  const kq = pop(t, t0 + 0.3, 0.4) * (1 - ramp(t, t1 - 0.2, t1 + 0.1));
  if (kq > 0) text(ctx, '?', 960, 470, { size: 120 * clamp(kq), family: 'Head', weight: 900, color: GOLD, shadow: 30 });
  ctx.restore();
  drawCam(ctx, t, { cam: 'CAM 03', place: '市中心 · 广场' });
  // 每多一个路人，胜算 ×1.1
  const kt = pop(t, t5, 0.45);
  if (kt > 0) {
    ctx.save(); ctx.translate(960, 250); ctx.scale(kt, kt);
    ctx.fillStyle = 'rgba(14,20,28,0.82)'; roundRect(ctx, -420, -110, 840, 210, 36); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.7); ctx.lineWidth = 3; ctx.stroke();
    richText(ctx, [['有人帮忙的胜算  ', CREAM], ['×1.1', GOLD]], 0, 10, { size: 72, family: 'Head', weight: 900 });
    text(ctx, '每多一个路人；控制了冲突时长和国家', 0, 70, { size: 30, family: 'Sans', weight: 400, color: DIM });
    ctx.restore();
  }
};

// 示意模拟
SCENES.sim = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('sim', 1), t2 = lineAt('sim', 2), t3 = lineAt('sim', 3), t4 = lineAt('sim', 4), t5 = lineAt('sim', 5);
  const S = DATA.sim;
  // 两种说法碰在一起
  const kq = ramp(t, t0 - 0.2, t0 + 0.4, easeOut) * (1 - ramp(t, t1 + 1.0, t1 + 1.4));
  if (kq > 0) {
    ctx.save(); ctx.globalAlpha *= kq;
    const chip = (edge, side, str, col) => {
      font(ctx, 72, 'Head', 900);
      const w = ctx.measureText(str).width + 110, x0 = side < 0 ? edge - w : edge;
      ctx.fillStyle = rgba(col, 0.18); roundRect(ctx, x0, 395, w, 140, 70); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
      text(ctx, str, x0 + w / 2, 491, { size: 72, family: 'Head', weight: 900, color: col });
    };
    const gap = 150 - 40 * ramp(t, t0, t1, easeOut);
    chip(960 - gap, -1, '旁观者效应', '#9ab8ff');
    chip(960 + gap, 1, '人多，更可能有人管', GOLD);
    if (t < t1) text(ctx, '?', 960, 505, { size: 110, family: 'Head', weight: 900, color: CREAM });
    else text(ctx, '不一定矛盾', 960, 650, { size: 56, family: 'Head', weight: 900, color: CREAM, alpha: ramp(t, t1, t1 + 0.3) });
    ctx.restore();
  }
  const kc = ramp(t, t1 + 1.1, t1 + 1.6);
  if (kc <= 0) return;
  ctx.save(); ctx.globalAlpha *= kc;
  const x0 = 360, x1 = 1400, y0 = 640, y1 = 190;
  const X = n => lerp(x0, x1, (n - 1) / 39), Y = p => lerp(y0, y1, p);
  // 坐标轴
  ctx.strokeStyle = 'rgba(251,243,228,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y1 - 20); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 20, y0); ctx.stroke();
  ctx.strokeStyle = 'rgba(251,243,228,0.08)';
  for (const p of [0.5, 1]) { ctx.beginPath(); ctx.moveTo(x0, Y(p)); ctx.lineTo(x1, Y(p)); ctx.stroke(); }
  for (const p of [0, 0.5, 1]) text(ctx, `${p * 100}%`, x0 - 18, Y(p) + 11, { size: 30, family: 'Sans', weight: 400, color: DIM, align: 'right' });
  for (const n of [1, 10, 20, 30, 40]) text(ctx, String(n), X(n), y0 + 44, { size: 30, family: 'Sans', weight: 400, color: DIM });
  text(ctx, '现场人数', x1 + 30, y0 + 44, { size: 32, family: 'Sans', weight: 700, color: DIM, align: 'left' });
  // 示意标签
  ctx.fillStyle = 'rgba(232,135,90,0.9)'; roundRect(ctx, x0, 96, 400, 56, 28); ctx.fill();
  text(ctx, '示意模拟，不是论文数据', x0 + 200, 134, { size: 30, family: 'Sans', weight: 700, color: '#2a1810' });
  const curve = (arr, k, col, w, glow) => {
    if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
    ctx.beginPath();
    const m = Math.max(1, Math.floor(arr.length * k));
    for (let i = 0; i < m; i++) { const x = X(S.n[i]), y = Y(arr[i]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  };
  const kE = ramp(t, t2, t2 + 1.4);
  curve(S.p_each, kE, '#9ab8ff', 6, 10);
  text(ctx, '每个人出手的概率', x1 + 30, Y(S.p_each[39]) + 10, { size: 36, family: 'Head', weight: 900, color: '#9ab8ff', align: 'left', alpha: ramp(t, t2 + 1.2, t2 + 1.5) });
  const kA = ramp(t, t4, t4 + 1.6);
  curve(S.p_any, kA, GOLD, 8, 20 + 20 * ramp(t, t5, t5 + 0.6));
  text(ctx, '至少一人出手的概率', x1 + 30, Y(S.p_any[39]) + 10, { size: 36, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: ramp(t, t4 + 1.4, t4 + 1.7) });
  // 底下一排人：每半拍重放一次（人数由 1 涨到 24）
  const kr = ramp(t, t3 - 0.2, t3 + 0.3);
  if (kr > 0) {
    const step = Math.floor((t - t3) / (TL.music.beat / 2));
    const R = S.replays[clamp(step, 0, S.replays.length - 1)];
    const gap = 54, xs = 960 - (R.n - 1) * gap / 2;
    ctx.save(); ctx.globalAlpha *= kr;
    R.help.forEach((h, i) => drawBean(ctx, xs + i * gap, 850, 0.42, h ? '#e8c27a' : CROWD[i % CROWD.length], { glow: h ? 0.9 : 0, arms: h ? 'calm' : null, mood: h ? 'happy' : 'calm' }));
    ctx.restore();
    // 图上的竖线：当前人数
    const xn = X(R.n);
    ctx.strokeStyle = rgba(CREAM, 0.35 * kr); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(xn, y0); ctx.lineTo(xn, y1); ctx.stroke(); ctx.setLineDash([]);
    if (kE >= 1) { ctx.fillStyle = '#9ab8ff'; circle(ctx, xn, Y(S.p_each[R.n - 1]), 9); ctx.fill(); }
    if (kA >= 1) { ctx.fillStyle = GOLD; circle(ctx, xn, Y(S.p_any[R.n - 1]), 11); ctx.fill(); }
    text(ctx, '金色的人：这一次出手了', 960, 920, { size: 30, family: 'Sans', weight: 400, color: DIM, alpha: kr * (1 - ramp(t, t4, t4 + 0.5)) });
  }
  ctx.restore();
};

// 你站在旁边
const TURN_RING = ringSpots(12, 3);
const YOU_POS = { x: 760, y: 845 };
SCENES.turn = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('turn', 1);
  ctx.save(); streetCam(ctx, 1.3, 900, 740);
  drawStreet(ctx, t, { warm: 0.15 });
  const people = pairPeople(t, 'argue');
  TURN_RING.forEach(p => { if (Math.hypot(p.x - YOU_POS.x, p.y - YOU_POS.y) > 140) people.push({ x: p.x, y: p.y, col: p.col, look: clamp((960 - p.x) / 300, -1, 1), bob: 2 * Math.sin(t * 2 + p.ph), alpha: 0.85 }); });
  const hes = t > t1 ? Math.sin((t - t1) * Math.PI * 2 / (TL.music.beat * 2)) : 0;
  people.push({ x: YOU_POS.x, y: YOU_POS.y, col: YOU, look: 0.7, mood: t > t1 ? 'worried' : 'calm', lean: 0.07 * hes, glow: 0.25 + 0.15 * beatPulse(t, 0.3) });
  drawPeople(ctx, people);
  pairFx(ctx, t, 'argue', 0.8);
  const sc = depthScale(YOU_POS.y);
  const ky = pop(t, t0 + 0.2, 0.4);
  if (ky > 0) {
    const yy = YOU_POS.y - 150 * sc - 6 * Math.sin(t * 3);
    text(ctx, '你', YOU_POS.x, yy - 20, { size: 56, family: 'Head', weight: 900, color: YOU, alpha: clamp(ky), shadow: 16 });
    ctx.fillStyle = rgba(YOU, clamp(ky)); ctx.beginPath(); ctx.moveTo(YOU_POS.x - 12, yy - 4); ctx.lineTo(YOU_POS.x + 12, yy - 4); ctx.lineTo(YOU_POS.x, yy + 12); ctx.fill();
  }
  if (t > t1) bubble(ctx, YOU_POS.x + 110, YOU_POS.y - 130 * sc, '要不要……', { size: 34, alpha: pop(t, t1 + 0.2, 0.3) });
  ctx.restore();
  drawCam(ctx, t, { cam: 'CAM 07', place: '市中心 · 街角', alpha: 0.85 });
};

// 结尾：监控关掉，几个人一起上前
const END_HELP = [ // 和你一起上前的人
  { from: { x: 1240, y: 780 }, to: { x: 1080, y: 740 }, col: '#9a8fb0', arms: 'pat', dir: -1 },
  { from: { x: 640, y: 600 }, to: { x: 830, y: 660 }, col: '#7fa3a0', arms: 'reach', dir: 1 },
  { from: { x: 1300, y: 620 }, to: { x: 1050, y: 655 }, col: '#8c98a8', arms: 'calm' },
];
SCENES.end = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('end', 1), t2 = lineAt('end', 2), t3 = lineAt('end', 3);
  const warm = 0.15 + 0.85 * ramp(t, t0, t0 + 1.2) ;
  const z = 1.42 - 0.1 * ramp(t, t3, TL.duration, x => x);
  ctx.save(); streetCam(ctx, z, 960, 760);
  drawStreet(ctx, t, { warm: Math.min(1, warm + 0.3 * ramp(t, t3, t3 + 1.5)), lamp: 1.2 });
  const km = ramp(t, t0, t0 + 1.4);
  const people = pairPeople(t, 'calmed', ramp(t, t0 + 0.8, t0 + 2.2));
  TURN_RING.forEach(p => { if (Math.hypot(p.x - YOU_POS.x, p.y - YOU_POS.y) > 140 && !END_HELP.some(h => Math.hypot(h.from.x - p.x, h.from.y - p.y) < 160)) people.push({ x: p.x, y: p.y, col: p.col, look: clamp((960 - p.x) / 300, -1, 1), bob: 2 * Math.sin(t * 2 + p.ph), alpha: 0.85 }); });
  people.push({ x: lerp(YOU_POS.x, 880, km), y: lerp(YOU_POS.y, 760, km), col: YOU, look: 0.6, mood: 'calm', arms: km > 0.6 ? 'out' : null, glow: 0.4 + 0.6 * km });
  END_HELP.forEach((h, i) => {
    const k = ramp(t, t0 + 0.1 + i * 0.15, t0 + 1.5 + i * 0.15);
    people.push({ x: lerp(h.from.x, h.to.x, k), y: lerp(h.from.y, h.to.y, k), col: h.col, look: h.to.x < 960 ? 1 : -1, arms: k > 0.6 ? h.arms : null, dir: h.dir, glow: k, mood: 'calm' });
  });
  drawPeople(ctx, people);
  ctx.restore();
  // 监控关掉：一道亮线收起
  const off = ramp(t, t0 - 0.3, t0 + 0.15);
  drawCam(ctx, t, { cam: 'CAM 07', place: '市中心 · 街角', alpha: 0.85 * (1 - off) });
  const fl = window01(t, t0 - 0.15, t0 + 0.6, 0.3);
  if (fl > 0) { glowDot(ctx, 960, 560, 1100, '#ffe2b0', 0.5 * fl); }
  // 上方压暗，给大字和数字留出位置
  const band = ctx.createLinearGradient(0, 0, 0, 520);
  band.addColorStop(0, 'rgba(12,8,14,0.78)'); band.addColorStop(0.75, 'rgba(12,8,14,0.5)'); band.addColorStop(1, 'rgba(12,8,14,0)');
  ctx.fillStyle = band; ctx.fillRect(0, 0, W, 520);
  // 往往不止你一个
  const kb = ramp(t, t0, t0 + 0.4, easeOut) * (1 - ramp(t, t1 - 0.4, t1));
  if (kb > 0) {
    ctx.save(); ctx.translate(960, 300); const sc = 0.9 + 0.1 * easeOut(prog(t, t0, t0 + 1)) + 0.015 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '往往不止你一个', 0, 0, { size: 160, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  // 3.76 个人
  const kn = ramp(t, t1, t1 + 0.4) * (1 - ramp(t, t3 + 0.6, t3 + 1.2));
  if (kn > 0) {
    ctx.save(); ctx.globalAlpha *= kn;
    ctx.fillStyle = 'rgba(20,14,18,0.7)'; roundRect(ctx, 560, 110, 800, 270, 40); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const k = pop(t, beatAfter(t1, i), 0.35);
      drawBean(ctx, 680 + i * 105, 330, 0.85 * clamp(k), '#e8c27a', { fill: i < 3 ? 1 : 0.76, glow: i < 3 ? 0.6 : 0.3, mood: 'happy', arms: i < 3 ? 'calm' : null });
    }
    const k2 = ramp(t, t2, t2 + 0.5);
    text(ctx, '3.76', 1180, 270, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: k2, shadow: 30 });
    text(ctx, '人 / 每段录像', 1180, 340, { size: 38, family: 'Serif', weight: 700, color: CREAM, alpha: k2 });
    ctx.restore();
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  const t = 58;
  drawBackground(ctx, t);
  ctx.save(); ctx.translate(960, 420); ctx.scale(1.1, 1.1); ctx.translate(-960, -640);
  drawStreet(ctx, t, { warm: 0.3 });
  const people = pairPeople(t, 'push', 0.6);
  CC_RING.forEach((p, i) => {
    const h = HELPERS.find(h => h.from === i);
    const q = { x: p.x, y: p.y, col: p.col, look: clamp((960 - p.x) / 300, -1, 1), mood: 'worried' };
    if (h) Object.assign(q, { x: h.to.x, y: h.to.y, arms: h.arms, dir: h.dir, look: h.look, glow: 1, mood: 'calm' });
    people.push(q);
  });
  drawPeople(ctx, people);
  ctx.restore();
  drawCam(ctx, 3, { cam: 'CAM 07', place: '市中心 · 街角' });
  const g = ctx.createLinearGradient(0, 520, 0, H);
  g.addColorStop(0, 'rgba(8,14,21,0)'); g.addColorStop(0.35, 'rgba(8,14,21,0.85)'); g.addColorStop(1, 'rgba(8,14,21,0.96)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, '路上起冲突', 960, 760, { size: 120, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  richText(ctx, [['真的', CREAM], ['没人管', GOLD], ['吗？', CREAM]], 960, 910, { size: 150, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '三个国家 219 段监控录像', 960, 1000, { size: 46, family: 'Sans', weight: 700, color: GOLD, spacing: 4 });
}
