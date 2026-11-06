// 21 天养成习惯？画面
// 美术方向：深夜窗边的书桌。墨绿夜色，台灯的暖光，一盆会长大的小芽、一本打卡日历。
// 习惯的“自动化程度”曲线画成一根往上爬的藤蔓。曲线和数据点来自 sim.py（示意），关键数字来自 Lally 等 (2010)。

const CREAM = '#fbf3e4';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,243,228,0.62)';
const FAINT = 'rgba(251,243,228,0.32)';
const LEAF = '#8fd6a0';
const LEAF_D = '#4f9c6c';
const POT = '#d98b62';
const MISS = '#8f9aa6';
const CAT = { eat: '#ff8f7a', drink: '#8fd0ff', run: '#ffc36b', other: '#c9a7ff' };
const S = DATA.sim;

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
const pop = (t, a, d = 0.4) => clamp(ramp(t, a, a + d, easeBack), 0, 1.2);
const curveY = (x, c) => S.a - S.b * Math.exp(-c * x);

// ---------- 背景：夜里的窗、台灯、飘着的光点 ----------
const MOTES = (() => {
  const rnd = mulberry32(5);
  return Array.from({ length: 60 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.4, v: 5 + rnd() * 12, ph: rnd() * 6 }));
})();
const STARS = (() => {
  const rnd = mulberry32(9);
  return Array.from({ length: 26 }, () => ({ x: 1380 + rnd() * 420, y: 70 + rnd() * 300, r: 0.8 + rnd() * 1.6, ph: rnd() * 6 }));
})();
const warmth = t => ramp(t, TL.music.end - 11, TL.music.end - 7);

