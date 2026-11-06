// Gamow–Stern 电梯悖论：画面
// 美术方向：深青色夜里的一栋 7 层小楼，剖开来看，中间是发着琥珀色光的电梯井。
// 往下用珊瑚红，往上用薄荷绿；关键数字用金色。没有人声，画面跟着配乐走。

const CREAM = '#f7f0e3';
const GOLD = '#ffd27a';
const DOWN = '#ff8f7a';
const UP = '#7fe3c9';
const AMBER = '#ffb65c';
const DIM = 'rgba(247,240,227,0.62)';
const SKIN = '#f3d9c4';
const SIM = DATA.sim;
const FLOORS = SIM.floors;
const pct = v => Math.round(v * 100);
const P1 = SIM.curves['1'];

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
// 三角箭头：中心 (x, y)，up 为真朝上
function arrow(ctx, x, y, size, up, color, o = {}) {
  const { alpha = 1, glow = 0 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glow) glowDot(ctx, x, y, size * 1.6, color, 0.45 * glow);
  const d = up ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x, y + d * size * 0.55);
  ctx.lineTo(x - size * 0.6, y - d * size * 0.45);
  ctx.lineTo(x + size * 0.6, y - d * size * 0.45);
  ctx.closePath();
  ctx.fillStyle = color; ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.12; ctx.strokeStyle = color;
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
const fmtInt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// 电梯在往返周期里的位置：u ∈ [0, 0.5) 往上，[0.5, 1) 往下；pos 以层为单位，0 = 1 楼
function carAt(t, period, phase = 0) {
  const u = (((t / period + phase) % 1) + 1) % 1;
  const up = u < 0.5;
  return { u, up, pos: (up ? u * 2 : 2 - u * 2) * (FLOORS - 1) };
}
// 这一部电梯下一次经过 floor（1 起）还要多久（以周期为单位），以及到时的方向
function nextArrival(u, floor) {
  const a = (floor - 1) / (2 * (FLOORS - 1)), b = 1 - a;
  const du = (((a - u) % 1) + 1) % 1, dd = (((b - u) % 1) + 1) % 1;
  return du < dd ? { d: du, down: false } : { d: dd, down: true };
}

// ---------- 背景：深青夜色，远处的城市，飘浮的光点 ----------
const BOKEH = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 60 }, () => ({ x: rnd() * W, y: rnd() * H, r: 2 + rnd() * 5, v: 3 + rnd() * 8, ph: rnd() * 6, warm: rnd() < 0.6 }));
})();
const SKYLINE = (() => {
  const rnd = mulberry32(5), out = [];
  let x = -40;
  while (x < W + 40) {
    const w = 60 + rnd() * 120, h = 60 + rnd() * 190;
    const wins = [];
    for (let i = 0; i < 6; i++) if (rnd() < 0.5) wins.push([rnd(), rnd()]);
    out.push({ x, w, h, wins });
    x += w + 6 + rnd() * 20;
  }
  return out;
})();
const warmth = t => ramp(t, TL.music.end - 15, TL.music.end - 11);

