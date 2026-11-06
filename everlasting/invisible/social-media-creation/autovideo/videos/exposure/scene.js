// 曝光效应：画面
// 美术方向：夜里亮着灯的阶梯教室。深蓝底，暖黄灯光；四个长相一样、只有毛衣颜色不同的女生。
// 没有人声：画面跟着配乐走，字幕一出现，对应的变化就发生；曲子起势的地方放大字和大转场。

const CREAM = '#fbf3e4';
const GOLD = '#ffd27a';
const DIM = 'rgba(251,243,228,0.6)';
const HAIR = '#2a2233';
const SKIN = '#f4dccb';
const VISITS = [0, 5, 10, 15];
const ACC = ['#8fa3c7', '#7cc6c0', '#f0b86a', '#ff8fa3'];
const SCORE = [3.6, 3.8, 4.3, 4.4];

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
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
}

// ---------- 背景：夜色，暖光尘埃，亮度跟着配乐 ----------
const DUST = (() => {
  const rnd = mulberry32(11);
  return Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.6, v: 4 + rnd() * 10, ph: rnd() * 6 }));
})();
const warmth = t => ramp(t, TL.music.end - 13, TL.music.end - 10.5);

function drawBackground(ctx, t) {
  const w = warmth(t);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix('#1a2140', '#3a2a3e', w));
  g.addColorStop(0.6, mix('#141a30', '#2c2034', w));
  g.addColorStop(1, mix('#0b0e1b', '#160f1c', w));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  // 斜照进来的光
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x0 = 260 + i * 330 + Math.sin(t * 0.07 + i) * 30;
    const lg = ctx.createLinearGradient(x0, 0, x0 + 520, H);
    const a = (0.025 + 0.035 * lv) * (1 + 0.6 * w);
    lg.addColorStop(0, rgba('#ffd9a0', a)); lg.addColorStop(1, rgba('#ffd9a0', 0));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 130, 0); ctx.lineTo(x0 + 650, H); ctx.lineTo(x0 + 420, H); ctx.closePath(); ctx.fill();
  }
  for (const d of DUST) {
    const y = (d.y - d.v * t + H * 10) % H, x = d.x + Math.sin(t * 0.3 + d.ph) * 20;
    glowDot(ctx, x, y, d.r * 4, '#ffe2b0', (0.16 + 0.3 * lv) * (0.6 + 0.4 * Math.sin(t + d.ph)));
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

// ---------- 人物 ----------
// 正面半身像：(x, y) 是肩膀底边中点，s 为缩放（整体约 190s 高）
function drawGirl(ctx, x, y, s, acc, o = {}) {
  const { alpha = 1, glow = 0, mouth = 'smile' } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -80, 170, acc, 0.45 * glow);
  ctx.fillStyle = HAIR;
  roundRect(ctx, -50, -152, 100, 118, 44); ctx.fill();
  const sg = ctx.createLinearGradient(0, -52, 0, 0);
  sg.addColorStop(0, acc); sg.addColorStop(1, mix(acc, '#000000', 0.25));
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(0, 4, 76, 56, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = mix(acc, '#ffffff', 0.25);
  ctx.beginPath(); ctx.ellipse(0, -48, 22, 8, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = SKIN; ctx.fillRect(-11, -62, 22, 16);
  ctx.beginPath(); ctx.ellipse(0, -98, 37, 43, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath(); ctx.ellipse(0, -122, 42, 30, 0, Math.PI * 0.98, Math.PI * 2.02); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-40, -118); ctx.quadraticCurveTo(-20, -96, 6, -112); ctx.quadraticCurveTo(26, -100, 40, -116); ctx.lineTo(40, -130); ctx.lineTo(-40, -130); ctx.fill();
  ctx.fillStyle = '#3b2b33';
  for (const sx of [-14, 14]) { ctx.beginPath(); ctx.ellipse(sx, -92, 4, 5.5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,130,150,0.35)';
  for (const sx of [-23, 23]) { ctx.beginPath(); ctx.ellipse(sx, -79, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#a3605f'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath();
  if (mouth === 'smile') ctx.arc(0, -76, 7, 0.2 * Math.PI, 0.8 * Math.PI);
  else { ctx.moveTo(-6, -71); ctx.lineTo(6, -71); }
  ctx.stroke();
  ctx.restore();
}

// 背影：(x, y) 是肩膀底边中点
function drawBack(ctx, x, y, s, body, o = {}) {
  const { alpha = 1, hair = '#1b1f2e', glow = 0 } = o;
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.scale(s, s);
  if (glow > 0) glowDot(ctx, 0, -40, 110, glow > 0 ? body : '#000', 0.55 * glow);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 30, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair;
  circle(ctx, 0, -46, 21); ctx.fill();
  ctx.restore();
}

// 拍立得照片：中心 (x, y)，宽 w
function drawCard(ctx, i, x, y, w, o = {}) {
  const { alpha = 1, tilt = 0, glow = 0, label = true, mouth = 'smile', lit = 1 } = o;
  if (alpha <= 0.002) return;
  const h = w * 1.22;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(tilt);
  if (glow > 0) glowDot(ctx, 0, 0, w * 1.1, ACC[i], 0.35 * glow);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#f6efe2';
  roundRect(ctx, -w / 2, -h / 2, w, h, 6); ctx.fill();
  ctx.shadowColor = 'transparent';
  const pw = w * 0.86, ph = pw * 1.02, px = -pw / 2, py = -h / 2 + w * 0.07;
  const bg = ctx.createLinearGradient(0, py, 0, py + ph);
  bg.addColorStop(0, mix('#2f3a5c', ACC[i], 0.35)); bg.addColorStop(1, '#1d2438');
  ctx.fillStyle = bg; ctx.fillRect(px, py, pw, ph);
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  drawGirl(ctx, 0, py + ph + 4, pw / 190, ACC[i], { mouth });
  if (lit < 1) { ctx.fillStyle = `rgba(16,20,34,${0.65 * (1 - lit)})`; ctx.fillRect(px, py, pw, ph); }
  ctx.restore();
  if (label) text(ctx, VISITS[i] ? `来了 ${VISITS[i]} 次` : '一次没来', 0, h / 2 - w * 0.07, { size: w * 0.15, family: 'Serif', weight: 700, color: '#3a2f3a' });
  ctx.restore();
}

// ---------- 阶梯教室（从后排往前看） ----------
const ROWS = 7, PER = 16;
const SEAT_GIRL = { '1': [1, 3], '2': [4, 12], '3': [3, 7] }; // 来 5 / 10 / 15 次的女生坐的位置 [排, 座]
function seatPos(r, c) {
  const y = 330 + r * 84, s = 0.62 + r * 0.115, wid = 860 + r * 150;
  return { x: 960 - wid / 2 + (c + 0.5) * (wid / PER), y, s };
}
const STUDENTS = (() => {
  const rnd = mulberry32(3), cols = ['#3a4566', '#45506f', '#353f5c', '#4b4b6b', '#3f4a63'];
  const taken = new Set(Object.values(SEAT_GIRL).map(([r, c]) => `${r},${c}`));
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < PER; c++) {
    if (taken.has(`${r},${c}`) || rnd() < 0.06) continue;
    out.push({ r, c, col: cols[Math.floor(rnd() * cols.length)], dx: (rnd() - 0.5) * 8, ph: rnd() * 6 });
  }
  return out;
})();

function drawHall(ctx, t, o = {}) {
  const { alpha = 1, present = {}, focus = 0, crowdA = 1, questions = 0 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 讲台和黑板
  ctx.fillStyle = '#1c2a2a';
  roundRect(ctx, 600, 90, 720, 170, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,210,0.18)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(240,240,230,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(660, 140); ctx.lineTo(900, 140); ctx.moveTo(660, 172); ctx.lineTo(820, 172); ctx.moveTo(1000, 150); ctx.quadraticCurveTo(1120, 110, 1240, 200); ctx.stroke();
  glowDot(ctx, 960, 60, 520, '#ffd9a0', 0.10 + 0.08 * musicLevel(t));
  for (let r = 0; r < ROWS; r++) {
    const p0 = seatPos(r, 0), p1 = seatPos(r, PER - 1), dx = (p1.x - p0.x) / (PER - 1);
    ctx.fillStyle = `rgba(30,36,58,${0.9})`;
    roundRect(ctx, p0.x - dx * 0.6, p0.y - 6 * p0.s, p1.x - p0.x + dx * 1.2, 22 * p0.s, 6); ctx.fill();
    for (const st of STUDENTS) if (st.r === r) {
      const p = seatPos(r, st.c);
      drawBack(ctx, p.x + st.dx, p.y + Math.sin(t * 0.8 + st.ph) * 1.2, p.s, st.col, { alpha: crowdA });
      if (questions > 0) {
        const k = questionPop(t, st, questions);
        if (k > 0) text(ctx, '?', p.x + 16 * p.s, p.y - 82 * p.s, { size: 44 * p.s, family: 'Head', weight: 900, color: GOLD, alpha: k });
      }
    }
    for (const [key, [gr, gc]] of Object.entries(SEAT_GIRL)) if (gr === r) {
      const i = Number(key), a = present[i] || 0, p = seatPos(gr, gc);
      drawBack(ctx, p.x, p.y, p.s, ACC[i], { alpha: a, hair: HAIR, glow: a * (i === 3 ? 0.6 + 0.6 * focus : 0.5) });
    }
  }
  ctx.restore();
}
function questionPop(t, st, start) {
  const idx = st.r * PER + st.c;
  const ti = start + (idx * 7919 % 97) / 97 * 3.2;
  return ramp(t, ti, ti + 0.25, easeBack) * (1 - ramp(t, ti + 2.2, ti + 2.6));
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  // 教室里只亮着一个座位
  const z = 1 + 0.05 * ramp(t, 0, 8.7, x => x);
  ctx.save();
  ctx.translate(960, 560); ctx.scale(z, z); ctx.translate(-960, -560);
  drawHall(ctx, t, { alpha: 0.85, crowdA: 0.55, present: { 3: ramp(t, lineAt('hook', 2), lineAt('hook', 2) + 0.8) } });
  ctx.restore();
  const p = seatPos(3, 7);
  glowDot(ctx, p.x * z - 960 * (z - 1), p.y - 40, 260, '#ffd9a0', 0.12 + 0.12 * ramp(t, 0.5, 3) + 0.08 * barPulse(t));
};

SCENES.setup = (ctx, t, s) => {
  const t0 = lineAt('setup', 0), t1 = lineAt('setup', 1), t3 = lineAt('setup', 3);
  text(ctx, '1992', 960, 330, { size: 300, family: 'Head', weight: 900, color: 'rgba(255,226,170,0.10)', alpha: ramp(t, t0, t0 + 0.6) * (1 - ramp(t, t1, t1 + 0.8)) });
  text(ctx, 'Moreland & Beach', 960, 410, { size: 40, family: 'Serif', weight: 400, color: DIM, alpha: ramp(t, t0 + 0.3, t0 + 0.9) * (1 - ramp(t, t1, t1 + 0.6)) });
  for (let i = 0; i < 4; i++) {
    const tb = beatAfter(t1, i);
    const k = ramp(t, tb, tb + 0.45, easeBack);
    const x = 960 + (i - 1.5) * 330, y = 480 + (1 - clamp(k)) * 60 + Math.sin(t * 0.9 + i) * 4;
    drawCard(ctx, i, x, y, 250, { alpha: clamp(k * 1.5), tilt: [-0.05, 0.03, -0.02, 0.05][i], label: false });
    const kl = ramp(t, beatAfter(t3, i), beatAfter(t3, i) + 0.3, easeBack);
    richText(ctx, [[String(VISITS[i]), i === 3 ? GOLD : CREAM], [' 次', CREAM]], x, 720 + 18 * (1 - clamp(kl)),
      { size: 64, family: 'Head', weight: 900, alpha: clamp(kl), shadow: 16 });
  }
};

SCENES.rule = (ctx, t, s) => {
  const t0 = s.start, tHall = lineAt('rule', 1), tMost = lineAt('rule', 3), tAll = lineAt('rule', 5), tNo = lineAt('rule', 6);
  // 起势处的大字
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, tHall - 0.5, tHall));
  if (kb > 0) {
    text(ctx, '规则只有一条', 960, 400, { size: 50, family: 'Serif', weight: 700, color: DIM, alpha: kb });
    ctx.save();
    ctx.translate(960, 560); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.2)) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '不和任何人说话', 0, 0, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
  }
  const kh = ramp(t, tHall - 0.4, tHall + 0.4);
  if (kh <= 0) return;
  // 每拍一节课：来了的人亮起来，下课暗下去
  const present = {}, count = [0, 0, 0, 0];
  for (let k = 0; k < 15; k++) {
    const tb = beatAfter(tHall, k), te = tb + TL.music.beat * 0.85;
    const att = [false, k % 3 === 0, k % 3 !== 2, true];
    for (let i = 1; i < 4; i++) if (att[i]) {
      if (t >= tb) count[i]++;
      const a = ramp(t, tb, tb + 0.08) * (1 - ramp(t, te - 0.1, te));
      present[i] = Math.max(present[i] || 0, a);
    }
  }
  const tEnd = beatAfter(tHall, 15);
  present[3] = Math.max(present[3] || 0, ramp(t, tEnd, tEnd + 0.6));
  const focus = ramp(t, tMost, tMost + 0.6);
  const z = 1 + 0.35 * ramp(t, tAll, tNo + 2.0);
  const p = seatPos(3, 7);
  ctx.save();
  ctx.globalAlpha *= kh;
  ctx.translate(p.x, p.y - 40); ctx.scale(z, z); ctx.translate(-p.x, -(p.y - 40));
  drawHall(ctx, t, { present, focus, crowdA: 1 - 0.45 * ramp(t, tNo, tNo + 0.8) });
  ctx.restore();
  // 出勤计数
  ctx.save(); ctx.globalAlpha *= kh * (1 - ramp(t, tAll, tAll + 0.6));
  for (let i = 0; i < 4; i++) {
    const x = 330 + i * 420, y = 960 - 70;
    const hot = i === 3 ? focus : 0;
    roundRect(ctx, x - 150, y - 46, 300, 76, 38);
    ctx.fillStyle = rgba(ACC[i], 0.16 + 0.2 * hot); ctx.fill();
    ctx.strokeStyle = rgba(ACC[i], 0.6); ctx.lineWidth = 2; ctx.stroke();
    circle(ctx, x - 104, y - 8, 12); ctx.fillStyle = ACC[i]; ctx.fill();
    richText(ctx, [['已来 ', CREAM], [String(count[i]), i === 3 ? GOLD : CREAM], [' 次', CREAM]], x + 14, y + 6,
      { size: 38, family: 'Serif', weight: 700 });
  }
  ctx.restore();
};

const CARD_ROW = i => ({ x: 960 + (i - 1.5) * 360, y: 285 });
SCENES.result = (ctx, t, s) => {
  const t0 = s.start, tQ = lineAt('result', 1), tUp = lineAt('result', 6), tSim = lineAt('result', 7), tQuiet = lineAt('result', 8);
  const base = 925, ppu = 76;
  for (let i = 0; i < 4; i++) {
    const tb = beatAfter(t0, i);
    const k = ramp(t, tb, tb + 0.6, easeOut);
    const { x, y } = CARD_ROW(i);
    const yy = lerp(H + 200, y, k) + Math.sin(t * 0.8 + i) * 3;
    const tBar = lineAt('result', 2 + i);
    const kg = ramp(t, tBar, tBar + 1.2, easeOut);
    const sim = ramp(t, tSim + i * 0.15, tSim + 0.6 + i * 0.15) * (i / 3);
    drawCard(ctx, i, x, yy, 210, { tilt: [-0.04, 0.02, -0.02, 0.04][i] * (1 - 0.6 * ramp(t, tQ, tQ + 0.6)), glow: Math.max(kg * (0.2 + 0.25 * i), sim),
      mouth: t > tQuiet ? 'line' : 'smile' });
    if (t > tQuiet) text(ctx, '……', x + 92, yy - 110, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, tQuiet + i * 0.12, tQuiet + 0.4 + i * 0.12) });
    // 柱子
    if (kg > 0) {
      const h = SCORE[i] * ppu * kg, bw = 120;
      const g = ctx.createLinearGradient(0, base - h, 0, base);
      g.addColorStop(0, ACC[i]); g.addColorStop(1, rgba(ACC[i], 0.25));
      ctx.fillStyle = g;
      roundRect(ctx, x - bw / 2, base - h, bw, h, [10, 10, 0, 0]); ctx.fill();
      const v = (SCORE[i] * clamp(kg * 1.2)).toFixed(1);
      text(ctx, v, x, base - h - 22, { size: 64, family: 'Head', weight: 900, color: i === 3 ? GOLD : CREAM, alpha: clamp(kg * 2), shadow: 14 });
    }
  }
  ctx.fillStyle = rgba('#fbf3e4', 0.3 * ramp(t, lineAt('result', 2) - 0.3, lineAt('result', 2)));
  ctx.fillRect(220, base, 1480, 2);
  // 来得越多，分越高：连线
  const kl = ramp(t, tUp, tUp + 1.2);
  if (kl > 0) {
    ctx.save();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 5; ctx.shadowColor = GOLD; ctx.shadowBlur = 18; ctx.lineCap = 'round';
    ctx.beginPath();
    const pts = SCORE.map((v, i) => [CARD_ROW(i).x, base - v * ppu]);
    ctx.moveTo(...pts[0]);
    const seg = kl * 3;
    for (let i = 1; i < 4; i++) {
      const f = clamp(seg - (i - 1));
      if (f <= 0) break;
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
    }
    ctx.stroke(); ctx.restore();
  }
};

