// 为什么你排的那队总是最慢：画面
// 美术方向：打烊前的深夜超市，俯视收银区。墨绿色地砖，每台收银机头顶一盏暖灯；
// 小人推着购物车排队，车里的东西越多，结账越久。你穿珊瑚色，头顶有个“你”字。
// 排队的动画直接读 sim.json 里的模拟片段（DATA.sim.demo_*），统计数字也全部从 DATA.sim 读。

const S = DATA.sim;
const CREAM = '#fbf3e4';
const DIM = 'rgba(251,243,228,0.62)';
const GOLD = '#ffcf6e';
const YOU = '#ff8a73';
const GOOD = '#8fe0b4';
const BAD = '#ec6f74';
const LANE = ['#8fd3c8', '#ffc46b', '#c4a8ff'];
const SHIRTS = ['#6f8fb3', '#8aa58a', '#b38f6f', '#9a86b8', '#6fa3a3', '#b07a8a', '#8f9bb0', '#a8a070'];
const HAIRS = ['#2b2230', '#3a2a22', '#1f2430', '#4a3328'];
const ITEMS = ['#ff9e8a', '#ffd27a', '#9fe0a8', '#8ec5ff', '#f5a8ff', '#ffb86b', '#c9f08a', '#ffe9b0'];
const SKIN = '#f1d3bd';

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
const pct = x => `${Math.round(x * 100)}%`;
const min1 = x => x.toFixed(1);
const comma = n => Math.round(n).toLocaleString('en-US');

// ---------- 背景：地砖 + 暖光 ----------
const DUST = (() => {
  const rnd = mulberry32(5);
  return Array.from({ length: 46 }, () => ({ x: rnd() * W, y: rnd() * H, r: 1 + rnd() * 2.2, v: 3 + rnd() * 8, ph: rnd() * 6 }));
})();
function drawBackground(ctx, t) {
  const g = ctx.createRadialGradient(960, 380, 100, 960, 540, 1300);
  g.addColorStop(0, '#16302f'); g.addColorStop(0.55, '#0f2124'); g.addColorStop(1, '#081215');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(220,255,240,0.035)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 120) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 120) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const lv = musicLevel(t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const y = (d.y - d.v * t + H * 10) % H, x = d.x + Math.sin(t * 0.3 + d.ph) * 18;
    glowDot(ctx, x, y, d.r * 4, '#ffe2b0', (0.1 + 0.22 * lv) * (0.6 + 0.4 * Math.sin(t + d.ph)));
  }
  ctx.restore();
}
function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1180);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const a = Math.max(1 - prog(t, 0, 0.5), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}
function tagNote(ctx, str, x, y, a = 1, align = 'left') {
  text(ctx, str, x, y, { size: 28, family: 'Sans', weight: 400, color: 'rgba(251,243,228,0.5)', align, alpha: a });
}

// ---------- 小人 ----------
// 俯视：(x, y) 是肩膀中心，脸朝 rot 方向（0 = 朝上，朝向收银台）
function drawShopper(ctx, x, y, s, o = {}) {
  const { shirt = SHIRTS[0], hair = HAIRS[0], alpha = 1, items = 3, seed = 0, you = false, glow = 0, rot = 0,
    cart = true, ring = null } = o;
  if (alpha <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (you || glow > 0) glowDot(ctx, 0, -30, 125, you ? YOU : (ring || GOLD), 0.32 + 0.3 * glow);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(3, 10, 36, 22, 0, 0, Math.PI * 2); ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 2, 44, 30, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (cart) {
    // 车里的东西：最多 9 件，按 3×3 摆
    const n = Math.max(1, Math.min(9, items));
    ctx.fillStyle = 'rgba(190,210,225,0.10)';
    roundRect(ctx, -28, -108, 56, 52, 9); ctx.fill();
    for (let k = 0; k < n; k++) {
      const cx = -17 + (k % 3) * 17, cy = -70 - Math.floor(k / 3) * 15;
      ctx.fillStyle = ITEMS[(seed * 3 + k * 5) % ITEMS.length];
      roundRect(ctx, cx - 6.5, cy - 6.5, 13, 13, 3); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(220,230,238,0.8)'; ctx.lineWidth = 2.6;
    roundRect(ctx, -28, -108, 56, 52, 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(220,230,238,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const gx of [-9.5, 9.5]) { ctx.moveTo(gx, -106); ctx.lineTo(gx, -58); }
    ctx.moveTo(-26, -82); ctx.lineTo(26, -82);
    ctx.stroke();
    ctx.strokeStyle = '#dfe6ec'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -50); ctx.lineTo(30, -50); ctx.stroke();
  }
  // 手臂
  ctx.strokeStyle = mix(shirt, '#000000', 0.12); ctx.lineWidth = 9; ctx.lineCap = 'round';
  const hy = cart ? -46 : -20;
  ctx.beginPath(); ctx.moveTo(-23, -6); ctx.lineTo(-21, hy); ctx.moveTo(23, -6); ctx.lineTo(21, hy); ctx.stroke();
  ctx.fillStyle = SKIN; circle(ctx, -21, hy, 5.5); ctx.fill(); circle(ctx, 21, hy, 5.5); ctx.fill();
  // 身体
  const sg = ctx.createLinearGradient(0, -17, 0, 17);
  sg.addColorStop(0, mix(shirt, '#ffffff', 0.18)); sg.addColorStop(1, mix(shirt, '#000000', 0.22));
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 17.5, 0, 0, Math.PI * 2); ctx.fill();
  // 头
  ctx.fillStyle = SKIN; circle(ctx, -15, -3, 3.8); ctx.fill(); circle(ctx, 15, -3, 3.8); ctx.fill();
  ctx.fillStyle = hair; circle(ctx, 0, -3, 15.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.13)'; circle(ctx, -4, -9, 6.5); ctx.fill();
  ctx.restore();
  if (you) youTag(ctx, x, y - 132 * s, Math.max(0.75, s), alpha);
}
function youTag(ctx, x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = YOU; ctx.shadowColor = rgba(YOU, 0.8); ctx.shadowBlur = 16;
  roundRect(ctx, x - 30 * s, y - 24 * s, 60 * s, 46 * s, 23 * s); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y + 20 * s); ctx.lineTo(x + 8 * s, y + 20 * s); ctx.lineTo(x, y + 31 * s); ctx.fill();
  ctx.restore();
  text(ctx, '你', x, y + 11 * s, { size: 31 * s, family: 'Head', weight: 900, color: '#2a1a1c', alpha: a });
}
const look = i => ({ shirt: SHIRTS[(i * 5 + 2) % SHIRTS.length], hair: HAIRS[(i * 3 + 1) % HAIRS.length], seed: i });
const itemsFor = p => Math.round(clamp((p.end - p.start) * 1.4, 1, 9));

