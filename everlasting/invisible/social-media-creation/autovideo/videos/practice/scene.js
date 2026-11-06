// 一万小时：画面
// 美术方向：夜里的山路。墨青色的夜空和山，一个提灯的小人沿着之字形山路往上走；
// “水平差异”画成 100 盏纸灯笼，被练习解释的那几盏点成琥珀色，其余是冷蓝色。
// 没有人声：字幕一出现，对应的变化就发生；曲子起势的 17.41 / 34.76 / 95.50 放大字。

const CREAM = '#fdf2df';
const GOLD = '#ffd27a';
const AMBER = '#ffad55';
const SLATE = '#7fa3bd';
const DIM = 'rgba(253,242,223,0.62)';
const INK = '#0b171c';

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
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.4, rgba(color, a * 0.35)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
}
const pop = (t, a, d = 0.4) => clamp(ramp(t, a, a + d, easeBack), 0, 1.2);
const fadeIn = (t, a, d = 0.5) => ramp(t, a, a + d);
const fadeOut = (t, a, d = 0.5) => 1 - ramp(t, a - d, a);

// ---------- 背景：墨青夜空、星星、远山、萤火 ----------
const STARS = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 110 }, () => ({ x: rnd() * W, y: rnd() * H * 0.62, r: 0.6 + rnd() * 1.6, ph: rnd() * 6, sp: 0.5 + rnd() * 1.5 }));
})();
const FLIES = (() => {
  const rnd = mulberry32(19);
  return Array.from({ length: 34 }, () => ({ x: rnd() * W, y: H * 0.35 + rnd() * H * 0.6, r: 1.5 + rnd() * 2.2, ph: rnd() * 6, ax: 20 + rnd() * 40, ay: 10 + rnd() * 25, sp: 0.15 + rnd() * 0.3 }));
})();
const warmth = t => ramp(t, TL.music.end - 14, TL.music.end - 8);

