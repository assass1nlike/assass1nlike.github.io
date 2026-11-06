// 等车悖论：画面
// 美术方向：雨后夜里的公交站。深靛蓝夜色，琥珀色的车灯和路灯；一条发光的时间线，
// 每个乘客是一根从时间线上升起的小光柱，柱子的高度就是他要等的分钟数。
// 没有人声：画面跟着配乐走，字幕一出现，对应的变化就发生；曲子起势处放大字和大转场。

const CREAM = '#fbf3e4';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,243,228,0.6)';
const AMBER = '#ffb24d';   // 长间隔、车灯
const TEAL = '#6fd6c9';    // 短间隔
const NEUTRAL = '#f3dcb5';
const SKIN = '#f4dccb';
const HAIR = '#22243a';

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
function tagSketch(ctx, x, y, a, align = 'right') {
  text(ctx, '示意', x, y, { size: 30, family: 'Sans', weight: 700, color: 'rgba(251,243,228,0.45)', align, alpha: a });
}

// ---------- 模拟数据 ----------
const SIM = DATA.sim;
const MU = SIM.mu;
function sweepAt(d, key = 'wait') {
  const sw = SIM.sweep, step = sw[1].d - sw[0].d;
  const x = clamp(d / step, 0, sw.length - 1), i = Math.min(sw.length - 2, Math.floor(x));
  return lerp(sw[i][key], sw[i + 1][key], x - i);
}
const atD = d => SIM.sweep.find(s => Math.abs(s.d - d) < 1e-6);
const POIS = SIM.random.find(r => r.cv_set === 1);

// ---------- 背景：夜色、远处城市的光斑、细雨 ----------
const BOKEH = (() => {
  const rnd = mulberry32(5), cols = ['#ffb24d', '#ffd9a0', '#7fa8ff', '#ff8f7a', '#9fe3d6'];
  return Array.from({ length: 34 }, () => ({
    x: rnd() * W, y: 380 + rnd() * 330, r: 14 + rnd() * 60, c: cols[Math.floor(rnd() * cols.length)],
    a: 0.05 + rnd() * 0.08, v: (rnd() - 0.5) * 5, ph: rnd() * 6,
  }));
})();
const RAIN = (() => {
  const rnd = mulberry32(9);
  return Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * H, l: 14 + rnd() * 22, v: 380 + rnd() * 260 }));
})();