// ---------- 收银台 ----------
// 一条收银通道：(x, y0) 是通道顶部，s 缩放；收银台在通道左边
function geo(x, y0, s) { return { x, y0, s, serveY: y0 + 190 * s, gap: 128 * s }; }
function drawCounter(ctx, t, g, i, o = {}) {
  const { busy = 1, lit = 1, alpha = 1, idleMark = 0 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(g.x, g.y0); ctx.scale(g.s, g.s);
  glowDot(ctx, -50, 170, 330, '#ffbe73', (0.10 + 0.08 * busy) * lit + 0.05 * musicLevel(t));
  // 通道两边的地面线
  ctx.strokeStyle = 'rgba(255,240,220,0.07)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-50, 300); ctx.lineTo(-50, 720); ctx.moveTo(56, 120); ctx.lineTo(56, 720); ctx.stroke();
  // 收银员
  drawShopper(ctx, -205, 160, 0.82, { shirt: '#c45c4c', hair: '#2a2028', cart: false, rot: Math.PI / 2 });
  // 台面
  const wg = ctx.createLinearGradient(-165, 0, -60, 0);
  wg.addColorStop(0, '#5a4130'); wg.addColorStop(1, '#7a5a42');
  ctx.fillStyle = wg; ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  roundRect(ctx, -168, 40, 112, 250, 16); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,230,200,0.12)'; roundRect(ctx, -164, 44, 104, 10, 5); ctx.fill();
  // 传送带
  ctx.fillStyle = '#26252c'; roundRect(ctx, -146, 110, 58, 165, 9); ctx.fill();
  ctx.save(); roundRect(ctx, -146, 110, 58, 165, 9); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 3;
  const off = (t * 46 * busy) % 22;
  ctx.beginPath();
  for (let y = 100 - off; y < 290; y += 22) { ctx.moveTo(-146, y); ctx.lineTo(-88, y); }
  ctx.stroke(); ctx.restore();
  // 收银机
  ctx.fillStyle = '#30343c'; roundRect(ctx, -156, 56, 84, 42, 7); ctx.fill();
  ctx.fillStyle = rgba('#ffcf7a', 0.35 + 0.55 * busy); roundRect(ctx, -146, 63, 46, 22, 4); ctx.fill();
  glowDot(ctx, -123, 74, 60, '#ffcf7a', 0.25 * busy);
  // 号牌
  ctx.fillStyle = LANE[i]; ctx.shadowColor = rgba(LANE[i], 0.8); ctx.shadowBlur = 22;
  circle(ctx, -112, 6, 30); ctx.fill(); ctx.shadowColor = 'transparent';
  text(ctx, String(i + 1), -112, 21, { size: 40, family: 'Head', weight: 900, color: '#1d1a22' });
  ctx.restore();
  if (idleMark > 0) {
    const y = g.serveY;
    ctx.save(); ctx.globalAlpha *= idleMark * alpha;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.ellipse(g.x, y - 20 * g.s, 70 * g.s, 70 * g.s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// ---------- 用模拟片段算每个人的位置（τ 是模拟里的分钟） ----------
const MOVE = 0.45, WALK = 0.8;
function sepPeople(people, tau, G, entryY) {
  const out = [];
  people.forEach((p, i) => {
    if (p.arr >= 0 && tau < p.arr) return;
    const g = G[p.lane];
    let ahead = 0;
    for (const q of people) if (q.lane === p.lane && q.start < p.start) ahead += 1 - ramp(tau, q.end, q.end + MOVE);
    let x = g.x, y = g.serveY + ahead * g.gap, a = 1;
    if (p.arr >= 0) {
      const k = ramp(tau, p.arr, p.arr + WALK, easeOut);
      y = lerp(entryY, y, k); a = clamp(k * 2.5);
    }
    if (tau > p.end) {
      const k = ramp(tau, p.end, p.end + WALK, easeIn);
      y -= k * 300 * g.s; x += k * 30 * g.s; a *= 1 - k;
    }
    out.push({ i, p, x, y, a, s: g.s, wait: tau < p.start });
  });
  return out;
}
// 一条总队：Q(u) 给出队里第 u 个位置的坐标（u 可以是小数）
function onePeople(people, tau, G, Q, entry) {
  const out = [];
  people.forEach((p, i) => {
    if (p.arr >= 0 && tau < p.arr) return;
    const g = G[p.lane];
    const serve = [g.x, g.serveY];
    let pos;
    if (p.arr < 0 && p.start <= 0) pos = serve;
    else {
      let qi = 0;
      for (let j = 0; j < i; j++) {
        const q = people[j];
        if (q.arr >= 0 && q.arr > tau) continue;
        if (!(q.arr < 0 && q.start <= 0)) qi += 1 - ramp(tau, q.start, q.start + MOVE);
      }
      const qp = Q(qi);
      const k = ramp(tau, p.start, p.start + WALK);
      pos = [lerp(qp[0], serve[0], k), lerp(qp[1], serve[1], k)];
    }
    let [x, y] = pos, a = 1;
    if (p.arr >= 0) {
      const k = ramp(tau, p.arr, p.arr + WALK, easeOut);
      x = lerp(entry[0], x, k); y = lerp(entry[1], y, k); a = clamp(k * 2.5);
    }
    if (tau > p.end) {
      const k = ramp(tau, p.end, p.end + WALK, easeIn);
      y -= k * 300 * g.s; x += k * 30 * g.s; a *= 1 - k;
    }
    out.push({ i, p, x, y, a, s: g.s, wait: tau < p.start });
  });
  return out;
}
function drawCrowd(ctx, list, o = {}) {
  const { you = -1, ring = {}, glow = {}, dim = 1 } = o;
  list.slice().sort((a, b) => a.y - b.y).forEach(c => {
    const L = look(c.i);
    drawShopper(ctx, c.x, c.y, c.s * 0.92, {
      ...L, items: itemsFor(c.p), alpha: c.a * (c.i === you ? 1 : dim), you: c.i === you,
      ring: ring[c.i] || null, glow: glow[c.i] || 0, shirt: c.i === you ? YOU : L.shirt,
    });
  });
}
const busyAt = (people, tau, lane) => people.some(p => p.lane === lane && p.start <= tau && tau < p.end) ? 1 : 0;
// 满屏的三条通道
const G3 = [0, 1, 2].map(i => geo(620 + i * 400, 110, 1));

// 静态排好的队（不来自模拟，用于示意）
function staticLane(g, n, base, o = {}) {
  return Array.from({ length: n }, (_, k) => ({
    i: base + k, p: { start: 0, end: 2 + ((base + k) * 7 % 5) }, x: g.x, y: g.serveY + k * g.gap, a: 1, s: g.s,
    ...(o[k] || {}),
  }));
}

// ---------- 场景 ----------
const SCENES = {};

SCENES.hook = (ctx, t, s) => {
  const P = S.demo_hook, you = P.length - 1;
  const t0 = 1.0, spm = 0.85, tau = (t - t0) / spm;
  const z = 1.06 - 0.06 * ramp(t, 0, 8.7, x => x);
  ctx.save(); ctx.translate(960, 420); ctx.scale(z, z); ctx.translate(-960, -420);
  G3.forEach((g, i) => drawCounter(ctx, t, g, i, { busy: busyAt(P, tau, i) }));
  const list = sepPeople(P, tau, G3, 1180);
  const emph = ramp(t, lineAt('hook', 2), lineAt('hook', 2) + 0.6);
  drawCrowd(ctx, list, { you, dim: 1 - 0.25 * emph });
  ctx.restore();
  tagNote(ctx, '模拟片段 · 示意', 60, 70, ramp(t, 0.6, 1.4));
};

SCENES.setup = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('setup', 1), t2 = lineAt('setup', 2), t3 = lineAt('setup', 3);
  // 300 万
  const kc = ramp(t, t0, t0 + 0.5) * (1 - ramp(t, t1 - 0.3, t1 + 0.2));
  if (kc > 0) {
    const n = S.total_customers * ramp(t, t0 + 0.1, t1 - 0.4, easeOut);
    text(ctx, comma(n), 960, 560, { size: 170, family: 'Head', weight: 900, color: GOLD, alpha: kc, shadow: 40 });
    text(ctx, '位模拟顾客', 960, 660, { size: 48, family: 'Serif', weight: 700, color: DIM, alpha: kc });
    // 一串小人从下往上走
    for (let k = 0; k < 27; k++) {
      const ph = ((t - t0) * 0.55 + (k * 7 % 27) / 27) % 1;
      drawShopper(ctx, 110 + k * 66, 860 - ph * 70, 0.5, { ...look(k), items: 2 + k % 5, alpha: kc * 0.85 * Math.sin(ph * Math.PI) });
    }
  }
  const ks = ramp(t, t1 - 0.2, t1 + 0.6);
  if (ks <= 0) return;
  ctx.save(); ctx.globalAlpha *= ks;
  // 随便挑一条：高亮在三条队之间跳，最后停在中间
  const pickT = k => beatAfter(t3, k);
  let pick = -1;
  if (t >= t3) { pick = [0, 2, 1][Math.min(2, Math.floor((t - t3) / TL.music.beat))]; }
  G3.forEach((g, i) => {
    drawCounter(ctx, t, g, i, { busy: t > t2 ? 1 : 0.2 });
    if (pick === i) {
      const lit = pickT(2) <= t ? 1 : 0.7;
      ctx.fillStyle = rgba(YOU, 0.10 * lit); roundRect(ctx, g.x - 70, g.y0 + 110, 140, 640, 30); ctx.fill();
      ctx.strokeStyle = rgba(YOU, 0.5 * lit); ctx.lineWidth = 3; ctx.stroke();
    }
  });
  const crowd = [];
  for (let k = 0; k < 3; k++) {
    const kb = ramp(t, beatAfter(t2, k), beatAfter(t2, k) + 0.35, easeBack);
    if (kb <= 0) continue;
    G3.forEach((g, i) => crowd.push({ i: i * 3 + k + 40, p: { start: 0, end: [1.5, 2.6, 1.9, 3.1, 2.2, 1.2, 2.8, 1.7, 2.4][i * 3 + k] }, x: g.x, y: g.serveY + k * g.gap + 30 * (1 - clamp(kb)), a: clamp(kb), s: 1 }));
  }
  drawCrowd(ctx, crowd);
  const ky = ramp(t, pickT(2), pickT(2) + 0.8, easeOut);
  if (ky > 0) drawShopper(ctx, G3[1].x, lerp(1150, G3[1].serveY + 3 * G3[1].gap, ky), 0.92, { shirt: YOU, items: 3, seed: 99, you: true, alpha: clamp(ky * 2) });
  // 参数
  richText(ctx, [['每小时来 ', DIM], [String(S.params.per_hour), GOLD], [' 人 · 平均每人结账 ', DIM], [String(S.params.mean_service_min), GOLD], [' 分钟', DIM]],
    1540, 960 - 60, { size: 34, family: 'Sans', weight: 700, alpha: ramp(t, t1 + 0.3, t1 + 0.9) });
  ctx.restore();
};

// 排名柱状图：vals = 三个比例
function rankBars(ctx, t, vals, o = {}) {
  const { alpha = 1, grow = [1, 1, 1], tint = [0, 0, 0], hi = [0, 0, 0], third = 0 } = o;
  const base = 840, ppu = 820, bw = 210, xs = [600, 960, 1320];
  const labels = ['最快', '中间', '最慢'];
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = 'rgba(251,243,228,0.3)'; ctx.fillRect(420, base, 1080, 3);
  xs.forEach((x, i) => {
    const h = vals[i] * ppu * grow[i];
    if (grow[i] > 0) {
      const col = mix(mix('#8fd3c8', GOLD, hi[i]), BAD, tint[i]);
      if (hi[i] > 0) glowDot(ctx, x, base - h / 2, 300, GOLD, 0.25 * hi[i]);
      const g = ctx.createLinearGradient(0, base - h, 0, base);
      g.addColorStop(0, col); g.addColorStop(1, rgba(col, 0.25));
      ctx.fillStyle = g; roundRect(ctx, x - bw / 2, base - h, bw, h, [14, 14, 0, 0]); ctx.fill();
      text(ctx, pct(vals[i]), x, base - h - 26, { size: 70 + 30 * hi[i], family: 'Head', weight: 900, color: hi[i] > 0.5 ? GOLD : CREAM, alpha: clamp(grow[i] * 2), shadow: 14 });
    }
    text(ctx, labels[i], x, base + 62, { size: 44, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(grow[i] * 3) });
  });
  if (third > 0) {
    const y = base - ppu / 3;
    ctx.save(); ctx.strokeStyle = rgba(GOLD, 0.85 * third); ctx.lineWidth = 3; ctx.setLineDash([16, 12]);
    ctx.beginPath(); ctx.moveTo(440, y); ctx.lineTo(lerp(440, 1480, third), y); ctx.stroke(); ctx.restore();
    text(ctx, '1/3', 1500, y + 14, { size: 44, family: 'Head', weight: 900, color: GOLD, align: 'left', alpha: third });
  }
  ctx.restore();
}

SCENES.reveal = (ctx, t, s) => {
  const t0 = s.start, tBars = lineAt('reveal', 2), tEq = lineAt('reveal', 3), tTwo = lineAt('reveal', 4), tFast = lineAt('reveal', 5);
  const R = S.rank_equal;
  // 起势：大字 1/3
  const kb = ramp(t, t0, t0 + 0.45, easeBack);
  const up = ramp(t, tBars - 0.5, tBars + 0.3, easeInOut);
  const size = lerp(330, 110, up) * (1 + 0.015 * barPulse(t));
  const y = lerp(560, 190, up);
  if (kb > 0) {
    glowDot(ctx, 960, y - size * 0.3, lerp(520, 260, up), GOLD, 0.16 * clamp(kb));
    ctx.save(); ctx.translate(960, y); const sc = 0.85 + 0.15 * kb; ctx.scale(sc, sc);
    text(ctx, '1/3', 0, 0, { size, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kb), shadow: 40 });
    ctx.restore();
    text(ctx, '三条队一样长，你随便挑一条', 960, lerp(680, 250, up) + 0 * up, { size: lerp(44, 0.01, up), family: 'Serif', weight: 700, color: DIM, alpha: clamp(kb) * (1 - up) });
  }
  if (t < tBars - 0.5) return;
  text(ctx, '你那队排第几', 960, 300, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: up });
  const grow = [0, 1, 2].map(i => ramp(t, beatAfter(tBars, i), beatAfter(tBars, i) + 0.7, easeOut));
  const tint = [0, 1, 2].map(i => i === 0 ? 0 : 0.85 * ramp(t, tTwo, tTwo + 0.5));
  rankBars(ctx, t, R, { grow, tint, third: ramp(t, tEq, tEq + 0.9) * (1 - 0.6 * ramp(t, tTwo, tTwo + 0.5)) });
  // 括号：三次里有两次
  const kk = ramp(t, tTwo + 0.2, tTwo + 0.8);
  if (kk > 0) {
    const yb = 840 - Math.max(R[1], R[2]) * 820 - 110;
    ctx.save(); ctx.globalAlpha *= kk;
    ctx.strokeStyle = BAD; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(870, yb + 26); ctx.lineTo(870, yb); ctx.lineTo(1410, yb); ctx.lineTo(1410, yb + 26); ctx.stroke();
    ctx.restore();
    richText(ctx, [['有队比你快 ', CREAM], [pct(R[1] + R[2]), BAD]], 1140, yb - 22, { size: 46, family: 'Head', weight: 900, alpha: kk * ramp(t, tFast - 0.2, tFast + 0.3) + kk * 0.0001 });
  }
};