function drawBackground(ctx, t) {
  const w = warmth(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#0f2a31', '#2a2433', w));
  g.addColorStop(0.65, mix('#0b1e24', '#1e1a26', w));
  g.addColorStop(1, mix('#061215', '#120e15', w));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  glowDot(ctx, 960, 1180, 1100, AMBER, 0.06 + 0.05 * lv + 0.05 * w);
  // 远处的楼
  for (const b of SKYLINE) {
    const top = H - b.h;
    ctx.fillStyle = 'rgba(8,24,28,0.85)';
    ctx.fillRect(b.x, top, b.w, b.h);
    for (const [wx, wy] of b.wins) {
      ctx.fillStyle = rgba(AMBER, 0.12 + 0.08 * Math.sin(t * 0.5 + wx * 9));
      ctx.fillRect(b.x + 8 + wx * (b.w - 24), top + 12 + wy * (b.h - 30), 8, 11);
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of BOKEH) {
    const y = (d.y - d.v * t + H * 10) % H, x = d.x + Math.sin(t * 0.25 + d.ph) * 18;
    glowDot(ctx, x, y, d.r * 4, d.warm ? '#ffcf8f' : '#8fe8d8', (0.10 + 0.22 * lv) * (0.6 + 0.4 * Math.sin(t * 0.8 + d.ph)));
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 540, 460, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- 小人 ----------
// (x, y) 是脚底中点，s=1 时约 100px 高
function person(ctx, x, y, s, col, o = {}) {
  const { alpha = 1, glasses = false, hair = '#2a2630', glow = 0, mouth = 'smile', look = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -50, 95, col, 0.5 * glow);
  ctx.fillStyle = '#20343a';
  roundRect(ctx, -12, -24, 10, 24, 4); ctx.fill();
  roundRect(ctx, 2, -24, 10, 24, 4); ctx.fill();
  const g = ctx.createLinearGradient(0, -66, 0, -20);
  g.addColorStop(0, col); g.addColorStop(1, mix(col, '#000000', 0.28));
  ctx.fillStyle = g;
  roundRect(ctx, -19, -66, 38, 46, [17, 17, 8, 8]); ctx.fill();
  ctx.fillStyle = SKIN; circle(ctx, 0, -84, 18); ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(0, -86, 19, Math.PI * 1.03, Math.PI * 1.97); ctx.closePath(); ctx.fill();
  const ex = look * 2.5;
  ctx.fillStyle = '#2b2228';
  circle(ctx, -6.5 + ex, -82, 2.4); ctx.fill(); circle(ctx, 6.5 + ex, -82, 2.4); ctx.fill();
  if (glasses) {
    ctx.strokeStyle = '#2b2228'; ctx.lineWidth = 1.7;
    circle(ctx, -6.5 + ex, -82, 5.6); ctx.stroke(); circle(ctx, 6.5 + ex, -82, 5.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1 + ex, -82); ctx.lineTo(1 + ex, -82); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,130,140,0.35)';
  circle(ctx, -11, -76, 3.6); ctx.fill(); circle(ctx, 11, -76, 3.6); ctx.fill();
  ctx.strokeStyle = '#9b5a55'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath();
  if (mouth === 'smile') ctx.arc(ex, -77, 4.2, 0.2 * Math.PI, 0.8 * Math.PI);
  else if (mouth === 'o') circle(ctx, ex, -74.5, 2.4);
  else { ctx.moveTo(-3.5 + ex, -74.5); ctx.lineTo(3.5 + ex, -74.5); }
  ctx.stroke();
  ctx.restore();
}
const GAMOW = { col: '#e9a868', glasses: true, name: 'Gamow' };
const STERN = { col: '#8fb8e8', glasses: false, name: 'Stern' };

function tag(ctx, str, x, y, col, o = {}) {
  const { alpha = 1, size = 32, align = 'center' } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  font(ctx, size, 'Serif', 700);
  const w = ctx.measureText(str).width + size * 1.1, h = size * 1.55;
  const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  roundRect(ctx, x0, y - h / 2, w, h, h / 2);
  ctx.fillStyle = rgba(col, 0.16); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  text(ctx, str, x0 + w / 2, y + size * 0.36, { size, family: 'Serif', weight: 700, color: CREAM, alpha });
}

// ---------- 楼的剖面 ----------
const WINDOWS = (() => {
  const rnd = mulberry32(19);
  return Array.from({ length: FLOORS * 8 }, () => ({ lit: rnd() < 0.7, ph: rnd() * 6, hue: rnd() }));
})();
// o.cars: [{pos, up, hot}]；返回几何信息供叠加标注
function building(ctx, t, o = {}) {
  const { cx = 960, by = 890, fh = 92, bw = 460, cars = [], shaftW = 84, gap = 30, alpha = 1, labels = true,
    floorAlpha = null, shaftAlpha = 1, lampDir = null, glowShaft = 0.5 } = o;
  const n = Math.max(1, cars.length);
  const geo = { cx, by, fh, bw, top: by - FLOORS * fh, fy: k => by - (k - 0.5) * fh, slab: k => by - (k - 1) * fh, shafts: [] };
  if (alpha <= 0.002) return geo;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const left = cx - bw / 2, top = geo.top;
  // 楼体
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40;
  const wg = ctx.createLinearGradient(left, 0, left + bw, 0);
  wg.addColorStop(0, '#173238'); wg.addColorStop(0.5, '#1d3d44'); wg.addColorStop(1, '#152c32');
  ctx.fillStyle = wg;
  roundRect(ctx, left, top - 26, bw, FLOORS * fh + 26, [22, 22, 4, 4]); ctx.fill();
  ctx.shadowColor = 'transparent';
  // 屋顶的小灯
  glowDot(ctx, cx, top - 46, 40, DOWN, 0.5 + 0.4 * barPulse(t));
  ctx.fillStyle = '#2a4a50'; ctx.fillRect(cx - 2, top - 46, 4, 22);
  circle(ctx, cx, top - 48, 6); ctx.fillStyle = DOWN; ctx.fill();
  // 电梯井区域
  const zone = n * shaftW + (n - 1) * gap;
  const sx0 = cx - zone / 2;
  for (let k = 1; k <= FLOORS; k++) {
    const y0 = geo.slab(k) - fh, fa = floorAlpha ? floorAlpha(k) : 1;
    ctx.save(); ctx.globalAlpha *= fa;
    // 两侧窗户
    const sideW = (bw - zone) / 2 - 26;
    if (sideW > 40) {
      const nw = Math.max(1, Math.floor(sideW / 62));
      for (const side of [0, 1]) for (let i = 0; i < nw; i++) {
        const wdat = WINDOWS[((k - 1) * 8 + side * 4 + i) % WINDOWS.length];
        const ww = sideW / nw - 14, x = side === 0 ? left + 18 + i * (sideW / nw) : cx + zone / 2 + 14 + i * (sideW / nw);
        roundRect(ctx, x, y0 + fh * 0.2, ww, fh * 0.5, 6);
        if (wdat.lit) {
          const a = 0.55 + 0.12 * Math.sin(t * 0.6 + wdat.ph);
          ctx.fillStyle = rgba(mix('#ffcf8f', '#ffe7b8', wdat.hue), a); ctx.fill();
          glowDot(ctx, x + ww / 2, y0 + fh * 0.45, ww * 0.9, '#ffcf8f', 0.12);
        } else { ctx.fillStyle = 'rgba(10,26,30,0.8)'; ctx.fill(); }
      }
    }
    ctx.restore();
    // 楼板
    ctx.fillStyle = 'rgba(120,170,170,0.22)';
    ctx.fillRect(left, geo.slab(k) - 3, bw, 4);
    if (labels) text(ctx, `${k}`, left - 34, geo.fy(k) + 12, { size: 34, family: 'Head', weight: 900, color: rgba(CREAM, 0.55 * fa) });
  }
  // 井道和轿厢
  for (let i = 0; i < n; i++) {
    const x = sx0 + i * (shaftW + gap);
    geo.shafts.push(x + shaftW / 2);
    ctx.save(); ctx.globalAlpha *= shaftAlpha;
    ctx.fillStyle = '#0b1a1e';
    ctx.fillRect(x, top, shaftW, FLOORS * fh);
    const sg = ctx.createLinearGradient(x, 0, x + shaftW, 0);
    sg.addColorStop(0, rgba(AMBER, 0)); sg.addColorStop(0.5, rgba(AMBER, 0.10 * glowShaft + 0.05 * musicLevel(t))); sg.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = sg; ctx.fillRect(x, top, shaftW, FLOORS * fh);
    ctx.strokeStyle = 'rgba(255,200,140,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 8, top); ctx.lineTo(x + 8, by); ctx.moveTo(x + shaftW - 8, top); ctx.lineTo(x + shaftW - 8, by); ctx.stroke();
    const c = cars[i];
    if (c) {
      const ch = fh - 16, cy = by - c.pos * fh - 8 - ch, cw = shaftW - 18;
      ctx.strokeStyle = 'rgba(255,220,170,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + shaftW / 2, top); ctx.lineTo(x + shaftW / 2, cy); ctx.stroke();
      glowDot(ctx, x + shaftW / 2, cy + ch / 2, fh * 1.3, c.hot ? GOLD : AMBER, 0.35 + 0.35 * (c.hot || 0));
      const cg = ctx.createLinearGradient(0, cy, 0, cy + ch);
      cg.addColorStop(0, '#ffe3b0'); cg.addColorStop(1, '#ffb65c');
      ctx.fillStyle = cg;
      roundRect(ctx, x + 9, cy, cw, ch, 8); ctx.fill();
      ctx.fillStyle = 'rgba(120,70,30,0.35)';
      ctx.fillRect(x + shaftW / 2 - 1, cy + 6, 2, ch - 12);
      arrow(ctx, x + shaftW / 2, cy + ch / 2, Math.min(26, cw * 0.4), c.up, c.up ? '#2f8f7a' : '#c4523f');
      if (c.face) carFace(ctx, x + shaftW / 2, cy + ch / 2, cw, c.face);
    }
    ctx.restore();
  }
  // 楼层指示灯
  if (lampDir) for (let k = 1; k <= FLOORS; k++) {
    const d = lampDir(k);
    if (!d) continue;
    arrow(ctx, sx0 - 22, geo.fy(k) - fh * 0.15, 16, d.up, d.up ? UP : DOWN, { alpha: d.a, glow: d.a });
  }
  ctx.restore();
  return geo;
}
function carFace(ctx, x, y, w, k) {
  ctx.save(); ctx.globalAlpha *= k;
  ctx.fillStyle = '#5a3420';
  circle(ctx, x - w * 0.2, y - w * 0.08, w * 0.06); ctx.fill();
  circle(ctx, x + w * 0.2, y - w * 0.08, w * 0.06); ctx.fill();
  ctx.strokeStyle = '#5a3420'; ctx.lineWidth = w * 0.04; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x + w * 0.04, y + w * 0.06, w * 0.12, 0.1 * Math.PI, 0.7 * Math.PI); ctx.stroke();
  ctx.restore();
}

// ---------- 电梯厅（近景） ----------
function lobby(ctx, t, o = {}) {
  const { open = 0, display = '2', down = 0, up = 0, call = 0, alpha = 1, q = 0, mood = 'calm', history = 0, look = 0 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  const fy = 860;
  // 墙
  const wg = ctx.createLinearGradient(0, 120, 0, fy);
  wg.addColorStop(0, '#16303a'); wg.addColorStop(1, '#10252c');
  ctx.fillStyle = wg; roundRect(ctx, 300, 120, 1320, fy - 120, [30, 30, 0, 0]); ctx.fill();
  // 地面
  const gg = ctx.createLinearGradient(0, fy, 0, H);
  gg.addColorStop(0, '#1b363c'); gg.addColorStop(1, 'rgba(10,20,24,0)');
  ctx.fillStyle = gg; ctx.fillRect(160, fy, 1600, 200);
  // 门框
  const dx = 960, dw = 400, dh = 520, dy = fy - dh;
  ctx.fillStyle = '#2c4c52'; roundRect(ctx, dx - dw / 2 - 26, dy - 26, dw + 52, dh + 26, [16, 16, 0, 0]); ctx.fill();
  // 轿厢内部
  const ig = ctx.createLinearGradient(0, dy, 0, fy);
  ig.addColorStop(0, '#ffe2ac'); ig.addColorStop(1, '#f2a85a');
  ctx.fillStyle = ig; ctx.fillRect(dx - dw / 2, dy, dw, dh);
  ctx.fillStyle = 'rgba(150,90,40,0.25)'; ctx.fillRect(dx - dw / 2, dy + dh * 0.55, dw, 4);
  // 门
  const half = dw / 2 * (1 - easeInOut(clamp(open)) * 0.94);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? dx - dw / 2 : dx + dw / 2 - half;
    const mg = ctx.createLinearGradient(x0, 0, x0 + half, 0);
    mg.addColorStop(0, '#5d7e84'); mg.addColorStop(0.5, '#7d9ea2'); mg.addColorStop(1, '#58777c');
    ctx.fillStyle = mg; ctx.fillRect(x0, dy, half, dh);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0 + half * 0.2, dy, 4, dh);
  }
  ctx.fillStyle = '#20393f'; ctx.fillRect(dx - 2, dy, 4, dh * (1 - clamp(open)));
  // 开门时的光
  if (open > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const w2 = dw * clamp(open);
    const lg = ctx.createLinearGradient(0, fy, 0, fy + 200);
    lg.addColorStop(0, rgba(AMBER, 0.35 * open)); lg.addColorStop(1, rgba(AMBER, 0));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(dx - w2 / 2, fy); ctx.lineTo(dx + w2 / 2, fy); ctx.lineTo(dx + w2 * 0.9, fy + 200); ctx.lineTo(dx - w2 * 0.9, fy + 200); ctx.fill();
    ctx.restore();
  }
  // 指示屏
  const py = dy - 110;
  ctx.fillStyle = '#0a1518'; roundRect(ctx, dx - 130, py - 44, 260, 88, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,170,0.25)'; ctx.lineWidth = 2; ctx.stroke();
  arrow(ctx, dx - 76, py, 34, true, up > 0 ? UP : 'rgba(127,227,201,0.15)', { glow: up });
  arrow(ctx, dx + 76, py, 34, false, down > 0 ? DOWN : 'rgba(255,143,122,0.15)', { glow: down });
  text(ctx, display, dx, py + 22, { size: 64, family: 'Head', weight: 900, color: '#ffcf8f' });
  // 呼梯按钮
  const bx = dx + dw / 2 + 110, byy = fy - 300;
  ctx.fillStyle = '#2c4c52'; roundRect(ctx, bx - 38, byy - 80, 76, 160, 38); ctx.fill();
  circle(ctx, bx, byy - 36, 24); ctx.fillStyle = call > 0 ? rgba(UP, 0.25 + 0.5 * call) : '#1a3036'; ctx.fill();
  if (call > 0) glowDot(ctx, bx, byy - 36, 70, UP, 0.5 * call);
  arrow(ctx, bx, byy - 36, 22, true, call > 0 ? '#eafff8' : 'rgba(255,255,255,0.35)');
  circle(ctx, bx, byy + 36, 24); ctx.fillStyle = '#1a3036'; ctx.fill();
  arrow(ctx, bx, byy + 36, 22, false, 'rgba(255,255,255,0.35)');
  // 人
  const px = 610;
  person(ctx, px, fy, 2.7, GAMOW.col, { glasses: true, mouth: mood, look });
  if (q > 0) {
    const s = easeBack(clamp(q));
    text(ctx, '?', px + 90, fy - 330 - 20 * s, { size: 150 * s, family: 'Head', weight: 900, color: GOLD, shadow: 30, alpha: clamp(q * 2) });
  }
  // 之前几次
  if (history > 0) {
    for (let i = 0; i < 5; i++) {
      const k = ramp(history, i / 5, i / 5 + 0.25, easeBack);
      arrow(ctx, 1450 + (i % 5) * 0 , 300 + i * 92, 46 * clamp(k, 0, 1.2), false, DOWN, { alpha: clamp(k) * (0.4 + 0.6 * (i === 4)), glow: 0.4 });
    }
  }
  ctx.restore();
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2), t3 = lineAt('hook', 3);
  const fl = Math.round(lerp(6, 2, ramp(t, 0.4, t1 - 0.1, x => x)));
  const open = ramp(t, t1, t1 + 0.8) * (1 - ramp(t, t3 + 0.2, t3 + 1.0));
  lobby(ctx, t, {
    display: String(fl), down: t > 0.3 ? 0.6 + 0.4 * (t > t1 ? barPulse(t) : 0) : 0, call: ramp(t, 0.6, 0.9),
    open, q: ramp(t, t2, t2 + 0.5), mood: t > t1 + 0.3 ? 'o' : 'smile', history: ramp(t, t3, t3 + 1.6, x => x), look: t > t2 ? -1 : 0,
  });
  if (t > t3) text(ctx, '又一次', 1450, 225, { size: 34, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t3, t3 + 0.5) });
};