function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111a3c');
  g.addColorStop(0.55, '#0c1330');
  g.addColorStop(1, '#070915');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hz = ctx.createLinearGradient(0, 380, 0, 760);
  hz.addColorStop(0, 'rgba(255,170,90,0)');
  hz.addColorStop(0.6, `rgba(255,170,90,${0.05 + 0.04 * lv})`);
  hz.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, 380, W, 380);
  for (const b of BOKEH) {
    const x = (b.x + b.v * t + W * 4) % W;
    glowDot(ctx, x, b.y, b.r, b.c, b.a * (0.7 + 0.3 * Math.sin(t * 0.5 + b.ph)) * (0.8 + 0.5 * lv));
  }
  ctx.strokeStyle = 'rgba(190,210,255,0.07)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const r of RAIN) {
    const y = (r.y + r.v * t) % (H + 40) - 20, x = r.x - (y * 0.08);
    ctx.moveTo(x, y); ctx.lineTo(x - r.l * 0.08, y + r.l);
  }
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 540, 480, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 角色 ----------
// 小人：(x, y) 是脚底，整体约 125s 高
function drawPerson(ctx, x, y, s, col, o = {}) {
  const { alpha = 1, glow = 0, look = 0, step = 0, phone = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -70, 120, col, 0.4 * glow);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20253d';
  const sw = Math.sin(step) * 5;
  roundRect(ctx, -14 + sw, -30, 11, 30, 5); ctx.fill();
  roundRect(ctx, 3 - sw, -30, 11, 30, 5); ctx.fill();
  const bg = ctx.createLinearGradient(0, -86, 0, -24);
  bg.addColorStop(0, col); bg.addColorStop(1, mix(col, '#000000', 0.3));
  ctx.fillStyle = bg;
  roundRect(ctx, -24, -86, 48, 62, 20); ctx.fill();
  ctx.fillStyle = mix(col, '#ffffff', 0.35);
  roundRect(ctx, -18, -84, 36, 9, 4); ctx.fill();
  ctx.fillStyle = SKIN;
  circle(ctx, 0, -106, 21); ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath(); ctx.arc(0, -108, 22, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-4 + look * 3, -122, 18, 9, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2d2433';
  for (const sx of [-7, 7]) { ctx.beginPath(); ctx.ellipse(sx + look * 5, -104, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,130,150,0.35)';
  for (const sx of [-13, 13]) { ctx.beginPath(); ctx.ellipse(sx + look * 3, -97, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
  if (phone > 0) {
    glowDot(ctx, 12, -60, 40, '#bfe6ff', 0.35 * phone);
    ctx.fillStyle = rgba('#d9f0ff', phone); roundRect(ctx, 6, -70, 12, 18, 3); ctx.fill();
  }
  ctx.restore();
}

// 公交（侧面，车头朝右）：(x, y) 是车轮着地处中点，整体约 160s 宽
function drawBus(ctx, x, y, s, o = {}) {
  const { alpha = 1, beam = 0, glow = 0, body = '#3a9d90' } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (beam > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createLinearGradient(80, 0, 420, 0);
    bg.addColorStop(0, rgba('#ffd9a0', 0.32 * beam)); bg.addColorStop(1, rgba('#ffd9a0', 0));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(78, -30); ctx.lineTo(420, -70); ctx.lineTo(420, 12); ctx.lineTo(78, -18); ctx.fill();
    ctx.restore();
  }
  if (glow > 0) glowDot(ctx, 0, -40, 150, AMBER, 0.45 * glow);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 86, 7, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, -84, 0, -12);
  g.addColorStop(0, mix(body, '#ffffff', 0.15)); g.addColorStop(1, mix(body, '#000000', 0.35));
  ctx.fillStyle = g;
  roundRect(ctx, -80, -84, 160, 72, [18, 24, 10, 10]); ctx.fill();
  ctx.fillStyle = '#f1e2c4';
  ctx.fillRect(-80, -32, 160, 8);
  ctx.fillStyle = '#ffe3a0';
  for (let i = 0; i < 4; i++) { roundRect(ctx, -70 + i * 30, -72, 24, 26, 5); ctx.fill(); }
  ctx.fillStyle = '#ffeec4';
  roundRect(ctx, 52, -74, 22, 38, [6, 12, 4, 4]); ctx.fill();
  ctx.fillStyle = mix(body, '#000000', 0.45);
  roundRect(ctx, 30, -46, 16, 30, 3); ctx.fill();
  ctx.fillStyle = AMBER;
  roundRect(ctx, 24, -82, 44, 7, 3); ctx.fill();
  for (const wx of [-48, 48]) {
    ctx.fillStyle = '#141726'; circle(ctx, wx, -12, 13); ctx.fill();
    ctx.fillStyle = '#7d849e'; circle(ctx, wx, -12, 5); ctx.fill();
  }
  ctx.fillStyle = '#fff3cf'; circle(ctx, 77, -24, 5); ctx.fill();
  glowDot(ctx, 79, -24, 26, '#ffd9a0', 0.8);
  ctx.restore();
}

// ---------- 夜里的公交站 ----------
const GROUND = 720;
const TOWERS = (() => {
  const rnd = mulberry32(13), out = [];
  for (let x = -40; x < W + 40;) {
    const w = 90 + rnd() * 150, h = 140 + rnd() * 300;
    const wins = [];
    for (let wy = 26; wy < h - 20; wy += 34) for (let wx = 16; wx < w - 22; wx += 30) if (rnd() < 0.22) wins.push([wx, wy, rnd()]);
    out.push({ x, w, h, wins, far: rnd() < 0.5 });
    x += w + 8 + rnd() * 40;
  }
  return out;
})();
function drawTowers(ctx, t) {
  for (const far of [true, false]) for (const b of TOWERS) if (b.far === far) {
    const y0 = GROUND - 24 - b.h * (far ? 1.15 : 0.8);
    ctx.fillStyle = far ? '#121a3a' : '#0e1430';
    ctx.fillRect(b.x, y0, b.w, GROUND - 24 - y0);
    for (const [wx, wy, r] of b.wins) {
      if (wy * (far ? 1.15 : 0.8) > b.h * (far ? 1.15 : 0.8) - 20) continue;
      const a = (far ? 0.18 : 0.32) * (0.6 + 0.4 * Math.sin(t * 0.3 + r * 20));
      ctx.fillStyle = rgba(r < 0.75 ? '#ffcf8a' : '#bcd6ff', a);
      ctx.fillRect(b.x + wx, y0 + wy * (far ? 1.15 : 0.8), 14, 18);
    }
  }
}

function drawStreet(ctx, t, o = {}) {
  const { alpha = 1, sign = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawTowers(ctx, t);
  // 人行道和马路
  ctx.fillStyle = '#1a2038'; ctx.fillRect(0, GROUND - 24, W, 30);
  ctx.fillStyle = '#2a3150'; ctx.fillRect(0, GROUND + 4, W, 6);
  const rg = ctx.createLinearGradient(0, GROUND + 10, 0, H);
  rg.addColorStop(0, '#0f1426'); rg.addColorStop(1, '#070912');
  ctx.fillStyle = rg; ctx.fillRect(0, GROUND + 10, W, H - GROUND - 10);
  ctx.fillStyle = 'rgba(255,230,180,0.10)';
  for (let x = ((-t * 0) % 220); x < W; x += 220) ctx.fillRect(x + 40, 880, 120, 8);
  // 路灯
  const lx = 430;
  ctx.fillStyle = '#2b3150'; ctx.fillRect(lx - 6, 250, 12, GROUND - 250);
  ctx.beginPath(); ctx.moveTo(lx, 256); ctx.quadraticCurveTo(lx + 10, 228, lx + 70, 236); ctx.lineWidth = 10; ctx.strokeStyle = '#2b3150'; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createLinearGradient(0, 240, 0, GROUND);
  cone.addColorStop(0, 'rgba(255,190,110,0.22)'); cone.addColorStop(1, 'rgba(255,190,110,0.02)');
  ctx.fillStyle = cone;
  ctx.beginPath(); ctx.moveTo(lx + 55, 244); ctx.lineTo(lx + 85, 244); ctx.lineTo(lx + 300, GROUND); ctx.lineTo(lx - 150, GROUND); ctx.fill();
  glowDot(ctx, lx + 70, 244, 90, '#ffc27a', 0.7);
  // 地上的倒影
  ctx.globalAlpha *= 0.5;
  for (const [x, c, r] of [[lx + 70, '#ffc27a', 1.2], [1130, '#ffe3a0', 1.5], [1560, '#ffd27a', 0.9]]) {
    ctx.save();
    ctx.translate(x, GROUND + 70); ctx.scale(1, 0.32);
    glowDot(ctx, 0, 0, 260 * r, c, 0.22);
    ctx.restore();
  }
  ctx.restore();
  // 候车亭
  const sx0 = 880, sx1 = 1380;
  ctx.fillStyle = 'rgba(150,190,230,0.07)'; roundRect(ctx, sx0 + 20, 420, sx1 - sx0 - 40, GROUND - 440, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(190,215,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
  const ad = ctx.createLinearGradient(0, 440, 0, 640);
  ad.addColorStop(0, 'rgba(255,214,150,0.30)'); ad.addColorStop(1, 'rgba(255,170,110,0.16)');
  ctx.fillStyle = ad; roundRect(ctx, sx1 - 170, 440, 130, 200, 6); ctx.fill();
  ctx.fillStyle = '#2b3150';
  ctx.fillRect(sx0 + 10, 400, 10, GROUND - 400); ctx.fillRect(sx1 - 20, 400, 10, GROUND - 400);
  roundRect(ctx, sx0 - 20, 384, sx1 - sx0 + 40, 26, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,214,150,0.5)'; ctx.fillRect(sx0 + 40, 410, sx1 - sx0 - 80, 3);
  glowDot(ctx, (sx0 + sx1) / 2, 420, 260, '#ffe3a0', 0.10);
  ctx.fillStyle = '#323a5c'; roundRect(ctx, sx0 + 70, 620, 280, 14, 5); ctx.fill();
  ctx.fillRect(sx0 + 90, 634, 8, 40); ctx.fillRect(sx0 + 322, 634, 8, 40);
  // 站牌
  const px = 1560;
  ctx.fillStyle = '#2b3150'; ctx.fillRect(px - 6, 360, 12, GROUND - 360);
  glowDot(ctx, px, 300, 260, '#ffd27a', 0.16 * sign);
  ctx.fillStyle = '#1d2440'; roundRect(ctx, px - 170, 210, 340, 160, 14); ctx.fill();
  ctx.strokeStyle = rgba(GOLD, 0.35 + 0.4 * sign); ctx.lineWidth = 3; ctx.stroke();
  text(ctx, '公交站', px, 262, { size: 34, family: 'Sans', weight: 700, color: DIM });
  richText(ctx, [['10', GOLD], [' 分钟一班', CREAM]], px, 334, { size: 48, family: 'Head', weight: 900, alpha: 0.55 + 0.45 * sign });
  ctx.restore();
}

// ---------- 时间线 ----------
const TX0 = 200, TX1 = 1740, SPAN = 80, BASE = 800, PPM = 19, BUS_S = 0.4, BUS_W = 160 * BUS_S + 4;
const TX = m => lerp(TX0, TX1, m / SPAN);
const pairTimes = d => [0, 1, 2, 3, 4].flatMap(k => (k < 4 ? [20 * k, 20 * k + 10 + d] : [80])).sort((a, b) => a - b);
const EVEN = Array.from({ length: 9 }, (_, i) => 10 * i);
const MESSY = [0, 7, 9, 26, 33, 41, 55, 57, 80]; // 示意：8 段间隔，平均 10 分钟
const PAX = SIM.demo_pax;

function nextBus(times, a) { for (const b of times) if (b >= a) return b; return times[times.length - 1]; }
function prevBus(times, a) { let p = times[0]; for (const b of times) if (b < a) p = b; return p; }
function busXs(times) {
  const xs = times.map(TX);
  for (let i = xs.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - BUS_W);
  return xs;
}
function paxColor(gap, colorK) {
  if (colorK <= 0) return NEUTRAL;
  return mix(NEUTRAL, gap > MU + 1e-6 ? AMBER : TEAL, colorK);
}

function drawTimeline(ctx, t, o = {}) {
  const { times, alpha = 1, axis = 0, pax = null, colorK = 0, focusLong = 0, tri = 0, triColor = 0,
    meanW = null, meanA = 0, gapLabels = 0, bands = 0, busGlow = () => 0, ends = 1, bounce = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 纵轴：要等几分钟
  if (axis > 0) {
    ctx.save(); ctx.globalAlpha *= axis;
    for (const m of [5, 10, 15, 20]) {
      const y = BASE - m * PPM;
      ctx.fillStyle = 'rgba(200,215,255,0.08)'; ctx.fillRect(TX0, y, TX1 - TX0, 1.5);
      text(ctx, String(m), TX0 - 18, y + 10, { size: 28, family: 'Sans', weight: 700, color: 'rgba(251,243,228,0.45)', align: 'right' });
    }
    text(ctx, '要等几分钟', TX0 - 18, BASE - 20 * PPM - 34, { size: 30, family: 'Sans', weight: 700, color: 'rgba(251,243,228,0.55)', align: 'left' });
    ctx.restore();
  }
  // 每段间隔的锯齿：越长的间隔，三角越大
  if (tri > 0) {
    for (let i = 0; i < times.length - 1; i++) {
      const a = times[i], b = times[i + 1], gap = b - a;
      if (gap < 0.05) continue;
      const long = gap > MU + 1e-6;
      const c = triColor > 0 ? mix(NEUTRAL, long ? AMBER : TEAL, triColor) : NEUTRAL;
      const g = ctx.createLinearGradient(0, BASE - gap * PPM, 0, BASE);
      const k = (long ? 1 + 0.6 * focusLong : 1 - 0.5 * focusLong) * tri;
      g.addColorStop(0, rgba(c, 0.22 * k)); g.addColorStop(1, rgba(c, 0.05 * k));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(TX(a), BASE); ctx.lineTo(TX(a), BASE - gap * PPM); ctx.lineTo(TX(b), BASE); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c, 0.35 * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(TX(a), BASE - gap * PPM); ctx.lineTo(TX(b), BASE); ctx.stroke();
    }
  }
  // 时间线本身
  ctx.save();
  ctx.shadowColor = rgba(AMBER, 0.8); ctx.shadowBlur = 16;
  ctx.fillStyle = rgba('#ffe1b0', 0.85);
  ctx.fillRect(TX0 - 20, BASE - 2, TX1 - TX0 + 40, 4);
  ctx.restore();
  if (bands > 0) {
    for (let i = 0; i < times.length - 1; i++) {
      const a = times[i], b = times[i + 1], long = b - a > MU + 1e-6;
      ctx.fillStyle = rgba(long ? AMBER : TEAL, (long ? 0.85 : 0.6) * bands);
      ctx.fillRect(TX(a) + 2, BASE - 5, TX(b) - TX(a) - 4, 10);
    }
  }
  // 乘客：每人一根光柱，高度 = 要等的分钟数
  if (pax) {
    PAX.forEach((a, i) => {
      const k = pax(i);
      if (k <= 0) return;
      const nb = nextBus(times, a), pb = prevBus(times, a), gap = nb - pb, long = gap > MU + 1e-6;
      const wait = nb - a;
      const bob = bounce * (long ? 1 : 0.2) * 10 * Math.max(0, Math.sin(t * 9 + i * 0.7));
      const h = wait * PPM * clamp(k) + bob;
      const x = TX(a), c = paxColor(gap, colorK);
      const dimK = long ? 1 : 1 - 0.55 * focusLong;
      ctx.fillStyle = rgba(c, 0.45 * dimK * clamp(k * 2));
      ctx.fillRect(x - 1.6, BASE - h, 3.2, h);
      const yy = k < 1 ? lerp(BASE - 520, BASE - h, easeOut(clamp(k))) : BASE - h;
      ctx.fillStyle = rgba(c, dimK * clamp(k * 2));
      circle(ctx, x, yy, 5.5); ctx.fill();
    });
  }
  // 公交
  const xs = busXs(times);
  times.forEach((b, i) => {
    const g = busGlow(i);
    ctx.fillStyle = rgba('#ffe1b0', 0.35);
    ctx.fillRect(TX(b) - 1, BASE - 12, 2, 12);
    drawBus(ctx, xs[i], BASE + 48, BUS_S, { glow: g });
  });
  if (ends > 0) {
    text(ctx, '0', TX0, BASE + 96, { size: 30, family: 'Sans', weight: 700, color: DIM, alpha: ends });
    text(ctx, `${SPAN} 分钟`, TX1, BASE + 96, { size: 30, family: 'Sans', weight: 700, color: DIM, alpha: ends });
  }
  if (gapLabels > 0) {
    for (let i = 0; i < times.length - 1; i++) {
      const a = times[i], b = times[i + 1], gap = b - a;
      if (gap < 0.5) continue;
      const long = gap > MU + 1e-6;
      text(ctx, String(Math.round(gap)), TX((a + b) / 2), BASE + 100, { size: 40, family: 'Head', weight: 900,
        color: long ? AMBER : TEAL, alpha: gapLabels });
    }
  }
  if (meanW != null && meanA > 0) {
    const y = BASE - meanW * PPM;
    ctx.save();
    ctx.globalAlpha *= meanA;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3.5; ctx.setLineDash([16, 10]); ctx.shadowColor = GOLD; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(TX0, y); ctx.lineTo(TX0 + (TX1 - TX0) * clamp(meanA * 1.5), y); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// 顶部两块读数：车的平均间隔（不变）和乘客的平均等待（在涨）
function drawReadout(ctx, t, wait, o = {}) {
  const { alpha = 1, hot = 0, left = 1 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  text(ctx, '车：平均间隔', TX0, 150, { size: 36, family: 'Serif', weight: 700, color: DIM, align: 'left', alpha: left });
  richText(ctx, [[String(MU), CREAM], [' 分钟', DIM]], TX0 + 150, 262, { size: 92, family: 'Head', weight: 900, alpha: left, shadow: 14 });
  text(ctx, '你：平均要等', TX1, 150, { size: 36, family: 'Serif', weight: 700, color: DIM, align: 'right' });
  const sc = 1 + 0.08 * hot * barPulse(t, 0.4);
  ctx.save();
  ctx.translate(TX1, 262); ctx.scale(sc, sc);
  if (hot > 0) glowDot(ctx, -150, -40, 220, GOLD, 0.18 * hot);
  richText(ctx, [[wait.toFixed(1), GOLD], [' 分钟', DIM]], 0, 0, { size: 118, family: 'Head', weight: 900, align: 'right', shadow: 18 });
  ctx.restore();
  ctx.restore();
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  const l1 = lineAt('hook', 1), l2 = lineAt('hook', 2), l3 = lineAt('hook', 3);
  drawStreet(ctx, t, { sign: ramp(t, 0.3, 1.3) * (0.85 + 0.15 * barPulse(t)) });
  const kw = ramp(t, l1 - 0.2, l1 + 1.6, x => x);
  const px = lerp(2000, 1130, easeOut(kw));
  drawPerson(ctx, px, GROUND - 6, 1.35, '#e89a5a', { step: kw < 1 ? t * 9 : 0, look: kw < 1 ? 0 : -1 + 2 * ramp(t, l2, l2 + 0.6), phone: ramp(t, l3 + 1.2, l3 + 1.8) });
  // 头顶的问题
  const kq = ramp(t, l2, l2 + 0.4, easeBack);
  if (kq > 0) {
    const bx = 1130, by = 440;
    ctx.save(); ctx.globalAlpha *= clamp(kq);
    ctx.translate(bx, by); ctx.scale(clamp(kq, 0, 1.2), clamp(kq, 0, 1.2));
    ctx.fillStyle = 'rgba(251,243,228,0.94)';
    roundRect(ctx, -150, -70, 300, 120, 40); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20, 48); ctx.lineTo(0, 80); ctx.lineTo(14, 48); ctx.fill();
    const k5 = ramp(t, l3, l3 + 0.35);
    text(ctx, '等几分钟？', 0, 8, { size: 50, family: 'Head', weight: 900, color: '#2a2440', alpha: 1 - k5 });
    richText(ctx, [['5', '#e0902a'], [' 分钟吧？', '#2a2440']], 0, 12, { size: 58, family: 'Head', weight: 900, alpha: k5 });
    ctx.restore();
  }
};

SCENES.setup = (ctx, t, s) => {
  const t0 = s.start, l1 = lineAt('setup', 1), l2 = lineAt('setup', 2), l3 = lineAt('setup', 3);
  const kin = ramp(t, t0 - 0.2, t0 + 0.8);
  drawTimeline(ctx, t, { times: EVEN, alpha: kin, axis: ramp(t, l1, l1 + 0.6), tri: ramp(t, l3, l3 + 0.8),
    busGlow: i => (i === 3 ? 0.5 * ramp(t, l1, l1 + 0.4) : 0), meanW: 5, meanA: ramp(t, l3 + 0.4, l3 + 1.4) });
  text(ctx, '车一分不差：每 10 分钟一辆', 960, 230, { size: 50, family: 'Head', weight: 900, color: CREAM, alpha: ramp(t, t0, t0 + 0.6) * (1 - ramp(t, l3 - 0.3, l3)) });
  // 你：在 20~30 分钟这段里的某一刻到站
  let a = null;
  if (t >= l1 && t < l2) a = 29.4;
  else if (t >= l2 && t < l3) a = 20.3;
  else if (t >= l3) a = lerp(20.3, 29.7, ramp(t, l3, l3 + 1.4, x => x));
  if (a != null) {
    const nb = nextBus(EVEN, a), h = (nb - a) * PPM, x = TX(a);
    const k = ramp(t, l1, l1 + 0.3) * (1 - ramp(t, l3 + 1.4, l3 + 2.0));
    ctx.save(); ctx.globalAlpha *= k;
    // 走过的轨迹
    if (t >= l3) for (let m = 20.3; m < a; m += 0.25) {
      ctx.fillStyle = rgba(NEUTRAL, 0.35); ctx.fillRect(TX(m) - 1.5, BASE - (30 - m) * PPM, 3, (30 - m) * PPM);
    }
    ctx.fillStyle = rgba(GOLD, 0.8); ctx.fillRect(x - 3, BASE - h, 6, h);
    glowDot(ctx, x, BASE - h, 30, GOLD, 0.6);
    circle(ctx, x, BASE - h, 8); ctx.fillStyle = GOLD; ctx.fill();
    // 横向：从你到下一辆车
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, BASE - 26); ctx.lineTo(TX(nb) - 8, BASE - 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TX(nb) - 8, BASE - 33); ctx.lineTo(TX(nb), BASE - 26); ctx.lineTo(TX(nb) - 8, BASE - 19); ctx.fill();
    text(ctx, '你', x, BASE - h - 26, { size: 40, family: 'Head', weight: 900, color: GOLD });
    ctx.restore();
  }
  const kb = ramp(t, l3 + 0.6, l3 + 1.3, easeBack);
  if (kb > 0) {
    richText(ctx, [['平均 ', CREAM], ['5', GOLD], [' 分钟', CREAM]], 960, 250, { size: 96, family: 'Head', weight: 900, alpha: clamp(kb), shadow: 20 });
    text(ctx, '柱子越高，等得越久', 960, 330, { size: 36, family: 'Serif', weight: 700, color: DIM, alpha: clamp(kb) });
  }
};

SCENES.messy = (ctx, t, s) => {
  const t0 = s.start, l1 = lineAt('messy', 1), l2 = lineAt('messy', 2), l3 = lineAt('messy', 3), l4 = lineAt('messy', 4);
  const km = ramp(t, l1 - 0.6, l1 + 1.0);
  const wob = (1 - km) * 0;
  const times = EVEN.map((e, i) => lerp(e, MESSY[i], km) + (i > 0 && i < 8 ? Math.sin(t * 2.3 + i) * 0.25 * km : 0));
  const pair = i => (i === 1 || i === 2 || i === 6 || i === 7);
  drawTimeline(ctx, t, { times, busGlow: i => (pair(i) ? 0.9 * window01(t, l2, l3 + 0.2, 0.3) : 0) });
  // 起势处的大字
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, l1 + 0.4, l1 + 1.0));
  if (kb > 0) {
    ctx.save();
    ctx.translate(960, 420); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '可车从来不准点', 0, 0, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  // 堵车、红灯、上下客
  [['堵车', 3], ['红灯', 5], ['上下客', 8]].forEach(([w, i], n) => {
    const tb = beatAfter(l1, n), k = ramp(t, tb, tb + 0.35, easeBack) * (1 - ramp(t, l2, l2 + 0.4));
    if (k <= 0) return;
    const x = TX(times[i]), y = BASE - 90 - 10 * (1 - clamp(k));
    ctx.save(); ctx.globalAlpha *= clamp(k);
    ctx.fillStyle = 'rgba(255,178,77,0.18)'; roundRect(ctx, x - 70, y - 40, 140, 56, 28); ctx.fill();
    ctx.strokeStyle = rgba(AMBER, 0.7); ctx.lineWidth = 2; ctx.stroke();
    text(ctx, w, x, y + 2, { size: 34, family: 'Sans', weight: 700, color: CREAM });
    ctx.restore();
  });
  // 挤着来
  const kp = window01(t, l2, l3 + 0.1, 0.3);
  if (kp > 0) for (const i of [1, 6]) {
    const x = (TX(times[i]) + TX(times[i + 1])) / 2;
    text(ctx, '挤着来', x, BASE - 70, { size: 38, family: 'Head', weight: 900, color: AMBER, alpha: kp });
  }
  // 半天不来
  const ke = ramp(t, l3, l3 + 0.5);
  if (ke > 0) {
    const a = TX(times[7]), b = TX(times[8]);
    ctx.save(); ctx.globalAlpha *= ke * (1 - 0.6 * ramp(t, l4, l4 + 0.4));
    const g = ctx.createLinearGradient(0, BASE - 260, 0, BASE);
    g.addColorStop(0, 'rgba(127,168,255,0)'); g.addColorStop(1, 'rgba(127,168,255,0.22)');
    ctx.fillStyle = g; ctx.fillRect(a + 36, BASE - 260, b - a - 72, 258);
    text(ctx, '……', (a + b) / 2, BASE - 110, { size: 70, family: 'Head', weight: 900, color: 'rgba(200,215,255,0.8)' });
    ctx.restore();
  }
  // 平均还是 10 分钟
  const ka = ramp(t, l4, l4 + 0.6);
  if (ka > 0) {
    const y = BASE - 210;
    ctx.save(); ctx.globalAlpha *= ka;
    ctx.strokeStyle = rgba(GOLD, 0.8); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(TX0, y + 18); ctx.lineTo(TX0, y); ctx.lineTo(TX0 + (TX1 - TX0) * ramp(t, l4, l4 + 0.9), y); ctx.stroke();
    if (t > l4 + 0.9) { ctx.beginPath(); ctx.moveTo(TX1, y); ctx.lineTo(TX1, y + 18); ctx.stroke(); }
    richText(ctx, [['8 段间隔，平均还是 ', CREAM], ['10', GOLD], [' 分钟', CREAM]], 960, y - 30, { size: 52, family: 'Head', weight: 900, shadow: 16 });
    ctx.restore();
  }
  tagSketch(ctx, TX1 + 20, 300, ramp(t, l1, l1 + 0.6));
};

SCENES.ask = (ctx, t, s) => {
  const t0 = s.start, l1 = lineAt('ask', 1);
  const kq = ramp(t, t0 - 0.1, t0 + 0.5, easeBack) * (1 - ramp(t, l1 - 0.2, l1 + 0.3));
  if (kq > 0) {
    ctx.save(); ctx.translate(960, 500); const sc = clamp(kq, 0, 1.2) * (1 + 0.03 * beatPulse(t)); ctx.scale(sc, sc);
    richText(ctx, [['? ', GOLD], ['分钟', CREAM]], 0, 0, { size: 210, family: 'Head', weight: 900, shadow: 30 });
    ctx.restore();
  }
  const kc = ramp(t, l1 - 0.1, l1 + 0.5, easeOut);
  if (kc <= 0) return;
  ctx.save(); ctx.globalAlpha *= kc;
  ctx.translate(0, 30 * (1 - kc));
  ctx.fillStyle = 'rgba(12,16,34,0.88)'; roundRect(ctx, 480, 300, 960, 400, 26); ctx.fill();
  ctx.strokeStyle = rgba(AMBER, 0.55); ctx.lineWidth = 2.5; ctx.stroke();
  for (const [i, c] of ['#ff8f7a', '#ffd27a', '#6fd6c9'].entries()) { circle(ctx, 530 + i * 34, 340, 9); ctx.fillStyle = c; ctx.fill(); }
  const rows = [
    [['for', TEAL], [' 每个乘客 ', CREAM], ['in', TEAL], [' 随机到站的人：', CREAM]],
    [['    等待 = 下一辆车 − 到站时刻', CREAM]],
    [['平均等待 = ', CREAM], ['所有人的等待取平均', GOLD]],
  ];
  rows.forEach((r, i) => {
    const tb = beatAfter(l1, i), k = ramp(t, tb, tb + 0.3);
    richText(ctx, r, 540, 440 + i * 86, { size: 40, family: 'Sans', weight: 700, align: 'left', alpha: k });
  });
  ctx.restore();
};

// 演示用乘客出现的顺序：按到站时刻打乱
const PAX_ORDER = (() => {
  const rnd = mulberry32(17), idx = PAX.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const rank = []; idx.forEach((v, r) => { rank[v] = r; }); return rank;
})();
const RAIN_DOTS = (() => {
  const rnd = mulberry32(23);
  return Array.from({ length: 260 }, () => ({ x: rnd() * W, y0: rnd(), v: 0.6 + rnd() * 0.8, r: 2 + rnd() * 3.5, c: rnd() < 0.5 ? AMBER : NEUTRAL }));
})();

function dAt(t) {
  const a = lineAt('sim', 3), b = lineAt('bunch', 0);
  return 6 * ramp(t, a + 0.2, a + 2.0) + 4 * ramp(t, b + 0.2, b + 2.0);
}

SCENES.sim = (ctx, t, s) => {
  const t0 = s.start, L = n => lineAt('sim', n);
  // 起势：100 万人
  const kb = ramp(t, t0, t0 + 0.4, easeOut) * (1 - ramp(t, L(1) - 0.4, L(1) + 0.2));
  if (kb > 0) {
    ctx.save(); ctx.globalAlpha *= kb;
    ctx.globalCompositeOperation = 'lighter';
    for (const d of RAIN_DOTS) {
      const y = ((d.y0 + (t - t0) * d.v * 0.5) % 1) * (H + 100) - 50;
      glowDot(ctx, d.x, y, d.r * 3, d.c, 0.35);
    }
    ctx.restore();
    const n = Math.round(SIM.passengers * ramp(t, t0, t0 + 2.2, easeOut));
    ctx.save(); ctx.translate(960, 520); const sc = 0.94 + 0.06 * easeOut(prog(t, t0, t0 + 1)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, n.toLocaleString('en-US'), 0, 0, { size: 190, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    text(ctx, '个乘客，随机走到站台', 0, 110, { size: 60, family: 'Head', weight: 900, color: CREAM, alpha: kb, shadow: 20 });
    ctx.restore();
  }
  const kt = ramp(t, L(1) - 0.3, L(1) + 0.5);
  if (kt <= 0) return;
  const d = dAt(t);
  const times = pairTimes(d);
  const reveal = i => ramp(t, L(1) + 0.1 + PAX_ORDER[i] / PAX.length * 1.4, L(1) + 0.5 + PAX_ORDER[i] / PAX.length * 1.4, x => x);
  const colorK = ramp(t, L(5), L(5) + 0.6);
  const focus = window01(t, L(6) + 0.3, L(9), 0.4);
  drawTimeline(ctx, t, { times, alpha: kt, axis: 1, pax: reveal, colorK, focusLong: focus, tri: ramp(t, L(2), L(2) + 0.6),
    triColor: colorK, meanW: sweepAt(d), meanA: ramp(t, L(2), L(2) + 0.8), gapLabels: ramp(t, L(4), L(4) + 0.4),
    bands: ramp(t, L(8), L(8) + 0.5) * (1 + 0.4 * barPulse(t)), bounce: window01(t, L(9), L(10), 0.3), ends: 1 - ramp(t, L(4), L(4) + 0.4) });
  drawReadout(ctx, t, sweepAt(d), { alpha: ramp(t, L(2) - 0.2, L(2) + 0.5), hot: ramp(t, L(10), L(10) + 0.4) });
  // 长短各占一半
  const kh = window01(t, L(5), L(6) + 0.2, 0.35);
  if (kh > 0) richText(ctx, [['长间隔 4 段', AMBER], ['  ·  ', DIM], ['短间隔 4 段', TEAL]], 960, 360,
    { size: 50, family: 'Head', weight: 900, alpha: kh, shadow: 14 });
  // 每 5 个人里有 4 个
  const k5 = window01(t, L(6), L(8) + 0.2, 0.35);
  if (k5 > 0) {
    const share = atD(6).long_share;
    for (let i = 0; i < 5; i++) {
      const tb = beatAfter(L(6), i);
      const kk = ramp(t, tb, tb + 0.3, easeBack);
      drawPerson(ctx, 960 + (i - 2) * 84, 306, 0.78, i < 4 ? AMBER : TEAL, { alpha: k5 * clamp(kk), glow: i < 4 ? 0.6 * ramp(t, L(7), L(7) + 0.4) : 0 });
    }
    richText(ctx, [[`${Math.round(share * 100)}%`, GOLD], [' 的人落在长间隔里', CREAM]], 960, 370,
      { size: 44, family: 'Head', weight: 900, alpha: k5 * ramp(t, L(7), L(7) + 0.4), shadow: 14 });
  }
  // 长间隔占时间的 80%
  const kT = window01(t, L(8), L(10) - 0.1, 0.35);
  if (kT > 0) richText(ctx, [['时间上，长间隔占 ', CREAM], [`${Math.round(16 / 20 * 100)}%`, AMBER]], 960, 360,
    { size: 50, family: 'Head', weight: 900, alpha: kT, shadow: 14 });
};

// 串车成因的示意：两辆车在一条路上
function roadScene(ctx, t, a0) {
  const L = n => lineAt('bunch', n);
  const RY = 640;
  ctx.save(); ctx.globalAlpha *= a0;
  ctx.save(); ctx.translate(0, 51); ctx.globalAlpha *= 0.8; drawTowers(ctx, t); ctx.restore();
  ctx.translate(960, 660); ctx.scale(1.25, 1.25); ctx.translate(-960, -560);
  ctx.fillStyle = '#121831'; ctx.fillRect(-200, RY + 6, W + 400, 120);
  ctx.fillStyle = 'rgba(255,230,180,0.12)';
  for (let x = -160; x < W + 200; x += 200) ctx.fillRect(x, RY + 62, 110, 6);
  ctx.fillStyle = '#232a48'; ctx.fillRect(-200, RY - 10, W + 400, 16);
  for (const sx of [560, 1020, 1480]) {
    const px = sx + 100;
    ctx.fillStyle = '#2b3150'; ctx.fillRect(px - 4, RY - 170, 8, 170);
    ctx.fillStyle = '#1d2440'; roundRect(ctx, px - 30, RY - 210, 60, 44, 8); ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.6); ctx.lineWidth = 2; ctx.stroke();
    text(ctx, '站', px, RY - 176, { size: 26, family: 'Sans', weight: 700, color: GOLD });
  }
  // 前车 A 在中间那站被一大群人拖住；后车 B 一路几乎不停
  const xA = t < L(5) ? lerp(800, 1040, ramp(t, L(4), L(5), easeOut))
    : t < L(7) ? 1040 : lerp(1040, 1250, ramp(t, L(7), L(7) + 1.5));
  const xB = lerp(180, 420, ramp(t, L(4), L(6), x => x)) + 340 * ramp(t, L(6), L(6) + 1.6) + 308 * ramp(t, L(7), L(7) + 1.5);
  const COLS = ['#e89a5a', '#8fa3c7', '#7cc6c0', '#f0b86a', '#ff8fa3'];
  const crowd = 12, board = prog(t, L(5) + 1.0, L(7) - 0.1);
  for (let i = 0; i < crowd; i++) {
    const kin = ramp(t, L(5) + i * 0.06, L(5) + 0.3 + i * 0.06, easeBack);
    const gone = Math.floor(board * crowd + 0.5);
    if (i < gone || kin <= 0) continue;
    const j = i - gone, row = j % 2;
    drawPerson(ctx, 1150 + Math.floor(j / 2) * 38 + row * 18, RY - 14 - row * 16, 0.5, COLS[i % 5], { alpha: clamp(kin) });
  }
  if (xB < 560) for (let i = 0; i < 2; i++)
    drawPerson(ctx, 690 + i * 38, RY - 14, 0.5, ['#9fb0d8', '#c7b0e8'][i], { alpha: ramp(t, L(4), L(4) + 0.4) });
  drawBus(ctx, xB, RY + 40, 0.95, { beam: 0.7 });
  drawBus(ctx, xA, RY + 40, 0.95, { beam: 0.7, glow: 0.4 * ramp(t, L(4), L(4) + 0.4) });
  const lab = (s, x, a, c) => text(ctx, s, x, RY - 128, { size: 38, family: 'Head', weight: 900, color: c, alpha: a, shadow: 10 });
  lab('晚了一点', xA, window01(t, L(4), L(6), 0.3), AMBER);
  lab('更晚了', xA, window01(t, L(6), L(7) + 0.2, 0.3), AMBER);
  lab('人少，停得短', xB, window01(t, L(7), L(7) + 1.3, 0.3), TEAL);
  text(ctx, '人多，上车慢', 1260, RY - 240, { size: 38, family: 'Head', weight: 900, color: CREAM, alpha: window01(t, L(5) + 0.2, L(7), 0.3), shadow: 10 });
  const gap = xA - xB - 170;
  const kd = ramp(t, L(4) + 0.3, L(4) + 0.8) * (1 - ramp(t, L(7) + 1.0, L(7) + 1.3));
  if (gap > 6 && kd > 0) {
    const y = RY + 110;
    ctx.save(); ctx.globalAlpha *= kd;
    ctx.strokeStyle = 'rgba(200,215,255,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xB + 85, y); ctx.lineTo(xA - 85, y);
    ctx.moveTo(xB + 85, y - 10); ctx.lineTo(xB + 85, y + 10); ctx.moveTo(xA - 85, y - 10); ctx.lineTo(xA - 85, y + 10); ctx.stroke();
    if (gap > 110) text(ctx, '车距', (xA + xB) / 2, y - 14, { size: 30, family: 'Sans', weight: 700, color: 'rgba(200,215,255,0.85)' });
    ctx.restore();
  }
  const kc = ramp(t, L(7) + 1.1, L(7) + 1.5, easeBack);
  if (kc > 0) {
    glowDot(ctx, (xA + xB) / 2, RY - 40, 220, AMBER, 0.25 * clamp(kc));
    text(ctx, '串车', (xA + xB) / 2, RY - 150, { size: 84, family: 'Head', weight: 900, color: GOLD, shadow: 30, alpha: clamp(kc) });
  }
  ctx.restore();
  tagSketch(ctx, W - 80, 160, a0);
}

SCENES.bunch = (ctx, t, s) => {
  const L = n => lineAt('bunch', n);
  const kt = 1 - ramp(t, L(4) - 0.4, L(4) + 0.1);
  if (kt > 0) {
    const d = dAt(t), times = pairTimes(d);
    const hi = window01(t, L(1), L(2) + 0.3, 0.3);
    drawTimeline(ctx, t, { times, alpha: kt, axis: 1, pax: () => 1, colorK: 1, tri: 1, triColor: 1, meanW: sweepAt(d), meanA: 1,
      gapLabels: 1 - ramp(t, L(0), L(0) + 0.3), ends: 0, busGlow: i => (i === 3 || i === 4 ? hi : 0) });
    drawReadout(ctx, t, sweepAt(d), { alpha: kt, hot: ramp(t, L(3), L(3) + 0.4) });
    if (hi > 0) {
      const x = TX(40);
      text(ctx, '两辆一起到', x - 30, BASE + 110, { size: 40, family: 'Head', weight: 900, color: AMBER, alpha: hi });
    }
    const kg = window01(t, L(2), L(3) + 0.4, 0.3);
    if (kg > 0) {
      const a = TX(40) + 4, b = TX(60) - 4, y = BASE - 20 * PPM - 26;
      ctx.save(); ctx.globalAlpha *= kg;
      ctx.strokeStyle = rgba(AMBER, 0.9); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(a, y + 12); ctx.lineTo(a, y); ctx.lineTo(b, y); ctx.lineTo(b, y + 12); ctx.stroke();
      richText(ctx, [['空 ', CREAM], ['20', AMBER], [' 分钟', CREAM]], (a + b) / 2, y - 18, { size: 42, family: 'Head', weight: 900 });
      ctx.restore();
    }
    // 关键数字
    const kn = window01(t, L(3), L(4) - 0.2, 0.3);
    if (kn > 0) text(ctx, '和 20 分钟一班一样', 960, 335, { size: 44, family: 'Head', weight: 900, color: CREAM, alpha: kn * ramp(t, L(3) + 0.8, L(3) + 1.2), shadow: 14 });
  }
  const kr = ramp(t, L(4) - 0.3, L(4) + 0.3);
  if (kr > 0) roadScene(ctx, t, kr);
};

// 平均等待 vs 不均匀程度
const CX0 = 260, CX1 = 1060, CY0 = 820, CY1 = 260, CVMAX = 1.4, WMAX = 15;
const CXp = cv => lerp(CX0, CX1, cv / CVMAX), CYp = w => lerp(CY0, CY1, w / WMAX);
SCENES.law = (ctx, t, s) => {
  const t0 = s.start, L = n => lineAt('law', n);
  const kc = ramp(t, t0 - 0.2, t0 + 0.5) * (1 - ramp(t, L(4) - 0.3, L(4) + 0.2));
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha *= kc;
    ctx.strokeStyle = 'rgba(251,243,228,0.45)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(CX0, CY1 - 20); ctx.lineTo(CX0, CY0); ctx.lineTo(CX1 + 30, CY0); ctx.stroke();
    for (const w of [5, 10, 15]) {
      ctx.fillStyle = 'rgba(200,215,255,0.08)'; ctx.fillRect(CX0, CYp(w), CX1 - CX0, 1.5);
      text(ctx, String(w), CX0 - 16, CYp(w) + 10, { size: 30, family: 'Sans', weight: 700, color: DIM, align: 'right' });
    }
    for (const cv of [0, 0.5, 1]) text(ctx, String(cv), CXp(cv), CY0 + 44, { size: 30, family: 'Sans', weight: 700, color: DIM });
    text(ctx, '平均要等（分钟）', CX0 - 10, CY1 - 44, { size: 32, family: 'Sans', weight: 700, color: DIM, align: 'left' });
    text(ctx, '车有多不均匀 →', CX1 + 30, CY0 + 92, { size: 32, family: 'Sans', weight: 700, color: DIM, align: 'right' });
    // 公式曲线
    const kf = ramp(t, L(1), L(1) + 1.2);
    if (kf > 0) {
      ctx.save(); ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.shadowColor = GOLD; ctx.shadowBlur = 14;
      ctx.beginPath();
      for (let i = 0; i <= 140 * kf; i++) { const cv = i / 100; const y = CYp(MU / 2 * (1 + cv * cv)); i ? ctx.lineTo(CXp(cv), y) : ctx.moveTo(CXp(cv), y); }
      ctx.stroke(); ctx.restore();
    }
    // 串车模型的模拟点
    SIM.sweep.filter((_, i) => i % 2 === 0).forEach((p, i, arr) => {
      const k = ramp(t, t0 + 0.3 + i / arr.length * 1.4, t0 + 0.6 + i / arr.length * 1.4, easeBack);
      if (k <= 0) return;
      circle(ctx, CXp(p.cv), CYp(p.wait), 8 * clamp(k, 0, 1.3)); ctx.fillStyle = AMBER; ctx.fill();
    });
    // 随机间隔的模拟点
    SIM.random.forEach(p => {
      const isP = p.cv_set === 1, k = ramp(t, L(2) - 0.2 + (isP ? 0.2 : 0), L(2) + 0.2 + (isP ? 0.2 : 0), easeBack);
      if (k <= 0) return;
      if (isP) glowDot(ctx, CXp(p.cv), CYp(p.wait), 60, TEAL, 0.5 * (0.7 + 0.3 * barPulse(t)));
      ctx.strokeStyle = TEAL; ctx.lineWidth = 4;
      circle(ctx, CXp(p.cv), CYp(p.wait), (isP ? 15 : 9) * clamp(k, 0, 1.3)); ctx.stroke();
    });
    // 图例
    const kl = ramp(t, t0 + 0.4, t0 + 1.0);
    circle(ctx, CX0 + 40, CY1 + 10, 8); ctx.fillStyle = rgba(AMBER, kl); ctx.fill();
    text(ctx, '两车一组、一前一后错开', CX0 + 62, CY1 + 21, { size: 30, family: 'Sans', weight: 700, color: CREAM, align: 'left', alpha: kl });
    const kl2 = ramp(t, L(2) - 0.2, L(2) + 0.3);
    ctx.strokeStyle = rgba(TEAL, kl2); ctx.lineWidth = 4; circle(ctx, CX0 + 40, CY1 + 62, 8); ctx.stroke();
    text(ctx, '间隔完全随机', CX0 + 62, CY1 + 73, { size: 30, family: 'Sans', weight: 700, color: CREAM, align: 'left', alpha: kl2 });
    // 标注
    text(ctx, `准点 ${atD(0).wait.toFixed(1)}`, CXp(0) + 20, CYp(atD(0).wait) - 22, { size: 34, family: 'Head', weight: 900, color: CREAM, align: 'left', alpha: ramp(t, t0 + 0.4, t0 + 0.8), shadow: 10 });
    text(ctx, `16/4 交替 ${atD(6).wait.toFixed(1)}`, CXp(0.6) + 16, CYp(atD(6).wait) + 46, { size: 34, family: 'Head', weight: 900, color: CREAM, align: 'left', alpha: ramp(t, t0 + 1.0, t0 + 1.4), shadow: 10 });
    const kp = ramp(t, L(3), L(3) + 0.4, easeBack);
    if (kp > 0) {
      text(ctx, `完全随机：${POIS.wait.toFixed(1)}`, CXp(POIS.cv) + 34, CYp(POIS.wait) + 60, { size: 46, family: 'Head', weight: 900, color: TEAL, align: 'left', alpha: clamp(kp), shadow: 12 });
      text(ctx, `串车也是 ${atD(10).wait.toFixed(1)}`, CXp(1) - 30, CYp(atD(10).wait) - 40, { size: 34, family: 'Head', weight: 900, color: AMBER, align: 'right', alpha: clamp(kp), shadow: 10 });
    }
    ctx.restore();
    // 公式
    const kq = ramp(t, L(1), L(1) + 0.6, easeOut);
    if (kq > 0) {
      ctx.save(); ctx.globalAlpha *= kq * kc;
      const fx = 1460;
      text(ctx, '平均要等', fx, 380, { size: 50, family: 'Head', weight: 900, color: CREAM });
      richText(ctx, [['= ', DIM], ['平均间隔', CREAM], [' ÷ 2', DIM]], fx, 470, { size: 50, family: 'Head', weight: 900 });
      richText(ctx, [['× (1 + ', DIM], ['CV²', GOLD], [')', DIM]], fx, 560, { size: 62, family: 'Head', weight: 900 });
      text(ctx, 'CV = 间隔的标准差 ÷ 平均间隔', fx, 650, { size: 32, family: 'Sans', weight: 700, color: DIM });
      text(ctx, '准点时 CV = 0，越乱越大', fx, 700, { size: 32, family: 'Sans', weight: 700, color: DIM });
      ctx.restore();
    }
  }
  // 按车算 vs 按人算
  const kv = ramp(t, L(4) - 0.2, L(4) + 0.5);
  if (kv <= 0) return;
  ctx.save(); ctx.globalAlpha *= kv;
  text(ctx, '车完全随机地来时', 960, 260, { size: 44, family: 'Head', weight: 900, color: DIM });
  const bx = 540, ppx = 38;
  const rows = [
    ['按班次平均', Math.round(POIS.mean_gap), TEAL, L(4)],
    ['你碰上的那段', Math.round(POIS.seen_gap), AMBER, L(5)],
  ];
  rows.forEach(([lbl, v, c, tb], i) => {
    const y = 440 + i * 200, k = ramp(t, tb, tb + 1.0, easeOut);
    text(ctx, lbl, bx - 30, y + 18, { size: 44, family: 'Head', weight: 900, color: CREAM, align: 'right', alpha: ramp(t, tb - 0.2, tb + 0.2) });
    const g = ctx.createLinearGradient(bx, 0, bx + v * ppx, 0);
    g.addColorStop(0, rgba(c, 0.3)); g.addColorStop(1, c);
    ctx.fillStyle = g; roundRect(ctx, bx, y - 40, v * ppx * k, 76, [0, 14, 14, 0]); ctx.fill();
    if (k > 0.05) richText(ctx, [[String(Math.round(v * clamp(k * 1.1))), i ? GOLD : CREAM], [' 分钟', DIM]], bx + v * ppx * k + 24, y + 26,
      { size: i ? 100 : 72, family: 'Head', weight: 900, align: 'left', shadow: 14 });
  });
  text(ctx, '长的那段，装下了更多的人', 960, 860, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, L(5) + 1.0, L(5) + 1.5) });
  ctx.restore();
};

// 长的总更容易被碰上 → 友谊悖论
const SEGS = [3, 12, 2, 6, 1.5, 15, 4, 2.5];
const DARTS = (() => {
  const rnd = mulberry32(31), tot = SEGS.reduce((a, b) => a + b, 0);
  return Array.from({ length: 26 }, (_, i) => ({ u: rnd() * tot, k: i }));
})();
const NODES = [[960, 520, 1], [700, 380, 0], [720, 680, 0], [1230, 360, 0], [1240, 690, 0], [600, 530, 0], [1340, 520, 0],
  [480, 300, 0], [470, 760, 0], [1480, 280, 0]];
const EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 8], [3, 9], [5, 8]];
SCENES.friend = (ctx, t, s) => {
  const t0 = s.start, l1 = lineAt('friend', 1);
  const ka = ramp(t, t0 - 0.2, t0 + 0.4) * (1 - ramp(t, l1 - 0.3, l1 + 0.1));
  if (ka > 0) {
    ctx.save(); ctx.globalAlpha *= ka;
    const tot = SEGS.reduce((a, b) => a + b, 0), x0 = 260, x1 = 1660, y = 600, sx = (x1 - x0) / tot;
    let acc = 0;
    SEGS.forEach(L => {
      const long = L > 5;
      ctx.fillStyle = rgba(long ? AMBER : TEAL, long ? 0.75 : 0.55);
      roundRect(ctx, x0 + acc * sx + 3, y - 12, L * sx - 6, 24, 12); ctx.fill();
      acc += L;
    });
    DARTS.forEach(d => {
      const tb = t0 + 0.1 + d.k * 0.06, k = ramp(t, tb, tb + 0.35, easeIn);
      if (k <= 0) return;
      const x = x0 + d.u * sx, yy = lerp(260, y - 22, k);
      glowDot(ctx, x, yy, 18, GOLD, 0.6); circle(ctx, x, yy, 6); ctx.fillStyle = GOLD; ctx.fill();
    });
    text(ctx, '随手一戳，多半戳中长的', 960, 760, { size: 44, family: 'Head', weight: 900, color: CREAM, alpha: ramp(t, t0 + 0.8, t0 + 1.2) });
    ctx.restore();
  }
  const kn = ramp(t, l1 - 0.2, l1 + 0.4);
  if (kn <= 0) return;
  ctx.save(); ctx.globalAlpha *= kn;
  text(ctx, '友谊悖论：同一个道理', 960, 190, { size: 52, family: 'Head', weight: 900, color: GOLD, shadow: 14 });
  ctx.strokeStyle = 'rgba(251,243,228,0.35)'; ctx.lineWidth = 3;
  for (const [a, b] of EDGES) {
    ctx.beginPath(); ctx.moveTo(NODES[a][0], NODES[a][1] - 40); ctx.lineTo(NODES[b][0], NODES[b][1] - 40); ctx.stroke();
  }
  NODES.forEach(([x, y, hub], i) => {
    drawPerson(ctx, x, y + (hub ? 20 : 10), hub ? 0.9 : 0.6, hub ? AMBER : ['#8fa3c7', '#7cc6c0', '#c7b0e8', '#9fb0d8'][i % 4], { glow: hub ? 0.8 * (0.7 + 0.3 * barPulse(t)) : 0 });
  });
  text(ctx, '人缘好的人，出现在更多人的好友名单里', 960, 880, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, l1 + 0.4, l1 + 0.8) });
  tagSketch(ctx, W - 80, 160, 1);
  ctx.restore();
};

SCENES.end = (ctx, t, s) => {
  const t0 = s.start, L = n => lineAt('end', n);
  const z = 1.06 - 0.06 * ramp(t, t0, TL.music.end, x => x);
  ctx.save();
  ctx.translate(960, 600); ctx.scale(z, z); ctx.translate(-960, -600);
  drawStreet(ctx, t, { sign: 0.6 + 0.2 * barPulse(t) });
  // 两辆一起来
  const kc = ramp(t, L(4) - 0.2, L(4) + 3.2, easeOut);
  if (kc > 0) {
    const xa = lerp(-420, 640, kc);
    drawBus(ctx, xa - 182, GROUND + 66, 1.0, { beam: 1, alpha: clamp(kc * 3) });
    drawBus(ctx, xa, GROUND + 66, 1.0, { beam: 1, alpha: clamp(kc * 3) });
  }
  drawPerson(ctx, 1130, GROUND - 6, 1.35, '#e89a5a', { look: -1 + 0.6 * ramp(t, L(4) + 0.8, L(4) + 1.6), phone: 1 - ramp(t, L(1), L(1) + 0.6) });
  ctx.restore();
  // 一段长长的空白
  const kl = ramp(t, L(2), L(2) + 0.8) * (1 - ramp(t, L(4) + 1.0, L(4) + 2.0));
  if (kl > 0) {
    const y = 860, a = 160, b = 1760;
    ctx.save(); ctx.globalAlpha *= kl;
    ctx.fillStyle = rgba('#ffe1b0', 0.5); ctx.fillRect(a - 40, y - 2, b - a + 80, 4);
    const kw = ramp(t, L(3), L(3) + 1.2);
    ctx.fillStyle = rgba(AMBER, 0.55); ctx.fillRect(lerp(1130, a, kw), y - 6, lerp(0, b - a, kw), 12);
    for (const x of [a, b]) { glowDot(ctx, x, y, 34, AMBER, 0.9); circle(ctx, x, y, 7); ctx.fillStyle = '#fff1c4'; ctx.fill(); }
    glowDot(ctx, 1130, y, 30, GOLD, 0.9);
    text(ctx, '你', 1130, y - 24, { size: 36, family: 'Head', weight: 900, color: GOLD });
    ctx.restore();
  }
  // 起势处的大字
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, L(1) + 0.2, L(1) + 0.9));
  if (kb > 0) {
    ctx.fillStyle = `rgba(7,9,21,${0.45 * kb})`; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(960, 460); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '不是你运气差', 0, 0, { size: 160, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 20);
  ctx.save();
  ctx.translate(0, -210);
  drawStreet(ctx, 20, { sign: 1 });
  drawBus(ctx, 380, GROUND + 66, 1.0, { beam: 1 });
  drawBus(ctx, 562, GROUND + 66, 1.0, { beam: 1 });
  drawPerson(ctx, 1130, GROUND - 6, 1.35, '#e89a5a', { look: -1 });
  ctx.restore();
  const g = ctx.createLinearGradient(0, 480, 0, H);
  g.addColorStop(0, 'rgba(7,9,21,0)'); g.addColorStop(0.3, 'rgba(7,9,21,0.8)'); g.addColorStop(1, 'rgba(7,9,21,0.95)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  richText(ctx, [['10', GOLD], [' 分钟一班', CREAM]], 960, 730, { size: 130, family: 'Head', weight: 900, shadow: 30 });
  richText(ctx, [['为什么要等不止 ', CREAM], ['5', GOLD], [' 分钟', CREAM]], 960, 890, { size: 120, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, `等车悖论 · 模拟 ${SIM.passengers / 1e4} 万个等车的人`, 960, 990, { size: 46, family: 'Sans', weight: 700, color: AMBER, spacing: 4 });
}
