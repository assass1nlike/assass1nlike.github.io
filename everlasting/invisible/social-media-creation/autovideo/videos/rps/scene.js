// 石头剪刀布：画面
// 美术方向：深夜的牌桌。梅紫色夜幕，头顶一盏暖黄吊灯，墨绿绒布桌面；两只卡通手对决：
// 薄荷绿袖子是“人”（有习惯、会露破绽的一方），珊瑚色袖子是“读你的一方”。记分牌用琥珀色大字。
// 没有人声：字幕一出现，对应的变化就发生；曲子起势处（17.41、34.76、95.50）放屏幕中央的大字。

const CREAM = '#fbf3e4';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,243,228,0.62)';
const CORAL = '#ff8a6b';
const MINT = '#6fd3c0';
const SKIN = '#f7dcc6';
const INK = '#3b2532';
const WIN_C = '#ffd27a', TIE_C = '#c9c3d8', LOSE_C = '#8fa6d8';
const NAME = ['石头', '布', '剪刀'];
const KIND = ['rock', 'paper', 'scissors'];
const SIM = DATA.sim;
const BEATS_OF = x => (x + 1) % 3; // 能赢 x 的那一手
const PREY_OF = x => (x + 2) % 3;  // 被 x 赢的那一手

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
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
}
const fmt = n => String(Math.round(n));

// ---------- 背景：夜幕、吊灯、浮尘 ----------
const DUST = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 60 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.4, v: 3 + rnd() * 8, ph: rnd() * 6 }));
})();
function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#24183a'); g.addColorStop(0.55, '#1a1230'); g.addColorStop(1, '#0d0918');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // 吊灯的光锥
  const cone = ctx.createLinearGradient(0, 0, 0, H);
  cone.addColorStop(0, rgba('#ffcf8a', 0.10 + 0.06 * lv)); cone.addColorStop(1, rgba('#ffcf8a', 0));
  ctx.fillStyle = cone;
  ctx.beginPath(); ctx.moveTo(880, 0); ctx.lineTo(1040, 0); ctx.lineTo(1560, H); ctx.lineTo(360, H); ctx.closePath(); ctx.fill();
  glowDot(ctx, 960, -40, 520, '#ffcf8a', 0.16 + 0.10 * lv);
  for (const d of DUST) {
    const y = (d.y - d.v * t + H * 10) % H, x = d.x + Math.sin(t * 0.3 + d.ph) * 18;
    glowDot(ctx, x, y, d.r * 4, '#ffe0b0', (0.12 + 0.25 * lv) * (0.6 + 0.4 * Math.sin(t + d.ph)));
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 520, 470, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// 绒布桌面
function drawTable(ctx, t, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createRadialGradient(960, 760, 60, 960, 900, 1000);
  g.addColorStop(0, '#2c6a61'); g.addColorStop(0.5, '#1c4843'); g.addColorStop(1, '#10282a');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(960, 1260, 1280, 540, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6a3d2b'; ctx.lineWidth = 26;
  ctx.beginPath(); ctx.ellipse(960, 1260, 1280, 540, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,160,0.25)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(960, 1260, 1268, 528, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, 960, 820, 520, '#ffcf8a', 0.10 + 0.06 * musicLevel(t));
  ctx.restore();
}

// ---------- 手 ----------
// 局部坐标：手腕在原点，手指朝上（-y）。整只手（布）约 330 高。
function rr(x, y, w, h, r) { return { t: 'rr', x, y, w, h, r }; }
function cap(x1, y1, x2, y2, w) { return { t: 'cap', x1, y1, x2, y2, w }; }
const HAND = (() => {
  const fist = [rr(-54, -104, 108, 116, 30)];
  const rock = {
    sil: [...fist, ...[0, 1, 2, 3].map(i => rr(-54 + 27 * i, -132, 27, 60, 13))],
    lines: [1, 2, 3].map(i => [-54 + 27 * i, -128, -54 + 27 * i, -96]),
    thumb: cap(-44, -66, 12, -82, 28),
  };
  const scissors = {
    sil: [...fist, rr(0, -128, 27, 56, 13), rr(27, -122, 27, 50, 13), cap(-40, -96, -72, -232, 28), cap(-14, -96, 10, -246, 28)],
    lines: [[27, -120, 27, -96], [0, -124, 0, -98]],
    thumb: cap(-26, -64, 36, -84, 28),
  };
  const fingers = [0, 1, 2, 3].map(i => {
    const bx = -40 + 26 * i, a = (i - 1.5) * 0.13, L = [92, 110, 104, 84][i];
    return { bx, tip: [bx + Math.sin(a) * L, -100 - Math.cos(a) * L] };
  });
  const paper = {
    sil: [rr(-54, -112, 108, 124, 32), ...fingers.map(f => cap(f.bx, -100, f.tip[0], f.tip[1], 25)), cap(-46, -38, -100, -104, 27)],
    lines: [0, 1, 2].map(i => {
      const a = fingers[i], b = fingers[i + 1];
      const mx = (a.tip[0] + b.tip[0]) / 2, my = (a.tip[1] + b.tip[1]) / 2;
      const x0 = (a.bx + b.bx) / 2, y0 = -104;
      return [x0, y0, lerp(x0, mx, 0.62), lerp(y0, my, 0.62)];
    }),
    thumb: null,
  };
  return { rock, paper, scissors };
})();

function shapePath(ctx, s, grow, fill) {
  if (s.t === 'rr') {
    roundRect(ctx, s.x - grow, s.y - grow, s.w + 2 * grow, s.h + 2 * grow, s.r + grow);
    ctx.fill();
  } else {
    ctx.lineWidth = s.w + 2 * grow; ctx.lineCap = 'round'; ctx.strokeStyle = fill;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
  }
}

// kind: 'rock' | 'paper' | 'scissors' 或 0/1/2
function drawHand(ctx, kind, x, y, s, sleeve, o = {}) {
  const { rot = 0, mirror = false, alpha = 1, glow = 0 } = o;
  if (alpha <= 0.002) return;
  const h = HAND[typeof kind === 'number' ? KIND[kind] : kind];
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rot); if (mirror) ctx.scale(-1, 1); ctx.scale(s, s);
  if (glow > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, 0, -120, 260, sleeve, 0.35 * glow); ctx.restore();
  }
  // 袖子
  ctx.fillStyle = INK; roundRect(ctx, -65, 4, 130, 110, 20); ctx.fill();
  ctx.fillStyle = sleeve; roundRect(ctx, -60, 8, 120, 110, 16); ctx.fill();
  // 手的轮廓与填色
  ctx.fillStyle = INK;
  for (const sh of h.sil) shapePath(ctx, sh, 5, INK);
  const sg = ctx.createLinearGradient(-60, -240, 60, 10);
  sg.addColorStop(0, '#fde9d8'); sg.addColorStop(1, '#efc3a6');
  ctx.fillStyle = sg;
  for (const sh of h.sil) shapePath(ctx, sh, 0, sg);
  ctx.strokeStyle = rgba(INK, 0.5); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of h.lines) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  if (h.thumb) { shapePath(ctx, h.thumb, 5, INK); shapePath(ctx, h.thumb, 0, '#f6d3bb'); }
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-26, -58, 16, 24, -0.3, 0, Math.PI * 2); ctx.fill();
  // 袖口
  ctx.fillStyle = INK; roundRect(ctx, -70, -3, 140, 34, 16); ctx.fill();
  ctx.fillStyle = mix(sleeve, '#ffffff', 0.35); roundRect(ctx, -66, 1, 132, 26, 13); ctx.fill();
  ctx.restore();
}