SCENES.setup = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('setup', 1), t2 = lineAt('setup', 2), t3 = lineAt('setup', 3);
  // 1958 和两个人
  const k0 = ramp(t, t0, t0 + 0.6) * (1 - ramp(t, t1 - 0.3, t1 + 0.4));
  if (k0 > 0) {
    text(ctx, '1958', 960, 470, { size: 330, family: 'Head', weight: 900, color: 'rgba(255,214,150,0.12)', alpha: k0 });
    const kp = ramp(t, t0 + 0.3, t0 + 0.9, easeBack);
    person(ctx, 820, 760, 2.3 * clamp(kp, 0, 1.1), GAMOW.col, { glasses: true, alpha: k0 });
    person(ctx, 1100, 760, 2.3 * clamp(kp, 0, 1.1), STERN.col, { alpha: k0 });
    tag(ctx, 'Gamow', 820, 820, GAMOW.col, { alpha: k0 * clamp(kp) });
    tag(ctx, 'Stern', 1100, 820, STERN.col, { alpha: k0 * clamp(kp) });
  }
  const kb = ramp(t, t1 - 0.2, t1 + 0.7, easeOut);
  if (kb <= 0) return;
  const car = carAt(t, 8.5, 0.12);
  const geo = building(ctx, t, { alpha: kb, by: 900 + 60 * (1 - kb), cars: [car] });
  text(ctx, '7 层', geo.cx + geo.bw / 2 + 40, geo.top + 10, { size: 54, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: kb * (1 - ramp(t, t2, t2 + 0.5)) });
  const kg = ramp(t, t2, t2 + 0.5, easeBack), ks = ramp(t, t3, t3 + 0.5, easeBack);
  const sx = geo.shafts[0];
  person(ctx, sx - 100, geo.slab(2), 0.62 * clamp(kg, 0, 1.2), GAMOW.col, { glasses: true, glow: 0.6 * clamp(kg) });
  person(ctx, sx + 100, geo.slab(6), 0.62 * clamp(ks, 0, 1.2), STERN.col, { glow: 0.6 * clamp(ks) });
  tag(ctx, 'Gamow · 2 楼', geo.cx - geo.bw / 2 - 90, geo.fy(2), GAMOW.col, { align: 'right', size: 38, alpha: clamp(kg) });
  tag(ctx, 'Stern · 6 楼', geo.cx + geo.bw / 2 + 50, geo.fy(6), STERN.col, { align: 'left', size: 38, alpha: clamp(ks) });
};