SCENES.twist = (ctx, t, s) => {
  const tQ = lineAt('twist', 1), tPair = lineAt('twist', 2), tSame = lineAt('twist', 3), tLike = lineAt('twist', 4),
    tFam = lineAt('twist', 5), tSo = lineAt('twist', 6), tEarly = lineAt('twist', 7);
  // 一屋子问号
  const kh = 1 - ramp(t, tPair - 0.5, tPair);
  if (kh > 0) {
    ctx.save(); ctx.globalAlpha *= kh;
    drawHall(ctx, t, { crowdA: 0.9, questions: tQ - 0.1 });
    ctx.restore();
  }
  // 15 次 ≈ 0 次
  const kp = ramp(t, tPair - 0.2, tPair + 0.5, easeOut) * (1 - ramp(t, tLike - 0.4, tLike));
  if (kp > 0) {
    ctx.save(); ctx.globalAlpha *= kp;
    drawCard(ctx, 3, 640, 470, 290, { tilt: -0.03 });
    drawCard(ctx, 0, 1280, 470, 290, { tilt: 0.03 });
    const ks = ramp(t, tSame, tSame + 0.4, easeBack);
    text(ctx, '≈', 960, 520, { size: 180 * clamp(ks), family: 'Head', weight: 900, color: GOLD, shadow: 30 });
    text(ctx, '“在课上见过她”', 960, 760, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(ks) });
    ctx.restore();
  }
  // 好感 vs 熟悉感
  const kc = ramp(t, tLike - 0.2, tLike + 0.4);
  if (kc <= 0) return;
  ctx.save(); ctx.globalAlpha *= kc;
  const x0 = 470, x1 = 1450, yb = 800, yt = 260;
  const X = v => lerp(x0, x1, v / 15), Y = v => lerp(yb, yt, (v - 3.0) / 1.8);
  ctx.fillStyle = 'rgba(251,243,228,0.3)'; ctx.fillRect(x0 - 40, yb + 40, x1 - x0 + 80, 2);
  VISITS.forEach((v, i) => {
    text(ctx, `${v} 次`, X(v), yb + 90, { size: 34, family: 'Serif', weight: 700, color: DIM });
  });
  const kL = ramp(t, tLike, tLike + 1.4);
  ctx.save();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowColor = GOLD; ctx.shadowBlur = 20 + 20 * ramp(t, tEarly, tEarly + 0.6);
  ctx.beginPath();
  VISITS.forEach((v, i) => {
    const f = clamp(kL * 3 - (i - 1));
    if (i === 0) ctx.moveTo(X(v), Y(SCORE[0]));
    else if (f > 0) ctx.lineTo(lerp(X(VISITS[i - 1]), X(v), f), lerp(Y(SCORE[i - 1]), Y(SCORE[i]), f));
  });
  ctx.stroke(); ctx.restore();
  VISITS.forEach((v, i) => {
    const a = clamp(kL * 3 - (i - 1) * 1);
    circle(ctx, X(v), Y(SCORE[i]), 10); ctx.fillStyle = rgba('#ffd27a', a); ctx.fill();
    text(ctx, SCORE[i].toFixed(1), X(v), Y(SCORE[i]) - 26, { size: 36, family: 'Serif', weight: 700, color: GOLD, alpha: a });
  });
  text(ctx, '好感', X(15) + 40, Y(4.4) + 12, { size: 44, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: kL });
  const kF = ramp(t, tFam, tFam + 1.2);
  const dim = 1 - 0.5 * ramp(t, tSo, tSo + 0.8);
  if (kF > 0) {
    ctx.save();
    ctx.globalAlpha *= dim;
    ctx.strokeStyle = 'rgba(200,210,235,0.75)'; ctx.lineWidth = 4; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(X(0), Y(3.35)); ctx.lineTo(lerp(X(0), X(15), kF), Y(3.35)); ctx.stroke();
    ctx.restore();
    richText(ctx, [['熟悉感', 'rgba(210,218,240,0.9)'], ['（示意）', 'rgba(210,218,240,0.5)']], X(15) + 40, Y(3.35) + 12,
      { size: 38, family: 'Serif', weight: 700, align: 'left', alpha: kF * dim });
  }
  ctx.restore();
};