// 对决姿势：左手朝右、右手朝左；pump 是“石头剪刀布”时的上下晃动（0..1）
function leftHand(ctx, kind, x, y, s, sleeve, o = {}) {
  drawHand(ctx, kind, x, y - (o.pump || 0) * 60, s, sleeve, { ...o, rot: Math.PI / 2 - 0.12 * (o.pump || 0) });
}
function rightHand(ctx, kind, x, y, s, sleeve, o = {}) {
  drawHand(ctx, kind, x, y - (o.pump || 0) * 60, s, sleeve, { ...o, rot: -Math.PI / 2 + 0.12 * (o.pump || 0), mirror: true });
}

function badge(ctx, ch, x, y, r, color, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = INK; circle(ctx, x, y, r + 4); ctx.fill();
  ctx.fillStyle = color; circle(ctx, x, y, r); ctx.fill();
  text(ctx, ch, x, y + r * 0.36, { size: r * 1.05, family: 'Head', weight: 900, color: INK });
  ctx.restore();
}

function dice(ctx, x, y, size, a = 1, rot = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = INK; roundRect(ctx, -size / 2 - 5, -size / 2 - 5, size + 10, size + 10, size * 0.22); ctx.fill();
  ctx.fillStyle = CREAM; roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.2); ctx.fill();
  ctx.fillStyle = CORAL;
  for (const [px, py] of [[-1, -1], [1, 1], [0, 0], [1, -1], [-1, 1]]) { circle(ctx, px * size * 0.26, py * size * 0.26, size * 0.09); ctx.fill(); }
  ctx.restore();
}

function arrow(ctx, x1, y1, x2, y2, w, color, a = 1) {
  if (a <= 0 || w <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  const ang = Math.atan2(y2 - y1, x2 - x1), head = 14 + w * 1.1;
  const ex = x2 - Math.cos(ang) * head * 0.8, ey = y2 - Math.sin(ang) * head * 0.8;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(ang - 0.5) * head, y2 - Math.sin(ang - 0.5) * head);
  ctx.lineTo(x2 - Math.cos(ang + 0.5) * head, y2 - Math.sin(ang + 0.5) * head);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function panel(ctx, x, y, w, h, a = 1, edge = 'rgba(255,214,160,0.35)') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(28,20,44,0.88)'; roundRect(ctx, x, y, w, h, 22); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = edge; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}

// 一轮“石头剪刀布”：从 tb 开始 3 拍晃手、第 4 拍亮出；返回 {pump, shown}
function round4(t, tb) {
  const b = TL.music.beat;
  const k = (t - tb) / b;
  if (k < 0) return { pump: 0, shown: false };
  if (k < 3) return { pump: Math.sin(Math.PI * (k % 1)), shown: false };
  return { pump: 0, shown: true };
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  drawTable(ctx, t, ramp(t, 0, 1.2));
  const plays = [[0, 2], [0, 1], [1, 1]]; // [左, 右]：石头赢剪刀；石头输给布；布平布
  let shownL = 0, shownR = 0, pump = 0, score = [0, 0], cur = -1;
  for (let i = 0; i < 3; i++) {
    const tb = lineAt('hook', i), r = round4(t, tb);
    if (t >= tb) { pump = r.pump; cur = i; if (r.shown) { shownL = plays[i][0]; shownR = plays[i][1]; } else { shownL = 0; shownR = 0; } }
    if (t >= beatAfter(tb, 3)) {
      const [a, b] = plays[i];
      if (a === BEATS_OF(b)) score[0]++; else if (b === BEATS_OF(a)) score[1]++;
    }
  }
  const enter = ramp(t, 0, 0.9, easeOut);
  leftHand(ctx, shownL, lerp(-200, 560, enter), 600, 1.15, CORAL, { pump });
  rightHand(ctx, shownR, lerp(W + 200, 1360, enter), 600, 1.15, MINT, { pump });
  // 记分
  const ks = ramp(t, 0.3, 1.0);
  richText(ctx, [[String(score[0]), CORAL], ['  :  ', DIM], [String(score[1]), MINT]], 960, 200, { size: 96, family: 'Head', weight: 900, alpha: ks, shadow: 20 });
  // 问号
  const tq = beatAfter(lineAt('hook', 2), 3);
  const kq = ramp(t, tq, tq + 0.5, easeBack);
  if (kq > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, 960, 470, 260, '#ffcf8a', 0.25 * clamp(kq)); ctx.restore();
    ctx.save(); ctx.translate(960, 540); ctx.scale(kq, kq);
    text(ctx, '?', 0, 0, { size: 260, family: 'Head', weight: 900, color: GOLD, shadow: 40 });
    ctx.restore();
  }
};