function drawBackground(ctx, t) {
  const w = warmth(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#15262c', '#2a2a2c', w));
  g.addColorStop(0.6, mix('#0f1d23', '#1f1d20', w));
  g.addColorStop(1, mix('#091216', '#120f12', w));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  // 窗
  ctx.save();
  ctx.globalAlpha = 0.5;
  roundRect(ctx, 1360, 40, 460, 380, 10);
  const wg = ctx.createLinearGradient(0, 40, 0, 420);
  wg.addColorStop(0, '#1b3340'); wg.addColorStop(1, '#122530');
  ctx.fillStyle = wg; ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,190,0.16)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1590, 40); ctx.lineTo(1590, 420); ctx.moveTo(1360, 230); ctx.lineTo(1820, 230); ctx.stroke();
  for (const s of STARS) { ctx.fillStyle = `rgba(255,245,220,${0.4 + 0.4 * Math.sin(t * 1.3 + s.ph)})`; circle(ctx, s.x, s.y, s.r); ctx.fill(); }
  glowDot(ctx, 1720, 120, 70, '#fff1c8', 0.35);
  ctx.fillStyle = 'rgba(255,244,214,0.85)'; circle(ctx, 1720, 120, 24); ctx.fill();
  ctx.fillStyle = '#183040'; circle(ctx, 1731, 113, 21); ctx.fill();
  ctx.restore();
  // 台灯的暖光
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, 260, 120, 900, '#ffc98a', (0.09 + 0.07 * lv) * (1 + 0.8 * w));
  glowDot(ctx, 960, 1180, 900, '#ffb070', 0.05 + 0.08 * w);
  for (const d of MOTES) {
    const y = (d.y - d.v * t + H * 10) % H, x = d.x + Math.sin(t * 0.35 + d.ph) * 22;
    glowDot(ctx, x, y, d.r * 4, '#ffe6b0', (0.12 + 0.28 * lv) * (0.6 + 0.4 * Math.sin(t + d.ph)));
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

// ---------- 小物件 ----------
function leaf(ctx, x, y, ang, len, color = LEAF) {
  if (len <= 0.5) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, LEAF_D); g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,70,45,0.5)'; ctx.lineWidth = Math.max(1, len * 0.04);
  ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke();
  ctx.restore();
}
function flower(ctx, x, y, r, k, color = '#ffb3a7') {
  if (k <= 0) return;
  glowDot(ctx, x, y, r * 3.2, '#ffd9a0', 0.35 * k);
  ctx.save(); ctx.translate(x, y); ctx.rotate(k * 0.6);
  for (let i = 0; i < 5; i++) {
    ctx.rotate(Math.PI * 2 / 5);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(r * 0.75 * k, 0, r * 0.62 * k, r * 0.42 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = GOLD; circle(ctx, 0, 0, r * 0.38 * k); ctx.fill();
  ctx.restore();
}

// 花盆：(x, y) 是盆底中点；growth 0~1 决定芽的高度和叶子数，bloom 开花
function drawPot(ctx, x, y, s, t, o = {}) {
  const { growth = 0.2, bloom = 0, alpha = 1, mood = 'smile', glow = 0, face = true } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -160, 260, '#ffd9a0', 0.4 * glow);
  // 芽
  const h = 30 + 300 * growth, sway = Math.sin(t * 1.4) * 6 * (0.3 + growth);
  const stem = u => [sway * u * u + Math.sin(u * 3) * 6 * growth, -108 - h * u];
  ctx.strokeStyle = LEAF_D; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) { const [px, py] = stem(i / 20); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  const nLeaves = 2 + Math.floor(growth * 8);
  for (let i = 0; i < nLeaves; i++) {
    const u = (i + 1) / (nLeaves + 0.6);
    const [px, py] = stem(u);
    const side = i % 2 ? 1 : -1;
    const len = (28 + 46 * growth) * (1 - 0.45 * u) * clamp(growth * 8 - i * 0.6 + 1);
    leaf(ctx, px, py, side > 0 ? -0.5 : Math.PI + 0.5, len);
  }
  const [tx, ty] = stem(1);
  leaf(ctx, tx, ty, -1.25, 24 + 20 * growth); leaf(ctx, tx, ty, Math.PI + 1.25, 22 + 18 * growth);
  flower(ctx, tx, ty - 6, 30, bloom);
  // 盆
  const pg = ctx.createLinearGradient(-80, 0, 80, 0);
  pg.addColorStop(0, '#b8694a'); pg.addColorStop(0.45, POT); pg.addColorStop(1, '#a95e42');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.moveTo(-58, 0); ctx.lineTo(58, 0); ctx.lineTo(74, -92); ctx.lineTo(-74, -92); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eaa47c';
  roundRect(ctx, -84, -116, 168, 28, 9); ctx.fill();
  ctx.fillStyle = '#3a2a22';
  ctx.beginPath(); ctx.ellipse(0, -114, 74, 7, 0, Math.PI, Math.PI * 2); ctx.fill();
  if (face) {
    ctx.fillStyle = '#4a2a20';
    for (const sx of [-22, 22]) { circle(ctx, sx, -56, 5.5); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,140,140,0.45)';
    for (const sx of [-36, 36]) { ctx.beginPath(); ctx.ellipse(sx, -44, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#4a2a20'; ctx.lineWidth = 3.5;
    ctx.beginPath();
    if (mood === 'smile') ctx.arc(0, -46, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    else if (mood === 'o') { circle(ctx, 0, -38, 5); }
    else { ctx.moveTo(-7, -40); ctx.lineTo(7, -40); }
    ctx.stroke();
  }
  ctx.restore();
}

// 打卡日历：每格 state(i) 返回 {k: 打勾进度, miss: 0~1, q: 问号}
function drawCalendar(ctx, x, y, cell, n, cols, state, o = {}) {
  const { alpha = 1, title = null, gap = 10, numbers = true } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const rows = Math.ceil(n / cols);
  const wTot = cols * cell + (cols - 1) * gap, hTot = rows * cell + (rows - 1) * gap;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#f4ead7';
  roundRect(ctx, x - 28, y - (title ? 96 : 28), wTot + 56, hTot + (title ? 124 : 56), 18); ctx.fill();
  ctx.shadowColor = 'transparent';
  if (title) {
    ctx.fillStyle = '#d9825b';
    roundRect(ctx, x - 28, y - 96, wTot + 56, 70, [18, 18, 0, 0]); ctx.fill();
    text(ctx, title, x + wTot / 2, y - 47, { size: 38, family: 'Head', weight: 900, color: '#fff6e8' });
  }
  for (let i = 0; i < n; i++) {
    const cx = x + (i % cols) * (cell + gap), cy = y + Math.floor(i / cols) * (cell + gap);
    const st = state(i) || {};
    const k = st.k || 0, m = st.miss || 0, q = st.q || 0;
    roundRect(ctx, cx, cy, cell, cell, cell * 0.16);
    ctx.fillStyle = k > 0 ? mix('#efe2c8', '#ffe4a3', clamp(k)) : m > 0 ? '#e1ddd6' : '#ece1cb'; ctx.fill();
    if (numbers) text(ctx, String(i + 1), cx + cell * 0.12, cy + cell * 0.3, { size: cell * 0.22, family: 'Sans', weight: 700, color: 'rgba(80,60,50,0.55)', align: 'left' });
    if (k > 0) {
      ctx.save();
      ctx.strokeStyle = '#d9822b'; ctx.lineWidth = cell * 0.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const p = [[cx + cell * 0.28, cy + cell * 0.56], [cx + cell * 0.45, cy + cell * 0.72], [cx + cell * 0.76, cy + cell * 0.36]];
      const f = clamp(k) * 2;
      ctx.beginPath(); ctx.moveTo(...p[0]);
      ctx.lineTo(lerp(p[0][0], p[1][0], clamp(f)), lerp(p[0][1], p[1][1], clamp(f)));
      if (f > 1) ctx.lineTo(lerp(p[1][0], p[2][0], f - 1), lerp(p[1][1], p[2][1], f - 1));
      ctx.stroke(); ctx.restore();
    }
    if (m > 0) {
      ctx.save();
      ctx.strokeStyle = rgba('#6d7884', m); ctx.lineWidth = cell * 0.09; ctx.lineCap = 'round';
      const r = cell * 0.2 * clamp(m * 1.3), mx = cx + cell * 0.52, my = cy + cell * 0.56;
      ctx.beginPath(); ctx.moveTo(mx - r, my - r); ctx.lineTo(mx + r, my + r); ctx.moveTo(mx + r, my - r); ctx.lineTo(mx - r, my + r); ctx.stroke();
      ctx.restore();
    }
    if (q > 0) text(ctx, '?', cx + cell / 2, cy + cell * 0.74, { size: cell * 0.55, family: 'Head', weight: 900, color: rgba('#b07d5a', 0.8 * q) });
  }
  ctx.restore();
  return { w: wTot, h: hTot };
}

function apple(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createRadialGradient(-12, -10, 4, 0, 0, 46);
  g.addColorStop(0, '#ffb3a0'); g.addColorStop(1, '#e8604f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -26);
  ctx.bezierCurveTo(30, -46, 54, -10, 36, 22); ctx.bezierCurveTo(24, 44, 8, 40, 0, 34);
  ctx.bezierCurveTo(-8, 40, -24, 44, -36, 22); ctx.bezierCurveTo(-54, -10, -30, -46, 0, -26); ctx.fill();
  ctx.strokeStyle = '#6b4a32'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(2, -40, 8, -48); ctx.stroke();
  leaf(ctx, 6, -40, -0.4, 26);
  ctx.restore();
}
function bottle(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-22, 0, 22, 0);
  g.addColorStop(0, '#6fb8ef'); g.addColorStop(0.5, '#b9e4ff'); g.addColorStop(1, '#5fa6dc');
  ctx.fillStyle = g;
  roundRect(ctx, -22, -28, 44, 76, 12); ctx.fill();
  roundRect(ctx, -12, -44, 24, 20, 5); ctx.fill();
  ctx.fillStyle = '#3d7fb8'; roundRect(ctx, -13, -54, 26, 12, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; roundRect(ctx, -22, 4, 44, 14, 2); ctx.fill();
  ctx.restore();
}
function shoe(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffc36b';
  ctx.beginPath(); ctx.moveTo(-44, 14); ctx.lineTo(-40, -26); ctx.quadraticCurveTo(-24, -30, -14, -16);
  ctx.quadraticCurveTo(10, -6, 36, 0); ctx.quadraticCurveTo(50, 4, 48, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff3dc'; roundRect(ctx, -48, 12, 100, 12, 6); ctx.fill();
  ctx.strokeStyle = '#a8662a'; ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 9, -14 + i * 3); ctx.lineTo(-12 + i * 9, -20 + i * 3); ctx.stroke(); }
  ctx.restore();
}
function sparkle(ctx, x, y, s, color = CAT.other) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? 12 : 34, a = i * Math.PI / 4 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
const ICON = { eat: apple, drink: bottle, run: shoe, other: sparkle };

// 卡片：中心 (x, y)
function card(ctx, x, y, w, h, o = {}) {
  const { alpha = 1, fill = '#f4ead7', tilt = 0 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(tilt);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = fill; roundRect(ctx, -w / 2, -h / 2, w, h, 22); ctx.fill();
  ctx.restore();
}

// 旧书
function drawBook(ctx, x, y, s, o = {}) {
  const { alpha = 1, year = 1, glow = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, 0, 380, '#ffd9a0', 0.3 * glow);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#7a2f2c'; roundRect(ctx, -160, -220, 320, 440, 12); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#5c2121'; roundRect(ctx, -160, -220, 34, 440, [12, 0, 0, 12]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,122,0.7)'; ctx.lineWidth = 3;
  roundRect(ctx, -110, -186, 250, 372, 6); ctx.stroke();
  text(ctx, 'PSYCHO-', 15, -80, { size: 42, family: 'Serif', weight: 700, color: GOLD, spacing: 2 });
  text(ctx, 'CYBERNETICS', 15, -30, { size: 34, family: 'Serif', weight: 700, color: GOLD, spacing: 2 });
  ctx.strokeStyle = 'rgba(255,210,122,0.5)'; ctx.beginPath(); ctx.moveTo(-50, 10); ctx.lineTo(80, 10); ctx.stroke();
  text(ctx, 'Maxwell Maltz', 15, 60, { size: 28, family: 'Serif', weight: 400, color: 'rgba(255,226,170,0.85)' });
  text(ctx, '1960', 15, 150, { size: 64, family: 'Head', weight: 900, color: GOLD, alpha: year });
  ctx.restore();
}

// 手镜和镜子里的人：bandage 绷带，smile 0~1
function drawMirror(ctx, x, y, s, o = {}) {
  const { alpha = 1, bandage = 1, smile = 0, glow = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -40, 330, '#ffd9a0', 0.35 * glow);
  ctx.fillStyle = '#b07a4a'; roundRect(ctx, -22, 120, 44, 190, 18); ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#c99257'; circle(ctx, 0, -20, 175); ctx.fill();
  ctx.shadowColor = 'transparent';
  const mg = ctx.createLinearGradient(-150, -170, 150, 130);
  mg.addColorStop(0, '#cfe3ea'); mg.addColorStop(1, '#8fb0bd');
  ctx.fillStyle = mg; circle(ctx, 0, -20, 150); ctx.fill();
  ctx.save(); circle(ctx, 0, -20, 150); ctx.clip();
  // 人
  ctx.fillStyle = '#2a2233'; ctx.beginPath(); ctx.ellipse(0, -60, 84, 92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7aa7d9'; ctx.beginPath(); ctx.ellipse(0, 150, 120, 80, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4dccb'; ctx.beginPath(); ctx.ellipse(0, -30, 66, 76, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2233'; ctx.beginPath(); ctx.ellipse(0, -96, 72, 34, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b2b33';
  for (const sx of [-24, 24]) { ctx.beginPath(); ctx.ellipse(sx, -34, 6, 8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = `rgba(255,130,150,${0.2 + 0.3 * smile})`;
  for (const sx of [-40, 40]) { ctx.beginPath(); ctx.ellipse(sx, -12, 12, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#a3605f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(0, 10 + 14 * smile - 4 * (1 - smile), 14, 10); ctx.stroke();
  if (bandage > 0) {
    ctx.save(); ctx.globalAlpha *= bandage;
    ctx.fillStyle = '#fff8ee';
    ctx.save(); ctx.translate(0, -14); ctx.rotate(0.5); roundRect(ctx, -30, -9, 60, 18, 6); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(0, -14); ctx.rotate(-0.5); roundRect(ctx, -30, -9, 60, 18, 6); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(-70, -100, 26, 60, 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// 气泡：中心 (x, y)
function bubble(ctx, str, x, y, o = {}) {
  const { alpha = 1, size = 40, color = '#3a2f3a', fill = '#f4ead7', glow = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  font(ctx, size, 'Serif', 700);
  const w = ctx.measureText(str).width + size * 1.4, h = size * 1.9;
  if (glow > 0) glowDot(ctx, x, y, w * 0.8, '#ffd27a', 0.4 * glow);
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = fill;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - w * 0.18, y + h / 2 - 4); ctx.lineTo(x - w * 0.26, y + h / 2 + 22); ctx.lineTo(x - w * 0.05, y + h / 2 - 4); ctx.fill();
  ctx.restore();
  text(ctx, str, x, y + size * 0.36, { size, family: 'Serif', weight: 700, color, alpha });
}

// ---------- 图表：自动化程度（0~42）随天数 ----------
const CH = { x0: 300, x1: 1620, yb: 790, yt: 200 };
function chartMap(xmax) {
  return { X: d => lerp(CH.x0, CH.x1, d / xmax), Y: v => lerp(CH.yb, CH.yt, v / S.max) };
}
function drawAxes(ctx, xmax, o = {}) {
  const { alpha = 1, ylab = true } = o;
  if (alpha <= 0) return;
  const { X, Y } = chartMap(xmax);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(251,243,228,0.4)';
  ctx.fillRect(CH.x0 - 20, CH.yb, CH.x1 - CH.x0 + 60, 3);
  ctx.fillRect(CH.x0 - 2, CH.yt - 30, 3, CH.yb - CH.yt + 30);
  for (const v of [0, 21, 42]) {
    text(ctx, String(v), CH.x0 - 26, Y(v) + 12, { size: 32, family: 'Sans', weight: 700, color: DIM, align: 'right' });
    if (v) { ctx.fillStyle = 'rgba(251,243,228,0.08)'; ctx.fillRect(CH.x0, Y(v), CH.x1 - CH.x0 + 40, 2); }
  }
  // 横轴刻度：放得下 21 天一格时用 21，越缩越稀
  for (let d = 21; d <= 280; d += 21) {
    const x = X(d);
    if (x > CH.x1 + 30) break;
    const a = d % 84 === 0 ? 1 : d % 42 === 0 ? 1 - prog(xmax, 160, 200) : 1 - prog(xmax, 100, 130);
    if (a <= 0) continue;
    ctx.fillStyle = `rgba(251,243,228,${0.4 * a})`; ctx.fillRect(x - 1, CH.yb, 3, 14);
    text(ctx, String(d), x, CH.yb + 52, { size: 32, family: 'Sans', weight: 700, color: DIM, alpha: a });
  }
  text(ctx, '天', CH.x1 + 70, CH.yb + 52, { size: 32, family: 'Serif', weight: 700, color: DIM });
  if (ylab) text(ctx, '“不用想”的程度', CH.x0 - 10, CH.yt - 56, { size: 34, family: 'Serif', weight: 700, color: DIM, align: 'left' });
  ctx.restore();
}
// 藤蔓：沿曲线画到 dEnd，叶子按经过的长度长出来
function drawVine(ctx, t, c, dEnd, xmax, o = {}) {
  const { alpha = 1, color = LEAF, width = 7, leaves = true, glow = 1, tip = true, dash = null, d0 = 0 } = o;
  if (alpha <= 0 || dEnd <= d0) return null;
  const { X, Y } = chartMap(xmax);
  const step = Math.max(0.25, xmax / 500);
  const pts = [];
  for (let d = d0; d < dEnd; d += step) pts.push([X(d), Y(curveY(d, c))]);
  pts.push([X(dEnd), Y(curveY(dEnd, c))]);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = width;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 16 * glow; }
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowColor = 'transparent';
  if (leaves) {
    let acc = 0, n = 0, total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      acc += seg;
      if (acc > 64) {
        acc = 0; n++;
        const ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
        const fromTip = total - pts.slice(0, i + 1).reduce((s, p, j) => j ? s + Math.hypot(p[0] - pts[j - 1][0], p[1] - pts[j - 1][1]) : 0, 0);
        const g = clamp(fromTip / 90);
        leaf(ctx, pts[i][0], pts[i][1], ang + (n % 2 ? -1.0 : 1.0) + Math.sin(t * 1.5 + n) * 0.08, 30 * g, color === LEAF ? LEAF : color);
      }
    }
  }
  const end = pts[pts.length - 1];
  if (tip) { glowDot(ctx, end[0], end[1], 40, '#fff0b8', 0.6); ctx.fillStyle = '#eaffd8'; circle(ctx, end[0], end[1], 8); ctx.fill(); }
  ctx.restore();
  return end;
}
function marker(ctx, x, y0, y1, label, o = {}) {
  const { alpha = 1, color = GOLD, size = 36, dy = 0 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = rgba(color === GOLD ? '#ffd27a' : color, 0.75); ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  ctx.restore();
  if (label) text(ctx, label, x, y1 - 18 + dy, { size, family: 'Head', weight: 900, color, alpha, shadow: 12 });
}

// ---------- 场景 ----------
const SCENES = {};
const deskCal = (ctx, t, state, o = {}) => drawCalendar(ctx, 250, 290, 112, 21, 7, state, { title: '21 天打卡', gap: 12, ...o });

SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2);
  // 每半拍打一个勾，第二句结束时打满 21 天
  const tick = i => beatAfter(lineAt('hook', 0) + 0.3, 0) + i * TL.music.beat * 0.4;
  deskCal(ctx, t, i => ({ k: ramp(t, tick(i), tick(i) + 0.25) }));
  const full = tick(20) + 0.3;
  // “养成！”印章
  const ks = pop(t, full, 0.35) * (1 - 0.7 * ramp(t, t2, t2 + 0.6));
  if (ks > 0) {
    ctx.save();
    ctx.translate(700, 520); ctx.rotate(-0.18); ctx.scale(1.6 - 0.6 * clamp(ks), 1.6 - 0.6 * clamp(ks));
    ctx.globalAlpha *= clamp(ks);
    ctx.strokeStyle = '#e0533e'; ctx.lineWidth = 7;
    roundRect(ctx, -170, -62, 340, 124, 16); ctx.stroke();
    text(ctx, '习惯养成！', 0, 24, { size: 74, family: 'Head', weight: 900, color: '#e0533e' });
    ctx.restore();
  }
  // 小芽几乎没长
  const kq = pop(t, t2 + 0.2);
  drawPot(ctx, 1420, 880, 1.75, t, { growth: 0.08 + 0.06 * ramp(t, 0.5, full), mood: t > t2 ? 'o' : 'smile', glow: 0.4 + 0.2 * barPulse(t) });
  if (kq > 0) text(ctx, '?', 1620, 470 - 20 * (1 - clamp(kq)), { size: 190, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kq), shadow: 30 });
};

SCENES.origin = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('origin', 1), t2 = lineAt('origin', 2), t3 = lineAt('origin', 3);
  const kb = ramp(t, t0, t0 + 0.8, easeOut);
  const bx = lerp(960, 640, ramp(t, t3 - 0.4, t3 + 0.4));
  drawBook(ctx, bx, 470 + (1 - kb) * 80, 1.0, { alpha: kb, year: ramp(t, t1, t1 + 0.5), glow: 0.4 + 0.6 * ramp(t, t2, t2 + 0.6) + 0.2 * barPulse(t) });
  text(ctx, '整形外科医生', bx, 800, { size: 44, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, t1 + 0.3, t1 + 0.8) });
  text(ctx, '《心理控制论》', bx, 860, { size: 36, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t2, t2 + 0.6) });
  const km = ramp(t, t3, t3 + 0.6, easeOut);
  drawMirror(ctx, 1300, 440 + (1 - km) * 60, 1.0, { alpha: km, bandage: 1, smile: 0, glow: 0.3 * km });
};

SCENES.quote = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('quote', 1), t2 = lineAt('quote', 2), t3 = lineAt('quote', 3), t4 = lineAt('quote', 4);
  // 起势：原话里的 21 天
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, t3 - 0.5, t3));
  if (kb > 0) {
    const up = ramp(t, t1 - 0.3, t1 + 0.4);
    ctx.save();
    ctx.translate(960, lerp(470, 300, up));
    const sc = (0.9 + 0.1 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t)) * lerp(1, 0.72, up);
    ctx.scale(sc, sc);
    richText(ctx, [['大约要 ', CREAM], ['21', GOLD], [' 天', CREAM]], 0, 0, { size: 170, family: 'Head', weight: 900, alpha: kb, shadow: 40 });
    ctx.restore();
    text(ctx, '病人适应自己新的脸', 960, lerp(590, 400, up), { size: 48, family: 'Serif', weight: 700, color: CREAM, alpha: kb * (1 - up) * ramp(t, t0 + 0.6, t0 + 1.2) });
    text(ctx, '“it takes about 21 days for the average patient to get used to his new face”', 960, lerp(670, 460, up),
      { size: 34, family: 'Serif', weight: 400, color: DIM, alpha: kb * (1 - up) * ramp(t, t0 + 1.2, t0 + 1.8) });
    // 至少
    const km = ramp(t, t1, t1 + 0.5) * kb;
    if (km > 0) {
      richText(ctx, [['“', DIM], ['a minimum of', GOLD], [' about 21 days”', DIM]], 960, 560, { size: 46, family: 'Serif', weight: 700, alpha: km });
      const kz = pop(t, t1 + 0.4);
      text(ctx, '至少', 960, 700, { size: 110 * clamp(kz), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kz) * kb, shadow: 30 });
    }
    // 镜子里的人笑了
    const kmr = ramp(t, t2, t2 + 0.6) * kb;
    if (kmr > 0) {
      drawMirror(ctx, 1560, 640, 0.7, { alpha: kmr, bandage: 1 - ramp(t, t2 + 0.3, t2 + 1.2), smile: ramp(t, t2 + 0.8, t2 + 1.5), glow: 0.6 });
      text(ctx, '接受新的自己', 1560, 920, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: kmr });
    }
  }
  // 传话：越传越短
  const chain = [
    { s: '至少大约 21 天，才能适应新形象', x: 560, y: 300 },
    { s: '大概 21 天就能适应', x: 1260, y: 430 },
    { s: '21 天能改掉一个习惯', x: 640, y: 570 },
  ];
  chain.forEach((c, i) => {
    const tb = beatAfter(t3, i * 2);
    const k = pop(t, tb);
    bubble(ctx, c.s, c.x, c.y + (1 - clamp(k)) * 30, { alpha: clamp(k) * (1 - 0.55 * ramp(t, t4, t4 + 0.5)), size: 50, fill: mix('#f4ead7', '#c8c2b8', i * 0.25) });
  });
  const kf = pop(t, t4, 0.5);
  if (kf > 0) {
    bubble(ctx, '21 天养成习惯！', 1200, 740 + (1 - clamp(kf)) * 30, { alpha: clamp(kf), size: 72, fill: '#ffe1a0', glow: 0.6 + 0.4 * barPulse(t) });
  }
  text(ctx, '（传话过程为示意）', 1700, 900, { size: 30, family: 'Sans', weight: 400, color: FAINT, alpha: ramp(t, t3, t3 + 0.6) });
};

SCENES.ask = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('ask', 1);
  // 21 天的日历后面，又长出一排排问号
  const n = 21 + Math.floor(42 * ramp(t, t0 + 0.4, t1 + 0.6, x => x));
  const cell = 62, gap = 9;
  const kIn = ramp(t, t0 - 0.2, t0 + 0.5);
  drawCalendar(ctx, 960 - (7 * cell + 6 * gap) / 2, 220, cell, Math.max(21, n), 7,
    i => i < 21 ? { k: 1 } : { q: ramp(t, t0 + 0.4 + (i - 21) * 0.045, t0 + 0.7 + (i - 21) * 0.045) },
    { alpha: kIn * (1 - ramp(t, s.end - 0.5, s.end)), numbers: false });
  const kc = pop(t, t1);
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(kc);
    card(ctx, 1500, 520, 300, 360, { tilt: 0.06 });
    ctx.save(); ctx.translate(1500, 520); ctx.rotate(0.06);
    ctx.strokeStyle = 'rgba(120,90,70,0.35)'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-100, -90 + i * 46); ctx.lineTo(100, -90 + i * 46); ctx.stroke(); }
    ctx.strokeStyle = LEAF_D; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-100, 120);
    for (let d = 0; d <= 84; d += 2) ctx.lineTo(-100 + d * 200 / 84, 120 - 200 * curveY(d, S.c.median) / S.max);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
};