SCENES.shortest = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('shortest', 1);
  const A = S.rank_equal, B = S.rank_shortest;
  const k = ramp(t, t0 + 0.3, t0 + 1.6);
  const vals = A.map((a, i) => lerp(a, B[i], k));
  const hi = [ramp(t, t1, t1 + 0.5), 0, 0];
  text(ctx, '你挑最短的那队（需要排队时）', 960, 300, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: ramp(t, t0, t0 + 0.5) });
  text(ctx, '1/3', 960, 190, { size: 110, family: 'Head', weight: 900, color: GOLD, alpha: 1 - ramp(t, t0 - 0.2, t0 + 0.4) });
  rankBars(ctx, t, vals, { hi, tint: [0, 0.35, 0.35].map(x => x * (1 - k)) });
};

// 对比：左边分开排，右边一条总队
const GL = [0, 1, 2].map(i => geo(275 + i * 235, 150, 0.7));
const GR = [0, 1, 2].map(i => geo(1235 + i * 235, 150, 0.7));
const QPATH = [[1470, 400], [1470, 640], [1260, 640], [1260, 410]];
function qPoint(u) {
  let d = u * 90;
  for (let k = 0; k < QPATH.length - 1; k++) {
    const [a, b] = [QPATH[k], QPATH[k + 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= len || k === QPATH.length - 2) { const f = d / len; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; }
    d -= len;
  }
}
function statCard(ctx, x, y, label, value, o = {}) {
  const { alpha = 1, color = CREAM, glow = 0 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (glow > 0) glowDot(ctx, x, y, 260, color, 0.25 * glow);
  ctx.fillStyle = 'rgba(10,22,26,0.82)'; ctx.strokeStyle = rgba(color, 0.55); ctx.lineWidth = 2.5;
  roundRect(ctx, x - 300, y - 54, 600, 108, 22); ctx.fill(); ctx.stroke();
  ctx.restore();
  text(ctx, label, x - 272, y + 12, { size: 32, family: 'Sans', weight: 700, color: DIM, alpha, align: 'left' });
  text(ctx, value, x + 272, y + 21, { size: 56, family: 'Head', weight: 900, color, alpha, align: 'right' });
}
SCENES.compare = (ctx, t, s) => {
  const t0 = s.start, L = n => lineAt('compare', n);
  const kb = ramp(t, t0, t0 + 0.5, easeBack) * (1 - ramp(t, L(1) - 1.2, L(1) - 0.5));
  if (kb > 0) {
    glowDot(ctx, 960, 470, 560, GOLD, 0.15 * clamp(kb));
    ctx.save(); ctx.translate(960, 540); const sc = 0.9 + 0.1 * clamp(kb) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '排成一条总队', 0, 0, { size: 170, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kb), shadow: 40 });
    ctx.restore();
    text(ctx, '像银行叫号那样', 960, 660, { size: 48, family: 'Serif', weight: 700, color: DIM, alpha: clamp(kb) });
  }
  const ks = ramp(t, L(1) - 0.9, L(1) - 0.1);
  if (ks <= 0) return;
  ctx.save(); ctx.globalAlpha *= ks;
  const spm = 1.0, tau = (t - (L(1) - 0.5)) / spm;
  const SP = S.demo_separate, OP = S.demo_single;
  // 分界线和标题
  ctx.strokeStyle = 'rgba(251,243,228,0.14)'; ctx.lineWidth = 2; ctx.setLineDash([10, 12]);
  ctx.beginPath(); ctx.moveTo(960, 60); ctx.lineTo(960, 900); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, '各排各的', 480, 72, { size: 50, family: 'Head', weight: 900, color: CREAM });
  text(ctx, '排一条总队', 1440, 72, { size: 50, family: 'Head', weight: 900, color: GOLD });
  GL.forEach((g, i) => drawCounter(ctx, t, g, i, { busy: busyAt(SP, tau, i) }));
  GR.forEach((g, i) => drawCounter(ctx, t, g, i, { busy: busyAt(OP, tau, i) }));
  // 总队的栏杆
  ctx.strokeStyle = rgba(GOLD, 0.18 + 0.2 * ramp(t, L(9), L(9) + 0.6)); ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(1520, 380); ctx.lineTo(1520, 690); ctx.lineTo(1210, 690); ctx.lineTo(1210, 400);
  ctx.moveTo(1420, 380); ctx.lineTo(1420, 590); ctx.lineTo(1310, 590); ctx.lineTo(1310, 400); ctx.stroke();
  const dimCrowd = 1 - 0.3 * ramp(t, L(3) - 0.3, L(3) + 0.3);
  drawCrowd(ctx, sepPeople(SP, tau, GL, 980), { dim: dimCrowd });
  drawCrowd(ctx, onePeople(OP, tau, GR, qPoint, [1260, 980]), { dim: dimCrowd });
  tagNote(ctx, '模拟片段：同一批顾客，同样的结账时间', 960, 790, 1 - ramp(t, L(3) - 0.3, L(3) + 0.3), 'center');
  // 一百万人的结果
  const a = S.separate_shortest, b = S.single;
  const swap = ramp(t, L(6), L(6) + 0.4);
  const k1 = ramp(t, L(3), L(3) + 0.4, easeBack), k2 = ramp(t, L(4), L(4) + 0.4, easeBack);
  const k3 = ramp(t, L(7), L(7) + 0.4, easeBack), k4 = ramp(t, L(8), L(8) + 0.4, easeBack);
  const fin = ramp(t, L(10), L(10) + 0.6);
  const cy = 790;
  statCard(ctx, 480, cy - 62, '平均等待', `${min1(a.mean)} 分钟`, { alpha: clamp(k1) * (1 - 0.65 * swap) });
  statCard(ctx, 1440, cy - 62, '平均等待', `${min1(b.mean)} 分钟`, { alpha: clamp(k2) * (1 - 0.65 * swap), color: GOOD, glow: fin });
  statCard(ctx, 480, cy + 62, '最倒霉的 10%', `${min1(a.p90)} 分钟以上`, { alpha: clamp(k3), color: CREAM });
  statCard(ctx, 1440, cy + 62, '最倒霉的 10%', `${min1(b.p90)} 分钟以上`, { alpha: clamp(k4), color: GOOD, glow: fin });
  tagNote(ctx, `每种排法模拟 ${comma(S.params.customers)} 位顾客`, 960, cy - 140, clamp(k1), 'center');
  ctx.restore();
};