const GROUPS = Array.from({ length: 60 }, (_, i) => ({ c: i % 12, r: Math.floor(i / 12) }));
const groupPos = g => [960 + (g.c - 5.5) * 132, 420 + g.r * 104];
function pairing(seed) {
  // 6 人随机分成 3 对
  const rnd = mulberry32(seed), p = [0, 1, 2, 3, 4, 5];
  for (let i = 5; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return [[p[0], p[1]], [p[2], p[3]], [p[4], p[5]]];
}
SCENES.setup = (ctx, t, s) => {
  const t0 = lineAt('setup', 0), t1 = lineAt('setup', 1), t2 = lineAt('setup', 2), t3 = lineAt('setup', 3);
  const kt = ramp(t, t0, t0 + 0.6);
  text(ctx, '2014 · 浙江大学', 960, 200, { size: 84, family: 'Head', weight: 900, color: CREAM, alpha: kt, shadow: 20 });
  text(ctx, 'Wang, Xu & Zhou · Scientific Reports', 960, 262, { size: 34, family: 'Serif', weight: 400, color: DIM, alpha: kt });
  const dim = 1 - 0.7 * ramp(t, t3, t3 + 0.4);
  const cols = [CORAL, MINT, CREAM];
  // 每拍重新配对一次
  const bi = TL.music.beats.findIndex(b => b > t) - 1;
  GROUPS.forEach((g, gi) => {
    const tg = t1 + (gi % 12) * 0.05 + g.r * 0.12;
    const k = ramp(t, tg, tg + 0.4, easeBack);
    if (k <= 0) return;
    const [gx, gy] = groupPos(g);
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = i / 6 * Math.PI * 2 + Math.PI / 6;
      return [gx + Math.cos(a) * 30 * k, gy + Math.sin(a) * 30 * k];
    });
    ctx.save(); ctx.globalAlpha *= dim;
    if (t > t2) {
      const kp = ramp(t, t2 + (gi % 7) * 0.03, t2 + 0.3 + (gi % 7) * 0.03);
      ctx.strokeStyle = rgba(GOLD, 0.75 * kp); ctx.lineWidth = 3;
      for (const [a, b] of pairing(gi * 997 + bi * 31)) {
        ctx.beginPath(); ctx.moveTo(...pts[a]); ctx.lineTo(...pts[b]); ctx.stroke();
      }
    }
    pts.forEach(([x, y], i) => { ctx.fillStyle = cols[(i + gi) % 3]; circle(ctx, x, y, 9 * clamp(k)); ctx.fill(); });
    ctx.restore();
  });
  const kg = ramp(t, t1 + 0.4, t1 + 1.0) * dim;
  richText(ctx, [['360', GOLD], [' 人 = ', CREAM], ['60', GOLD], [' 组 × ', CREAM], ['6', GOLD], [' 人', CREAM]], 960, 345,
    { size: 44, family: 'Serif', weight: 700, alpha: kg });
  // 300 轮
  const kr = ramp(t, t3, t3 + 0.4, easeOut);
  if (kr > 0) {
    const n = Math.max(1, Math.round(300 * ramp(t, t3 + 0.1, t3 + 1.6, x => x)));
    ctx.save(); ctx.translate(960, 620); const sc = 0.9 + 0.1 * kr; ctx.scale(sc, sc);
    richText(ctx, [['第 ', CREAM], [String(n), GOLD], [' 轮', CREAM]], 0, 0, { size: 150, family: 'Head', weight: 900, alpha: kr, shadow: 40 });
    ctx.restore();
  }
};