// 96 个人：按论文的人数分配吃 27、喝 31、运动 34、其他 4，打乱后排成 12×8
const PEOPLE = (() => {
  const list = [...Array(27).fill('eat'), ...Array(31).fill('drink'), ...Array(34).fill('run'), ...Array(4).fill('other')];
  const rnd = mulberry32(96);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list.map((cat, i) => ({ cat, col: i % 12, row: Math.floor(i / 12), ph: rnd() * 6 }));
})();
const CARDS = [
  { cat: 'eat', a: '午饭时', b: '吃一个水果', x: 520 },
  { cat: 'drink', a: '午饭时', b: '喝一瓶水', x: 960 },
  { cat: 'run', a: '晚饭前', b: '跑 15 分钟', x: 1400 },
];

SCENES.study = (ctx, t, s) => {
  const L = i => lineAt('study', i);
  const t0 = s.start;
  // 1. 96 个人
  const kg = 1 - ramp(t, L(2) - 0.4, L(2) + 0.2);
  if (kg > 0) {
    const kb = ramp(t, t0, t0 + 0.5, easeOut);
    ctx.save(); ctx.globalAlpha *= kg;
    ctx.save();
    ctx.translate(960, 190); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    richText(ctx, [['96', GOLD], [' 个人', CREAM]], 0, 0, { size: 150, family: 'Head', weight: 900, alpha: kb, shadow: 40 });
    ctx.restore();
    text(ctx, '伦敦大学学院 · Lally 等的研究', 960, 258, { size: 36, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t0 + 0.5, t0 + 1.1) });
    for (const p of PEOPLE) {
      const x = 960 + (p.col - 5.5) * 112, y = 360 + p.row * 62;
      const tp = t0 + 0.2 + (p.row * 12 + p.col) * 0.032;
      const k = pop(t, tp, 0.35);
      if (k <= 0) continue;
      drawPot(ctx, x, y + 26, 0.22 * clamp(k, 0, 1.15), t + p.ph, { growth: 0.05, face: false });
      const ki = pop(t, L(1) + (p.row * 12 + p.col) * 0.012, 0.3);
      if (ki > 0) ICON[p.cat](ctx, x + 30, y - 22, 0.32 * ki);
    }
    const kl = ramp(t, L(1) + 0.8, L(1) + 1.3);
    if (kl > 0) {
      const items = [['eat', '吃', 27], ['drink', '喝', 31], ['run', '运动', 34], ['other', '其他', 4]];
      items.forEach(([c, name, n], i) => {
        const x = 520 + i * 300;
        ICON[c](ctx, x - 50, 880, 0.4);
        richText(ctx, [[name + ' ', CREAM], [String(n), GOLD]], x + 20, 893, { size: 38, family: 'Serif', weight: 700, alpha: kl * (1 - ramp(t, L(2) - 0.6, L(2))) });
      });
    }
    ctx.restore();
  }
  // 2. 三张例子卡片
  const kc = ramp(t, L(2) - 0.2, L(2) + 0.3) * (1 - ramp(t, L(4) - 0.3, L(4) + 0.2));
  if (kc > 0) {
    CARDS.forEach((c, i) => {
      const tb = i === 0 ? L(2) : i === 1 ? beatAfter(L(2), 2) : L(3);
      const k = pop(t, tb, 0.45);
      if (k <= 0) return;
      const y = 470 + (1 - clamp(k)) * 60 + Math.sin(t * 0.9 + i) * 4;
      card(ctx, c.x, y, 340, 420, { alpha: kc * clamp(k), tilt: [-0.04, 0.02, 0.04][i] });
      ctx.save(); ctx.globalAlpha *= kc * clamp(k);
      glowDot(ctx, c.x, y - 60, 120, CAT[c.cat], 0.35);
      ICON[c.cat](ctx, c.x, y - 60, 1.7);
      text(ctx, c.a, c.x, y + 90, { size: 40, family: 'Serif', weight: 700, color: '#7a5a48' });
      text(ctx, c.b, c.x, y + 150, { size: 50, family: 'Head', weight: 900, color: '#3a2f3a' });
      ctx.restore();
    });
  }
  // 3. 每天同一个时机：三天的时间条，午饭那一格亮起
  const kd = ramp(t, L(4) - 0.2, L(4) + 0.4) * (1 - ramp(t, L(5) - 0.3, L(5) + 0.2));
  if (kd > 0) {
    ctx.save(); ctx.globalAlpha *= kd;
    ['第 1 天', '第 2 天', '第 3 天'].forEach((d, i) => {
      const tb = beatAfter(L(4), i);
      const k = ramp(t, tb, tb + 0.35, easeOut);
      const y = 340 + i * 170;
      ctx.save(); ctx.globalAlpha *= k;
      text(ctx, d, 400, y + 14, { size: 40, family: 'Serif', weight: 700, color: DIM, align: 'right' });
      const bg = ctx.createLinearGradient(460, 0, 1560, 0);
      bg.addColorStop(0, 'rgba(255,214,140,0.35)'); bg.addColorStop(0.5, 'rgba(255,240,200,0.45)'); bg.addColorStop(1, 'rgba(90,110,160,0.35)');
      ctx.fillStyle = bg; roundRect(ctx, 460, y - 26, 1100, 52, 26); ctx.fill();
      text(ctx, '早', 500, y + 12, { size: 30, family: 'Sans', weight: 700, color: 'rgba(60,40,30,0.7)' });
      text(ctx, '晚', 1520, y + 12, { size: 30, family: 'Sans', weight: 700, color: 'rgba(240,240,255,0.8)' });
      const lx = 1000;
      glowDot(ctx, lx, y, 90, CAT.eat, 0.45 * k);
      ICON.eat(ctx, lx, y - 4, 0.62 * clamp(pop(t, tb + 0.15)));
      ctx.restore();
    });
    text(ctx, '午饭', 1000, 860, { size: 44, family: 'Head', weight: 900, color: GOLD, alpha: ramp(t, beatAfter(L(4), 2), beatAfter(L(4), 2) + 0.4) });
    ctx.restore();
  }
  // 4. 手机上打卡 + 打分
  const kp = ramp(t, L(5) - 0.2, L(5) + 0.4) * (1 - ramp(t, L(8) - 0.3, L(8) + 0.2));
  if (kp > 0) {
    ctx.save(); ctx.globalAlpha *= kp;
    const px = 760, py = 500;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#2b2f3a'; roundRect(ctx, px - 200, py - 360, 400, 720, 48); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#f4ead7'; roundRect(ctx, px - 180, py - 330, 360, 660, 34); ctx.fill();
    text(ctx, '第 12 天', px, py - 250, { size: 40, family: 'Head', weight: 900, color: '#d9825b' });
    text(ctx, '昨天做了吗？', px, py - 160, { size: 42, family: 'Serif', weight: 700, color: '#3a2f3a', alpha: ramp(t, L(6) - 0.3, L(6)) });
    const tap = beatAfter(L(6), 2);
    [['做了', -80], ['没做', 80]].forEach(([lab, dx], i) => {
      const on = i === 0 ? ramp(t, tap, tap + 0.2) : 0;
      roundRect(ctx, px + dx - 68, py - 120, 136, 70, 35);
      ctx.fillStyle = on ? mix('#e8dcc4', '#ffcf6e', on) : '#e8dcc4'; ctx.fill();
      text(ctx, lab, px + dx, py - 72, { size: 36, family: 'Serif', weight: 700, color: '#3a2f3a', alpha: ramp(t, L(6) - 0.3, L(6)) });
    });
    if (t > tap) glowDot(ctx, px - 80, py - 85, 90 * (1 - prog(t, tap, tap + 0.6)) + 10, '#ffd27a', 0.6 * (1 - prog(t, tap, tap + 0.6)));
    // 打分滑条
    const ks = ramp(t, L(7) - 0.2, L(7) + 0.3);
    if (ks > 0) {
      ctx.save(); ctx.globalAlpha *= ks;
      text(ctx, '做的时候有多不用想？', px, py + 30, { size: 34, family: 'Serif', weight: 700, color: '#3a2f3a' });
      ctx.fillStyle = '#e0d2b8'; roundRect(ctx, px - 140, py + 90, 280, 18, 9); ctx.fill();
      const v = lerp(0, 0.62, ramp(t, L(7) + 0.3, L(7) + 1.4));
      ctx.fillStyle = '#ffb44a'; roundRect(ctx, px - 140, py + 90, 280 * v, 18, 9); ctx.fill();
      ctx.fillStyle = '#d9822b'; circle(ctx, px - 140 + 280 * v, py + 99, 20); ctx.fill();
      text(ctx, '0', px - 150, py + 160, { size: 30, family: 'Sans', weight: 700, color: '#7a5a48' });
      text(ctx, '42', px + 150, py + 160, { size: 30, family: 'Sans', weight: 700, color: '#7a5a48' });
      text(ctx, '7 道题，每题 0～6 分', px, py + 230, { size: 30, family: 'Sans', weight: 400, color: '#7a5a48' });
      ctx.restore();
    }
    // 右边的说明
    const items = [['“我做它是自动的”', L(7) + 0.4], ['“我做它不用想”', L(7) + 0.8], ['“不做反而难受”', L(7) + 1.2]];
    items.forEach(([s0, ta], i) => text(ctx, s0, 1360, 360 + i * 90, { size: 42, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, ta, ta + 0.4) }));
    text(ctx, '问卷里的几道题（意译）', 1360, 640, { size: 30, family: 'Sans', weight: 400, color: FAINT, alpha: ramp(t, L(7) + 1.4, L(7) + 1.8) });
    ctx.restore();
  }
  // 5. 84 天的日历
  const k84 = ramp(t, L(8) - 0.2, L(8) + 0.3) * (1 - ramp(t, L(9) + 0.3, L(9) + 0.9));
  if (k84 > 0) {
    const cell = 56, gap = 8, cols = 12;
    const fillT = i => L(8) + 0.2 + i * 0.022;
    const missDays = new Set([9, 23, 38, 51, 66, 70]);
    drawCalendar(ctx, 960 - (cols * cell + (cols - 1) * gap) / 2, 330, cell, 84, cols,
      i => missDays.has(i) ? { miss: ramp(t, fillT(i), fillT(i) + 0.2) } : { k: ramp(t, fillT(i), fillT(i) + 0.2) },
      { alpha: k84, title: '84 天', numbers: false });
    const n = Math.min(84, Math.max(0, Math.floor((t - L(8) - 0.2) / 0.022) + 1));
    richText(ctx, [['第 ', CREAM], [String(n), GOLD], [' 天', CREAM]], 1640, 560, { size: 64, family: 'Head', weight: 900, alpha: k84 * ramp(t, L(8), L(8) + 0.3), shadow: 16 });
  }
  // 6. 每天的打分点 → 曲线
  const kc2 = ramp(t, L(9), L(9) + 0.6);
  if (kc2 > 0) {
    drawAxes(ctx, 90, { alpha: kc2 });
    const { X, Y } = chartMap(90);
    S.dots.forEach(([d, v], i) => {
      const k = ramp(t, L(9) + 0.3 + d * 0.022, L(9) + 0.5 + d * 0.022);
      if (k <= 0) return;
      ctx.fillStyle = rgba('#fbf3e4', 0.75 * k); circle(ctx, X(d), Y(v), 7 * k); ctx.fill();
    });
    text(ctx, '示意：一个人每天的打分', CH.x1, CH.yb - 40, { size: 32, family: 'Sans', weight: 400, color: FAINT, align: 'right', alpha: kc2 });
    const kv = ramp(t, L(10), s.end + 0.5, x => x);
    drawVine(ctx, t, S.c.median, 8 * kv, 90, { alpha: kc2 });
  }
};