// 每人一张记录卡，箭头按拍子一个个弹出
function logCard(ctx, t, x, y, who, floor, seq, tStart, o = {}) {
  const { alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const w = 470, h = 290;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 24);
  ctx.fillStyle = 'rgba(8,22,26,0.82)'; ctx.fill();
  ctx.strokeStyle = rgba(who.col, 0.6); ctx.lineWidth = 2.5; ctx.stroke();
  text(ctx, `${who.name} 在 ${floor} 楼等到的`, x, y - h / 2 + 50, { size: 34, family: 'Serif', weight: 700, color: CREAM });
  let nd = 0, nu = 0;
  seq.forEach((d, i) => {
    const tb = beatAfter(tStart, Math.floor(i / 2)) + (i % 2) * TL.music.beat / 2;
    const k = ramp(t, tb, tb + 0.22, easeBack);
    if (t >= tb) d ? nd++ : nu++;
    const cx = x - w / 2 + 44 + (i % 8) * 54, cy = y - 28 + Math.floor(i / 8) * 62;
    arrow(ctx, cx, cy, 34 * clamp(k, 0, 1.25), !d, d ? DOWN : UP, { alpha: clamp(k) });
  });
  richText(ctx, [['往下 ', DIM], [String(nd), DOWN], ['    往上 ', DIM], [String(nu), UP]], x, y + h / 2 - 26, { size: 36, family: 'Serif', weight: 700 });
  ctx.restore();
}

SCENES.observe = (ctx, t, s) => {
  const t0 = s.start, tG = lineAt('observe', 1), tS = lineAt('observe', 3);
  const car = carAt(t, 8.5, 0.12);
  const geo = building(ctx, t, { by: 890, fh: 86, bw: 420, cars: [car] });
  const sx = geo.shafts[0];
  person(ctx, sx - 95, geo.slab(2), 0.58, GAMOW.col, { glasses: true, glow: 0.5 });
  person(ctx, sx + 95, geo.slab(6), 0.58, STERN.col, { glow: 0.5 });
  // 起势：两边的大箭头
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, tG - 0.4, tG + 0.2));
  if (kb > 0) {
    const sc = 1 + 0.03 * barPulse(t);
    text(ctx, '同一部电梯，两种运气', 960, 150, { size: 84, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 30 });
    arrow(ctx, 470, geo.fy(2) - 70, 150 * sc, false, DOWN, { alpha: kb, glow: 0.8 });
    text(ctx, '2 楼', 470, geo.fy(2) + 80, { size: 64, family: 'Head', weight: 900, color: CREAM, alpha: kb });
    arrow(ctx, 1450, geo.fy(6) - 40, 150 * sc, true, UP, { alpha: kb, glow: 0.8 });
    text(ctx, '6 楼', 1450, geo.fy(6) + 110, { size: 64, family: 'Head', weight: 900, color: CREAM, alpha: kb });
  }
  logCard(ctx, t, 420, geo.fy(2) - 40, GAMOW, 2, SIM.demo_gamow, tG, { alpha: ramp(t, tG - 0.3, tG + 0.3) });
  logCard(ctx, t, 1500, geo.fy(6) + 40, STERN, 6, SIM.demo_stern, tS, { alpha: ramp(t, tS - 0.3, tS + 0.3) });
  const ka = ramp(t, tG - 0.3, tG + 0.3);
  text(ctx, '前 16 次（模拟）', 420, geo.fy(2) + 140, { size: 26, family: 'Sans', weight: 400, color: DIM, alpha: ka });
  text(ctx, '前 16 次（模拟）', 1500, geo.fy(6) + 220, { size: 26, family: 'Sans', weight: 400, color: DIM, alpha: ramp(t, tS - 0.3, tS + 0.3) });
};

SCENES.tease = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('tease', 1);
  // 坏笑的电梯，眼睛左右瞟
  const k = ramp(t, t0, t0 + 0.5, easeBack) * (1 - ramp(t, t1 + 0.6, s.end));
  const cx = 960, cy = 470, w = 300 * clamp(k, 0, 1.1), h = 340 * clamp(k, 0, 1.1);
  if (k > 0) {
    glowDot(ctx, cx, cy, 420, AMBER, 0.35 * clamp(k));
    const cg = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    cg.addColorStop(0, '#ffe3b0'); cg.addColorStop(1, '#ffb65c');
    ctx.fillStyle = cg; roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 30); ctx.fill();
    const look = Math.sin((t - t0) * Math.PI / (2 * TL.music.beat)) * w * 0.07;
    ctx.fillStyle = '#5a3420';
    for (const sxx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sxx * w * 0.2 + look, cy - h * 0.1, w * 0.05, w * 0.07, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#5a3420'; ctx.lineWidth = w * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.14, cy + h * 0.1); ctx.quadraticCurveTo(cx + w * 0.04, cy + h * 0.2, cx + w * 0.18, cy + h * 0.06); ctx.stroke();
    arrow(ctx, cx - w * 0.75, cy, 70 * clamp(k), false, DOWN, { alpha: clamp(k), glow: 0.5 });
    arrow(ctx, cx + w * 0.75, cy, 70 * clamp(k), true, UP, { alpha: clamp(k), glow: 0.5 });
    person(ctx, cx - 470, 800, 1.6, GAMOW.col, { glasses: true, mouth: 'line', alpha: clamp(k), look: 1 });
    person(ctx, cx + 470, 800, 1.6, STERN.col, { mouth: 'line', alpha: clamp(k), look: -1 });
  }
};