// 一张张脸从眼前经过，她每经过一次就更亮一点
const FACES = (() => {
  const rnd = mulberry32(21), cols = ['#6f7fa6', '#7a86a0', '#8d8aa8', '#6c8a99', '#9a8fa0'];
  return Array.from({ length: 26 }, (_, i) => ({ lane: i % 3, off: rnd(), col: cols[i % 5], sp: 0.8 + rnd() * 0.5 }));
})();
SCENES.meaning = (ctx, t, s) => {
  const t0 = s.start, tFlow = lineAt('meaning', 1), tHeart = lineAt('meaning', 5), tSee = lineAt('meaning', 7);
  const kb = ramp(t, t0, t0 + 0.6, easeOut) * (1 - ramp(t, tFlow - 0.3, tFlow + 0.5));
  if (kb > 0) {
    text(ctx, '曝光效应', 960, 540, { size: 170, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    text(ctx, 'Mere Exposure Effect', 960, 630, { size: 44, family: 'Serif', weight: 400, color: DIM, alpha: kb, spacing: 4 });
  }
  const kf = ramp(t, tFlow - 0.2, tFlow + 0.8);
  if (kf <= 0) return;
  ctx.save(); ctx.globalAlpha *= kf * (1 - ramp(t, s.end - 0.6, s.end));
  const span = W + 400;
  for (const f of FACES) {
    const y = [330, 560, 790][f.lane];
    const x = ((f.off * span + (t - tFlow) * 150 * f.sp) % span) - 200;
    const sc = [0.7, 0.85, 0.7][f.lane];
    drawGirl(ctx, x, y + 70, sc, f.col, { alpha: 0.35, mouth: 'line' });
  }
  // 她：每小节经过一次，越来越暖
  const bars = TL.music.bars.filter(b => b >= tFlow - 0.01 && b < s.end);
  const period = 2 * TL.music.beat * 4;
  const passes = Math.floor((t - tFlow) / period);
  const ph = ((t - tFlow) % period) / period;
  const warm = clamp((passes + ph) / 6);
  const x = lerp(-180, W + 180, ph);
  const heart = ramp(t, tHeart, tHeart + 0.5);
  const sc = 0.95 + 0.04 * beatPulse(t) * heart;
  drawGirl(ctx, x, 630, sc, mix('#8f8fb0', ACC[3], warm), { glow: 0.3 + 0.7 * warm, mouth: 'smile' });
  if (heart > 0) {
    const r = 150 + 60 * (1 - beatPulse(t, 0.3));
    ctx.strokeStyle = rgba(ACC[3], 0.5 * heart * beatPulse(t, 0.3)); ctx.lineWidth = 3;
    circle(ctx, x, 540, r); ctx.stroke();
  }
  if (bars.length && t > tSee) glowDot(ctx, x, 540, 340, '#ffd9a0', 0.15 * ramp(t, tSee, tSee + 0.6));
  ctx.restore();
};

SCENES.end = (ctx, t, s) => {
  const t0 = s.start, tYou = lineAt('end', 1), tMaybe = lineAt('end', 2);
  // 夕阳下的空教室：她坐前面，你坐后面
  const her = seatPos(2, 9), you = seatPos(5, 5);
  ctx.save();
  ctx.globalAlpha *= ramp(t, t0 - 0.2, t0 + 0.8);
  const z = 1.08 - 0.08 * ramp(t, t0, s.end, x => x);
  ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960, -540);
  drawHall(ctx, t, { crowdA: 0.12 });
  drawBack(ctx, her.x, her.y, her.s, ACC[3], { hair: HAIR, glow: 0.6 + 0.3 * barPulse(t) });
  const ky = ramp(t, t0 + 0.3, t0 + 1.2);
  drawBack(ctx, you.x, you.y, you.s, '#8fb4ff', { alpha: ky, hair: '#1b1f2e', glow: 0.4 * ky });
  // 视线
  const kl = ramp(t, t0 + 0.6, t0 + 1.8), kb = ramp(t, tYou, tYou + 1.2);
  const a = [you.x, you.y - 50 * you.s], b = [her.x, her.y - 50 * her.s];
  ctx.lineCap = 'round';
  const draw = (p, q, k, col) => {
    if (k <= 0) return;
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(...p);
    const c = [(p[0] + q[0]) / 2, Math.min(p[1], q[1]) - 120];
    for (let i = 1; i <= 30 * k; i++) {
      const u = i / 30;
      ctx.lineTo((1 - u) ** 2 * p[0] + 2 * (1 - u) * u * c[0] + u * u * q[0], (1 - u) ** 2 * p[1] + 2 * (1 - u) * u * c[1] + u * u * q[1]);
    }
    ctx.stroke();
  };
  draw(a, b, kl, rgba('#8fb4ff', 0.8));
  draw(b, a, kb, rgba(ACC[3], 0.8));
  if (t > tMaybe) glowDot(ctx, (a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 60, 200, '#ffd9a0', 0.25 * ramp(t, tMaybe, tMaybe + 1) * (0.8 + 0.2 * barPulse(t)));
  ctx.restore();
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 20);
  for (let i = 0; i < 4; i++) {
    const x = 960 + (i - 1.5) * 300;
    drawCard(ctx, i, x, 300, 230, { tilt: [-0.06, 0.03, -0.03, 0.06][i], glow: i === 3 ? 1 : 0, label: true, lit: i === 3 ? 1 : 0.55 });
  }
  const g = ctx.createLinearGradient(0, 430, 0, H);
  g.addColorStop(0, 'rgba(11,14,27,0)'); g.addColorStop(0.35, 'rgba(11,14,27,0.85)'); g.addColorStop(1, 'rgba(11,14,27,0.95)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, '一句话没说', 960, 700, { size: 130, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  richText(ctx, [['来得越多', CREAM], ['越被喜欢', '#ff8fa3']], 960, 870, { size: 150, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '曝光效应 · 1992 年的课堂实验', 960, 965, { size: 44, family: 'Sans', weight: 700, color: '#ff8fa3', spacing: 4 });
}