// 曲线场景共用：点、藤蔓
function chartBase(ctx, t, xmax, dEnd, o = {}) {
  const { dotsA = 1, alpha = 1 } = o;
  drawAxes(ctx, xmax, { alpha });
  const { X, Y } = chartMap(xmax);
  if (dotsA > 0) S.dots.forEach(([d, v]) => { ctx.fillStyle = rgba('#fbf3e4', 0.75 * dotsA * alpha); circle(ctx, X(d), Y(v), 7); ctx.fill(); });
  return drawVine(ctx, t, S.c.median, dEnd, xmax, { alpha });
}

SCENES.curve = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('curve', 1);
  const d = t < t1 ? lerp(8, 22, ramp(t, t0 - 0.4, t1 - 0.2)) : lerp(22, 84, ramp(t, t1, s.end + 0.3));
  chartBase(ctx, t, 90, d, { dotsA: 1 - 0.5 * ramp(t, t1, t1 + 1) });
  const { X, Y } = chartMap(90);
  const ka = ramp(t, t0 + 0.4, t0 + 0.9) * (1 - ramp(t, t1 + 0.6, t1 + 1.2));
  if (ka > 0) {
    text(ctx, '涨得快', X(12) + 100, Y(curveY(12, S.c.median)) + 60, { size: 54, family: 'Head', weight: 900, color: GOLD, alpha: ka, shadow: 12 });
  }
  const kf = ramp(t, t1 + 0.6, t1 + 1.2);
  if (kf > 0) text(ctx, '越来越平', X(60), Y(curveY(60, S.c.median)) + 100, { size: 54, family: 'Head', weight: 900, color: GOLD, alpha: kf, shadow: 12 });
};