const COINS = (() => {
  const rnd = mulberry32(5);
  return Array.from({ length: 34 }, () => ({ x: 120 + rnd() * 1680, d: rnd() * 2.2, v: 380 + rnd() * 260, r: 26 + rnd() * 16, sp: rnd() * 4 }));
})();
function coin(ctx, x, y, r, spin, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(Math.max(0.15, Math.abs(Math.cos(spin))), 1);
  ctx.fillStyle = '#b8862e'; circle(ctx, 0, 0, r + 3); ctx.fill();
  ctx.fillStyle = GOLD; circle(ctx, 0, 0, r); ctx.fill();
  ctx.strokeStyle = 'rgba(140,90,20,0.6)'; ctx.lineWidth = 2; circle(ctx, 0, 0, r * 0.75); ctx.stroke();
  text(ctx, '¥', 0, r * 0.36, { size: r * 1.0, family: 'Head', weight: 900, color: '#8a5a12' });
  ctx.restore();
}
function wheel(ctx, x, y, R, ang, a, o = {}) {
  if (a <= 0) return;
  const { labels = 0 } = o;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = INK; circle(ctx, x, y, R + 10); ctx.fill();
  const cols = [CORAL, MINT, '#e7b65c'];
  for (let i = 0; i < 3; i++) {
    const a0 = ang + i * 2 * Math.PI / 3 - Math.PI / 2, a1 = a0 + 2 * Math.PI / 3;
    ctx.fillStyle = mix(cols[i], '#1a1230', 0.15);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a0, a1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke();
    const am = (a0 + a1) / 2;
    drawHand(ctx, i, x + Math.cos(am) * R * 0.52, y + Math.sin(am) * R * 0.52 + 50, 0.42, mix(cols[i], '#ffffff', 0.3), { rot: am + Math.PI / 2 });
    if (labels > 0) text(ctx, '1/3', x + Math.cos(am) * (R + 80), y + Math.sin(am) * (R + 80) + 20, { size: 58, family: 'Head', weight: 900, color: GOLD, alpha: labels, shadow: 14 });
  }
  ctx.fillStyle = INK; circle(ctx, x, y, 30); ctx.fill();
  ctx.fillStyle = CREAM; circle(ctx, x, y, 22); ctx.fill();
  ctx.restore();
  // 指针
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = CREAM; ctx.strokeStyle = INK; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y - R + 26); ctx.lineTo(x - 24, y - R - 30); ctx.lineTo(x + 24, y - R - 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
SCENES.theory = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('theory', 1), t2 = lineAt('theory', 2), t3 = lineAt('theory', 3), t4 = lineAt('theory', 4);
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, t1 - 0.5, t1));
  if (kb > 0) {
    for (const c of COINS) {
      const y = -60 + (t - t0 - c.d) * c.v;
      if (y > -60 && y < H + 60) coin(ctx, c.x, y, c.r, t * 3 + c.sp, 0.5 * kb);
    }
    ctx.save(); ctx.translate(960, 540);
    const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '按得分，发真钱', 0, 0, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
    text(ctx, '玩完 300 轮，按累计得分付现金', 960, 650, { size: 42, family: 'Serif', weight: 700, color: DIM, alpha: kb });
  }
  const kw = ramp(t, t1 - 0.2, t1 + 0.5, easeOut);
  if (kw <= 0) return;
  // 转盘：t2 后快转，t3 慢下来标 1/3，t4 再转起来
  const spin = (tt) => {
    let a = 0.25 * Math.max(0, tt - t1);
    a += 9 * Math.max(0, Math.min(tt, t3) - t2);
    if (tt > t3) a += 9 * (1 - Math.exp(-(tt - t3) * 3)) / 3;
    if (tt > t4) a += 5 * (tt - t4) * ramp(tt, t4, t4 + 0.6);
    return a;
  };
  text(ctx, '理论上的最优解：混合策略纳什均衡', 960, 150, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: kw });
  wheel(ctx, 960, 540, 250 * (0.85 + 0.15 * kw), spin(t), kw, { labels: ramp(t, t3, t3 + 0.5) * (1 - ramp(t, t4, t4 + 0.4)) });
  const kq = ramp(t, t4 + 0.2, t4 + 0.7, easeBack);
  if (kq > 0) {
    ctx.save(); ctx.translate(960, 540); ctx.scale(kq, kq);
    ctx.fillStyle = INK; circle(ctx, 0, 0, 74); ctx.fill();
    ctx.fillStyle = GOLD; circle(ctx, 0, 0, 66); ctx.fill();
    text(ctx, '?', 0, 36, { size: 100, family: 'Head', weight: 900, color: INK });
    ctx.restore();
  }
};

SCENES.even = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('even', 1);
  const m = SIM.marginal, vals = [m.rock, m.paper, m.scissors];
  const base = 800, ppu = 1000;
  text(ctx, '354 名玩家，平均每人出拳的比例', 960, 150, { size: 42, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t0, t0 + 0.5) });
  const yr = base - ppu / 3;
  ctx.save();
  ctx.globalAlpha *= ramp(t, t0 + 0.3, t0 + 0.8);
  ctx.strokeStyle = 'rgba(251,243,228,0.45)'; ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.moveTo(500, yr); ctx.lineTo(1500, yr); ctx.stroke();
  ctx.restore();
  text(ctx, '完全随机 1/3', 1520, yr + 12, { size: 34, family: 'Serif', weight: 700, color: DIM, align: 'left', alpha: ramp(t, t0 + 0.3, t0 + 0.8) });
  ctx.fillStyle = 'rgba(251,243,228,0.3)'; ctx.fillRect(480, base, 1000, 3);
  const cols = [CORAL, MINT, '#e7b65c'];
  for (let i = 0; i < 3; i++) {
    const x = 760 + i * 220, tb = beatAfter(t0, i);
    const k = ramp(t, tb, tb + 0.7, easeOut), h = vals[i] * ppu * k;
    const hot = i === 0 ? ramp(t, t1, t1 + 0.5) : 0;
    const g = ctx.createLinearGradient(0, base - h, 0, base);
    g.addColorStop(0, cols[i]); g.addColorStop(1, rgba(cols[i], 0.25));
    ctx.fillStyle = g; roundRect(ctx, x - 70, base - h, 140, h, [12, 12, 0, 0]); ctx.fill();
    if (hot > 0) { ctx.strokeStyle = rgba(GOLD, hot); ctx.lineWidth = 4; ctx.stroke(); }
    text(ctx, `${Math.round(vals[i] * 100 * clamp(k * 1.1))}%`, x, base - h - 24, { size: 60, family: 'Head', weight: 900, color: i === 0 && hot > 0.5 ? GOLD : CREAM, alpha: clamp(k * 2), shadow: 14 });
    drawHand(ctx, i, x, base - h - 150, 0.36, mix(cols[i], '#ffffff', 0.2), { alpha: clamp(k * 2) });
    text(ctx, NAME[i], x, base + 56, { size: 42, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(k * 2) });
  }
};