// 分开排的那个片段，停在第 10 分钟：3 号收银台空着，1 号队里有人在等
const FREEZE = 10.0;
const WAITER = 16, LATER = 18;
function frozenStore(ctx, t, o = {}) {
  const { alpha = 1, idle = 0, rings = {}, moveWaiter = 0 } = o;
  const SP = S.demo_separate;
  ctx.save(); ctx.globalAlpha *= alpha;
  G3.forEach((g, i) => drawCounter(ctx, t, g, i, { busy: busyAt(SP, FREEZE, i) || (i === 2 ? moveWaiter : 0), idleMark: i === 2 ? idle * (1 - moveWaiter) : 0 }));
  const list = sepPeople(SP, FREEZE, G3, 1180).map(c => {
    if (c.i !== WAITER || moveWaiter <= 0) return { ...c, y: c.y + Math.sin(t * 1.3 + c.i) * 1.5 };
    // 排一条总队的话，他会直接去空着的 3 号台
    const k = moveWaiter;
    const x = lerp(c.x, G3[2].x, k), y = lerp(c.y, G3[2].serveY, k) - Math.sin(k * Math.PI) * 140;
    return { ...c, x, y };
  });
  drawCrowd(ctx, list, { ring: rings });
  ctx.restore();
  return list;
}
SCENES.why = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('why', 1);
  const lit = ramp(t, t1 - 0.2, t1 + 0.6);
  frozenStore(ctx, t, { alpha: 0.35 + 0.65 * lit });
  const kq = ramp(t, t0, t0 + 0.4, easeBack) * (1 - ramp(t, t1 - 0.3, t1 + 0.3));
  if (kq > 0) {
    ctx.fillStyle = `rgba(8,18,21,${0.5 * kq})`; ctx.fillRect(0, 0, W, H);
    text(ctx, '为什么？', 960, 590, { size: 190, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kq), shadow: 40 });
  }
};
function label(ctx, str, x, y, color, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  font(ctx, 34, 'Sans', 700);
  const w = ctx.measureText(str).width + 36;
  ctx.fillStyle = rgba(color, 0.92); roundRect(ctx, x - w / 2, y - 30, w, 50, 25); ctx.fill();
  ctx.restore();
  text(ctx, str, x, y + 7, { size: 34, family: 'Sans', weight: 700, color: '#1d1a22', alpha: a });
}
function bigStat(ctx, t, val, cap, x, y, a, color = GOLD) {
  if (a <= 0) return;
  text(ctx, val, x, y, { size: 150, family: 'Head', weight: 900, color, alpha: a, shadow: 30 });
  text(ctx, cap, x, y + 64, { size: 38, family: 'Serif', weight: 700, color: DIM, alpha: a });
}
SCENES.idle = (ctx, t, s) => {
  const L = n => lineAt('idle', n);
  const kIdle = ramp(t, L(1), L(1) + 0.5), kWait = ramp(t, L(2), L(2) + 0.5);
  const kLate = ramp(t, L(4), L(4) + 0.5), kMove = ramp(t, L(5) + 0.3, L(5) + 1.5, easeInOut);
  const rings = {};
  if (kWait > 0) rings[WAITER] = BAD;
  if (kLate > 0 && kMove < 1) rings[LATER] = LANE[1];
  const list = frozenStore(ctx, t, { idle: kIdle, rings, moveWaiter: kMove });
  const pos = i => list.find(c => c.i === i);
  const g3 = G3[2];
  label(ctx, '空着', g3.x, g3.serveY + 95, GOLD, kIdle * (1 - kMove));
  const w = pos(WAITER), l = pos(LATER);
  if (w) label(ctx, kLate > 0.5 ? '先来的，还在等' : '在等', w.x, w.y + 140, BAD, kWait * (1 - kMove));
  if (l) label(ctx, '后来的，先结账', l.x, l.y + 268, LANE[1], kLate * (1 - kMove));
  if (kMove >= 1) label(ctx, '没人白等', g3.x, g3.serveY + 95, GOOD, ramp(t, L(5) + 1.5, L(5) + 1.9));
  // 右边的大数字
  const x = 1700;
  const k1 = ramp(t, L(0), L(0) + 0.4, easeBack) * (1 - ramp(t, L(3) - 0.3, L(3)));
  const k2 = ramp(t, L(3), L(3) + 0.4, easeBack) * (1 - ramp(t, L(5), L(5) + 0.4));
  bigStat(ctx, t, pct(S.idle_while_waiting.shortest), '的时间', x, 480, clamp(k1));
  bigStat(ctx, t, pct(S.overtaken.shortest), '的顾客', x, 480, clamp(k2), BAD);
  if (t > L(5)) bigStat(ctx, t, '0', '排一条：都不会发生', x, 480, ramp(t, L(5) + 0.2, L(5) + 0.6), GOOD);
  tagNote(ctx, '模拟片段：分开排，第 10 分钟', 60, 1060 - 120, ramp(t, s.start, s.start + 0.5) * (1 - kMove), 'left');
};