// ---------- 解释：上面 5 层，下面 1 层 ----------
function bracket(ctx, x, y0, y1, col, label, o = {}) {
  const { alpha = 1, size = 40 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(x - 12, y0); ctx.lineTo(x, y0); ctx.lineTo(x, y1); ctx.lineTo(x - 12, y1); ctx.stroke();
  ctx.restore();
  text(ctx, label, x + 22, (y0 + y1) / 2 + size * 0.36, { size, family: 'Head', weight: 900, color: col, align: 'left', alpha });
}

SCENES.explain = (ctx, t, s) => {
  const t0 = s.start, tRun = lineAt('explain', 1), tMost = lineAt('explain', 2), tDir = lineAt('explain', 3),
    tSim = lineAt('explain', 4), tWait = lineAt('explain', 5), tRes = lineAt('explain', 6), tTh = lineAt('explain', 7),
    tFlip = lineAt('explain', 8), tUp = lineAt('explain', 9);
  const flip = ramp(t, tFlip, tFlip + 0.8);
  const me = flip > 0.5 ? 6 : 2;
  const period = 8 * TL.music.beat;
  const car = carAt(t, period, 0.3);
  const run = t >= tRun;
  const shown = run ? car : { pos: 4.2, up: true };
  const geo = building(ctx, t, { cx: 520, by: 890, fh: 92, bw: 400, cars: [shown] });
  const sx = geo.shafts[0];
  // 我在的这层
  const fa = 1 - Math.abs(flip - 0.5) * 2;
  const who = me === 2 ? GAMOW : STERN;
  person(ctx, sx - 92, geo.slab(me), 0.6, who.col, { glasses: who.glasses, glow: 0.7, alpha: 1 - fa });
  ctx.save(); ctx.strokeStyle = rgba(GOLD, 0.8 * (1 - fa)); ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
  ctx.beginPath(); ctx.moveTo(geo.cx - geo.bw / 2 + 6, geo.fy(me)); ctx.lineTo(geo.cx + geo.bw / 2 - 6, geo.fy(me)); ctx.stroke(); ctx.restore();
  // 上下的光柱：上面会往下来（红），下面会往上来（绿）
  const kc = ramp(t, t0, t0 + 0.6);
  const yMe = geo.fy(me), yTop = geo.fy(FLOORS), yBot = geo.fy(1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const above = me === 2 ? DOWN : DOWN, below = UP;
  ctx.fillStyle = rgba(above, 0.18 * kc * (1 - fa)); ctx.fillRect(sx - 42, yTop, 84, yMe - yTop);
  ctx.fillStyle = rgba(below, 0.22 * kc * (1 - fa)); ctx.fillRect(sx - 42, yMe, 84, yBot - yMe);
  ctx.restore();
  const nUp = FLOORS - me, nDn = me - 1;
  bracket(ctx, geo.cx + geo.bw / 2 + 30, yTop, yMe - 6, DOWN, `${nUp} 层`, { alpha: kc * (1 - fa) });
  bracket(ctx, geo.cx + geo.bw / 2 + 30, yMe + 6, yBot, UP, `${nDn} 层`, { alpha: kc * (1 - fa) });

  // 右侧面板 1：起势大字
  const k1 = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, tRun - 0.4, tRun + 0.2));
  if (k1 > 0) {
    const sc = 1 + 0.02 * barPulse(t);
    richText(ctx, [['上面 ', CREAM], ['5', DOWN], [' 层', CREAM]], 1330, 420, { size: 150 * sc, family: 'Head', weight: 900, alpha: k1, shadow: 30 });
    richText(ctx, [['下面 ', CREAM], ['1', UP], [' 层', CREAM]], 1330, 640, { size: 150 * sc, family: 'Head', weight: 900, alpha: k1, shadow: 30 });
    text(ctx, '站在 2 楼看', 1330, 230, { size: 48, family: 'Serif', weight: 700, color: DIM, alpha: k1 });
  }
  // 右侧面板 2：往返一趟的时间条
  const k2 = ramp(t, tRun - 0.2, tRun + 0.5) * (1 - ramp(t, tSim - 0.3, tSim + 0.3));
  if (k2 > 0) {
    ctx.save(); ctx.globalAlpha *= k2;
    const x0 = 1040, x1 = 1780, y = 470, hb = 60;
    text(ctx, '电梯往返一趟', 1410, 330, { size: 50, family: 'Head', weight: 900, color: CREAM });
    text(ctx, '1 楼 → 7 楼 → 1 楼', 1410, 385, { size: 32, family: 'Serif', weight: 700, color: DIM });
    const a = 1 / 12, b = 11 / 12, kcol = ramp(t, tMost, tMost + 0.6);
    const seg = (u0, u1, col) => {
      roundRect(ctx, lerp(x0, x1, u0) + 2, y, (u1 - u0) * (x1 - x0) - 4, hb, 10);
      ctx.fillStyle = rgba(col, 0.25 + 0.6 * kcol); ctx.fill();
    };
    roundRect(ctx, x0, y, x1 - x0, hb, 12); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
    seg(0, a, UP); seg(a, b, DOWN); seg(b, 1, UP);
    // 光标随电梯走
    const cxu = lerp(x0, x1, car.u);
    ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
    roundRect(ctx, cxu - 4, y - 16, 8, hb + 32, 4); ctx.fill(); ctx.shadowBlur = 0;
    text(ctx, '在 2 楼上面', lerp(x0, x1, 0.5), y + hb + 60, { size: 42, family: 'Head', weight: 900, color: DOWN, alpha: kcol });
    text(ctx, '下面', lerp(x0, x1, a / 2), y + hb + 60, { size: 30, family: 'Serif', weight: 700, color: UP, alpha: kcol });
    text(ctx, '下面', lerp(x0, x1, (1 + b) / 2), y + hb + 60, { size: 30, family: 'Serif', weight: 700, color: UP, alpha: kcol });
    const kd = ramp(t, tDir, tDir + 0.5, easeBack);
    if (kd > 0) {
      richText(ctx, [['在上面 → 来时', CREAM], ['往下', DOWN]], 1410, 720, { size: 50, family: 'Head', weight: 900, alpha: clamp(kd) });
      richText(ctx, [['在下面 → 来时', CREAM], ['往上', UP]], 1410, 800, { size: 50, family: 'Head', weight: 900, alpha: clamp(kd) });
    }
    ctx.restore();
  }
  // 右侧面板 3：模拟
  const k3 = ramp(t, tSim - 0.2, tSim + 0.5) * (1 - ramp(t, tFlip - 0.3, tFlip + 0.3));
  if (k3 > 0) {
    ctx.save(); ctx.globalAlpha *= k3;
    const x0 = 1060, x1 = 1760, yb = 600, yt = 300;
    const N = SIM.trials, conv = SIM.converge;
    const kw = ramp(t, tWait, tRes, x => x);
    const nNow = Math.pow(N, kw);
    text(ctx, '模拟：电梯不停来回跑，在 2 楼随机时刻等', 1410, 200, { size: 32, family: 'Serif', weight: 700, color: DIM });
    richText(ctx, [['已等 ', CREAM], [fmtInt(Math.max(1, nNow)), GOLD], [' 次', CREAM]], 1410, 262, { size: 46, family: 'Head', weight: 900, alpha: ramp(t, tWait - 0.2, tWait + 0.3) });
    const X = n => lerp(x0, x1, Math.log10(n) / Math.log10(N)), Y = v => lerp(yb, yt, v);
    ctx.fillStyle = 'rgba(247,240,227,0.3)'; ctx.fillRect(x0, yb, x1 - x0, 2);
    for (const [v, lab] of [[0, '0%'], [0.5, '50%'], [1, '100%']]) {
      ctx.fillStyle = 'rgba(247,240,227,0.10)'; ctx.fillRect(x0, Y(v), x1 - x0, 1.5);
      text(ctx, lab, x0 - 14, Y(v) + 9, { size: 26, family: 'Sans', weight: 400, color: DIM, align: 'right' });
    }
    for (const [n, lab] of [[1, '1'], [100, '100'], [10000, '1 万'], [N, '10 万']]) text(ctx, lab, X(n), yb + 38, { size: 26, family: 'Sans', weight: 400, color: DIM });
    text(ctx, '等的次数', x1, yb + 74, { size: 24, family: 'Sans', weight: 400, color: DIM, align: 'right' });
    // 理论线
    const th = SIM.theory_single[1], kth = ramp(t, tTh, tTh + 0.5);
    ctx.save(); ctx.strokeStyle = rgba(GOLD, 0.35 + 0.5 * kth); ctx.lineWidth = 2.5 + 1.5 * kth; ctx.setLineDash([12, 10]);
    if (kth > 0) { ctx.shadowColor = GOLD; ctx.shadowBlur = 14 * kth; }
    ctx.beginPath(); ctx.moveTo(x0, Y(th)); ctx.lineTo(x1, Y(th)); ctx.stroke(); ctx.restore();
    // 模拟曲线
    ctx.save(); ctx.strokeStyle = DOWN; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.shadowColor = DOWN; ctx.shadowBlur = 10;
    ctx.beginPath();
    let last = null;
    for (const [n, v] of conv) {
      if (n > nNow) break;
      const p = [X(n), Y(v)];
      last ? ctx.lineTo(...p) : ctx.moveTo(...p);
      last = p;
    }
    ctx.stroke(); ctx.restore();
    if (last) glowDot(ctx, last[0], last[1], 22, DOWN, 0.9);
    // 结果
    const kr = ramp(t, tRes, tRes + 0.5, easeBack);
    if (kr > 0) {
      const v = P1[1];
      richText(ctx, [['第一部往下  ', CREAM], [`${pct(v)}%`, GOLD]], 1410, 810, { size: 100 * clamp(kr, 0, 1.15), family: 'Head', weight: 900, alpha: clamp(kr), shadow: 30 });
    }
    if (kth > 0) {
      ctx.save();
      roundRect(ctx, 1490, Y(th) + 22, 270, 76, 16); ctx.fillStyle = `rgba(8,22,26,${0.85 * kth})`; ctx.fill();
      ctx.restore();
      richText(ctx, [['理论值 ', CREAM], ['5/6', GOLD]], 1625, Y(th) + 74, { size: 42, family: 'Head', weight: 900, alpha: kth });
    }
    ctx.restore();
  }
  // 右侧面板 4：反过来
  const k4 = ramp(t, tFlip - 0.1, tFlip + 0.5);
  if (k4 > 0) {
    const kU = ramp(t, tUp, tUp + 0.5, easeBack);
    richText(ctx, [['2 楼  ', CREAM], ['往下 ', DOWN], [`${pct(P1[1])}%`, GOLD]], 1100, 440, { size: 96, family: 'Head', weight: 900, align: 'left', alpha: k4 * (1 - 0.45 * clamp(kU)), shadow: 20 });
    arrow(ctx, 1020, 405, 70, false, DOWN, { alpha: k4 * (1 - 0.45 * clamp(kU)), glow: 0.5 });
    if (kU > 0) {
      richText(ctx, [['6 楼  ', CREAM], ['往上 ', UP], [`${pct(1 - P1[5])}%`, GOLD]], 1100, 700, { size: 110 * clamp(kU, 0, 1.15), family: 'Head', weight: 900, align: 'left', alpha: clamp(kU), shadow: 24 });
      arrow(ctx, 1020, 662, 80 * clamp(kU), true, UP, { alpha: clamp(kU), glow: 0.8 });
    }
  }
};