// 上一手（以石头为例）→ 下一手的三条路
const PCT = SIM.cr_pct;
const SEQ = (() => {
  const rnd = mulberry32(9); let a = 0; const out = [];
  for (let i = 0; i < 40; i++) { out.push(a); if (rnd() > 0.5) a = Math.floor(rnd() * 3); }
  return out;
})();
SCENES.winstay = (ctx, t, s) => {
  const t0 = s.start, L = n => lineAt('winstay', n);
  // 大字 + 背后滚动的出拳序列
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, L(1) - 0.5, L(1)));
  if (kb > 0) {
    for (let row = 0; row < 2; row++) {
      const y = row ? 820 : 300, dir = row ? 1 : -1;
      SEQ.forEach((k, i) => {
        const x = ((i * 150 + dir * (t - t0) * 120) % 6000 + 6000) % 6000 - 200;
        if (x < -150 || x > W + 150) return;
        const rep = i > 0 && SEQ[i - 1] === k;
        drawHand(ctx, k, x, y + 60, 0.34, rep ? MINT : '#6b6283', { alpha: kb * (rep ? 0.85 : 0.35) });
      });
    }
    ctx.save(); ctx.translate(960, 590);
    const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '可顺序露了馅', 0, 0, { size: 160, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  const kd = ramp(t, L(1) - 0.2, L(1) + 0.5) * (1 - ramp(t, L(9) - 0.2, L(9) + 0.4));
  // 当前状态：赢 → 平 → 输，概率平滑过渡
  const kT = ramp(t, L(5), L(5) + 0.6), kL = ramp(t, L(6), L(6) + 0.6);
  const get = key => {
    const w = PCT.W[key], tt = PCT.T[key], l = PCT.L[key];
    return lerp(lerp(w, tt, kT), l, kL);
  };
  // 显示顺序：石头（不换）、布（逆时针）、剪刀（顺时针）
  const probs = [get('stay'), get('shift_ccw'), get('shift_cw')];
  if (kd > 0) {
    ctx.save(); ctx.globalAlpha *= kd;
    const lx = 470, ly = 560;
    text(ctx, '上一把', lx, 210, { size: 46, family: 'Serif', weight: 700, color: DIM });
    drawHand(ctx, 0, lx, ly + 110, 0.82, MINT, { glow: 0.5 });
    const res = kL > 0.5 ? ['输', LOSE_C] : kT > 0.5 ? ['平', TIE_C] : ['赢', WIN_C];
    badge(ctx, res[0], lx + 110, ly - 120, 42, res[1], ramp(t, L(1), L(1) + 0.4, easeBack));
    // 对手那一手
    const opp = kL > 0.5 ? 1 : kT > 0.5 ? 0 : 2;
    const ko = ramp(t, L(1) + 0.3, L(1) + 0.8);
    text(ctx, `对手出${NAME[opp]}`, lx, ly + 300, { size: 36, family: 'Serif', weight: 700, color: DIM, alpha: ko });
    text(ctx, '下一把', 1330, 210, { size: 46, family: 'Serif', weight: 700, color: DIM });
    const rows = [300, 510, 720], labels = ['不换', '换成布', '换成剪刀'];
    for (let i = 0; i < 3; i++) {
      const ka = ramp(t, beatAfter(L(2), i), beatAfter(L(2), i) + 0.5, easeOut);
      const p = probs[i] / 100;
      const hot = i === 0 ? 1 - kL : (i === 2 ? kL : 0);
      arrow(ctx, lx + 150, ly - 10, lerp(lx + 150, 1160, ka), lerp(ly - 10, rows[i] - 30, ka), 4 + 40 * p,
        hot > 0.5 ? rgba(GOLD, 0.85) : 'rgba(251,243,228,0.45)', ka);
      drawHand(ctx, i, 1250, rows[i] + 60, 0.42, mix(MINT, '#1a1230', 0.25), { alpha: ka });
      const big = i === 0 ? 1 + 0.35 * ramp(t, L(3), L(3) + 0.4, easeBack) * (1 - ramp(t, L(5), L(5) + 0.4)) : 1;
      text(ctx, `${Math.round(probs[i])}%`, 1360, rows[i] - 2, { size: 74 * big, family: 'Head', weight: 900, color: hot > 0.5 ? GOLD : CREAM, align: 'left', alpha: ka, shadow: 14 });
      text(ctx, labels[i], 1362, rows[i] + 44, { size: 32, family: 'Serif', weight: 700, color: DIM, align: 'left', alpha: ka });
    }
    const kr = ramp(t, L(3), L(3) + 0.5) * (1 - ramp(t, L(5) - 0.3, L(5)));
    text(ctx, '（完全随机的话是 33%）', 1440, rows[0] + 44, { size: 30, family: 'Serif', weight: 700, color: GOLD, align: 'left', alpha: kr });
    text(ctx, '以石头为例 · 取“赢 2 分、平 1 分、输 0 分”的 12 组 · 百分比读自论文图表，为约数', 960, 900, { size: 28, family: 'Sans', weight: 400, color: 'rgba(251,243,228,0.45)' });
    // 输了以后：三个数差不多
    const kq = ramp(t, L(8), L(8) + 0.5);
    if (kq > 0) text(ctx, '?', lx - 150, ly - 60, { size: 140, family: 'Head', weight: 900, color: LOSE_C, alpha: kq, shadow: 20 });
    ctx.restore();
  }
  // 小结：赢/平/输之后“不换”的比例
  const ks = ramp(t, L(9) - 0.1, L(9) + 0.5);
  if (ks > 0) {
    ctx.save(); ctx.globalAlpha *= ks;
    const base = 800, ppu = 900, keys = ['W', 'T', 'L'], nm = ['赢了之后', '平局之后', '输了之后'], cs = [WIN_C, TIE_C, LOSE_C];
    text(ctx, '下一把“不换”的比例（约数）', 960, 180, { size: 46, family: 'Serif', weight: 700, color: DIM });
    const yr = base - ppu / 3;
    ctx.strokeStyle = 'rgba(251,243,228,0.45)'; ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(520, yr); ctx.lineTo(1420, yr); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, '随机 1/3', 1440, yr + 12, { size: 34, family: 'Serif', weight: 700, color: DIM, align: 'left' });
    for (let i = 0; i < 3; i++) {
      const x = 700 + i * 260, k = ramp(t, L(9) + i * 0.15, L(9) + 0.6 + i * 0.15, easeOut);
      const v = PCT[keys[i]].stay, h = v / 100 * ppu * k;
      ctx.fillStyle = rgba(cs[i], i === 0 ? 0.95 : 0.55); roundRect(ctx, x - 80, base - h, 160, h, [12, 12, 0, 0]); ctx.fill();
      text(ctx, `${v}%`, x, base - h - 24, { size: i === 0 ? 80 : 60, family: 'Head', weight: 900, color: i === 0 ? GOLD : CREAM, alpha: clamp(k * 2), shadow: 14 });
      text(ctx, nm[i], x, base + 56, { size: 40, family: 'Serif', weight: 700, color: i === 0 ? GOLD : CREAM });
    }
    ctx.restore();
  }
};