SCENES.switch = (ctx, t, s) => {
  const L = n => lineAt('switch', n);
  const W_ = S.switch;
  // 示意：你那队前面还有 3 个人，隔壁只剩 1 个，你跳过去
  const kOut = ramp(t, L(1) - 0.3, L(1) + 0.4);
  if (kOut < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - kOut;
    G3.forEach((g, i) => drawCounter(ctx, t, g, i, { busy: 1 }));
    const crowd = [...staticLane(G3[0], 3, 60), ...staticLane(G3[1], 3, 70), ...staticLane(G3[2], 1, 80)];
    drawCrowd(ctx, crowd);
    const kj = ramp(t, L(0) + 0.9, L(0) + 1.7, easeInOut);
    const from = [G3[1].x, G3[1].serveY + 3 * G3[1].gap], to = [G3[2].x, G3[2].serveY + G3[2].gap];
    const x = lerp(from[0], to[0], kj), y = lerp(from[1], to[1], kj) - Math.sin(kj * Math.PI) * 120;
    if (kj > 0 && kj < 1) {
      ctx.strokeStyle = rgba(YOU, 0.5); ctx.lineWidth = 4; ctx.setLineDash([10, 12]);
      ctx.beginPath(); ctx.moveTo(...from); ctx.quadraticCurveTo((from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 240, to[0], to[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    drawShopper(ctx, x, y, 0.92, { shirt: YOU, items: 3, seed: 99, you: true });
    tagNote(ctx, '示意', 60, 70);
    ctx.restore();
  }
  if (t < L(1) - 0.3) return;
  // 4 万次
  const kc = ramp(t, L(1), L(1) + 0.4, easeBack);
  const up = ramp(t, L(2) - 0.4, L(2) + 0.2);
  text(ctx, `${comma(W_.episodes * ramp(t, L(1), L(1) + 1.4, easeOut))} 次`, 960, lerp(560, 150, up), { size: lerp(160, 70, up), family: 'Head', weight: 900, color: GOLD, alpha: clamp(kc), shadow: 30 });
  text(ctx, '每次都让同一个人走两遍：换 / 不换', 960, lerp(650, 210, up), { size: lerp(42, 32, up), family: 'Serif', weight: 700, color: DIM, alpha: clamp(kc) });
  if (t < L(2) - 0.4) return;
  // 有队可换的比例：圆环
  const kr = ramp(t, L(2), L(2) + 1.0, easeOut);
  const cx = 480, cy = 560, r = 170;
  ctx.lineWidth = 34; ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(251,243,228,0.12)'; circle(ctx, cx, cy, r); ctx.stroke();
  ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * W_.share_switched * kr); ctx.stroke();
  text(ctx, pct(W_.share_switched), cx, cy + 30, { size: 96, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kr * 2) });
  text(ctx, '有队可换', cx, cy + r + 80, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(kr * 2) });
  // 换了的人：少等 / 一样 / 更慢
  const kb = ramp(t, L(3), L(3) + 1.0, easeOut);
  if (kb <= 0) return;
  const x0 = 830, x1 = 1680, y = 400, h = 86;
  const segs = [[W_.share_better_if_switched, GOOD, '少等了'], [W_.share_same_if_switched, '#9aa3a8', ''], [W_.share_worse_if_switched, BAD, '更慢']];
  const kw = ramp(t, L(5), L(5) + 0.5);
  text(ctx, '换了队的人', x0, y - 70, { size: 38, family: 'Serif', weight: 700, color: DIM, align: 'left', alpha: kb });
  let acc = 0;
  segs.forEach(([v, col, name], i) => {
    const a = x0 + (x1 - x0) * acc * kb, b = x0 + (x1 - x0) * (acc + v) * kb;
    acc += v;
    const hot = i === 2 ? kw : 0;
    if (hot > 0) glowDot(ctx, (a + b) / 2, y + h / 2, 180, BAD, 0.4 * hot);
    ctx.fillStyle = col;
    roundRect(ctx, a, y - 8 * hot, Math.max(0, b - a - 4), h + 16 * hot, i === 0 ? [18, 0, 0, 18] : i === 2 ? [0, 18, 18, 0] : 0); ctx.fill();
    if (name && kb > 0.9) {
      const xm = i === 2 ? b - 4 : (a + b) / 2;
      text(ctx, pct(v), i === 2 ? xm : xm, y + h / 2 + 22, { size: i === 2 ? 44 : 60, family: 'Head', weight: 900, color: '#16201f', align: i === 2 ? 'right' : 'center', alpha: i === 2 ? 0 : 1 });
      text(ctx, i === 2 ? `${name} ${pct(v)}` : name, i === 2 ? x1 : (a + b) / 2, y + h + 62, { size: i === 2 ? 48 : 40, family: 'Sans', weight: 700, color: col, align: i === 2 ? 'right' : 'center', alpha: 1 });
    }
  });
  const ks = ramp(t, L(4), L(4) + 0.4, easeBack);
  if (ks > 0) {
    richText(ctx, [['平均省下 ', CREAM], [min1(W_.saved_mean_if_switched), GOLD], [' 分钟', CREAM]], (x0 + x1) / 2, 720, { size: 90, family: 'Head', weight: 900, alpha: clamp(ks), shadow: 24 });
    text(ctx, `不换平均等 ${min1(W_.stay_mean_if_switched)} 分钟，换了 ${min1(W_.switch_mean_if_switched)} 分钟`, (x0 + x1) / 2, 790, { size: 34, family: 'Sans', weight: 400, color: DIM, alpha: clamp(ks) });
  }
};

// 一个思考泡泡，里面是一条队
function bubble(ctx, x, y, r, n, a, col) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(251,243,228,0.08)'; ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 3;
  circle(ctx, x, y, r); ctx.fill(); ctx.stroke();
  const gap = n > 1 ? (r * 1.35) / (n - 1) : 0, s0 = n > 1 ? Math.min(0.8, gap / 140) : 0.95;
  for (let k = 0; k < n; k++) drawShopper(ctx, x, (n > 1 ? y - r * 0.62 + 80 * s0 + k * gap : y + 45), s0, { ...look(k + 120), items: 2 + k % 4 });
  ctx.restore();
}
SCENES.memory = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('memory', 1);
  const me = [960, 860];
  drawShopper(ctx, me[0], me[1], 1.1, { shirt: YOU, items: 3, seed: 99, you: true, alpha: ramp(t, t0 - 0.3, t0 + 0.3) });
  const kf = ramp(t, t0 + 0.1, t0 + 0.6, easeBack), fade = ramp(t, t0 + 1.2, t1 + 0.4);
  // 快的那次：泡泡飘走、变淡
  const xf = 600 - 120 * fade, yf = 430 - 120 * fade;
  bubble(ctx, xf, yf, 150 * (0.8 + 0.2 * clamp(kf)), 1, clamp(kf) * (1 - 0.9 * fade), GOOD);
  text(ctx, '快', xf, yf - 175, { size: 54, family: 'Head', weight: 900, color: GOOD, alpha: clamp(kf) * (1 - 0.9 * fade) });
  // 慢的那次：泡泡越来越大
  const ks = ramp(t, t1, t1 + 0.6, easeBack), grow = ramp(t, t1, s.end, x => x);
  const rs = 190 + 50 * grow;
  bubble(ctx, 1320, 450 - 20 * grow, rs * clamp(ks + 0.001), 4, clamp(ks), BAD);
  text(ctx, '慢', 1320, 450 - 20 * grow - rs - 26, { size: 60, family: 'Head', weight: 900, color: BAD, alpha: clamp(ks) });
};