// ---------- 多部电梯 ----------
SCENES.doubt = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('doubt', 1);
  const n = t < t0 + 0.6 ? 1 : t < t0 + 1.2 ? 2 : 4;
  const cars = Array.from({ length: n }, (_, i) => carAt(t, 8.5, [0.12, 0.61, 0.33, 0.85][i]));
  const kb = ramp(t, t0 - 0.3, t0 + 0.4);
  building(ctx, t, { cx: 680, by: 890, fh: 90, bw: 140 + n * 110 + 150, cars, shaftW: 76, gap: 26, alpha: kb });
  // 书
  const kk = ramp(t, t1 - 0.1, t1 + 0.5, easeBack);
  if (kk > 0) {
    ctx.save();
    ctx.translate(1400, 470); ctx.rotate(-0.04); ctx.scale(clamp(kk, 0, 1.1), clamp(kk, 0, 1.1));
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#e8dcc4'; roundRect(ctx, -230, -280, 460, 560, 14); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#c75d4a'; roundRect(ctx, -230, -280, 460, 150, [14, 14, 0, 0]); ctx.fill();
    text(ctx, 'Puzzle-Math', 0, -210, { size: 56, family: 'Head', weight: 900, color: '#fff3e0' });
    text(ctx, 'Gamow & Stern · 1958', 0, -158, { size: 28, family: 'Serif', weight: 700, color: 'rgba(255,243,224,0.85)' });
    text(ctx, '多几部电梯呢？', 0, -30, { size: 46, family: 'Serif', weight: 700, color: '#3a2c28' });
    text(ctx, '结果不变', 0, 80, { size: 96, family: 'Head', weight: 900, color: '#3a2c28' });
    text(ctx, '（大意）', 0, 150, { size: 28, family: 'Sans', weight: 400, color: 'rgba(58,44,40,0.6)' });
    ctx.restore();
    const kq = ramp(t, t1 + 1.2, t1 + 1.6, easeBack);
    text(ctx, '?', 1660, 330, { size: 170 * clamp(kq, 0, 1.2), family: 'Head', weight: 900, color: GOLD, shadow: 30, alpha: clamp(kq) });
  }
};