SCENES.build = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('build', 1);
  const kp = ramp(t, t0 - 0.1, t0 + 0.5, easeOut);
  const px = 300, py = 270, pw = 640, ph = 470;
  panel(ctx, px, py, pw, ph, kp);
  if (kp > 0) {
    ctx.save(); ctx.globalAlpha *= kp;
    text(ctx, '“人”的出拳规则', px + 40, py + 70, { size: 44, family: 'Head', weight: 900, color: GOLD, align: 'left' });
    const rowsT = [['赢了', 'W', WIN_C], ['平了', 'T', TIE_C], ['输了', 'L', LOSE_C]];
    rowsT.forEach(([nm, key, c], i) => {
      const k = ramp(t, beatAfter(t0, 1 + i), beatAfter(t0, 1 + i) + 0.4);
      const y = py + 150 + i * 105, p = PCT[key];
      badge(ctx, nm[0], px + 70, y, 30, c, k);
      // 三段条：不换 / 换成被克的 / 换成克它的
      const bx = px + 130, bw = 440;
      const seg = [[p.stay, c], [p.shift_cw, 'rgba(251,243,228,0.35)'], [p.shift_ccw, 'rgba(251,243,228,0.18)']];
      let x = bx;
      ctx.save(); ctx.globalAlpha *= k;
      for (const [j, [v, col]] of seg.entries()) {
        const w = bw * v / 100 * k;
        ctx.fillStyle = col; roundRect(ctx, x, y - 26, Math.max(0, w - 4), 52, 10); ctx.fill();
        if (j === 0) text(ctx, `${v}% 不换`, x + 16, y + 12, { size: 30, family: 'Sans', weight: 700, color: INK, align: 'left' });
        x += w;
      }
      ctx.restore();
    });
    text(ctx, '其余概率按论文比例换成另外两手', px + 40, py + ph - 34, { size: 28, family: 'Sans', weight: 400, color: 'rgba(251,243,228,0.5)', align: 'left' });
    ctx.restore();
  }
  const kh = ramp(t, t1, t1 + 0.6, easeBack);
  if (kh > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, 1400, 470, 340, MINT, 0.25 * clamp(kh)); ctx.restore();
    drawHand(ctx, 0, 1400, 700 + (1 - clamp(kh)) * 120, 0.95 * (0.8 + 0.2 * kh), MINT, { alpha: clamp(kh), glow: 0.4 });
    text(ctx, '“人”', 1400, 900, { size: 64, family: 'Head', weight: 900, color: MINT, alpha: clamp(kh), shadow: 16 });
  }
  arrow(ctx, px + pw + 30, 500, lerp(px + pw + 30, 1200, ramp(t, t1, t1 + 0.5)), 500, 8, 'rgba(255,210,122,0.7)', ramp(t, t1, t1 + 0.3));
};

// 打一万局的进度（duel 末尾开始，result 第三句到 10000）
const gamesAt = t => {
  const a = lineAt('duel', 4), b = lineAt('result', 2);
  return Math.round(10000 * Math.pow(prog(t, a, b), 2));
};
function countAt(which, g) {
  const c = SIM.vs_human.curve[which], step = SIM.vs_human.curve_step;
  if (g <= 0) return 0;
  const x = g / step - 1, i = Math.floor(x);
  if (i < 0) return c[0] * g / step;
  if (i >= c.length - 1) return c[c.length - 1];
  return lerp(c[i], c[i + 1], x - i);
}
const FAST = (() => {
  const rnd = mulberry32(17);
  return Array.from({ length: 200 }, () => [Math.floor(rnd() * 3), Math.floor(rnd() * 3)]);
})();
SCENES.duel = (ctx, t, s) => {
  const L = n => lineAt('duel', n), t0 = s.start;
  drawTable(ctx, t, 1);
  const tf = L(4);
  // 规则卡
  const kc = ramp(t, t0, t0 + 0.5) * (1 - ramp(t, tf, tf + 0.4));
  panel(ctx, 520, 90, 880, 200, kc);
  if (kc > 0) {
    const hA = window01(t, L(0), L(2), 0.3), hB = window01(t, L(2), L(4) + 0.2, 0.3);
    richText(ctx, [['它赢了或平了  →  ', rgba('#fbf3e4', 0.55 + 0.45 * hA)], ['出克它上一手的', hA > 0.5 ? GOLD : CREAM]], 960, 170, { size: 46, family: 'Serif', weight: 700, alpha: kc });
    richText(ctx, [['它输了  →  ', rgba('#fbf3e4', 0.55 + 0.45 * hB)], ['出它上一手', hB > 0.5 ? GOLD : CREAM]], 960, 250, { size: 46, family: 'Serif', weight: 700, alpha: kc });
  }
  // 手：示范两种情况，然后快打
  let lk = 0, rk = 0, pump = 0, rb = null, glowL = 0;
  if (t < L(2)) { rk = 0; rb = ['赢', WIN_C]; lk = t > L(1) ? 1 : 0; glowL = ramp(t, L(1), L(1) + 0.3); if (t < L(1)) lk = 2; }
  else if (t < tf) { rk = 0; rb = ['输', LOSE_C]; lk = t > L(3) ? 0 : 1; glowL = ramp(t, L(3), L(3) + 0.3); }
  else {
    const b = TL.music.beat / 2, k = (t - tf) / b, i = Math.floor(k);
    pump = Math.sin(Math.PI * (k % 1)) * (i % 2 === 0 ? 1 : 0);
    [lk, rk] = FAST[i % FAST.length];
  }
  leftHand(ctx, lk, 560, 600, 1.15, CORAL, { pump, glow: glowL });
  rightHand(ctx, rk, 1360, 600, 1.15, MINT, { pump });
  if (rb) badge(ctx, rb[0], 1300, 420, 38, rb[1], ramp(t, rb[0] === '赢' ? L(0) : L(2), (rb[0] === '赢' ? L(0) : L(2)) + 0.4, easeBack));
  text(ctx, '针对它的策略', 560, 860, { size: 44, family: 'Head', weight: 900, color: CORAL, shadow: 14 });
  text(ctx, '“人”', 1360, 860, { size: 44, family: 'Head', weight: 900, color: MINT, shadow: 14 });
  const kn = ramp(t, tf, tf + 0.4);
  if (kn > 0) {
    richText(ctx, [['第 ', CREAM], [fmt(Math.max(1, gamesAt(t))), GOLD], [' 局', CREAM]], 960, 220, { size: 96, family: 'Head', weight: 900, alpha: kn, shadow: 20 });
  }
};