SCENES.end = (ctx, t, s) => {
  const t0 = s.start, L = n => lineAt('end', n);
  const lit = ramp(t, L(1) - 0.4, L(1) + 0.6);
  const zoom = 1 + 0.08 * ramp(t, L(3), L(3) + 1.6);
  ctx.save();
  ctx.translate(960, 500); ctx.scale(1 / zoom, 1 / zoom); ctx.translate(-960, -500);
  ctx.globalAlpha *= 0.3 + 0.7 * lit;
  G3.forEach((g, i) => drawCounter(ctx, t, g, i, { busy: 1 }));
  // 别的队往前走：0、2 号队各走一个人；回头看时你这队也动了
  const shift = [ramp(t, L(2) + 0.2, L(2) + 0.9), ramp(t, L(4) - 0.2, L(4) + 0.5), ramp(t, L(2) + 0.7, L(2) + 1.4)];
  const crowd = [];
  const n = [4, 4, 5];
  let youPos = null, fan = null;
  G3.forEach((g, li) => {
    for (let k = 0; k < n[li]; k++) {
      const slot = k - shift[li];
      const i = 200 + li * 10 + k;
      const a = k === 0 ? 1 - shift[li] : 1;
      const c = { i, p: { start: 0, end: 1 + (i * 7) % 5 }, x: g.x, y: g.serveY + slot * g.gap + (k === 0 ? -200 * shift[li] * g.s : 0), a, s: 1 };
      if (li === 1 && k === 2) youPos = c;
      else if (li === 2 && k === 4) fan = c;
      else crowd.push(c);
    }
  });
  drawCrowd(ctx, crowd, { dim: 0.85 });
  const kFan = ramp(t, L(3) + 0.4, L(3) + 1.2);
  drawShopper(ctx, fan.x, fan.y, 0.92, { ...look(fan.i), items: 4, ring: kFan > 0 ? rgba(LANE[2], kFan) : null, glow: 0.5 * kFan, rot: -0.5 * kFan });
  drawShopper(ctx, youPos.x, youPos.y, 0.92, { shirt: YOU, items: 3, seed: 99, you: true, glow: 0.4 * lit });
  // 视线
  const arc = (p, q, k, col) => {
    if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -t * 20;
    ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(...p);
    const c = [(p[0] + q[0]) / 2, Math.min(p[1], q[1]) - 120];
    for (let j = 1; j <= 30 * k; j++) {
      const u = j / 30;
      ctx.lineTo((1 - u) ** 2 * p[0] + 2 * (1 - u) * u * c[0] + u * u * q[0], (1 - u) ** 2 * p[1] + 2 * (1 - u) * u * c[1] + u * u * q[1]);
    }
    ctx.stroke(); ctx.restore();
  };
  const ky = ramp(t, L(2), L(2) + 1.0) * (1 - 0.6 * ramp(t, L(4), L(4) + 0.6));
  const eye = [youPos.x, youPos.y - 30];
  arc(eye, [G3[0].x, G3[0].serveY + 40], ky, rgba(YOU, 0.75));
  arc(eye, [G3[2].x, G3[2].serveY + 40], ky, rgba(YOU, 0.75));
  const kEnvy = ramp(t, L(4), L(4) + 1.2);
  arc([fan.x, fan.y - 30], [youPos.x + 10, youPos.y - 60], kEnvy, rgba(LANE[2], 0.9));
  if (kEnvy > 0) glowDot(ctx, youPos.x, youPos.y - 40, 260, '#ffd9a0', 0.25 * kEnvy * (0.8 + 0.2 * barPulse(t)));
  ctx.restore();
  // 起势：大字
  const kb = ramp(t, t0, t0 + 0.5, easeBack) * (1 - ramp(t, L(1) - 0.6, L(1) + 0.2));
  if (kb > 0) {
    glowDot(ctx, 960, 500, 600, GOLD, 0.14 * clamp(kb));
    ctx.save(); ctx.translate(960, 560); const sc = 0.9 + 0.1 * clamp(kb) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '你那队不是最慢的', 0, 0, { size: 150, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kb), shadow: 40 });
    ctx.restore();
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 20);
  const G = [0, 1, 2].map(i => geo(650 + i * 380, 40, 0.8));
  G.forEach((g, i) => drawCounter(ctx, 10, g, i, { busy: 1 }));
  const crowd = [...staticLane(G[0], 1, 300), ...staticLane(G[1], 3, 310), ...staticLane(G[2], 1, 320)];
  drawCrowd(ctx, crowd);
  drawShopper(ctx, G[1].x, G[1].serveY + 3 * G[1].gap, 0.75, { shirt: YOU, items: 3, seed: 99, you: true });
  const g = ctx.createLinearGradient(0, 470, 0, H);
  g.addColorStop(0, 'rgba(8,18,21,0)'); g.addColorStop(0.4, 'rgba(8,18,21,0.88)'); g.addColorStop(1, 'rgba(8,18,21,0.97)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  text(ctx, '你排的那队', 960, 735, { size: 130, family: 'Head', weight: 900, color: CREAM, shadow: 30 });
  richText(ctx, [['为什么', CREAM], ['总是最慢', YOU], ['？', CREAM]], 960, 890, { size: 150, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '让电脑替你排了 300 万次队', 960, 990, { size: 48, family: 'Sans', weight: 700, color: GOLD, spacing: 4 });
}