SCENES.plateau = (ctx, t, s) => {
  const L = i => lineAt('plateau', i);
  const t4 = L(4);
  const xmax = lerp(90, 270, ramp(t, t4 - 0.2, t4 + 1.0));
  const { X, Y } = chartMap(xmax);
  // 观察期之外：曲线推算
  const kx = ramp(t, t4, t4 + 1.0);
  if (kx > 0) {
    ctx.save(); ctx.globalAlpha *= kx;
    ctx.fillStyle = 'rgba(160,190,220,0.07)'; ctx.fillRect(X(84), CH.yt - 30, X(xmax) - X(84) + 40, CH.yb - CH.yt + 30);
    ctx.strokeStyle = 'rgba(200,215,235,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(X(84), CH.yt - 30); ctx.lineTo(X(84), CH.yb); ctx.stroke();
    ctx.restore();
    text(ctx, '实验只记了 84 天', X(84) + 24, CH.yb - 80, { size: 32, family: 'Serif', weight: 700, color: 'rgba(210,222,240,0.85)', align: 'left', alpha: kx });
    text(ctx, '右边是按曲线往后推算的', X(84) + 24, CH.yb - 36, { size: 32, family: 'Serif', weight: 700, color: 'rgba(210,222,240,0.65)', align: 'left', alpha: kx });
  }
  const tip = chartBase(ctx, t, xmax, 84, { dotsA: 0.5 * (1 - kx) });
  // 平台线
  const kp = ramp(t, s.start, s.start + 0.8);
  ctx.save(); ctx.globalAlpha *= kp;
  ctx.strokeStyle = 'rgba(255,210,122,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.moveTo(CH.x0, Y(S.a)); ctx.lineTo(CH.x1 + 40, Y(S.a)); ctx.stroke();
  ctx.restore();
  text(ctx, '顶', CH.x1 + 70, Y(S.a) + 14, { size: 38, family: 'Head', weight: 900, color: GOLD, alpha: kp });
  // 66 天：到达平台 95% 的那天
  const d66 = S.t95.median;
  const km = ramp(t, s.start + 0.3, s.start + 1.3);
  const sweep = lerp(0, d66, km);
  marker(ctx, X(sweep), CH.yb, Y(curveY(sweep, S.c.median)) - 10, km > 0.98 ? '' : '', { alpha: km });
  flower(ctx, X(d66), Y(curveY(d66, S.c.median)) - 4, 26, ramp(t, s.start + 1.2, s.start + 1.8, easeBack));
  // 21 天在哪
  const k21 = ramp(t, L(1), L(1) + 0.6) * (1 - ramp(t, t4 - 0.3, t4 + 0.3));
  if (k21 > 0) {
    marker(ctx, X(21), CH.yb, Y(curveY(21, S.c.median)) - 10, '21 天', { alpha: k21 * 0.9, color: '#c9d3e0', size: 34 });
    ctx.fillStyle = rgba('#c9d3e0', k21); circle(ctx, X(21), Y(curveY(21, S.c.median)), 9); ctx.fill();
    text(ctx, '还在半山腰', X(21) + 20, Y(curveY(21, S.c.median)) + 60, { size: 34, family: 'Serif', weight: 700, color: '#c9d3e0', align: 'left', alpha: k21 * (1 - ramp(t, L(3) - 0.3, L(3))) });
  }
  // 大字 66 天
  const kb = ramp(t, L(2), L(2) + 0.4, easeOut) * (1 - ramp(t, L(3) - 0.2, L(3) + 0.3));
  const k66 = Math.max(kb, 0);
  if (km > 0) {
    const big = kb;
    const x = lerp(X(d66), 1230, big), y = lerp(Y(curveY(d66, S.c.median)) - 40, 640, big);
    ctx.save(); ctx.translate(x, y);
    const sc = lerp(0.3, 1, big) * (1 + 0.015 * barPulse(t));
    ctx.scale(sc, sc);
    richText(ctx, [['66', GOLD], [' 天', CREAM]], 0, 0, { size: 210, family: 'Head', weight: 900, alpha: ramp(t, s.start + 1.0, s.start + 1.4), shadow: 40 });
    ctx.restore();
    text(ctx, '39 位曲线拟合得好的人里，排在正中间的那个', 1230, 720, { size: 34, family: 'Serif', weight: 700, color: DIM, alpha: k66 });
    text(ctx, '“到顶”= 涨到平台的 95%', 1230, 772, { size: 30, family: 'Sans', weight: 400, color: FAINT, alpha: k66 });
  }
  // 最快 18 天
  const kf = ramp(t, L(3), L(3) + 0.4);
  if (kf > 0) {
    const df = lerp(0, 84, ramp(t, L(3), L(3) + 1.2, x => x));
    drawVine(ctx, t, S.c.fast, df, xmax, { alpha: kf, color: '#ffc36b', width: 5, leaves: false, glow: 0.8, tip: false });
    const k = ramp(t, L(3) + 0.5, L(3) + 0.9);
    marker(ctx, X(S.t95.fast), CH.yb, Y(curveY(S.t95.fast, S.c.fast)) - 70, '18 天', { alpha: k, color: '#ffc36b', size: 40 });
  }
  // 最慢 254 天（推算）
  if (kx > 0) {
    const ds = lerp(0, 262, ramp(t, t4 + 0.3, t4 + 1.6, x => x));
    drawVine(ctx, t, S.c.slow, ds, xmax, { alpha: kx, color: '#9fc3ff', width: 5, leaves: false, glow: 0.8, tip: false, dash: null });
    const k = ramp(t, t4 + 1.4, t4 + 1.8);
    marker(ctx, X(S.t95.slow), CH.yb, Y(curveY(S.t95.slow, S.c.slow)) - 20, '254 天', { alpha: k, color: '#9fc3ff', size: 40 });
  }
  text(ctx, '示意：按论文的曲线形式画，参数取中位数', CH.x0 + 10, CH.yt - 100, { size: 30, family: 'Sans', weight: 400, color: FAINT, align: 'left', alpha: kp });
};