function scoreTile(ctx, x, y, label, v, color, a, hot = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(20,14,32,0.9)'; roundRect(ctx, x - 180, y - 120, 360, 240, 22); ctx.fill();
  ctx.strokeStyle = rgba(color, 0.5 + 0.5 * hot); ctx.lineWidth = 3 + 3 * hot; ctx.stroke();
  if (hot > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, x, y, 260, color, 0.18 * hot); ctx.restore(); }
  text(ctx, label, x, y - 62, { size: 40, family: 'Serif', weight: 700, color });
  text(ctx, fmt(v), x, y + 82, { size: 108, family: 'Head', weight: 900, color: hot > 0.5 ? GOLD : CREAM, shadow: 14 });
  ctx.restore();
}
function stackBar(ctx, x, y, w, h, parts, a, o = {}) {
  if (a <= 0) return;
  const { grow = 1, labels = true } = o;
  ctx.save(); ctx.globalAlpha *= a;
  let cx = x;
  for (const [v, color, name] of parts) {
    const ww = w * v * grow;
    ctx.fillStyle = color; roundRect(ctx, cx + 2, y, Math.max(0, ww - 4), h, 12); ctx.fill();
    if (labels && ww > 120) text(ctx, `${name} ${Math.round(v * 100)}%`, cx + ww / 2, y + h / 2 + 14, { size: 40, family: 'Head', weight: 900, color: INK });
    cx += ww;
  }
  ctx.restore();
}
SCENES.result = (ctx, t, s) => {
  const L = n => lineAt('result', n), t0 = s.start;
  const g = gamesAt(t);
  const done = ramp(t, L(2), L(2) + 0.5);
  const up = ramp(t, L(3) - 0.2, L(3) + 0.5, easeInOut);
  const ty = lerp(330, 260, up), sc = lerp(1, 0.8, up);
  text(ctx, `已打 ${fmt(g)} / 10000 局`, 960, lerp(150, 120, up), { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t0 - 0.3, t0 + 0.3) });
  ctx.save(); ctx.translate(960, ty); ctx.scale(sc, sc); ctx.translate(-960, -ty);
  scoreTile(ctx, 560, ty, '策略赢', countAt('W', g), WIN_C, 1, done);
  scoreTile(ctx, 960, ty, '平', countAt('T', g), TIE_C, 1, 0);
  scoreTile(ctx, 1360, ty, '策略输', countAt('L', g), LOSE_C, 1, 0.4 * done);
  ctx.restore();
  // “人”自己的出拳比例
  const ko = ramp(t, t0 + 0.2, t0 + 0.7) * (1 - ramp(t, L(3) - 0.4, L(3)));
  if (ko > 0) {
    ctx.save(); ctx.globalAlpha *= ko;
    text(ctx, '“人”这一万局里出了', 960, 580, { size: 38, family: 'Serif', weight: 700, color: MINT });
    SIM.vs_human.opp_share.forEach((v, i) => {
      const x = 640 + i * 320;
      drawHand(ctx, i, x - 70, 760, 0.36, MINT);
      text(ctx, `${Math.round(v * 100)}%`, x + 40, 735, { size: 64, family: 'Head', weight: 900, color: CREAM, align: 'center' });
      text(ctx, NAME[i], x + 40, 785, { size: 32, family: 'Serif', weight: 700, color: DIM });
    });
    ctx.restore();
  }
  // 胜率条
  const kb = ramp(t, L(3) - 0.1, L(3) + 0.4);
  if (kb > 0) {
    const h = SIM.vs_human;
    text(ctx, '对“人”', 300, 600, { size: 40, family: 'Head', weight: 900, color: MINT, align: 'right', alpha: kb });
    stackBar(ctx, 340, 555, 1280, 66, [[h.win_rate, WIN_C, '赢'], [h.tie_rate, TIE_C, '平'], [h.loss_rate, LOSE_C, '输']], kb, { grow: ramp(t, L(3), L(3) + 0.8, easeOut) });
    text(ctx, '“人”的出拳看着很匀，它的习惯却被读了出来', 960, 700, { size: 34, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, L(3) + 0.6, L(3) + 1.2) });
  }
};