const CAR_COL = { 1: DOWN, 2: AMBER, 4: GOLD, 8: CREAM };
function shaftIcon(ctx, x, y, n, col, a) {
  const w = 12, g = 6, tot = n * w + (n - 1) * g;
  for (let i = 0; i < n; i++) {
    roundRect(ctx, x - tot / 2 + i * (w + g), y - 28, w, 56, 4);
    ctx.fillStyle = rgba(col, 0.75 * a); ctx.fill();
  }
}
SCENES.many = (ctx, t, s) => {
  const t0 = s.start, t2 = lineAt('many', 1), tK = lineAt('many', 2), t4 = lineAt('many', 3), t8 = lineAt('many', 4), tHalf = lineAt('many', 5);
  const x0 = 250, x1 = 1060, yb = 800, yt = 260;
  const X = f => lerp(x0, x1, (f - 2) / 4), Y = v => lerp(yb, yt, v);
  const ka = ramp(t, t0, t0 + 0.6);
  ctx.save(); ctx.globalAlpha *= ka;
  text(ctx, 'Knuth · 1969', 120, 150, { size: 46, family: 'Head', weight: 900, color: GOLD, align: 'left' });
  text(ctx, '各层“第一部往下”的比例（模拟）', 120, 200, { size: 30, family: 'Serif', weight: 700, color: DIM, align: 'left' });
  for (const [v, lab] of [[0, '0%'], [0.5, '50%'], [1, '100%']]) {
    ctx.fillStyle = v === 0.5 ? 'rgba(247,240,227,0.28)' : 'rgba(247,240,227,0.10)';
    ctx.fillRect(x0 - 20, Y(v), x1 - x0 + 40, v === 0.5 ? 2.5 : 1.5);
    text(ctx, lab, x0 - 36, Y(v) + 9, { size: 28, family: 'Sans', weight: 400, color: DIM, align: 'right', alpha: v === 0.5 ? 1 - ramp(t, tHalf, tHalf + 0.4) : 1 });
  }
  for (let f = 2; f <= 6; f++) text(ctx, `${f} 楼`, X(f), yb + 50, { size: 32, family: 'Serif', weight: 700, color: f === 2 ? CREAM : DIM });
  ctx.restore();
  const starts = { 1: t0 + 0.3, 2: t2, 4: t4, 8: t8 };
  for (const n of [1, 2, 4, 8]) {
    const kl = ramp(t, starts[n], starts[n] + 1.0);
    if (kl <= 0) continue;
    const curve = SIM.curves[String(n)];
    const latest = n === 8 ? t >= t8 : t < starts[n * 2];
    const a = latest || t > tHalf ? 1 : 0.45;
    ctx.save();
    ctx.strokeStyle = rgba(CAR_COL[n], a); ctx.lineWidth = latest ? 6 : 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = CAR_COL[n]; ctx.shadowBlur = latest ? 18 : 0;
    ctx.beginPath();
    for (let f = 2; f <= 6; f++) {
      const seg = clamp(kl * 4 - (f - 3));
      if (f === 2) ctx.moveTo(X(2), Y(curve[1]));
      else if (seg > 0) ctx.lineTo(lerp(X(f - 1), X(f), seg), lerp(Y(curve[f - 2]), Y(curve[f - 1]), seg));
    }
    ctx.stroke(); ctx.restore();
    for (let f = 2; f <= 6; f++) {
      const pa = clamp(kl * 4 - (f - 2));
      circle(ctx, X(f), Y(curve[f - 1]), latest ? 9 : 6); ctx.fillStyle = rgba(CAR_COL[n], pa * a); ctx.fill();
    }
    text(ctx, `${n} 部`, X(6) + 30, Y(curve[5]) + 10, { size: 30, family: 'Serif', weight: 700, color: CAR_COL[n], align: 'left', alpha: clamp(kl * 2 - 1) * a });
  }
  // 右边：2 楼的读数
  text(ctx, '2 楼，第一部往下', 1500, 200, { size: 40, family: 'Head', weight: 900, color: CREAM, alpha: ka });
  const rows = [[1, t0 + 0.3, 300], [2, t2, 450], [4, t4, 620], [8, t8, 760]];
  for (const [n, ts, y] of rows) {
    const k = ramp(t, ts, ts + 0.45, easeBack);
    if (k <= 0) continue;
    const latest = n === 8 ? true : t < (rows.find(r => r[0] === n * 2) || [0, 1e9])[1];
    const big = latest || t > tHalf;
    shaftIcon(ctx, 1290, y - 26, n, CAR_COL[n], clamp(k));
    text(ctx, `${n} 部`, 1400, y, { size: 44, family: 'Serif', weight: 700, color: CREAM, align: 'left', alpha: clamp(k) * (big ? 1 : 0.6) });
    text(ctx, `${pct(SIM.curves[String(n)][1])}%`, 1800, y + 8, { size: (big ? 100 : 70) * clamp(k, 0, 1.1), family: 'Head', weight: 900, color: n === 1 ? DOWN : GOLD, align: 'right', alpha: clamp(k) * (big ? 1 : 0.6), shadow: 20 });
  }
  const kk = ramp(t, tK, tK + 0.5, easeBack);
  if (kk > 0) richText(ctx, [['Knuth 精确解 ', DIM], ['13/18', GOLD], [` ≈ ${(SIM.knuth_two_cars * 100).toFixed(1)}%`, DIM]], 1545, 518, { size: 32 * clamp(kk, 0, 1.1), family: 'Serif', weight: 700, alpha: clamp(kk) });
  const kh = ramp(t, tHalf, tHalf + 0.6);
  if (kh > 0) {
    ctx.save(); ctx.strokeStyle = rgba(GOLD, kh); ctx.lineWidth = 4; ctx.shadowColor = GOLD; ctx.shadowBlur = 20 * (0.6 + 0.4 * barPulse(t));
    ctx.beginPath(); ctx.moveTo(x0 - 20, Y(0.5)); ctx.lineTo(lerp(x0 - 20, x1 + 20, kh), Y(0.5)); ctx.stroke(); ctx.restore();
    text(ctx, '一半', x0 - 36, Y(0.5) + 12, { size: 36, family: 'Head', weight: 900, color: GOLD, align: 'right', alpha: kh });
  }
};

// ---------- 为什么：总有一部离你很近 ----------
const WHY_PHASES = (() => { const r = mulberry32(42); return Array.from({ length: 8 }, () => r()); })();
SCENES.why = (ctx, t, s) => {
  const t0 = s.start, tNear = lineAt('why', 1), tFar = lineAt('why', 2), tClose = lineAt('why', 3), tFirst = lineAt('why', 4), tHalf = lineAt('why', 5);
  const kq = ramp(t, t0, t0 + 0.4, easeBack) * (1 - ramp(t, tNear - 0.4, tNear));
  if (kq > 0) text(ctx, '为什么？', 960, 560, { size: 170 * clamp(kq, 0, 1.1), family: 'Head', weight: 900, color: GOLD, shadow: 40, alpha: clamp(kq) });
  const kb = ramp(t, tNear - 0.4, tNear + 0.4);
  if (kb <= 0) return;
  const period = 12;
  const cars = WHY_PHASES.map(ph => carAt(t, period, ph));
  const arr = cars.map(c => nextArrival(c.u, 2));
  let best = 0;
  arr.forEach((a, i) => { if (a.d < arr[best].d) best = i; });
  const hot = ramp(t, tNear + 0.3, tNear + 0.8);
  cars.forEach((c, i) => { c.hot = i === best ? hot : 0; });
  const geo = building(ctx, t, { cx: 900, by: 900, fh: 78, bw: 1180, cars, shaftW: 88, gap: 30, alpha: kb, glowShaft: 0.3 });
  const yMe = geo.fy(2), L = geo.cx - geo.bw / 2, R = geo.cx + geo.bw / 2;
  ctx.save(); ctx.globalAlpha *= kb;
  ctx.strokeStyle = rgba(GOLD, 0.85); ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.moveTo(L, yMe); ctx.lineTo(R, yMe); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  person(ctx, L + 60, geo.slab(2), 0.56, GAMOW.col, { glasses: true, glow: 0.6, alpha: kb });
  text(ctx, '你在 2 楼', L - 64, yMe + 12, { size: 34, family: 'Head', weight: 900, color: GOLD, align: 'right', alpha: kb });
  text(ctx, '电梯位置为示意', R, geo.by + 34, { size: 24, family: 'Sans', weight: 400, color: DIM, align: 'right', alpha: kb });
  // 最近的那部
  if (hot > 0) {
    const sx = geo.shafts[best], c = cars[best];
    const cy = geo.by - c.pos * geo.fh - geo.fh / 2;
    ctx.save(); ctx.globalAlpha *= hot * (1 - ramp(t, tFar - 0.3, tFar + 0.2) + ramp(t, tFirst, tFirst + 0.4));
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.shadowColor = GOLD; ctx.shadowBlur = 16;
    roundRect(ctx, sx - 50, cy - geo.fh / 2 + 2, 100, geo.fh - 4, 12); ctx.stroke();
    ctx.restore();
  }
  // 远处：上面的地方大
  const kf = ramp(t, tFar, tFar + 0.5) * (1 - ramp(t, tClose - 0.2, tClose + 0.3));
  const zx0 = geo.shafts[0] - 50, zx1 = geo.shafts[7] + 50;
  if (kf > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(DOWN, 0.16 * kf); ctx.fillRect(zx0, geo.fy(7), zx1 - zx0, yMe - geo.fy(7));
    ctx.fillStyle = rgba(UP, 0.2 * kf); ctx.fillRect(zx0, yMe, zx1 - zx0, geo.fy(1) - yMe);
    ctx.restore();
    bracket(ctx, R + 30, geo.fy(7), yMe - 6, DOWN, '上面 5 层', { alpha: kf, size: 40 });
    bracket(ctx, R + 30, yMe + 6, geo.fy(1), UP, '下面 1 层', { alpha: kf, size: 40 });
  }
  // 近处：上下一样大
  const kc = ramp(t, tClose, tClose + 0.5) * (1 - ramp(t, tHalf + 1.2, s.end - 0.2));
  if (kc > 0) {
    const band = geo.fh * 0.42;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(DOWN, 0.28 * kc); ctx.fillRect(zx0, yMe - band, zx1 - zx0, band);
    ctx.fillStyle = rgba(UP, 0.28 * kc); ctx.fillRect(zx0, yMe, zx1 - zx0, band);
    ctx.restore();
    bracket(ctx, R + 30, yMe - band, yMe - 4, DOWN, '近处 ↓', { alpha: kc, size: 34 });
    bracket(ctx, R + 30, yMe + 4, yMe + band, UP, '近处 ↑', { alpha: kc, size: 34 });
    text(ctx, '一样大', R + 120, yMe + band + 70, { size: 40, family: 'Head', weight: 900, color: GOLD, alpha: kc });
  }
  // 一半一半（16 部电梯的模拟值）
  const kh = ramp(t, tHalf, tHalf + 0.5, easeBack);
  if (kh > 0) {
    const v = SIM.curves['8'][1];
    ctx.save();
    roundRect(ctx, 500, 110, 800, 180, 30); ctx.fillStyle = `rgba(8,22,26,${0.88 * clamp(kh)})`; ctx.fill();
    ctx.restore();
    arrow(ctx, 600, 190, 60 * clamp(kh), false, DOWN, { alpha: clamp(kh), glow: 0.6 });
    text(ctx, `${pct(v)}%`, 760, 222, { size: 90 * clamp(kh, 0, 1.1), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kh) });
    arrow(ctx, 1000, 190, 60 * clamp(kh), true, UP, { alpha: clamp(kh), glow: 0.6 });
    text(ctx, `${pct(1 - v)}%`, 1160, 222, { size: 90 * clamp(kh, 0, 1.1), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kh) });
    text(ctx, '8 部电梯，2 楼（模拟）', 900, 272, { size: 26, family: 'Sans', weight: 400, color: DIM, alpha: clamp(kh) });
  }
};