SCENES.miss = (ctx, t, s) => {
  const L = i => lineAt('miss', i);
  const t0 = s.start;
  // 一周的打卡格：做、做、做、漏、做……（论文里“漏做”指连做 3 次之后的那一次没做）
  const cell = 120, gap = 16, x0 = 960 - (7 * cell + 6 * gap) / 2, y0 = 170;
  const kIn = ramp(t, t0 - 0.2, t0 + 0.5);
  const tickT = [t0 + 0.3, beatAfter(t0, 1), beatAfter(t0, 2)];
  drawCalendar(ctx, x0, y0, cell, 7, 7, i => {
    if (i < 3) return { k: ramp(t, tickT[i], tickT[i] + 0.25) };
    if (i === 3) return { miss: ramp(t, L(1) + 0.2, L(1) + 0.6) };
    if (i === 4) return { k: ramp(t, L(4) + 0.2, L(4) + 0.6) };
    if (i === 5) return { k: ramp(t, L(5) + 0.3, L(5) + 0.7) };
    return {};
  }, { alpha: kIn, numbers: false });
  // 放大看三个分数（示意，取论文的平均变化）
  const base = 24;
  const vals = [base, base - S.miss.drop, base + S.miss.rebound];
  const zx = [470, 820, 1170];
  const zY = v => 690 - (v - base) * 150;
  const kz = ramp(t, L(2) - 0.2, L(2) + 0.4);
  if (kz > 0) {
    ctx.save(); ctx.globalAlpha *= kz;
    ctx.fillStyle = 'rgba(251,243,228,0.05)'; roundRect(ctx, 300, 400, 1040, 500, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(251,243,228,0.22)'; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, '漏做前后，“不用想”的分数', 330, 450, { size: 32, family: 'Sans', weight: 700, color: DIM, align: 'left' });
    const shown = [1, ramp(t, L(2) + 0.2, L(2) + 0.6), ramp(t, L(4) + 0.4, L(4) + 0.9)];
    ctx.strokeStyle = 'rgba(143,214,160,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(zx[0], zY(vals[0]));
    if (shown[1] > 0) ctx.lineTo(lerp(zx[0], zx[1], shown[1]), lerp(zY(vals[0]), zY(vals[1]), shown[1]));
    if (shown[2] > 0) ctx.lineTo(lerp(zx[1], zx[2], shown[2]), lerp(zY(vals[1]), zY(vals[2]), shown[2]));
    ctx.stroke();
    const labels = ['漏做前', '漏做那天', '再做一天'];
    vals.forEach((v, i) => {
      if (shown[i] <= 0.99) return;
      ctx.fillStyle = i === 1 ? MISS : LEAF; circle(ctx, zx[i], zY(v), 16); ctx.fill();
      text(ctx, labels[i], zx[i], 870, { size: 36, family: 'Serif', weight: 700, color: DIM });
    });
    if (shown[1] > 0.99) text(ctx, `−${S.miss.drop}`, zx[1], zY(vals[1]) + 80, { size: 66, family: 'Head', weight: 900, color: GOLD, shadow: 12 });
    if (shown[2] > 0.99) {
      text(ctx, `+${S.miss.rebound}`, zx[2], zY(vals[2]) - 100, { size: 66, family: 'Head', weight: 900, color: GOLD, shadow: 12 });
      text(ctx, '比漏做前还高', zx[2], zY(vals[2]) - 42, { size: 34, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, L(5), L(5) + 0.5) });
    }
    ctx.restore();
  }
  // 满分 42 的尺子：0.29 只是顶上一条细线
  const kr = ramp(t, L(3) - 0.2, L(3) + 0.4);
  if (kr > 0) {
    ctx.save(); ctx.globalAlpha *= kr;
    const rx = 1700, ry0 = 860, ry1 = 400, Yr = v => lerp(ry0, ry1, v / S.max);
    ctx.fillStyle = 'rgba(251,243,228,0.12)'; roundRect(ctx, rx - 50, ry1, 100, ry0 - ry1, 16); ctx.fill();
    const g = ctx.createLinearGradient(0, ry0, 0, Yr(base));
    g.addColorStop(0, LEAF_D); g.addColorStop(1, LEAF);
    ctx.fillStyle = g; roundRect(ctx, rx - 50, Yr(base), 100, ry0 - Yr(base), [0, 0, 16, 16]); ctx.fill();
    const hh = Math.max(3, Yr(base - S.miss.drop) - Yr(base));
    ctx.fillStyle = GOLD; ctx.fillRect(rx - 62, Yr(base), 124, hh);
    glowDot(ctx, rx, Yr(base), 70, '#ffd27a', 0.45);
    text(ctx, '满分 42', rx, ry1 - 22, { size: 38, family: 'Head', weight: 900, color: CREAM });
    text(ctx, '0', rx, ry0 + 44, { size: 32, family: 'Sans', weight: 700, color: DIM });
    text(ctx, `掉的这一丝 = ${S.miss.drop}`, rx - 80, Yr(base) + 12, { size: 34, family: 'Serif', weight: 700, color: GOLD, align: 'right' });
    ctx.restore();
  }
  text(ctx, '示意：变化幅度取论文里的平均值', 1310, 450, { size: 28, family: 'Sans', weight: 400, color: FAINT, align: 'right', alpha: kz });
};