SCENES.random = (ctx, t, s) => {
  const L = n => lineAt('random', n), t0 = s.start;
  const h = SIM.vs_human, r = SIM.vs_random;
  text(ctx, '同一个策略，各打一万局', 960, 150, { size: 46, family: 'Serif', weight: 700, color: DIM });
  text(ctx, '对“人”', 300, 400, { size: 40, family: 'Head', weight: 900, color: MINT, align: 'right' });
  stackBar(ctx, 340, 355, 1280, 66, [[h.win_rate, WIN_C, '赢'], [h.tie_rate, TIE_C, '平'], [h.loss_rate, LOSE_C, '输']], 1 - 0.5 * ramp(t, L(1), L(1) + 0.5));
  const kr = ramp(t, t0 + 0.2, t0 + 0.7);
  dice(ctx, 960, 560, 90, kr, Math.sin(t * 6) * 0.3 * (1 - ramp(t, L(1), L(1) + 0.4)));
  text(ctx, '对随机对手', 300, 760, { size: 40, family: 'Head', weight: 900, color: CREAM, align: 'right', alpha: kr });
  stackBar(ctx, 340, 715, 1280, 66, [[r.win_rate, WIN_C, '赢'], [r.tie_rate, TIE_C, '平'], [r.loss_rate, LOSE_C, '输']], kr, { grow: ramp(t, t0 + 0.4, t0 + 1.4, easeOut) });
  const k3 = ramp(t, L(1), L(1) + 0.5);
  if (k3 > 0) {
    ctx.save(); ctx.globalAlpha *= k3;
    ctx.strokeStyle = 'rgba(251,243,228,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
    for (const f of [1 / 3, 2 / 3]) { const x = 340 + 1280 * f; ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x, 805); ctx.stroke(); }
    ctx.restore();
    text(ctx, `赢 ${r.wins}　平 ${r.ties}　输 ${r.losses}`, 960, 860, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: k3 });
  }
};

SCENES.end = (ctx, t, s) => {
  const L = n => lineAt('end', n), t0 = s.start;
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, L(1) - 0.5, L(1)));
  if (kb > 0) {
    ctx.save(); ctx.translate(960, 560);
    const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '没有必胜', 0, -80, { size: 150, family: 'Head', weight: 900, color: CREAM, alpha: kb, shadow: 40 });
    text(ctx, '只有破绽', 0, 110, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  const kt = ramp(t, L(1) - 0.4, L(1) + 0.6);
  if (kt <= 0) return;
  ctx.save(); ctx.globalAlpha *= kt;
  drawTable(ctx, t, 1);
  // 你（薄荷绿）赢了一把，又想出同一个；对面（珊瑚色）等着
  let you = 0, opp = 2, pumpY = 0, pumpO = 0, oppGlow = 0, youGlow = 0;
  const tr = L(4), tReveal = L(5);
  if (t < L(3)) { you = 0; opp = 0; youGlow = 1.6 * ramp(t, L(2), L(2) + 0.6) * (0.8 + 0.4 * barPulse(t)); }
  if (t >= L(3)) { you = 0; opp = 2; youGlow = ramp(t, L(3), L(3) + 0.4); }
  if (t >= tr) {
    const r = round4(t, tr);
    pumpY = pumpO = r.pump;
    if (!r.shown) { you = 0; opp = 0; }
    if (t >= beatAfter(tr, 3)) { you = 0; opp = 0; }
  }
  if (t >= tReveal) { you = 0; opp = 1; pumpY = pumpO = 0; oppGlow = ramp(t, tReveal, tReveal + 0.8); youGlow = 0.3; }
  const lv = musicLevel(t);
  leftHand(ctx, opp, 560, 600, 1.15, CORAL, { pump: pumpO, glow: oppGlow * (0.8 + 0.2 * barPulse(t)) });
  rightHand(ctx, you, 1360, 600, 1.15, MINT, { pump: pumpY, glow: youGlow * 0.6 });
  const kl = ramp(t, L(3), L(3) + 0.5);
  text(ctx, '你', 1360, 860, { size: 56, family: 'Head', weight: 900, color: MINT, alpha: kl, shadow: 14 });
  text(ctx, '对面', 560, 860, { size: 56, family: 'Head', weight: 900, color: CORAL, alpha: kl, shadow: 14 });
  if (t >= L(3) && t < tr) badge(ctx, '赢', 1300, 420, 38, WIN_C, ramp(t, L(3), L(3) + 0.4, easeBack));
  // 你脑子里的“还出石头”
  const kth = window01(t, tr + 0.2, tReveal + 1.2, 0.3);
  if (kth > 0) {
    ctx.save(); ctx.globalAlpha *= kth;
    ctx.fillStyle = 'rgba(251,243,228,0.92)';
    circle(ctx, 1500, 360, 14); ctx.fill(); circle(ctx, 1530, 320, 20); ctx.fill();
    roundRect(ctx, 1480, 150, 230, 140, 60); ctx.fill();
    drawHand(ctx, 0, 1595, 270, 0.32, MINT);
    ctx.restore();
  }
  ctx.restore();
  const kz = ramp(t, tReveal, tReveal + 1);
  if (kz > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glowDot(ctx, 960, 560, 700, '#ffcf8a', 0.10 * kz * (0.7 + 0.3 * lv)); ctx.restore(); }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 20);
  drawTable(ctx, 20, 1);
  leftHand(ctx, 1, 470, 470, 1.0, CORAL, { glow: 0.6 });
  rightHand(ctx, 0, 1450, 470, 1.0, MINT, { glow: 0.6 });
  const g = ctx.createLinearGradient(0, 480, 0, H);
  g.addColorStop(0, 'rgba(13,9,24,0)'); g.addColorStop(0.4, 'rgba(13,9,24,0.82)'); g.addColorStop(1, 'rgba(13,9,24,0.95)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, 'VS', 960, 470, { size: 120, family: 'Head', weight: 900, color: GOLD, shadow: 30 });
  text(ctx, '石头剪刀布', 960, 740, { size: 150, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  richText(ctx, [['有', CREAM], ['必胜法', GOLD], ['吗？', CREAM]], 960, 900, { size: 130, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '浙大 360 人 × 300 轮 · 一万局模拟', 960, 1000, { size: 44, family: 'Sans', weight: 700, color: MINT, spacing: 4 });
}