SCENES.turn = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('turn', 1);
  const open = ramp(t, t0 + 0.3, t0 + 1.1) * (1 - ramp(t, t1 + 0.6, t1 + 1.4));
  lobby(ctx, t, { display: '2', down: 0.7 + 0.3 * barPulse(t), call: 1, open, mood: 'smile', look: t > t1 ? 1 : 0 });
};

SCENES.end = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('end', 1), t2 = lineAt('end', 2), t5 = lineAt('end', 5);
  const kb = ramp(t, t0 - 0.2, t0 + 1.2);
  const focus = ramp(t, t5, t5 + 0.8);
  const car = carAt(t, 8.5, 0.12);
  const geo = building(ctx, t, {
    by: 900, fh: 90, bw: 440, cars: [car], alpha: kb * (0.35 + 0.65 * ramp(t, t1 - 0.4, t1 + 0.4)),
    floorAlpha: k => (k === 2 ? 1 : 1 - 0.55 * focus),
  });
  const sx = geo.shafts[0];
  const kl = ramp(t, t1 - 0.2, t1 + 0.6);
  for (let k = 2; k <= 6; k++) {
    const p = P1[k - 1], down = p >= 0.5, v = down ? p : 1 - p;
    const a = kl * (k === 2 ? 1 : 1 - 0.6 * focus);
    const ka = ramp(t, beatAfter(t1, k - 2), beatAfter(t1, k - 2) + 0.4, easeBack);
    person(ctx, sx - 92, geo.slab(k), 0.56, mix(UP, DOWN, p), { glasses: k === 2, alpha: a, glow: k === 2 ? 0.5 + 0.5 * focus : 0.25 });
    const col = Math.abs(p - 0.5) < 0.02 ? CREAM : down ? DOWN : UP;
    const xA = geo.cx + geo.bw / 2 + 60;
    if (Math.abs(p - 0.5) < 0.02) {
      arrow(ctx, xA, geo.fy(k) - 14, 30 * clamp(ka), true, UP, { alpha: a * clamp(ka) });
      arrow(ctx, xA + 40, geo.fy(k) + 14, 30 * clamp(ka), false, DOWN, { alpha: a * clamp(ka) });
    } else arrow(ctx, xA + 20, geo.fy(k), (24 + 50 * (v - 0.5)) * clamp(ka, 0, 1.2), !down, col, { alpha: a * clamp(ka), glow: 0.4 });
    text(ctx, `${pct(v)}%`, xA + 80, geo.fy(k) + 14, { size: 40, family: 'Head', weight: 900, color: col, align: 'left', alpha: a * clamp(ka) });
  }
  text(ctx, '1 部电梯，每层先来的方向（模拟）', geo.cx + geo.bw / 2 + 40, geo.top - 20, { size: 26, family: 'Sans', weight: 400, color: DIM, align: 'left', alpha: kl * (1 - focus) });
  if (focus > 0) {
    glowDot(ctx, sx - 92, geo.fy(2), 160, GOLD, 0.25 * focus * (0.8 + 0.2 * barPulse(t)));
    tag(ctx, '你在这里', geo.cx - geo.bw / 2 - 70, geo.fy(2), GOLD, { size: 40, align: 'right', alpha: focus });
  }
  // 起势大字
  const kt = ramp(t, t0, t0 + 0.7, easeOut) * (1 - ramp(t, t1 - 0.5, t1 + 0.1));
  if (kt > 0) {
    const sc = 0.94 + 0.06 * easeOut(prog(t, t0, t0 + 1.2)) + 0.01 * barPulse(t);
    ctx.save(); ctx.translate(960, 560); ctx.scale(sc, sc);
    glowDot(ctx, 0, -40, 600, AMBER, 0.25 * kt);
    text(ctx, '是你站的位置', 0, 0, { size: 160, family: 'Head', weight: 900, color: GOLD, alpha: kt, shadow: 40 });
    ctx.restore();
  }
  void t2;
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 30);
  const geo = building(ctx, 30, { cx: 470, by: 950, fh: 108, bw: 420, cars: [{ pos: 3.4, up: false, hot: 1 }],
    lampDir: k => (k === 2 ? { up: false, a: 1 } : k === 6 ? { up: true, a: 1 } : null) });
  const sx = geo.shafts[0];
  person(ctx, sx - 100, geo.slab(2), 0.7, GAMOW.col, { glasses: true, glow: 0.7, mouth: 'o' });
  person(ctx, sx + 100, geo.slab(6), 0.7, STERN.col, { glow: 0.7, mouth: 'o' });
  text(ctx, '电梯为什么', 1290, 330, { size: 130, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  richText(ctx, [['总往', CREAM], ['反方向', DOWN], ['走？', CREAM]], 1290, 500, { size: 130, family: 'Head', weight: 900, shadow: 30 });
  arrow(ctx, 1010, 690, 90, false, DOWN, { glow: 0.9 });
  arrow(ctx, 1570, 690, 90, true, UP, { glow: 0.9 });
  text(ctx, '2 楼', 1010, 800, { size: 50, family: 'Head', weight: 900, color: CREAM });
  text(ctx, '6 楼', 1570, 800, { size: 50, family: 'Head', weight: 900, color: CREAM });
  text(ctx, `${pct(P1[1])}%`, 1290, 720, { size: 110, family: 'Head', weight: 900, color: GOLD, shadow: 30 });
  text(ctx, '不是你运气差，是你站的位置', 1290, 930, { size: 52, family: 'Sans', weight: 700, color: GOLD, spacing: 2 });
}