SCENES.turn = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('turn', 1);
  deskCal(ctx, t, () => ({ k: 1 }), { alpha: ramp(t, t0 - 0.3, t0 + 0.4) });
  // 21 天时，按 66 天那条示意曲线，大约长到顶的 S.at21.frac
  drawPot(ctx, 1420, 880, 1.75, t, { growth: 0.08 + 0.5 * S.at21.frac * ramp(t, t0, t0 + 1.2), mood: t > t1 ? 'line' : 'smile', glow: 0.4 });
  const kq = pop(t, t1 + 0.2);
  if (kq > 0) text(ctx, '…', 1640, 420, { size: 110, family: 'Head', weight: 900, color: CREAM, alpha: clamp(kq) });
};

SCENES.end = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('end', 1), t2 = lineAt('end', 2);
  const g = ramp(t, t0, t0 + 3.5, easeOut);
  // 日历继续往下长：中间漏了一天，后面接着打勾
  const cell = 70, gap = 9, x0 = 230, y0 = 240;
  const extra = Math.floor(ramp(t, t0 + 0.3, t2 + 1.2, x => x) * 28);
  const missAt = 21 + 9;
  drawCalendar(ctx, x0, y0, cell, 21 + Math.max(1, extra), 7, i => {
    if (i < 21) return { k: 1 };
    if (i === missAt) return { miss: ramp(t, t1 + 0.1, t1 + 0.5) };
    const ti = i < missAt ? t0 + 0.3 + (i - 20) * 0.35 : i === missAt + 1 ? t2 + 0.2 : t2 + 0.6 + (i - missAt - 2) * 0.3;
    return { k: ramp(t, ti, ti + 0.25) };
  }, { alpha: 1, numbers: false, title: '接着打卡' });
  const ks = ramp(t, t0, t0 + 0.6, easeOut);
  ctx.save();
  ctx.translate(1180, 250); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
  text(ctx, '它还在长', 0, 0, { size: 140, family: 'Head', weight: 900, color: GOLD, alpha: ks * (1 - 0.6 * ramp(t, t1, t1 + 0.8)), shadow: 40 });
  ctx.restore();
  const bloom = ramp(t, t2 + 0.4, t2 + 1.4, easeBack);
  drawPot(ctx, 1480, 920, 1.3, t, { growth: 0.08 + 0.5 * S.at21.frac + (0.92 - 0.5 * S.at21.frac) * g, mood: 'smile', bloom, glow: 0.5 + 0.4 * g + 0.3 * barPulse(t) });
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 20);
  drawCalendar(ctx, 110, 330, 70, 21, 7, () => ({ k: 1 }), { title: '21 天打卡', numbers: false });
  drawPot(ctx, 1520, 960, 1.15, 3, { growth: 0.35, mood: 'o', glow: 0.6 });
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(9,18,22,0.2)'); g.addColorStop(0.45, 'rgba(9,18,22,0.75)'); g.addColorStop(0.8, 'rgba(9,18,22,0.3)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  richText(ctx, [['21', GOLD], [' 天', CREAM]], 1100, 400, { size: 230, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '养成一个习惯？', 1100, 600, { size: 130, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  text(ctx, '有人认真记了 84 天', 1100, 740, { size: 64, family: 'Serif', weight: 700, color: LEAF, shadow: 20 });
}