function ridge(ctx, y0, amp, seed, color) {
  const rnd = mulberry32(seed);
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) {
    const y = y0 - amp * (0.55 * Math.sin(x / 260 + ph[0]) + 0.3 * Math.sin(x / 120 + ph[1]) + 0.15 * Math.sin(x / 55 + ph[2]));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function drawBackground(ctx, t) {
  const w = warmth(t), lv = musicLevel(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#0f2430', '#2a2030', w));
  g.addColorStop(0.55, mix('#12262d', '#2e2228', w));
  g.addColorStop(1, mix('#081115', '#140c10', w));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 地平线附近的暖光
  glowDot(ctx, 960, 760, 900, '#ff9b52', 0.06 + 0.05 * lv + 0.08 * w);
  for (const s of STARS) {
    const a = (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * (0.7 + 0.5 * lv);
    ctx.fillStyle = `rgba(235,240,255,${clamp(a)})`;
    circle(ctx, s.x, s.y, s.r); ctx.fill();
  }
  ridge(ctx, 820, 70, 3, rgba('#16313a', 0.9));
  ridge(ctx, 900, 50, 5, rgba('#0f2229', 0.95));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of FLIES) {
    const x = f.x + Math.sin(t * f.sp + f.ph) * f.ax, y = f.y + Math.cos(t * f.sp * 1.3 + f.ph) * f.ay;
    const a = (0.12 + 0.35 * lv) * (0.5 + 0.5 * Math.sin(t * 1.7 + f.ph));
    glowDot(ctx, x, y, f.r * 6, '#ffc070', a);
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 520, 500, 960, 540, 1200);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.6), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 小人 ----------
// (x, y) 是脚底；s 缩放，整体约 130s 高。lantern: 0..1 灯笼亮度，<0 不拿灯
function drawWalker(ctx, x, y, s, o = {}) {
  const { phase = 0, alpha = 1, lantern = 1, cloak = '#b4583f', scarf = AMBER, violin = false, hold = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  const step = Math.sin(phase * Math.PI * 2), bob = Math.abs(Math.cos(phase * Math.PI * 2)) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 2, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
  // 腿
  ctx.fillStyle = '#2b1f24';
  for (const k of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(k * 9 + step * k * 6, -8, 7, 10, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, -bob);
  // 斗篷
  const cg = ctx.createLinearGradient(0, -70, 0, -6);
  cg.addColorStop(0, mix(cloak, '#ffffff', 0.12)); cg.addColorStop(1, mix(cloak, '#000000', 0.3));
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(-14, -72); ctx.quadraticCurveTo(-34, -30, -30, -10); ctx.quadraticCurveTo(0, -2, 30, -10);
  ctx.quadraticCurveTo(34, -30, 14, -72); ctx.closePath(); ctx.fill();
  // 头
  ctx.fillStyle = mix(cloak, '#000000', 0.15);
  circle(ctx, 0, -92, 30); ctx.fill();
  ctx.fillStyle = '#f6dcc4';
  ctx.beginPath(); ctx.ellipse(0, -88, 22, 21, 0, 0, Math.PI * 2); ctx.fill();
  // 兜帽尖
  ctx.fillStyle = mix(cloak, '#000000', 0.15);
  ctx.beginPath(); ctx.moveTo(-14, -118); ctx.quadraticCurveTo(4, -134, 22, -128); ctx.quadraticCurveTo(10, -120, 12, -112); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -104, 24, 10, 0, Math.PI, Math.PI * 2); ctx.fill();
  // 眼睛（弯弯的）、腮红
  ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  for (const sx of [-8, 8]) { ctx.beginPath(); ctx.arc(sx, -88, 4, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,120,110,0.35)';
  for (const sx of [-14, 14]) { ctx.beginPath(); ctx.ellipse(sx, -80, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  // 围巾
  ctx.fillStyle = scarf;
  roundRect(ctx, -18, -72, 36, 9, 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, -66); ctx.lineTo(-20, -44 + step * 2); ctx.lineTo(-11, -46); ctx.closePath(); ctx.fill();
  if (violin) {
    ctx.save(); ctx.translate(-10, -64); ctx.rotate(-0.5);
    ctx.fillStyle = '#9a5a2e';
    ctx.beginPath(); ctx.ellipse(-16, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3418'; ctx.fillRect(-2, -2, 26, 4);
    ctx.restore();
    ctx.strokeStyle = '#e8d6b0'; ctx.lineWidth = 2;
    const bw = Math.sin(phase * Math.PI * 2) * 10;
    ctx.beginPath(); ctx.moveTo(-34 + bw, -46); ctx.lineTo(10 + bw, -80); ctx.stroke();
  }
  if (lantern >= 0 && !violin) {
    // 杆和灯笼
    const lx = 44, ly = -64 + Math.sin(phase * Math.PI * 2 + 1) * 2 - hold * 30;
    ctx.strokeStyle = '#6b4a35'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(14, -44); ctx.lineTo(lx + 4, ly - 26); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(lx + 4, ly - 26); ctx.lineTo(lx + 4, ly - 12); ctx.stroke();
    drawLamp(ctx, lx + 4, ly, 11, { lit: lantern, color: AMBER, glow: 1.4 });
  }
  ctx.restore();
}

// 纸灯笼：中心 (x, y)，半宽 r；lit 0..1
function drawLamp(ctx, x, y, r, o = {}) {
  const { lit = 0, color = AMBER, glow = 1, alpha = 1 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (lit > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, x, y, r * 4.2 * glow, color, 0.32 * lit);
    ctx.restore();
  }
  const h = r * 1.25;
  const body = lit > 0 ? mix('#2a3a42', color, 0.25 + 0.75 * lit) : '#2a3a42';
  const g = ctx.createRadialGradient(x - r * 0.3, y - h * 0.3, r * 0.1, x, y, r * 1.3);
  g.addColorStop(0, lit > 0 ? mix(body, '#fff6dc', 0.55 * lit) : '#34474f');
  g.addColorStop(1, body);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, r, h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = lit > 0 ? rgba('#5a2e16', 0.35) : 'rgba(150,180,190,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(x, y, r * Math.abs(k) * 1.6 + 0.01, h, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = '#3b2a22';
  roundRect(ctx, x - r * 0.45, y - h - r * 0.22, r * 0.9, r * 0.3, r * 0.1); ctx.fill();
  roundRect(ctx, x - r * 0.45, y + h - r * 0.08, r * 0.9, r * 0.3, r * 0.1); ctx.fill();
  ctx.restore();
}

// ---------- 山和之字形山路 ----------
const MOUNT = [[0, 880], [320, 800], [700, 730], [1000, 590], [1250, 420], [1560, 228], [1760, 400], [1920, 480], [1920, 1080], [0, 1080]];
const PATH_PTS = [[-20, 960], [440, 885], [900, 900], [1240, 815], [1000, 735], [880, 675], [1100, 600], [1420, 520], [1330, 440], [1310, 395], [1470, 300], [1556, 246]];
const PATH = (() => {
  // Catmull-Rom 采样，再按弧长参数化
  const P = PATH_PTS, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 24; k++) {
      const u = k / 24, u2 = u * u, u3 = u2 * u;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  const len = [0];
  for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, len, total: len[len.length - 1] };
})();
function pathAt(u) {
  const d = clamp(u) * PATH.total, L = PATH.len;
  let i = 1; while (i < L.length - 1 && L[i] < d) i++;
  const k = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  const a = PATH.pts[i - 1], b = PATH.pts[i];
  return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), dir: b[0] >= a[0] ? 1 : -1, s: lerp(1.0, 0.42, clamp(u)) };
}
const MILES = [[0.25, '2500'], [0.5, '5000'], [0.75, '7500']];

function drawMountain(ctx, t, o = {}) {
  const { trail = 0, signs = 1, summit = 0, lamps = 0 } = o;
  // 山体
  const g = ctx.createLinearGradient(0, 228, 0, H);
  g.addColorStop(0, '#1c3a40'); g.addColorStop(1, '#0c1a1e');
  ctx.fillStyle = g;
  ctx.beginPath(); MOUNT.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#9fd0d0', 0.18); ctx.lineWidth = 3;
  ctx.beginPath(); MOUNT.slice(0, 8).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  // 山路
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = PATH.pts;
  for (let i = 1; i < pts.length; i++) {
    const u = PATH.len[i] / PATH.total;
    ctx.strokeStyle = mix('#1c3a40', '#d9c7a0', 0.2 + 0.12 * (1 - u));
    ctx.lineWidth = lerp(34, 10, u);
    ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke();
  }
  // 走过的路被照亮
  if (trail > 0) {
    ctx.save(); ctx.shadowColor = AMBER; ctx.shadowBlur = 18;
    for (let i = 1; i < pts.length; i++) {
      const u = PATH.len[i] / PATH.total;
      if (u > trail) break;
      ctx.strokeStyle = rgba('#ffc27a', 0.45);
      ctx.lineWidth = lerp(8, 3, u);
      ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke();
    }
    ctx.restore();
  }
  // 路边灯笼
  if (lamps > 0) {
    for (let k = 1; k <= 18; k++) {
      const u = k / 19, p = pathAt(u);
      const lit = ramp(lamps, u - 0.03, u + 0.02);
      drawLamp(ctx, p.x + 26 * p.s, p.y - 46 * p.s, 9 * p.s, { lit, alpha: 0.5 + 0.5 * lit });
    }
  }
  // 里程牌
  if (signs > 0) {
    for (const [u, label] of MILES) {
      const p = pathAt(u);
      drawSign(ctx, p.x - 40 * p.s, p.y - 4, p.s, label, { alpha: signs });
    }
  }
  // 山顶
  const top = pathAt(1);
  glowDot(ctx, top.x, top.y - 40, 160 + 120 * summit, '#ffd27a', 0.18 + 0.4 * summit);
  ctx.save(); ctx.translate(top.x, top.y);
  ctx.strokeStyle = '#d8c39a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke();
  ctx.fillStyle = mix('#c86a3a', GOLD, summit);
  const wv = Math.sin(t * 3) * 4;
  ctx.beginPath(); ctx.moveTo(0, -70); ctx.quadraticCurveTo(26, -62 + wv, 50, -58); ctx.quadraticCurveTo(26, -48 - wv, 0, -40); ctx.fill();
  ctx.restore();
}
function drawSign(ctx, x, y, s, label, o = {}) {
  const { alpha = 1, glow = 0, size = 26 } = o;
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(Math.max(s, 0.55), Math.max(s, 0.55));
  ctx.fillStyle = '#5a4030'; ctx.fillRect(-3, -48, 6, 48);
  font(ctx, size, 'Serif', 700);
  const w = ctx.measureText(label).width + 26;
  if (glow > 0) glowDot(ctx, 0, -62, w, GOLD, 0.5 * glow);
  ctx.fillStyle = mix('#d9c29a', '#ffe3a6', glow);
  roundRect(ctx, -w / 2, -58 - size, w, size + 12, 6); ctx.fill();
  text(ctx, label, 0, -54, { size, family: 'Serif', weight: 700, color: '#3a2a22' });
  ctx.restore();
}

// ---------- 100 盏灯笼 ----------
const GRID = { x: 560, y: 520, gap: 66, r: 20 };
function lampPos(i, g = GRID) {
  const r = Math.floor(i / 10), c = i % 10;
  return { x: g.x + (c - 4.5) * g.gap, y: g.y + (r - 4.5) * g.gap * 0.86 };
}
// state(i) -> {lit, color, alpha}
function drawGrid(ctx, t, state, g = GRID) {
  for (let i = 0; i < 100; i++) {
    const st = state(i);
    if (!st || st.alpha <= 0) continue;
    const p = lampPos(i, g);
    const sway = Math.sin(t * 1.3 + i * 0.7) * 1.5;
    drawLamp(ctx, p.x + sway, p.y, g.r * (st.scale || 1), st);
  }
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 0), t2 = lineAt('hook', 1), t3 = lineAt('hook', 2);
  const z = 1.06 - 0.06 * ramp(t, 0, 9, x => x);
  ctx.save(); ctx.translate(960, 600); ctx.scale(z, z); ctx.translate(-960, -600);
  drawMountain(ctx, t, { summit: ramp(t, t2, t2 + 0.8), trail: 0.04 + 0.05 * prog(t, 0, 9) });
  const top = pathAt(1);
  drawSign(ctx, top.x - 190, top.y + 70, 1, '10000 小时', { glow: ramp(t, t1, t1 + 0.6) * (0.7 + 0.3 * barPulse(t)), size: 40 });
  const u = 0.04 + 0.05 * prog(t, 0, 9), p = pathAt(u);
  drawWalker(ctx, p.x, p.y, p.s * 1.25, { phase: t * 0.9, lantern: 0.9 + 0.1 * beatPulse(t) });
  ctx.restore();
  // 山顶的问号
  const kq = pop(t, t3, 0.5);
  if (kq > 0) {
    const x = top.x * z + 960 * (1 - z) + 110, y = (top.y - 120) * z + 600 * (1 - z);
    text(ctx, '?', x, y, { size: 150 * kq, family: 'Head', weight: 900, color: GOLD, shadow: 40, alpha: clamp(kq) });
  }
  // 标题字
  const kt = fadeIn(t, t1 - 0.2, 0.6) * fadeOut(t, s.end, 0.5);
  text(ctx, '一万小时', 120, 250, { size: 120, family: 'Head', weight: 900, color: CREAM, align: 'left', alpha: kt, shadow: 30 });
  text(ctx, '= 高手？', 130, 360, { size: 72, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: fadeIn(t, t2, 0.5) * fadeOut(t, s.end, 0.5), shadow: 20 });
};

function drawBook(ctx, x, y, s, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.05);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.fillStyle = '#e9dcc0'; roundRect(ctx, -150, -210, 300, 420, 10); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#c2472f'; ctx.fillRect(-150, -210, 300, 150);
  ctx.fillStyle = '#d6c7a6'; ctx.fillRect(-150, -210, 18, 420);
  text(ctx, 'OUTLIERS', 10, -120, { size: 46, family: 'Serif', weight: 700, color: '#fdf2df', spacing: 4 });
  text(ctx, '异类', 10, 40, { size: 110, family: 'Head', weight: 900, color: '#2c2420' });
  text(ctx, 'Malcolm Gladwell', 10, 120, { size: 26, family: 'Serif', weight: 400, color: '#5a4a40' });
  text(ctx, '2008', 10, 172, { size: 30, family: 'Serif', weight: 700, color: '#c2472f' });
  ctx.restore();
}

const GROUPS = [{ name: '最好的', col: '#d0703f' }, { name: '好的', col: '#8d7a9c' }, { name: '未来的音乐老师', col: '#5f8a8f' }];
SCENES.origin = (ctx, t, s) => {
  const t0 = lineAt('origin', 0), t1 = lineAt('origin', 1), t2 = lineAt('origin', 2), t3 = lineAt('origin', 3);
  // 书
  const kb = ramp(t, t0, t0 + 0.6, easeOut);
  const bm = ramp(t, t1, t1 + 0.7);
  drawBook(ctx, lerp(960, 330, bm), lerp(470 + 40 * (1 - kb), 380, bm), lerp(1, 0.62, bm), kb * (1 - ramp(t, t2, t2 + 0.6)));
  // 1993 卡片
  const kc = ramp(t, t1, t1 + 0.6, easeOut) * (1 - ramp(t, t2, t2 + 0.6));
  if (kc > 0) {
    text(ctx, '1993', 1160, 430, { size: 210, family: 'Head', weight: 900, color: GOLD, alpha: kc, shadow: 30 });
    text(ctx, 'Ericsson, Krampe & Tesch-Römer', 1160, 510, { size: 36, family: 'Serif', weight: 400, color: DIM, alpha: kc });
    text(ctx, '《心理学评论》', 1160, 565, { size: 34, family: 'Serif', weight: 700, color: DIM, alpha: kc });
    ctx.save(); ctx.translate(820, 300); ctx.rotate(-0.2); ctx.scale(1.6, 1.6);
    drawViolinIcon(ctx, kc); ctx.restore();
  }
  // 三组小提琴学生
  const kg = ramp(t, t2, t2 + 0.6);
  if (kg <= 0) return;
  text(ctx, '柏林 · 音乐学院 · 小提琴', 960, 200, { size: 44, family: 'Serif', weight: 700, color: DIM, alpha: kg * (1 - ramp(t, t3, t3 + 0.5)) });
  const focus = ramp(t, t3, t3 + 0.6);
  GROUPS.forEach((gr, gi) => {
    const cx = 960 + (gi - 1) * 560;
    const kk = ramp(t, beatAfter(t2, gi), beatAfter(t2, gi) + 0.5, easeOut);
    const a = kk * (gi === 0 ? 1 : 1 - 0.75 * focus);
    const sc = gi === 0 ? 1 + 0.15 * focus : 1;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(cx + (gi === 0 ? 260 * focus : 0), 640); ctx.scale(sc, sc);
    if (gi === 0 && focus > 0) glowDot(ctx, 0, -60, 330, AMBER, 0.25 * focus * (0.8 + 0.2 * barPulse(t)));
    for (let k = 0; k < 10; k++) {
      const row = k < 5 ? 0 : 1, col = k % 5;
      const x = (col - 2) * 78 + row * 36 - 18, y = row * 90 - 60;
      drawWalker(ctx, x, y, 0.72, { violin: true, cloak: gr.col, scarf: mix(gr.col, '#ffffff', 0.4), phase: t * 0.6 + k * 0.37, lantern: -1 });
    }
    text(ctx, gr.name, 0, 150, { size: 44, family: 'Head', weight: 900, color: gi === 0 ? GOLD : CREAM });
    ctx.restore();
  });
};
function drawViolinIcon(ctx, a) {
  ctx.save(); ctx.globalAlpha *= a * 0.9;
  ctx.fillStyle = '#a65f2c';
  ctx.beginPath(); ctx.ellipse(0, 30, 34, 40, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -30, 28, 32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b3416'; ctx.fillRect(-5, -110, 10, 120);
  ctx.beginPath(); ctx.arc(0, -116, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b2210';
  ctx.beginPath(); ctx.ellipse(-12, 4, 3, 12, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(12, 4, 3, 12, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 那一组 10 个人各自的练习时长（千小时）：论文没公布个人数值，这里是示意，只保证均值约一万、一半不到一万
const TEN = [11.9, 8.5, 14.6, 9.6, 10.4, 7.9, 12.8, 9.0, 11.2, 6.3];
SCENES.tenk = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('tenk', 1), t2 = lineAt('tenk', 2), t3 = lineAt('tenk', 3), t4 = lineAt('tenk', 4);
  // 起势：计数器滚到 10000
  const up = ramp(t, t1 - 0.2, t1 + 0.6);
  const kn = ramp(t, t0, t0 + 1.6, easeOut);
  const n = Math.round(10000 * kn / 10) * 10;
  const pulse = 0.015 * barPulse(t);
  ctx.save();
  ctx.translate(960, lerp(520, 170, up)); const sc = lerp(1, 0.42, up) * (0.9 + 0.1 * ramp(t, t0, t0 + 0.8, easeOut) + pulse); ctx.scale(sc, sc);
  glowDot(ctx, 0, -60, 520, AMBER, 0.22 * (1 - up) * (0.8 + 0.2 * barPulse(t)));
  richText(ctx, [[n.toLocaleString('en-US'), GOLD], [' 小时', CREAM]], 0, 0, { size: 200, family: 'Head', weight: 900, alpha: ramp(t, t0 - 0.1, t0 + 0.3), shadow: 40 });
  ctx.restore();
  text(ctx, '最好的那组 · 到 20 岁时的平均累计练习', 960, 640, { size: 46, family: 'Serif', weight: 700, color: DIM, alpha: fadeIn(t, t0 + 0.6, 0.6) * (1 - up) });
  // 10 个人的柱子
  const kr = ramp(t, t1, t1 + 0.6);
  if (kr <= 0) return;
  const base = 860, ppk = 34, x0 = 960 - 4.5 * 150;
  const yLine = base - 10 * ppk;
  const below = ramp(t, t3, t3 + 0.6);
  ctx.save(); ctx.globalAlpha *= kr * (1 - ramp(t, t4, t4 + 0.6) * 0.8);
  TEN.forEach((v, i) => {
    const x = x0 + i * 150;
    const tb = beatAfter(t1, Math.floor(i / 3));
    const kh = ramp(t, tb, tb + 0.8, easeOut);
    const under = v < 10;
    const col = under ? mix(AMBER, SLATE, below) : AMBER;
    const hl = ramp(t, beatAfter(t2, Math.floor(i * 0.4)), beatAfter(t2, Math.floor(i * 0.4)) + 0.3);
    const h = v * ppk * kh;
    const g = ctx.createLinearGradient(0, base - h, 0, base);
    g.addColorStop(0, rgba(col, 0.95)); g.addColorStop(1, rgba(col, 0.2));
    ctx.fillStyle = g; roundRect(ctx, x - 34, base - h, 68, h, [10, 10, 0, 0]); ctx.fill();
    drawWalker(ctx, x, base - h - 2, 0.55, { violin: true, cloak: under ? mix('#d0703f', '#5f7f90', below) : '#d0703f', scarf: '#f3c79a', phase: t * 0.7 + i * 0.4, lantern: -1, alpha: 0.6 + 0.4 * hl * (under ? 1 - 0.5 * below : 1) });
    text(ctx, String(i + 1), x, base + 44, { size: 32, family: 'Serif', weight: 700, color: DIM, alpha: hl });
  });
  // 一万小时线
  ctx.strokeStyle = rgba(GOLD, 0.85); ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.moveTo(x0 - 80, yLine); ctx.lineTo(x0 + 9 * 150 + 80, yLine); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, '10000', x0 - 100, yLine + 12, { size: 34, family: 'Serif', weight: 700, color: GOLD, align: 'right' });
  ctx.fillStyle = 'rgba(253,242,223,0.3)'; ctx.fillRect(x0 - 80, base, 9 * 150 + 160, 2);
  text(ctx, '个人数值为示意', x0 - 60, base + 44, { size: 28, family: 'Sans', weight: 400, color: DIM, align: 'right' });
  if (below > 0) {
    richText(ctx, [['5 人', SLATE], [' 不到一万小时', CREAM]], 1520, 330, { size: 58, family: 'Head', weight: 900, alpha: below * (1 - ramp(t, t4, t4 + 0.5)) });
  }
  ctx.restore();
  // 作者的原话
  const kq = ramp(t, t4, t4 + 0.6, easeOut);
  if (kq > 0) {
    ctx.save(); ctx.globalAlpha *= kq;
    ctx.fillStyle = 'rgba(12,24,28,0.82)'; roundRect(ctx, 460, 360 + 20 * (1 - kq), 1000, 300, 24); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.4); ctx.lineWidth = 2; ctx.stroke();
    text(ctx, '“一万小时这个数，', 960, 470 + 20 * (1 - kq), { size: 62, family: 'Head', weight: 900, color: CREAM });
    text(ctx, '没什么特别或神奇的。”', 960, 560 + 20 * (1 - kq), { size: 62, family: 'Head', weight: 900, color: GOLD });
    text(ctx, 'Ericsson & Pool《刻意练习》2016', 960, 625 + 20 * (1 - kq), { size: 30, family: 'Serif', weight: 400, color: DIM });
    ctx.restore();
  }
};

// 论文卡片：88 张从四面飞来，排成 11×8
const PAPERS = (() => {
  const rnd = mulberry32(88);
  return Array.from({ length: 88 }, (_, i) => {
    const ang = rnd() * Math.PI * 2;
    return { sx: 960 + Math.cos(ang) * 1300, sy: 540 + Math.sin(ang) * 900, rot: (rnd() - 0.5) * 1.2, d: rnd() * 1.4, c: i % 11, r: Math.floor(i / 11) };
  });
})();
function paperPos(p) { return { x: 960 + (p.c - 5) * 120, y: 170 + p.r * 86 }; }
function drawPaper(ctx, x, y, rot, a, hot = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = mix('#cdbf9f', '#ffe2a8', hot); roundRect(ctx, -30, -38, 60, 76, 4); ctx.fill();
  ctx.fillStyle = 'rgba(60,45,35,0.45)';
  for (let k = 0; k < 5; k++) ctx.fillRect(-20, -24 + k * 11, k === 0 ? 40 : 32 - (k % 2) * 8, 4);
  ctx.restore();
}

SCENES.ask = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('ask', 1);
  const ka = ramp(t, t0, t0 + 0.6, easeOut) * (1 - ramp(t, t1, t1 + 0.6));
  if (ka > 0) {
    // 练习 → 水平 ?
    richText(ctx, [['练习', AMBER], ['  →  ', DIM], ['水平', CREAM]], 960, 520, { size: 120, family: 'Head', weight: 900, alpha: ka, shadow: 30 });
    text(ctx, '?', 960, 380, { size: 130 * clamp(pop(t, t0 + 0.4, 0.5)), family: 'Head', weight: 900, color: GOLD, alpha: ka, shadow: 30 });
  }
  // 论文从四面飞进来
  for (const p of PAPERS) {
    const ts = t1 + p.d * 0.9;
    const k = ramp(t, ts, ts + 1.2, easeOut);
    if (k <= 0) continue;
    const q = paperPos(p);
    drawPaper(ctx, lerp(p.sx, q.x, k), lerp(p.sy, q.y, k), p.rot * (1 - k), 0.9 * clamp(k * 3));
  }
};

const SIM = DATA.sim;
const PLOT = { x0: 330, x1: 1590, y0: 860, y1: 170 };
const PX = v => lerp(PLOT.x0, PLOT.x1, (v + 3) / 6), PY = v => lerp(PLOT.y0, PLOT.y1, (v + 3) / 6);

SCENES.meta = (ctx, t, s) => {
  const t0 = s.start, L = i => lineAt('meta', i);
  // 1. 88 项研究：论文排好，中间大字
  const kp = 1 - ramp(t, L(2) - 0.2, L(2) + 0.5);
  if (kp > 0) {
    for (const p of PAPERS) {
      const q = paperPos(p);
      const lit = ramp(t, t0 + p.d * 0.5, t0 + p.d * 0.5 + 0.3);
      drawPaper(ctx, q.x, q.y + Math.sin(t + p.c) * 2, 0, 0.9 * kp * (1 - 0.55 * ramp(t, t0, t0 + 0.4)), lit * 0.5);
    }
    ctx.fillStyle = `rgba(8,16,20,${0.55 * kp * ramp(t, t0, t0 + 0.4)})`; ctx.fillRect(0, 0, W, H);
    const kn = ramp(t, t0, t0 + 1.0, easeOut);
    const sc = 0.9 + 0.1 * ramp(t, t0, t0 + 0.6, easeOut) + 0.015 * barPulse(t);
    ctx.save(); ctx.translate(960, 500); ctx.scale(sc, sc);
    glowDot(ctx, 0, -60, 460, AMBER, 0.25 * kp);
    richText(ctx, [[String(Math.round(88 * kn)), GOLD], [' 项研究', CREAM]], 0, 0, { size: 190, family: 'Head', weight: 900, alpha: kp * ramp(t, t0 - 0.1, t0 + 0.2), shadow: 40 });
    ctx.restore();
    text(ctx, 'Macnamara, Hambrick & Oswald · 2014 元分析', 960, 600, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: kp * fadeIn(t, t0 + 0.8) });
    const kc = pop(t, L(1), 0.45);
    [['157', '组数据'], ['11135', '人']].forEach(([a, b], i) => {
      const k = i ? pop(t, beatAfter(L(1), 1), 0.45) : kc;
      if (k <= 0) return;
      const x = 960 + (i ? 230 : -230), y = 760;
      ctx.save(); ctx.globalAlpha *= clamp(k) * kp; ctx.translate(x, y); ctx.scale(clamp(k, 0, 1.2), clamp(k, 0, 1.2));
      ctx.fillStyle = 'rgba(255,173,85,0.12)'; roundRect(ctx, -200, -62, 400, 110, 55); ctx.fill();
      ctx.strokeStyle = rgba(AMBER, 0.5); ctx.lineWidth = 2; ctx.stroke();
      richText(ctx, [[a, GOLD], [' ' + b, CREAM]], 0, 18, { size: 60, family: 'Head', weight: 900 });
      ctx.restore();
    });
  }
  // 2. 100 盏灯
  const kg = ramp(t, L(2), L(2) + 0.6) * (1 - ramp(t, L(8) - 0.3, L(8) + 0.4));
  if (kg > 0) {
    const n14 = L(5), n86 = L(6);
    ctx.save(); ctx.globalAlpha *= kg;
    text(ctx, '人和人的水平差异', GRID.x, 175, { size: 46, family: 'Head', weight: 900, color: CREAM, alpha: fadeIn(t, L(2), 0.5) });
    drawGrid(ctx, t, i => {
      const r = Math.floor(i / 10);
      const tin = beatAfter(L(3), Math.floor(r / 2.5)) + (i % 10) * 0.025;
      const a = Math.max(0.18 * ramp(t, L(2) + 0.2, L(2) + 1.0), ramp(t, tin, tin + 0.35));
      const t14 = beatAfter(n14, Math.floor(i / 4)) + (i % 4) * 0.06;
      const is14 = i < 14;
      const doubt = t > L(4) && t < n14 ? 0.15 + 0.15 * Math.sin(t * 9 + i) : 0;
      if (is14) {
        const lit = ramp(t, t14, t14 + 0.25);
        return { alpha: a, lit: Math.max(lit, doubt), color: AMBER, glow: 1 + 0.3 * beatPulse(t) * lit };
      }
      const t86 = n86 + ((i * 37) % 86) / 86 * 1.2;
      const lit = ramp(t, t86, t86 + 0.3) * (0.55 + 0.25 * ramp(t, L(7), L(7) + 0.5) * (0.5 + 0.5 * Math.sin(t * 3 + i)));
      return { alpha: a, lit: Math.max(lit, doubt), color: lit > doubt ? SLATE : AMBER, glow: 0.8 };
    });
    // 右侧数字
    const k14 = pop(t, n14, 0.5);
    if (k14 > 0) {
      ctx.save(); ctx.translate(1420, 450); ctx.scale(clamp(k14, 0, 1.2), clamp(k14, 0, 1.2));
      glowDot(ctx, 0, -70, 300, AMBER, 0.25);
      text(ctx, '14%', 0, 0, { size: 230, family: 'Head', weight: 900, color: GOLD, shadow: 40 });
      ctx.restore();
      text(ctx, '练习量能解释的部分', 1420, 520, { size: 44, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(k14) });
      text(ctx, '2018 年作者更正后的结果（原文为 12%）', 1420, 568, { size: 28, family: 'Sans', weight: 400, color: DIM, alpha: clamp(k14) });
    }
    const k86 = ramp(t, n86, n86 + 0.6, easeOut);
    if (k86 > 0) {
      text(ctx, '86%', 1420, 720, { size: 130, family: 'Head', weight: 900, color: SLATE, alpha: k86, shadow: 20 });
      text(ctx, '练习以外', 1420, 790, { size: 44, family: 'Serif', weight: 700, color: CREAM, alpha: k86 });
    }
    if (t > L(4) && t < n14 + 0.3) {
      text(ctx, '练习能点亮几盏？', 1420, 470, { size: 60, family: 'Head', weight: 900, color: CREAM, alpha: fadeIn(t, L(4), 0.4) * fadeOut(t, n14 + 0.3, 0.3) });
    }
    ctx.restore();
  }
  // 3. 散点：练得差不多的人
  const ks = ramp(t, L(8), L(8) + 0.6);
  if (ks <= 0) return;
  ctx.save(); ctx.globalAlpha *= ks;
  ctx.strokeStyle = 'rgba(253,242,223,0.45)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(PLOT.x0, PLOT.y1 - 20); ctx.lineTo(PLOT.x0, PLOT.y0); ctx.lineTo(PLOT.x1 + 20, PLOT.y0); ctx.stroke();
  text(ctx, '练习量 →', PLOT.x1, PLOT.y0 + 52, { size: 38, family: 'Serif', weight: 700, color: CREAM, align: 'right' });
  ctx.save(); ctx.translate(PLOT.x0 - 30, PLOT.y1 + 60); ctx.rotate(-Math.PI / 2);
  text(ctx, '水平 →', 0, 0, { size: 38, family: 'Serif', weight: 700, color: CREAM, align: 'right' });
  ctx.restore();
  const [b0, b1] = SIM.band;
  const kb = ramp(t, L(8) + 0.5, L(8) + 1.1);
  ctx.fillStyle = rgba(AMBER, 0.1 * kb);
  ctx.fillRect(PX(b0), PLOT.y1 - 10, PX(b1) - PX(b0), PLOT.y0 - PLOT.y1 + 10);
  SIM.points.forEach(([x, y], i) => {
    const inb = x >= b0 && x <= b1;
    const ti = L(8) + (i / SIM.points.length) * 0.8;
    const a = ramp(t, ti, ti + 0.2);
    const px = PX(clamp(x, -2.9, 2.9)), py = PY(clamp(y, -2.9, 2.9));
    if (inb && kb > 0) glowDot(ctx, px, py, 26, AMBER, 0.35 * kb);
    circle(ctx, px, py, inb ? 9 : 7);
    ctx.fillStyle = inb ? rgba(mix(SLATE, AMBER, kb), a) : rgba(SLATE, a * (1 - 0.45 * kb));
    ctx.fill();
  });
  // 一大截：从最低到最高的箭头
  const kr = ramp(t, L(9), L(9) + 0.8, easeOut);
  if (kr > 0) {
    const xa = PX(b1) + 40, ylo = PY(SIM.band_ymin), yhi = PY(SIM.band_ymax);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(xa, ylo); ctx.lineTo(xa, lerp(ylo, yhi, kr)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xa - 16, ylo); ctx.lineTo(xa + 16, ylo); ctx.stroke();
    if (kr > 0.95) { ctx.beginPath(); ctx.moveTo(xa - 16, yhi); ctx.lineTo(xa + 16, yhi); ctx.stroke(); }
    ctx.shadowBlur = 0;
    text(ctx, '差出一大截', xa + 36, (ylo + yhi) / 2 + 18, { size: 54, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: kr });
  }
  text(ctx, `练习量差不多的 ${SIM.band_n} 个人`, (PX(b0) + PX(b1)) / 2, PLOT.y1 - 30, { size: 34, family: 'Serif', weight: 700, color: AMBER, alpha: kb });
  text(ctx, `模拟示意：按相关系数 ${SIM.r_target} 随机生成 ${SIM.n} 人`, PLOT.x0, PLOT.y0 + 52, { size: 28, family: 'Sans', weight: 400, color: DIM, align: 'left' });
  ctx.restore();
};

// 五个领域（2018 年更正后的数值，单位 %）
const DOMS = [
  { name: '棋类等游戏', v: 24, icon: 'knight' },
  { name: '音乐', v: 23, icon: 'note' },
  { name: '体育', v: 20, icon: 'ball' },
  { name: '教育', v: 5, icon: 'book' },
  { name: '职业', v: 1, icon: 'case' },
];
function drawIcon(ctx, kind, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'knight') {
    ctx.beginPath();
    ctx.moveTo(-18, 26); ctx.lineTo(20, 26); ctx.lineTo(16, 4); ctx.quadraticCurveTo(22, -14, 8, -26);
    ctx.lineTo(4, -32); ctx.lineTo(-2, -24); ctx.quadraticCurveTo(-20, -18, -22, -2); ctx.lineTo(-10, 0); ctx.lineTo(-4, -6);
    ctx.quadraticCurveTo(-6, 10, -18, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = INK; circle(ctx, 2, -14, 3); ctx.fill();
  } else if (kind === 'note') {
    ctx.beginPath(); ctx.ellipse(-10, 18, 12, 9, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(0, -28, 4, 46);
    ctx.beginPath(); ctx.moveTo(4, -28); ctx.quadraticCurveTo(22, -20, 18, -2); ctx.quadraticCurveTo(16, -14, 4, -14); ctx.fill();
  } else if (kind === 'ball') {
    circle(ctx, 0, 0, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 26, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === 'book') {
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(-14, -26, -30, -20); ctx.lineTo(-30, 20); ctx.quadraticCurveTo(-14, 14, 0, 22);
    ctx.quadraticCurveTo(14, 14, 30, 20); ctx.lineTo(30, -20); ctx.quadraticCurveTo(14, -26, 0, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 22); ctx.stroke();
  } else {
    roundRect(ctx, -28, -14, 56, 38, 6); ctx.stroke();
    roundRect(ctx, -10, -24, 20, 12, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-28, 2); ctx.lineTo(28, 2); ctx.stroke();
  }
  ctx.restore();
}
const BAR = { x0: 620, x1: 1440, y: i => 220 + i * 140, h: 46 };
const PCT = v => (v / 100) * (BAR.x1 - BAR.x0) * 2.4; // 24% 约占轨道的 58%，小数值也看得清差别
function drawTrack(ctx, y, a, fillPct, col = AMBER, restA = 0) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(127,163,189,0.14)'; roundRect(ctx, BAR.x0, y - BAR.h / 2, BAR.x1 - BAR.x0, BAR.h, BAR.h / 2); ctx.fill();
  if (restA > 0) { ctx.fillStyle = rgba(SLATE, 0.28 * restA); roundRect(ctx, BAR.x0, y - BAR.h / 2, BAR.x1 - BAR.x0, BAR.h, BAR.h / 2); ctx.fill(); }
  if (fillPct > 0) {
    const w = Math.max(BAR.h * 0.35, PCT(fillPct));
    const g = ctx.createLinearGradient(BAR.x0, 0, BAR.x0 + w, 0);
    g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(1, col);
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 20;
    ctx.fillStyle = g; roundRect(ctx, BAR.x0, y - BAR.h / 2, w, BAR.h, BAR.h / 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

SCENES.split = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('split', 1);
  // 总体 14% 的一条，裂成五条
  const kin = ramp(t, t0 - 0.2, t0 + 0.6, easeOut);
  const ks = ramp(t, t1, t1 + 0.9, easeInOut);
  text(ctx, '总体', BAR.x0 - 40, 540 + 16, { size: 50, family: 'Head', weight: 900, color: CREAM, align: 'right', alpha: kin * (1 - ks) });
  text(ctx, '14%', BAR.x1 + 40, 540 + 26, { size: 90, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: kin * (1 - ks), shadow: 20 });
  DOMS.forEach((d, i) => {
    const y = lerp(540, BAR.y(i), ks);
    drawTrack(ctx, y, kin * (i === 0 ? 1 : ks), lerp(14, 0, ks) * ramp(t, t0, t0 + 0.8), AMBER, 0);
    drawIcon(ctx, d.icon, BAR.x0 - 300, y, 1.1, rgba(CREAM, ks));
    text(ctx, d.name, BAR.x0 - 40, y + 16, { size: 46, family: 'Head', weight: 900, color: CREAM, align: 'right', alpha: ks });
  });
};

SCENES.domains = (ctx, t, s) => {
  const L = i => lineAt('domains', i), tP = L(5);
  const dim = ramp(t, tP, tP + 0.5);
  DOMS.forEach((d, i) => {
    const y = BAR.y(i), tb = L(i);
    const kf = ramp(t, tb, tb + 0.9, easeOut);
    const hot = window01(t, tb, tb + 2.1, 0.3);
    const a = 1 - 0.7 * dim;
    drawTrack(ctx, y, a, d.v * kf, AMBER, 0);
    drawIcon(ctx, d.icon, BAR.x0 - 300, y, 1.1 + 0.1 * hot, rgba(mix(CREAM, GOLD, hot), a));
    text(ctx, d.name, BAR.x0 - 40, y + 16, { size: 46, family: 'Head', weight: 900, color: mix(CREAM, GOLD, hot), align: 'right', alpha: a });
    const kn = pop(t, tb + 0.15, 0.45);
    if (kn > 0) {
      const x = BAR.x0 + Math.max(BAR.h * 0.35, PCT(d.v)) + 24;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + 26); ctx.scale(clamp(kn, 0, 1.2), clamp(kn, 0, 1.2));
      text(ctx, `${d.v}%`, 0, 0, { size: 84 + 20 * hot, family: 'Head', weight: 900, color: GOLD, align: 'left', shadow: 20 });
      ctx.restore();
    }
    if (i === 4 && t > tb + 0.6) text(ctx, '统计上不显著', BAR.x1, y + 16, { size: 30, family: 'Sans', weight: 400, color: DIM, align: 'right', alpha: fadeIn(t, tb + 0.6) * a });
  });
  text(ctx, '练习量能解释的水平差异', BAR.x1, 120, { size: 32, family: 'Serif', weight: 700, color: DIM, align: 'right', alpha: fadeIn(t, s.start, 0.6) * (1 - dim) });
  // 按任务的“可预测性”分组
  if (dim > 0) {
    ctx.save(); ctx.globalAlpha *= dim;
    ctx.fillStyle = 'rgba(10,22,26,0.96)'; roundRect(ctx, 320, 150, 1280, 720, 30); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.35); ctx.lineWidth = 2; ctx.stroke();
    text(ctx, '按任务环境的可预测性分组', 960, 225, { size: 34, family: 'Serif', weight: 700, color: DIM });
    const rows = [['规则稳定，如跑步', 23, AMBER], ['中等，如击剑', 14, mix(AMBER, SLATE, 0.5)], ['多变，如处理飞行紧急情况', 6, SLATE]];
    rows.forEach(([name, v, col], i) => {
      const y = 360 + i * 185, k = ramp(t, tP + 0.2 + i * 0.3, tP + 1.0 + i * 0.3, easeOut);
      text(ctx, name, 460, y - 40, { size: 46, family: 'Head', weight: 900, color: CREAM, align: 'left' });
      ctx.fillStyle = 'rgba(127,163,189,0.14)'; roundRect(ctx, 460, y, 800, 46, 23); ctx.fill();
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.fillStyle = col;
      roundRect(ctx, 460, y, Math.max(16, 800 * v / 100 * 2.4 * k), 46, 23); ctx.fill(); ctx.restore();
      text(ctx, `${Math.round(v * k)}%`, 1300, y + 40, { size: 96, family: 'Head', weight: 900, color: i === 2 ? SLATE : GOLD, align: 'left', shadow: 16 });
    });
    ctx.restore();
  }
};

SCENES.fair = (ctx, t, s) => {
  const L = i => lineAt('fair', i);
  // Ericsson 的卡片
  const ke = ramp(t, L(0), L(0) + 0.6, easeOut) * (1 - ramp(t, L(4) - 0.4, L(4) + 0.2));
  if (ke > 0) {
    ctx.save(); ctx.globalAlpha *= ke;
    const mv = ramp(t, L(2), L(2) + 0.8);
    const cx = lerp(960, 380, mv), cy = lerp(470, 470, mv);
    ctx.fillStyle = 'rgba(253,242,223,0.06)'; circle(ctx, cx, cy - 40, 150); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.35); ctx.lineWidth = 2; ctx.stroke();
    drawProf(ctx, cx, cy + 60, 1.25, t);
    text(ctx, 'K. Anders Ericsson', cx, cy + 180, { size: 44, family: 'Serif', weight: 700, color: CREAM, alpha: fadeIn(t, L(1), 0.5) });
    text(ctx, '“刻意练习”的提出者', cx, cy + 232, { size: 34, family: 'Serif', weight: 400, color: DIM, alpha: fadeIn(t, L(1), 0.5) });
    // 两个圈：宽泛的练习 vs 严格的刻意练习
    const kc = ramp(t, L(2), L(2) + 0.8, easeOut);
    if (kc > 0) {
      const ox = 1220, oy = 470;
      ctx.fillStyle = rgba(SLATE, 0.12 * kc); circle(ctx, ox, oy, 330 * kc); ctx.fill();
      ctx.strokeStyle = rgba(SLATE, 0.6 * kc); ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '元分析算进来的“练习”', ox, oy - 250, { size: 40, family: 'Head', weight: 900, color: SLATE, alpha: kc });
      const ki = ramp(t, L(3), L(3) + 0.6, easeOut);
      if (ki > 0) {
        glowDot(ctx, ox, oy + 40, 260 * ki, AMBER, 0.35 * ki * (0.8 + 0.2 * beatPulse(t)));
        ctx.fillStyle = rgba(AMBER, 0.25 * ki); circle(ctx, ox, oy + 40, 140 * ki); ctx.fill();
        ctx.strokeStyle = rgba(GOLD, 0.9 * ki); ctx.lineWidth = 4; ctx.stroke();
        text(ctx, '严格的', ox, oy + 30, { size: 40, family: 'Head', weight: 900, color: GOLD, alpha: ki });
        text(ctx, '刻意练习', ox, oy + 82, { size: 40, family: 'Head', weight: 900, color: GOLD, alpha: ki });
        text(ctx, '和水平的关系更强', ox, oy + 250, { size: 36, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, L(3) + 0.5, L(3) + 1) });
      }
    }
    ctx.restore();
  }
  // 回到灯笼：14 盏亮着，其余也在
  const kg = ramp(t, L(4) - 0.2, L(4) + 0.6);
  if (kg <= 0) return;
  ctx.save(); ctx.globalAlpha *= kg;
  const G = { x: 960, y: 500, gap: 70, r: 21 };
  const rest = ramp(t, L(5), L(5) + 1.0);
  drawGrid(ctx, t, i => {
    if (i < 14) return { alpha: 1, lit: 1, color: AMBER, glow: 1.2 + 0.4 * beatPulse(t) };
    const ti = L(5) + ((i * 37) % 86) / 86 * 0.9;
    return { alpha: 0.35 + 0.65 * ramp(t, ti, ti + 0.3), lit: 0.6 * ramp(t, ti, ti + 0.3), color: SLATE, glow: 0.8 };
  }, G);
  ctx.restore();
};
function drawProf(ctx, x, y, s, t) {
  // 戴眼镜、留胡子的老教授（卡通化，不是肖像）
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#4a5560';
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-56, -70, 0, -74); ctx.quadraticCurveTo(56, -70, 60, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f3d7c0';
  ctx.beginPath(); ctx.ellipse(0, -118, 40, 44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9d4cc';
  ctx.beginPath(); ctx.ellipse(0, -96, 34, 26, 0, 0, Math.PI); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -156, 36, 14, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = 3;
  for (const sx of [-15, 15]) { circle(ctx, sx, -122, 11); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-4, -122); ctx.lineTo(4, -122); ctx.stroke();
  ctx.fillStyle = '#2b2b30';
  for (const sx of [-15, 15]) { circle(ctx, sx, -122, 3); ctx.fill(); }
  ctx.restore();
}

SCENES.rest = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('rest', 1);
  const G = { x: 960, y: 500, gap: 70, r: 21 };
  drawGrid(ctx, t, i => {
    if (i < 14) return { alpha: 1, lit: 1 - 0.4 * ramp(t, t0, t0 + 0.6), color: AMBER, glow: 1 };
    return { alpha: 1, lit: 0.6 + 0.3 * beatPulse(t) * ramp(t, t0, t0 + 0.4), color: SLATE, glow: 1.1 };
  }, G);
  const words = [['天赋？', 380, 380], ['起步早晚？', 1560, 300], ['运气？', 1540, 700]];
  words.forEach(([w, x, y], i) => {
    const k = pop(t, beatAfter(t1, i), 0.45);
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + Math.sin(t * 1.5 + i) * 6); ctx.scale(clamp(k, 0, 1.2), clamp(k, 0, 1.2));
    font(ctx, 54, 'Head', 900);
    const ww = ctx.measureText(w).width + 60;
    ctx.fillStyle = 'rgba(12,26,32,0.9)'; roundRect(ctx, -ww / 2, -50, ww, 84, 42); ctx.fill();
    ctx.strokeStyle = rgba(SLATE, 0.8); ctx.lineWidth = 3; ctx.stroke();
    text(ctx, w, 0, 10, { size: 54, family: 'Head', weight: 900, color: CREAM });
    ctx.restore();
  });
  text(ctx, '剩下的 86%', 960, 150, { size: 52, family: 'Head', weight: 900, color: SLATE, alpha: fadeIn(t, t0, 0.5) });
};

SCENES.end = (ctx, t, s) => {
  const t0 = s.start, L = i => lineAt('end', i);
  // 起势：大字，然后山路
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, L(1) - 0.5, L(1)));
  const km = ramp(t, L(1) - 0.6, L(1) + 0.4);
  if (km > 0) {
    ctx.save(); ctx.globalAlpha *= km;
    const walk = prog(t, L(1), L(5) + 1.5);
    const u = 0.08 + 0.42 * easeOut(walk);
    const lampsU = u + 0.01;
    drawMountain(ctx, t, { trail: u, lamps: lampsU, summit: 0.25 });
    // 前面的人：已经走得更高
    const ko = ramp(t, L(2), L(2) + 0.6) * (1 - 0.5 * ramp(t, L(4), L(4) + 0.6));
    const po = pathAt(0.82);
    drawWalker(ctx, po.x, po.y, po.s * 1.05, { phase: t * 0.5, cloak: '#5f7f90', scarf: '#bcd3dc', lantern: 0.6, alpha: ko });
    const p = pathAt(u);
    const bright = ramp(t, L(4), L(4) + 0.8) + 0.6 * ramp(t, L(5), L(5) + 1.0);
    if (bright > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, p.x + 40 * p.s, p.y - 70 * p.s, 220 + 260 * bright, AMBER, 0.12 + 0.25 * bright * (0.85 + 0.15 * barPulse(t)));
      ctx.restore();
    }
    drawWalker(ctx, p.x, p.y, p.s * 1.15, { phase: walk * 9, lantern: 0.8 + 0.2 * bright, hold: ramp(t, L(4), L(4) + 0.8) });
    ctx.restore();
  }
  if (kb > 0) {
    ctx.fillStyle = `rgba(6,12,14,${0.5 * kb})`; ctx.fillRect(0, 0, W, H);
    const sc = 0.92 + 0.08 * ramp(t, t0, t0 + 1.2, easeOut) + 0.012 * barPulse(t);
    ctx.save(); ctx.translate(960, 520); ctx.scale(sc, sc);
    glowDot(ctx, 0, -50, 520, AMBER, 0.28 * kb);
    text(ctx, '练习不是全部', 0, 0, { size: 170, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
    text(ctx, '但它是你手里那盏灯', 960, 640, { size: 56, family: 'Serif', weight: 700, color: CREAM, alpha: kb * ramp(t, t0 + 1.2, t0 + 1.8) });
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 30);
  drawMountain(ctx, 30, { trail: 0.36, lamps: 0.37, summit: 1, signs: 0 });
  const p = pathAt(0.36);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, p.x + 40, p.y - 70, 380, AMBER, 0.3);
  ctx.restore();
  drawWalker(ctx, p.x, p.y, p.s * 1.5, { phase: 0.2, lantern: 1 });
  const g = ctx.createLinearGradient(0, 0, 1100, 0);
  g.addColorStop(0, 'rgba(8,16,20,0.92)'); g.addColorStop(0.75, 'rgba(8,16,20,0.6)'); g.addColorStop(1, 'rgba(8,16,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, '练够一万小时', 110, 380, { size: 150, family: 'Head', weight: 900, color: CREAM, align: 'left', shadow: 30 });
  text(ctx, '就能成为高手吗？', 110, 560, { size: 120, family: 'Head', weight: 900, color: GOLD, align: 'left', shadow: 30 });
  richText(ctx, [['88 项研究：练习只解释了 ', CREAM], ['14%', GOLD]], 110, 700, { size: 64, family: 'Head', weight: 900, align: 'left', shadow: 20 });
}
