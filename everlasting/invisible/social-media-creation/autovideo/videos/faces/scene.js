// 一个人认识多少张脸：画面
// 美术方向：记忆的夜空。墨紫色的夜里，每一张认识的脸都是一颗暖色的小星星；
// 熟人是琥珀色，名人是玫瑰色（戴墨镜、王冠、帽子），没想起来的脸是暗下去的剪影。
// 数据全部来自 DATA.study（Jenkins, Dowsett & Burton 2018）。

const S = DATA.study;
const CREAM = '#fbf1e6';
const GOLD = '#ffd27a';
const AMBER = '#ffb066';
const ROSE = '#ff8fa8';
const DIM = 'rgba(251,241,230,0.62)';
const FAINT = 'rgba(251,241,230,0.38)';

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
const GA = Math.PI * (3 - Math.sqrt(5)); // 黄金角，向日葵排布

// ---------- 脸 ----------
const SKINS = ['#f6dcc6', '#efc8a8', '#e4b38f', '#cf9670', '#ad7653', '#f3d4bc'];
const HAIRS = ['#2b2030', '#4a3328', '#6b4a32', '#1d1a24', '#8a5a3c', '#c79a6e', '#3d2c44'];
const SPECS = (() => {
  const rnd = mulberry32(7), out = [];
  for (let k = 0; k < 36; k++) {
    out.push({
      skin: SKINS[Math.floor(rnd() * SKINS.length)], hair: HAIRS[Math.floor(rnd() * HAIRS.length)],
      style: Math.floor(rnd() * 6), acc: k >= 24 ? (k % 3) + 1 : 0, eye: 0.85 + rnd() * 0.3,
    });
  }
  return out;
})();
const N_PLAIN = 24, N_FAME = 12;

// 在原点画一张脸，R 为脸的半径。flat 不为空时画成单色剪影
function drawFaceVec(ctx, f, R, flat = null) {
  const hair = flat ? flat[1] : f.hair, skin = flat ? flat[0] : f.skin;
  ctx.fillStyle = hair;
  if (f.style === 3) { ctx.beginPath(); ctx.ellipse(0, 0.25 * R, 1.18 * R, 1.2 * R, 0, 0, Math.PI * 2); ctx.fill(); }
  if (f.style === 1) { roundRect(ctx, -1.12 * R, -0.9 * R, 2.24 * R, 1.75 * R, 0.6 * R); ctx.fill(); }
  if (f.style === 2) { circle(ctx, 0, -1.12 * R, 0.42 * R); ctx.fill(); }
  ctx.fillStyle = skin; circle(ctx, 0, 0, R); ctx.fill();
  ctx.fillStyle = hair;
  if (f.style === 4) {
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + i * 0.15); circle(ctx, Math.cos(a) * 0.86 * R, Math.sin(a) * 0.86 * R, 0.36 * R); ctx.fill(); }
  } else if (f.style === 5) {
    ctx.beginPath(); ctx.arc(0, 0, 1.03 * R, Math.PI * 1.08, Math.PI * 1.92); ctx.quadraticCurveTo(0, -0.55 * R, -0.9 * R, -0.45 * R); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 1.05 * R, Math.PI * 0.98, Math.PI * 2.02);
    ctx.quadraticCurveTo(0.45 * R, -0.25 * R, 0.1 * R, -0.42 * R); ctx.quadraticCurveTo(-0.4 * R, -0.2 * R, -1.05 * R, -0.05 * R); ctx.fill();
  }
  if (flat) return;
  ctx.fillStyle = 'rgba(255,120,140,0.32)';
  for (const sx of [-0.52, 0.52]) { ctx.beginPath(); ctx.ellipse(sx * R, 0.34 * R, 0.17 * R, 0.1 * R, 0, 0, Math.PI * 2); ctx.fill(); }
  if (f.acc === 1) {
    ctx.fillStyle = '#1a1420';
    for (const sx of [-0.36, 0.36]) { roundRect(ctx, sx * R - 0.27 * R, 0.0 * R, 0.54 * R, 0.3 * R, 0.12 * R); ctx.fill(); }
    ctx.fillRect(-0.12 * R, 0.06 * R, 0.24 * R, 0.06 * R);
  } else {
    ctx.fillStyle = '#2e2230';
    for (const sx of [-0.34, 0.34]) { ctx.beginPath(); ctx.ellipse(sx * R, 0.1 * R, 0.09 * R * f.eye, 0.12 * R * f.eye, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.strokeStyle = '#a65a5c'; ctx.lineWidth = Math.max(1, 0.09 * R); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0.3 * R, 0.18 * R, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  if (f.acc === 2) {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(-0.55 * R, -0.95 * R); ctx.lineTo(-0.6 * R, -1.45 * R); ctx.lineTo(-0.28 * R, -1.18 * R);
    ctx.lineTo(0, -1.55 * R); ctx.lineTo(0.28 * R, -1.18 * R); ctx.lineTo(0.6 * R, -1.45 * R); ctx.lineTo(0.55 * R, -0.95 * R); ctx.closePath(); ctx.fill();
  } else if (f.acc === 3) {
    ctx.fillStyle = '#3a2440';
    ctx.beginPath(); ctx.ellipse(0, -0.82 * R, 1.35 * R, 0.24 * R, 0, 0, Math.PI * 2); ctx.fill();
    roundRect(ctx, -0.72 * R, -1.5 * R, 1.44 * R, 0.72 * R, 0.25 * R); ctx.fill();
    ctx.fillStyle = ROSE; ctx.fillRect(-0.72 * R, -0.98 * R, 1.44 * R, 0.14 * R);
  }
}

// 精灵图：亮着的脸、暗着的剪影、各色光晕
const SPR = 72, SPR_R = 23;
let FACE = [], SHADE = [], GLOW = {};
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function setup() {
  FACE = SPECS.map(f => {
    const c = makeCanvas(SPR, SPR), g = c.getContext('2d');
    g.translate(SPR / 2, SPR / 2 + 4); drawFaceVec(g, f, SPR_R); return c;
  });
  SHADE = SPECS.map(f => {
    const c = makeCanvas(SPR, SPR), g = c.getContext('2d');
    g.translate(SPR / 2, SPR / 2 + 4); drawFaceVec(g, f, SPR_R, ['#4a3f66', '#342b4c']); return c;
  });
  for (const col of [AMBER, ROSE, GOLD, CREAM, '#ffe2b8']) {
    const c = makeCanvas(64, 64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.35, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    GLOW[col] = c;
  }
}
// 以 (x, y) 为中心画脸，d 为脸的直径
function face(ctx, k, x, y, d, a = 1, shade = false) {
  if (a <= 0.003 || d < 0.5) return;
  const s = d / (2 * SPR_R) * SPR;
  ctx.globalAlpha = a;
  ctx.drawImage((shade ? SHADE : FACE)[k], x - s / 2, y - s / 2 - 4 * s / SPR, s, s);
  ctx.globalAlpha = 1;
}
function glow(ctx, col, x, y, r, a) {
  if (a <= 0.003) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(GLOW[col], x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}
const plainK = i => (i * 7 + (i >> 3)) % N_PLAIN;
const fameK = i => N_PLAIN + (i * 5 + (i >> 2)) % N_FAME;
const hash = i => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return ((x ^ (x >>> 13)) >>> 0) / 4294967296; };

// 向日葵排布的一团脸：第 i 张的位置和直径
function sunflower(i, n, cx, cy, R) {
  const r = R * Math.sqrt((i + 0.5) / n), th = i * GA;
  return { x: cx + r * Math.cos(th), y: cy + r * Math.sin(th), d: 1.45 * R / Math.sqrt(n) };
}

// ---------- 背景：墨紫夜空，暖色星尘 ----------
const STARS = (() => {
  const rnd = mulberry32(5);
  return Array.from({ length: 140 }, () => ({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.6, ph: rnd() * 6, v: 0.5 + rnd() }));
})();
const NEBULA = [[420, 260, 520, '#ff9a6a'], [1520, 780, 600, '#a070ff'], [1300, 200, 420, '#ff7fa0'], [500, 860, 460, '#7a5cff']];
function drawBackground(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d1532'); g.addColorStop(0.55, '#150f26'); g.addColorStop(1, '#0b0915');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lv = musicLevel(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  NEBULA.forEach(([x, y, r, c], i) => {
    const gx = x + Math.sin(t * 0.05 + i * 2) * 60, gy = y + Math.cos(t * 0.04 + i) * 40;
    const ng = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    ng.addColorStop(0, rgba(c, 0.05 + 0.04 * lv)); ng.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = ng; ctx.fillRect(gx - r, gy - r, 2 * r, 2 * r);
  });
  for (const s of STARS) {
    const a = (0.25 + 0.45 * lv) * (0.55 + 0.45 * Math.sin(t * s.v + s.ph));
    ctx.fillStyle = rgba('#ffe6c4', a);
    circle(ctx, s.x, s.y, s.r); ctx.fill();
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  const v = ctx.createRadialGradient(960, 520, 500, 960, 540, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  const band = ctx.createLinearGradient(0, 860, 0, H);
  band.addColorStop(0, 'rgba(10,7,20,0)'); band.addColorStop(0.55, 'rgba(10,7,20,0.62)'); band.addColorStop(1, 'rgba(10,7,20,0.8)');
  ctx.fillStyle = band; ctx.fillRect(0, 860, W, H - 860);
  const a = Math.max(1 - prog(t, 0, 0.6), prog(t, TL.music.end, TL.duration - 0.1));
  if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
}

// 中央大字后面压一块柔和的暗区，保证在满屏的脸上也看得清
function darkPad(ctx, x, y, rx, ry, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(rx / ry, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, `rgba(12,9,22,${0.85 * a})`); g.addColorStop(0.6, `rgba(12,9,22,${0.6 * a})`); g.addColorStop(1, 'rgba(12,9,22,0)');
  ctx.fillStyle = g; circle(ctx, 0, 0, ry); ctx.fill();
  ctx.restore();
}
function chip(ctx, str, x, y, col, a, size = 30) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  font(ctx, size, 'Sans', 700);
  const w = ctx.measureText(str).width + size * 1.1, h = size * 1.6;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = rgba(col, 0.16); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  text(ctx, str, x, y + size * 0.36, { size, family: 'Sans', weight: 700, color: CREAM, alpha: a });
}
function popIn(t, t0, d = 0.4) { return ramp(t, t0, t0 + d, easeBack); }

const SCENES = {};

// ---------- 开头：满天的脸 ----------
const DRIFT = (() => {
  const rnd = mulberry32(19);
  return Array.from({ length: 420 }, (_, i) => ({ x: rnd() * W, y: 60 + rnd() * 840, d: 14 + rnd() * 20, k: i % N_PLAIN, ph: rnd(), v: 6 + rnd() * 14 }));
})();
const KNOWN = [3, 40, 77, 101, 150, 199, 233, 260, 301, 333, 370, 401];

SCENES.hook = (ctx, t, s) => {
  const t1 = lineAt('hook', 1), t2 = lineAt('hook', 2), t3 = lineAt('hook', 3);
  const known = ramp(t, t1, t1 + 0.9);
  const fadeAll = 1 - 0.55 * ramp(t, t2 - 0.2, t2 + 0.4);
  DRIFT.forEach((f, i) => {
    const appear = ramp(t, 0.1 + f.ph * 1.8, 0.5 + f.ph * 1.8);
    const x = (f.x + f.v * t + W) % (W + 60) - 30, y = f.y + Math.sin(t * 0.4 + f.ph * 9) * 6;
    const isK = KNOWN.includes(i);
    if (isK && known > 0) {
      glow(ctx, AMBER, x, y, f.d * 2.2, 0.55 * known * fadeAll);
      face(ctx, f.k, x, y, f.d * (1 + 0.3 * known), appear * fadeAll);
    } else {
      face(ctx, f.k, x, y, f.d, appear * (0.42 - 0.3 * known) * fadeAll);
      face(ctx, f.k, x, y, f.d, appear * 0.35 * known * fadeAll, true);
    }
  });
  // 一百？一千？一万？
  const guesses = ['100', '1000', '10000'];
  const kOut = 1 - ramp(t, t3 - 0.3, t3 + 0.2);
  guesses.forEach((g, i) => {
    const tb = beatAfter(t2, i * 1.3 | 0);
    const k = popIn(t, tb, 0.45);
    if (k <= 0) return;
    const x = [480, 960, 1470][i], size = [96, 112, 132][i];
    darkPad(ctx, x, 470, 300, 160, clamp(k) * kOut);
    richText(ctx, [[g, GOLD], ['？', CREAM]], x, 500 + 20 * (1 - clamp(k)), { size, family: 'Head', weight: 900, alpha: clamp(k) * kOut, shadow: 24 });
  });
  // 有人真的去数了：一笔一笔写“正”字
  const kz = ramp(t, t3 - 0.1, t3 + 0.3);
  if (kz > 0) {
    darkPad(ctx, 960, 470, 520, 230, kz);
    const strokes = [[[-60, -60], [60, -60]], [[0, -60], [0, 60]], [[0, 0], [50, 0]], [[-45, -10], [-45, 60]], [[-75, 60], [75, 60]]];
    ctx.save();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.shadowColor = GOLD; ctx.shadowBlur = 20;
    for (let z = 0; z < 2; z++) {
      strokes.forEach(([p, q], j) => {
        const n = z * 5 + j, tb = t3 + 0.15 + n * TL.music.beat * 0.36;
        const f = ramp(t, tb, tb + 0.18, x => x);
        if (f <= 0) return;
        const ox = 960 + (z - 0.5) * 220;
        ctx.beginPath(); ctx.moveTo(ox + p[0], 470 + p[1]); ctx.lineTo(ox + lerp(p[0], q[0], f), 470 + lerp(p[1], q[1], f)); ctx.stroke();
      });
    }
    ctx.restore();
  }
};

// ---------- 研究：25 个人，6 小时 ----------
SCENES.setup = (ctx, t, s) => {
  const t0 = lineAt('setup', 0), t1 = lineAt('setup', 1), t2 = lineAt('setup', 2), t3 = lineAt('setup', 3);
  const kt = ramp(t, t0, t0 + 0.6) * (1 - ramp(t, t1 - 0.2, t1 + 0.3));
  text(ctx, '2018', 960, 520, { size: 320, family: 'Head', weight: 900, color: 'rgba(255,214,150,0.14)', alpha: kt });
  text(ctx, 'Jenkins · Dowsett · Burton', 960, 610, { size: 46, family: 'Serif', weight: 700, color: CREAM, alpha: kt, spacing: 2 });
  text(ctx, '英国 · 约克大学等  ·  发表于《英国皇家学会学报 B》', 960, 680, { size: 32, family: 'Sans', weight: 400, color: DIM, alpha: kt });
  // 25 个人
  const kg = 1 - ramp(t, t3 - 0.3, t3 + 0.3);
  if (t > t1 - 0.3 && kg > 0) {
    ctx.save(); ctx.globalAlpha *= kg;
    for (let i = 0; i < S.participants; i++) {
      const r = Math.floor(i / 5), c = i % 5;
      const x = 560 + (c - 2) * 124, y = 470 + (r - 2) * 124;
      const k = popIn(t, t1 + i * 0.06, 0.4);
      if (k <= 0) continue;
      glow(ctx, GOLD, x, y, 70, 0.22 * clamp(k));
      ctx.save(); ctx.globalAlpha *= clamp(k);
      ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
      face(ctx, (i * 5 + 2) % N_PLAIN, x, y + Math.sin(t * 1.3 + i) * 2, 82, ctx.globalAlpha);
      ctx.restore();
    }
    const kn = popIn(t, t1 + 0.3, 0.5);
    richText(ctx, [[String(S.participants), GOLD], [' 人', CREAM]], 1330, 470, { size: 170, family: 'Head', weight: 900, alpha: clamp(kn), shadow: 24 });
    const ka = popIn(t, t2, 0.5);
    richText(ctx, [['平均 ', CREAM], [String(S.mean_age), GOLD], [' 岁', CREAM]], 1330, 600, { size: 72, family: 'Head', weight: 900, alpha: clamp(ka), shadow: 18 });
    text(ctx, '格拉斯哥大学、阿伯丁大学的学生', 1330, 670, { size: 30, family: 'Sans', weight: 400, color: DIM, alpha: clamp(ka) });
    ctx.restore();
  }
  // 6 小时：三关
  const kb = ramp(t, t3 - 0.1, t3 + 0.5);
  if (kb > 0) {
    const segs = [[1, '第一关', '写下认识的人', AMBER], [1, '第二关', '写下认识的名人', ROSE], [4, '第三关', '看照片认人', GOLD]];
    const x0 = 230, total = 1460, y = 560;
    let x = x0;
    segs.forEach(([h, a, b, col], i) => {
      const w = total * h / 6, k = ramp(t, t3 + i * 0.35, t3 + 0.35 + i * 0.35, easeOut);
      ctx.save(); ctx.globalAlpha *= kb;
      roundRect(ctx, x + 5, y - 55, (w - 10) * k, 110, 20);
      const g = ctx.createLinearGradient(0, y - 55, 0, y + 55);
      g.addColorStop(0, rgba(col, 0.75)); g.addColorStop(1, rgba(col, 0.35));
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
      text(ctx, a, x + w / 2, y - 85, { size: 42, family: 'Sans', weight: 700, color: col, alpha: kb * k });
      text(ctx, h === 4 ? '约 4 小时' : '1 小时', x + w / 2, y + 16, { size: 44, family: 'Head', weight: 900, color: '#241830', alpha: kb * k });
      text(ctx, b, x + w / 2, y + 120, { size: h === 4 ? 40 : 34, family: 'Sans', weight: 700, color: CREAM, alpha: kb * k });
      x += w;
    });
    richText(ctx, [['每人约 ', CREAM], [String(S.hours), GOLD], [' 小时', CREAM]], 960, 320, { size: 100, family: 'Head', weight: 900, alpha: kb, shadow: 18 });
  }
};

// ---------- 第一关：回忆熟人 ----------
const PCATS = ['家人', '朋友', '同学', '同事', '邻居', '店员', '医生', '球友', '通勤路上', '旅途'];
// 回忆速度从每 5 分钟 40 个线性降到 21 个，第 m 分钟时已写出的比例（只用于计数动画）
function recallFrac(m, a = S.personal.first5, b = S.personal.last5) {
  const r = x => a + (b - a) * (x - 2.5) / 55;
  const area = x => a * x + (b - a) * (x * x / 2 - 2.5 * x) / 55;
  return clamp(area(m) / area(60));
}
SCENES.recall = (ctx, t, s) => {
  const t0 = s.start, t1 = lineAt('recall', 1), t2 = lineAt('recall', 2), t3 = lineAt('recall', 3), t4 = lineAt('recall', 4);
  const kb = ramp(t, t0, t0 + 0.5, easeOut) * (1 - ramp(t, t1 - 0.5, t1));
  if (kb > 0) {
    text(ctx, '第一关 · 60 分钟', 960, 400, { size: 50, family: 'Sans', weight: 700, color: AMBER, alpha: kb, spacing: 6 });
    ctx.save();
    ctx.translate(960, 560); const sc = 0.92 + 0.08 * easeOut(prog(t, t0, t0 + 1.4)) + 0.015 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, '写下你认识的每一张脸', 0, 0, { size: 128, family: 'Head', weight: 900, color: GOLD, alpha: kb, shadow: 40 });
    ctx.restore();
    text(ctx, '一个人，安安静静，对着一张表格', 960, 680, { size: 36, family: 'Serif', weight: 400, color: DIM, alpha: kb });
  }
  const kin = ramp(t, t1 - 0.3, t1 + 0.4);
  if (kin <= 0) return;
  const kout = 1 - ramp(t, s.end - 0.5, s.end);
  ctx.save(); ctx.globalAlpha *= kin * kout;
  // 时钟
  const tEnd = t4 + 0.6, m = 60 * prog(t, t1, tEnd), cx = 330, cy = 440, R = 150;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(251,241,230,0.14)'; ctx.lineWidth = 16; circle(ctx, cx, cy, R); ctx.stroke();
  ctx.strokeStyle = AMBER; ctx.shadowColor = AMBER; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * m / 60); ctx.stroke();
  ctx.shadowBlur = 0;
  text(ctx, String(Math.floor(m)), cx, cy + 22, { size: 96, family: 'Head', weight: 900, color: CREAM });
  text(ctx, '分钟', cx, cy + 72, { size: 30, family: 'Sans', weight: 400, color: DIM });
  // 计数
  const n = Math.round(S.personal.recalled * recallFrac(m));
  const hot = ramp(t, t4, t4 + 0.4);
  text(ctx, '已写出', cx, 720, { size: 34, family: 'Sans', weight: 400, color: DIM });
  ctx.save(); ctx.translate(cx, 820); const zs = 1 + 0.25 * hot * (1 - ramp(t, t4 + 0.4, t4 + 1.2)) ; ctx.scale(zs, zs);
  richText(ctx, [[String(n), hot > 0 ? GOLD : CREAM], [' 个', CREAM]], 0, 0, { size: 84, family: 'Head', weight: 900, shadow: 16 });
  ctx.restore();
  // 分类标签
  PCATS.forEach((c, i) => {
    const x = 1270 + ((i % 5) - 2) * 165, y = 105 + Math.floor(i / 5) * 72;
    chip(ctx, c, x, y + Math.sin(t * 1.2 + i) * 3, AMBER, popIn(t, beatAfter(t1, Math.floor(i / 3)) + (i % 3) * 0.08, 0.35), 30);
  });
  // 一团慢慢长大的熟人
  const CX = 1270, CY = 560, RR = 300, N = S.personal.recalled;
  for (let i = 0; i < N; i++) {
    if (i >= n) break;
    const p = sunflower(i, N, CX, CY, RR);
    const born = t1 + (tEnd - t1) * inverseFrac(i / N);
    const k = popIn(t, born, 0.35);
    face(ctx, plainK(i), p.x, p.y + Math.sin(t + i) * 1.5, p.d * clamp(k, 0, 1.3), ctx.globalAlpha);
  }
  glow(ctx, AMBER, CX, CY, 420, 0.10 + 0.06 * barPulse(t));
  // 叫不出名字 / “学校门卫”
  const tag = (i, t0, label, sub) => {
    const k = popIn(t, t0, 0.45) * (1 - ramp(t, t0 + 2.0, t0 + 2.3));
    if (k <= 0) return;
    const p = sunflower(i, N, CX, CY, RR);
    glow(ctx, GOLD, p.x, p.y, 90, 0.6 * clamp(k));
    face(ctx, plainK(i), p.x, p.y, 64 * clamp(k), 1);
    ctx.save(); ctx.globalAlpha *= clamp(k);
    const bx = p.x + 60, by = p.y - 90;
    ctx.strokeStyle = rgba(GOLD, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x + 24, p.y - 26); ctx.lineTo(bx, by + 30); ctx.stroke();
    font(ctx, 40, 'Serif', 700);
    const w1 = ctx.measureText(label).width;
    font(ctx, 34, 'Sans', 700);
    const w = w1 + ctx.measureText(sub).width + 70;
    roundRect(ctx, bx - 10, by - 46, w, 80, 16); ctx.fillStyle = 'rgba(30,22,44,0.94)'; ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.8); ctx.stroke();
    ctx.restore();
    text(ctx, label, bx + 15, by + 8, { size: 40, family: 'Serif', weight: 700, color: CREAM, align: 'left', alpha: clamp(k) });
    text(ctx, sub, bx + w - 28, by + 8, { size: 34, family: 'Sans', weight: 700, color: GOLD, align: 'right', alpha: clamp(k) });
  };
  tag(40, t2 + 0.1, '名字：想不起来', '✓ 也算');
  tag(61, t3 + 0.1, '“学校门卫”', '✓ 也算');
  ctx.restore();
};
function inverseFrac(f) { // recallFrac 的反函数（二分）
  let lo = 0, hi = 60;
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (recallFrac(mid) < f) lo = mid; else hi = mid; }
  return lo / 60;
}

// ---------- 越写越慢 → 外推 ----------
// 回忆速度图：横轴分钟（0 ~ xmax），纵轴每 5 分钟写出的个数
const CH = { x0: 330, x1: 1590, yb: 780, yt: 250, vmax: 45 };
function chartX(m, xmax) { return lerp(CH.x0, CH.x1, m / xmax); }
function chartY(v) { return lerp(CH.yb, CH.yt, v / CH.vmax); }
// 只有两个已知点（第 1 段和第 12 段），用过零点 145 分钟的直线做最小二乘，作为示意的趋势线
const TREND = (() => {
  const z = S.personal.zero_min, p = [[2.5, S.personal.first5], [57.5, S.personal.last5]];
  const a = p.reduce((s, [m, v]) => s + v * (z - m), 0) / p.reduce((s, [m]) => s + (z - m) ** 2, 0);
  return m => Math.max(0, a * (z - m));
})();
function drawRateChart(ctx, t, o) {
  const { xmax, bar1, bar2, line = 0, area = 0, alpha = 1 } = o;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  // 坐标轴
  ctx.fillStyle = 'rgba(251,241,230,0.35)'; ctx.fillRect(CH.x0 - 20, CH.yb, CH.x1 - CH.x0 + 60, 3);
  const ticks = xmax > 100 ? [0, 30, 60, 90, 120, 150] : [0, 15, 30, 45, 60];
  ticks.forEach(m => {
    const x = chartX(m, xmax);
    if (x > CH.x1 + 30) return;
    ctx.fillRect(x - 1, CH.yb, 2, 12);
    text(ctx, String(m), x, CH.yb + 50, { size: 30, family: 'Sans', weight: 400, color: DIM });
  });
  text(ctx, '分钟', CH.x1 + 60, CH.yb + 50, { size: 28, family: 'Sans', weight: 400, color: FAINT });
  text(ctx, '每 5 分钟写出的个数', CH.x0 - 20, CH.yt - 40, { size: 30, family: 'Sans', weight: 400, color: FAINT, align: 'left' });
  // 已写的面积和外推的面积
  if (area > 0) {
    const steps = 60;
    const poly = (a, b, fill) => {
      ctx.beginPath(); ctx.moveTo(chartX(a, xmax), CH.yb);
      for (let i = 0; i <= steps; i++) { const m = lerp(a, b, i / steps); ctx.lineTo(chartX(m, xmax), chartY(TREND(m))); }
      ctx.lineTo(chartX(b, xmax), CH.yb); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    };
    ctx.save(); ctx.globalAlpha *= area;
    poly(0, 60, rgba(AMBER, 0.42));
    poly(60, S.personal.zero_min, rgba(AMBER, 0.16));
    ctx.restore();
  }
  // 两根真实的柱子
  const bw = chartX(5, xmax) - chartX(0, xmax);
  [[0, S.personal.first5, bar1], [55, S.personal.last5, bar2]].forEach(([m, v, k]) => {
    if (k <= 0) return;
    const x = chartX(m, xmax), h = (CH.yb - chartY(v)) * easeOut(clamp(k));
    const g = ctx.createLinearGradient(0, CH.yb - h, 0, CH.yb);
    g.addColorStop(0, AMBER); g.addColorStop(1, rgba(AMBER, 0.3));
    ctx.fillStyle = g; roundRect(ctx, x + 3, CH.yb - h, bw - 6, h, [8, 8, 0, 0]); ctx.fill();
    const big = xmax < 100;
    text(ctx, String(Math.round(v * clamp(k * 1.3))), x + bw / 2, CH.yb - h - (big ? 24 : 14), { size: big ? 80 : 46, family: 'Head', weight: 900, color: GOLD, alpha: clamp(k * 2), shadow: 14 });
  });
  // 趋势线
  if (line > 0) {
    const z = S.personal.zero_min, end = z * line;
    ctx.save();
    ctx.strokeStyle = CREAM; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(chartX(0, xmax), chartY(TREND(0)));
    ctx.lineTo(chartX(Math.min(end, 60), xmax), chartY(TREND(Math.min(end, 60)))); ctx.stroke();
    if (end > 60) {
      ctx.setLineDash([14, 12]); ctx.strokeStyle = GOLD;
      ctx.beginPath(); ctx.moveTo(chartX(60, xmax), chartY(TREND(60))); ctx.lineTo(chartX(end, xmax), chartY(TREND(end))); ctx.stroke();
    }
    ctx.restore();
    text(ctx, '趋势外推（示意）', chartX(95, xmax), chartY(TREND(95)) - 40, { size: 30, family: 'Sans', weight: 400, color: DIM, alpha: ramp(line, 0.5, 0.8) });
  }
  ctx.restore();
}

SCENES.slow = (ctx, t, s) => {
  const t0 = lineAt('slow', 0), t1 = lineAt('slow', 1);
  drawRateChart(ctx, t, { xmax: 60, bar1: ramp(t, t0, t0 + 0.8, x => x), bar2: ramp(t, t1, t1 + 0.8, x => x), alpha: ramp(t, t0 - 0.3, t0 + 0.3) });
  // 中间各段只标位置
  const a = ramp(t, t0, t0 + 0.5) * 0.35;
  for (let i = 1; i < 11; i++) {
    const x = chartX(i * 5 + 2.5, 60);
    circle(ctx, x, CH.yb - 14, 4); ctx.fillStyle = rgba(CREAM, a); ctx.fill();
  }
  text(ctx, '前 5 分钟', chartX(2.5, 60), CH.yb + 100, { size: 32, family: 'Sans', weight: 700, color: AMBER, alpha: ramp(t, t0, t0 + 0.4) });
  text(ctx, '最后 5 分钟', chartX(57.5, 60), CH.yb + 100, { size: 32, family: 'Sans', weight: 700, color: AMBER, alpha: ramp(t, t1, t1 + 0.4) });
};

// ---------- 外推；第二关：名人 ----------
const FCATS = ['影视', '音乐', '政治', '体育', '王室', '科学', '时尚', '商界', '历史人物'];
SCENES.extra = (ctx, t, s) => {
  const L = i => lineAt('extra', i);
  const t0 = s.start;
  // 外推图
  const kc = 1 - ramp(t, L(2) - 0.5, L(2));
  if (kc > 0) {
    const xmax = lerp(60, 150, ramp(t, t0, t0 + 1.0));
    const line = ramp(t, t0 + 0.6, t0 + 2.2, x => x);
    const area = ramp(t, L(1), L(1) + 0.8);
    drawRateChart(ctx, t, { xmax, bar1: 1, bar2: 1, line, area, alpha: kc });
    const z = S.personal.zero_min, zx = chartX(z, xmax);
    const kz = popIn(t, t0 + 2.0, 0.5) * kc;
    if (kz > 0) {
      glow(ctx, GOLD, zx, CH.yb, 120, 0.7 * clamp(kz) * (0.7 + 0.3 * barPulse(t)));
      circle(ctx, zx, CH.yb, 12); ctx.fillStyle = rgba('#ffd27a', clamp(kz)); ctx.fill();
      richText(ctx, [[String(z), GOLD], [' 分钟', CREAM]], zx, CH.yb - 190, { size: 96, family: 'Head', weight: 900, alpha: clamp(kz), shadow: 20 });
      text(ctx, '才写得完', zx, CH.yb - 120, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(kz) });
    }
    if (area > 0) {
      const ax = chartX(25, xmax), bx = chartX(90, xmax);
      text(ctx, `已写 ${S.personal.recalled}`, ax, chartY(10), { size: 40, family: 'Head', weight: 900, color: '#2a1c30', alpha: area * kc });
      text(ctx, '还没写的', bx, chartY(5), { size: 34, family: 'Sans', weight: 700, color: CREAM, alpha: area * kc });
      richText(ctx, [['全部 ≈ ', CREAM], [String(S.personal.projected), GOLD]], 1060, 330, { size: 96, family: 'Head', weight: 900, alpha: area * kc, shadow: 18 });
    }
  }
  // 第二关
  const k2 = ramp(t, L(2) - 0.2, L(2) + 0.4);
  if (k2 <= 0) return;
  const tm = L(7);
  const kHead = k2 * (1 - ramp(t, tm - 0.4, tm));
  text(ctx, '第二关 · 60 分钟 · 写名人', 960, 120, { size: 44, family: 'Sans', weight: 700, color: ROSE, alpha: kHead, spacing: 4 });
  FCATS.forEach((c, i) => {
    chip(ctx, c, 300 + (i % 2) * 150, 240 + i * 62, ROSE, popIn(t, L(3) + i * 0.1, 0.35) * kHead, 28);
  });
  // 名人一团
  const N = S.famous.projected, NR = S.famous.recalled;
  const tStart = L(2) + 0.3, tFull = L(5) + 0.4;
  const merge = ramp(t, tm, tm + 1.6);
  const CX = lerp(1150, 1340, merge), CY = lerp(500, 520, merge), RR = lerp(300, 205, merge);
  const extra = ramp(t, L(6), L(6) + 1.4);
  for (let i = 0; i < N; i++) {
    const p = sunflower(i, N, CX, CY, RR);
    let a;
    if (i < NR) a = popIn(t, tStart + (tFull - tStart) * inverseFrac(i / NR), 0.35);
    else a = ramp(t, L(6) + (i - NR) / (N - NR) * 1.2, L(6) + 0.3 + (i - NR) / (N - NR) * 1.2) * (0.55 + 0.45 * merge);
    if (a <= 0) continue;
    face(ctx, fameK(i), p.x, p.y + Math.sin(t + i) * 1.2, p.d * clamp(a, 0, 1.3), clamp(a));
  }
  glow(ctx, ROSE, CX, CY, RR * 1.4, 0.12 + 0.06 * barPulse(t));
  // 按个数发钱
  const kcoin = ramp(t, L(4), L(4) + 0.3) * (1 - ramp(t, L(5) - 0.2, L(5) + 0.2));
  if (kcoin > 0) {
    for (let j = 0; j < 8; j++) {
      const tb = beatAfter(L(4), j % 4) + (j >> 2) * 0.27, ph = prog(t, tb, tb + 0.9);
      if (ph <= 0 || ph >= 1) continue;
      const p = sunflower((j * 37 + 11) % NR, N, CX, CY, RR);
      const y = p.y - 40 - 70 * easeOut(ph), a = kcoin * (1 - ph);
      ctx.save(); ctx.globalAlpha *= a;
      circle(ctx, p.x, y, 26); ctx.fillStyle = GOLD; ctx.fill();
      ctx.strokeStyle = '#c98f2e'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      text(ctx, '1p', p.x, y + 9, { size: 24, family: 'Head', weight: 900, color: '#8a5a1a', alpha: a });
    }
    text(ctx, '每写一个给 1 便士，每多写 100 个，单价再涨 1 便士', 1150, 880, { size: 30, family: 'Sans', weight: 400, color: DIM, alpha: kcoin });
  }
  // 计数
  const nNow = t < L(6) ? Math.round(NR * recallFrac(60 * prog(t, tStart, tFull), S.famous.first5, S.famous.last5))
    : Math.round(lerp(NR, N, extra));
  const kn = ramp(t, L(2) + 0.2, L(2) + 0.6) * (1 - ramp(t, tm - 0.3, tm + 0.2));
  const isExtra = t >= L(6);
  if (kn > 0) {
    darkPad(ctx, 1150, 500, 230, 110, 0.9 * kn * ramp(t, L(5), L(5) + 0.3));
    richText(ctx, [[isExtra ? '≈ ' : '', CREAM], [String(nNow), t > L(5) ? GOLD : CREAM]], 1150, 540, { size: 120, family: 'Head', weight: 900, alpha: kn * ramp(t, L(5), L(5) + 0.3), shadow: 20 });
    if (isExtra) text(ctx, `前 5 分钟 ${S.famous.first5} 个，最后 5 分钟 ${S.famous.last5} 个，外推到 ${S.famous.zero_min} 分钟`, 1150, 880, { size: 30, family: 'Sans', weight: 400, color: DIM, alpha: kn * extra });
  }
  // 两团相加
  if (merge > 0) {
    const NP = S.personal.projected, ax = lerp(400, 600, merge), ay = 520, ar = 230 * merge;
    for (let i = 0; i < NP; i++) {
      const p = sunflower(i, NP, ax, ay, Math.max(1, ar));
      face(ctx, plainK(i), p.x, p.y + Math.sin(t + i) * 1.2, p.d, merge);
    }
    glow(ctx, AMBER, ax, ay, 320, 0.12 * merge);
    const km = ramp(t, tm + 0.4, tm + 1.2);
    text(ctx, '认识的人', 600, 830, { size: 36, family: 'Sans', weight: 700, color: AMBER, alpha: km });
    text(ctx, String(NP), 600, 900, { size: 64, family: 'Head', weight: 900, color: CREAM, alpha: km });
    text(ctx, '名人', 1340, 830, { size: 36, family: 'Sans', weight: 700, color: ROSE, alpha: km });
    text(ctx, String(N), 1340, 900, { size: 64, family: 'Head', weight: 900, color: CREAM, alpha: km });
    text(ctx, '+', 970, 560, { size: 120, family: 'Head', weight: 900, color: CREAM, alpha: km });
    const ke = popIn(t, tm + 1.3, 0.5);
    if (ke > 0) {
      darkPad(ctx, 970, 180, 300, 110, clamp(ke));
      richText(ctx, [['≈ ', CREAM], [String(S.recall_total), GOLD], [' 个', CREAM]], 970, 215, { size: 110, family: 'Head', weight: 900, alpha: clamp(ke), shadow: 20 });
    }
  }
};

// ---------- 想得起来的，只是一部分 ----------
const NT = S.recall_total;
const MERGED_TYPE = i => (hash(i) < S.famous.projected / NT ? 1 : 0);
function mergedPos(i, cx = 960, cy = 470, R = 250) { return sunflower(i, NT, cx, cy, R); }
const FOG = (() => {
  const rnd = mulberry32(33);
  return Array.from({ length: 700 }, (_, i) => {
    const a = rnd() * Math.PI * 2, r = 290 + Math.pow(rnd(), 0.8) * 560;
    return { x: 960 + Math.cos(a) * r * 1.25, y: 470 + Math.sin(a) * r * 0.72, d: 13 + rnd() * 8, k: i % 36, ph: rnd() * 6 };
  });
})();
function drawMerged(ctx, t, a, o = {}) {
  const { cx = 960, cy = 470, R = 250 } = o;
  for (let i = 0; i < NT; i++) {
    const p = mergedPos(i, cx, cy, R), ty = MERGED_TYPE(i);
    face(ctx, ty ? fameK(i) : plainK(i), p.x, p.y + Math.sin(t + i) * 1.2, p.d, a);
  }
  glow(ctx, '#ffe2b8', cx, cy, R * 1.5, 0.14 * a);
}
SCENES.hidden = (ctx, t, s) => {
  const t0 = lineAt('hidden', 0), t1 = lineAt('hidden', 1);
  // 两团汇成一团
  const km = ramp(t, s.start - 0.4, s.start + 1.0);
  const NP = S.personal.projected, NF = S.famous.projected;
  let ip = 0, iff = 0;
  for (let i = 0; i < NT; i++) {
    const ty = MERGED_TYPE(i);
    const src = ty ? sunflower(Math.min(iff++, NF - 1), NF, 1340, 520, 205) : sunflower(Math.min(ip++, NP - 1), NP, 600, 520, 230);
    const dst = mergedPos(i);
    const k = easeInOut(clamp(km * 1.2 - hash(i + 7) * 0.2));
    face(ctx, ty ? fameK(i) : plainK(i), lerp(src.x, dst.x, k), lerp(src.y, dst.y, k) + Math.sin(t + i) * 1.2, lerp(src.d, dst.d, k), 1);
  }
  glow(ctx, '#ffe2b8', 960, 470, 380, 0.14 * km);
  text(ctx, `想得起来的 ≈ ${NT}`, 960, 790, { size: 44, family: 'Serif', weight: 700, color: CREAM, alpha: ramp(t, t0, t0 + 0.5) });
  // 外面一圈暗着的脸
  const kf = ramp(t, t1 - 0.2, t1 + 1.2);
  FOG.forEach((f, i) => {
    const a = clamp(kf * 1.6 - (i / FOG.length) * 0.6);
    if (a <= 0) return;
    face(ctx, f.k, f.x, f.y + Math.sin(t * 0.7 + f.ph) * 3, f.d, a * (0.55 + 0.2 * Math.sin(t * 2 + f.ph)), true);
  });
  text(ctx, '见了才认得的？', 1560, 170, { size: 40, family: 'Serif', weight: 700, color: DIM, alpha: kf });
};

// ---------- 第三关：3441 个名人，两张照片 ----------
const WALL = (() => {
  const n = S.database, cols = 93, rows = Math.ceil(n / cols), cell = 18.5;
  const x0 = 960 - (cols - 1) * cell / 2, y0 = 470 - (rows - 1) * cell / 2;
  const rnd = mulberry32(41);
  const cells = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const x = x0 + c * cell, y = y0 + r * cell;
    cells.push({ x, y, k: (i * 11 + r) % 36, dist: Math.hypot(x - 960, (y - 470) * 1.6), u: rnd() });
  }
  // 平均认出 775 个：随机挑 775 个；其中按 1 : 4.62 标出“自己想得起来的”（示意）
  const order = cells.map((_, i) => i).sort((a, b) => cells[a].u - cells[b].u);
  const nRec = Math.round(S.recognized_both / S.ratio);
  order.slice(0, S.recognized_both).forEach((i, j) => { cells[i].known = true; cells[i].rank = j / S.recognized_both; cells[i].recalled = j < nRec; });
  return { cells, cell };
})();
function drawWall(ctx, t, o) {
  const { appear = 1, lit = 0, recalled = 0, dim = 1 } = o;
  const d = WALL.cell * 0.9;
  for (const c of WALL.cells) {
    const a = clamp(appear * 1.4 - c.dist / 1500);
    if (a <= 0) continue;
    const L = c.known ? clamp(lit * 1.5 - c.rank * 0.5) : 0;
    if (L > 0) {
      glow(ctx, c.recalled && recalled > 0 ? CREAM : ROSE, c.x, c.y, d * 1.4, 0.35 * L * dim);
      face(ctx, c.k, c.x, c.y, d * (1 + 0.15 * L), L * dim);
      if (c.recalled && recalled > 0) {
        ctx.strokeStyle = rgba('#ffffff', 0.9 * recalled * dim); ctx.lineWidth = 2.2;
        circle(ctx, c.x, c.y, d * 0.72); ctx.stroke();
      }
    }
    if (L < 1) face(ctx, c.k, c.x, c.y, d, a * (1 - L) * dim * (1 - 0.4 * lit), true);
  }
}
function photoCard(ctx, k, x, y, w, o = {}) {
  const { alpha = 1, tilt = 0, variant = 0, mark = null, markA = 0, label = '' } = o;
  if (alpha <= 0) return;
  const h = w * 1.25;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y); ctx.rotate(tilt);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#f5ece0'; roundRect(ctx, -w / 2, -h / 2, w, h, 8); ctx.fill();
  ctx.shadowColor = 'transparent';
  const pw = w * 0.88, ph = h * 0.78, px = -pw / 2, py = -h / 2 + w * 0.06;
  const bg = ctx.createLinearGradient(px, py, px + pw, py + ph);
  if (variant === 0) { bg.addColorStop(0, '#6a4a6e'); bg.addColorStop(1, '#2c2140'); }
  else { bg.addColorStop(0, '#2e4a5c'); bg.addColorStop(1, '#4a3550'); }
  ctx.fillStyle = bg; ctx.fillRect(px, py, pw, ph);
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  // 同一个人，不同的照片：角度、大小、光线都不一样
  ctx.translate(variant ? pw * 0.08 : -pw * 0.04, py + ph * (variant ? 0.55 : 0.5) + 0);
  ctx.rotate(variant ? 0.16 : -0.06);
  ctx.fillStyle = variant ? '#3a2440' : '#4a3a5a';
  ctx.beginPath(); ctx.ellipse(0, pw * 0.5, pw * 0.42, pw * 0.24, 0, Math.PI, Math.PI * 2); ctx.fill();
  drawFaceVec(ctx, SPECS[k], pw * (variant ? 0.27 : 0.23));
  if (variant) { ctx.fillStyle = 'rgba(255,190,120,0.16)'; ctx.fillRect(-pw, -ph, pw * 2, ph * 2); }
  ctx.restore();
  if (label) text(ctx, label, 0, h / 2 - w * 0.07, { size: w * 0.11, family: 'Sans', weight: 700, color: '#4a3a48' });
  ctx.restore();
  if (mark && markA > 0) {
    const ok = mark === 'y';
    const kk = clamp(markA);
    circle(ctx, x + w * 0.38, y - h * 0.42, 34 * kk);
    ctx.fillStyle = ok ? GOLD : '#7a6a8a'; ctx.fill();
    text(ctx, ok ? '✓' : '✗', x + w * 0.38, y - h * 0.42 + 14, { size: 44 * kk, family: 'Sans', weight: 700, color: '#241830' });
  }
}
SCENES.recog = (ctx, t, s) => {
  const L = i => lineAt('recog', i);
  const t0 = s.start;
  const wallA = ramp(t, t0 - 0.2, t0 + 1.4, x => x);
  const away = ramp(t, L(1) - 0.3, L(1) + 0.3) * (1 - ramp(t, L(4) - 0.4, L(4) + 0.1));
  const lit = ramp(t, L(4), L(4) + 1.6, x => x);
  const rec = ramp(t, L(5), L(5) + 0.8);
  drawWall(ctx, t, { appear: wallA, lit, recalled: rec, dim: 1 - 0.8 * away });
  // 3441 的大字
  const kb = popIn(t, t0 + 0.2, 0.6) * (1 - ramp(t, L(1) - 0.4, L(1)));
  if (kb > 0) {
    darkPad(ctx, 960, 470, 560, 230, clamp(kb));
    ctx.save(); ctx.translate(960, 500); const sc = 0.95 + 0.05 * clamp(kb) + 0.012 * barPulse(t); ctx.scale(sc, sc);
    text(ctx, String(S.database), 0, 0, { size: 240, family: 'Head', weight: 900, color: GOLD, alpha: clamp(kb), shadow: 40 });
    ctx.restore();
    text(ctx, '个名人的脸', 960, 590, { size: 54, family: 'Serif', weight: 700, color: CREAM, alpha: clamp(kb) });
  }
  // 两张照片
  if (away > 0) {
    const k = 23 + 4; // 一张戴帽子的名人脸
    const ka = popIn(t, L(1), 0.5), kb2 = popIn(t, L(1) + 0.25, 0.5);
    const yA = beatAfter(L(2), 1), yB = beatAfter(L(2), 2);
    const both = ramp(t, L(3), L(3) + 0.5);
    const shift = ramp(t, L(3) - 0.2, L(3) + 0.4);
    const cx = lerp(960, 760, shift);
    photoCard(ctx, k, cx - 190, 450, 300, { alpha: away * clamp(ka), tilt: -0.04, variant: 0, label: '照片 A', mark: 'y', markA: popIn(t, yA, 0.3) });
    photoCard(ctx, k, cx + 190, 450, 300, { alpha: away * clamp(kb2), tilt: 0.04, variant: 1, label: '照片 B', mark: 'y', markA: popIn(t, yB, 0.3) });
    const kq = ramp(t, L(2), L(2) + 0.4) * away;
    text(ctx, '认识这张脸吗？', cx, 760, { size: 46, family: 'Serif', weight: 700, color: CREAM, alpha: kq * (1 - both) });
    ['Y', 'N'].forEach((key, j) => {
      const kx = cx + (j ? 70 : -70), press = key === 'Y' ? Math.max(beatPulse(t - (yA - L(2)) * 0 , 0.2) * (t > yA ? 1 : 0), 0) : 0;
      const kk = kq * (1 - both);
      if (kk <= 0) return;
      ctx.save(); ctx.globalAlpha *= kk;
      roundRect(ctx, kx - 34, 800 + 4 * press, 68, 64, 12);
      ctx.fillStyle = key === 'Y' ? rgba(GOLD, 0.25 + 0.5 * press) : 'rgba(251,241,230,0.08)'; ctx.fill();
      ctx.strokeStyle = key === 'Y' ? GOLD : FAINT; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      text(ctx, key, kx, 846 + 4 * press, { size: 40, family: 'Head', weight: 900, color: key === 'Y' ? GOLD : DIM, alpha: kk });
    });
    if (both > 0) {
      richText(ctx, [['✓ + ✓ = ', CREAM], ['认识', GOLD]], cx, 790, { size: 54, family: 'Head', weight: 900, alpha: both * away });
      // 只认出一张：不算
      const kx = ramp(t, L(3) + 0.6, L(3) + 1.1) * away;
      photoCard(ctx, 30, 1430, 390, 160, { alpha: kx, tilt: -0.03, variant: 0, mark: 'y', markA: kx });
      photoCard(ctx, 30, 1630, 390, 160, { alpha: kx, tilt: 0.03, variant: 1, mark: 'n', markA: kx });
      richText(ctx, [['✓ + ✗ = ', DIM], ['不算', DIM]], 1530, 590, { size: 44, family: 'Head', weight: 900, alpha: kx });
      text(ctx, '可能只是认得这张照片', 1530, 640, { size: 28, family: 'Sans', weight: 400, color: FAINT, alpha: kx });
    }
  }
  // 775
  if (lit > 0) {
    const kn = ramp(t, L(4), L(4) + 0.4);
    darkPad(ctx, 960, 470, 360, 150, kn * 0.95);
    const n = Math.round(S.recognized_both * clamp(lit * 1.25));
    richText(ctx, [[String(n), GOLD]], 960, 520, { size: 180, family: 'Head', weight: 900, alpha: kn, shadow: 30 });
    text(ctx, `平均认出（共 ${S.database} 个）`, 960, 585, { size: 36, family: 'Sans', weight: 700, color: CREAM, alpha: kn });
    if (rec > 0) {
      ctx.save(); ctx.globalAlpha *= rec;
      circle(ctx, 640, 870, 11); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.restore();
      text(ctx, '自己也想得起来的', 662, 880, { size: 30, family: 'Sans', weight: 700, color: CREAM, align: 'left', alpha: rec });
      circle(ctx, 1000, 870, 9); ctx.fillStyle = rgba(ROSE, rec); ctx.fill();
      text(ctx, '见了才认得的（比例示意）', 1022, 880, { size: 30, family: 'Sans', weight: 700, color: CREAM, align: 'left', alpha: rec });
    }
  }
};

// ---------- 1 : 4.6，放大 ----------
// 天空里 5000 张脸：前 944 张是“想得起来的”那一团，其余的从它们身边飞出去
const SKY = (() => {
  // 向日葵排布从内往外排，前 944 张自然落在中心，成为这片星系的核
  const n = S.rounded, rnd = mulberry32(57), out = [];
  for (let i = 0; i < n; i++) {
    const p = sunflower(i, n, 0, 0, 1);
    const x = 960 + p.x * 930 + (rnd() - 0.5) * 6, y = 470 + p.y * 455 + (rnd() - 0.5) * 6;
    const parent = i < NT ? i : Math.floor(rnd() * NT);
    out.push({ x, y, d: 11 + rnd() * 5, k: (i * 13) % 36, parent, ph: rnd() * 6, u: rnd(), type: i < NT ? MERGED_TYPE(i) : (rnd() < 0.42 ? 1 : 0) });
  }
  return out;
})();
// grow: 0 = 只有那一团 944；1 = 满天 5000。spread: 那一团从向日葵位置散到天空位置
function drawSky(ctx, t, o = {}) {
  const { grow = 1, spread = 1, a = 1, dimC = 0 } = o;
  for (let i = 0; i < SKY.length; i++) {
    const f = SKY[i];
    let x, y, d, al = a;
    if (i < NT) {
      const p = mergedPos(i);
      const k = easeInOut(spread);
      x = lerp(p.x, f.x, k); y = lerp(p.y, f.y, k); d = lerp(p.d, f.d, k);
    } else {
      const g = clamp((grow - f.u * 0.85) / 0.15);
      if (g <= 0) continue;
      const p = mergedPos(f.parent), q = SKY[f.parent];
      const k = easeOut(g), sp = easeInOut(spread);
      const px = lerp(p.x, q.x, sp), py = lerp(p.y, q.y, sp);
      x = lerp(px, f.x, k); y = lerp(py, f.y, k); d = f.d * (0.4 + 0.6 * k);
      al = a * clamp(g * 2);
    }
    y += Math.sin(t * 0.8 + f.ph) * 1.5;
    if (dimC > 0) { const dd = Math.hypot(x - 960, (y - 470) * 1.8); al *= 1 - dimC * clamp(1 - (dd - 250) / 450); }
    face(ctx, f.type ? fameK(i) : plainK(i), x, y, d, al);
  }
}
SCENES.ratio = (ctx, t, s) => {
  const L = i => lineAt('ratio', i);
  // 1 个 vs 4.6 个
  const kr = 1 - ramp(t, L(3) - 0.5, L(3));
  if (kr > 0) {
    const row = (y, kind, a, dashed) => {
      if (a <= 0) return;
      const col = kind ? ROSE : AMBER, kk = k => (kind ? fameK(k) : plainK(k));
      const k1 = popIn(t, kind ? L(0) : L(2) + 0.2, 0.5);
      ctx.save(); ctx.globalAlpha *= a;
      glow(ctx, col, 520, y, 110, 0.5 * clamp(k1));
      face(ctx, kk(5), 520, y, 120 * clamp(k1, 0, 1.2), clamp(k1));
      ctx.strokeStyle = rgba('#ffffff', 0.85 * clamp(k1)); ctx.lineWidth = 3; circle(ctx, 520, y, 80); ctx.stroke();
      text(ctx, '想得起来', 520, y + 130, { size: 34, family: 'Sans', weight: 700, color: CREAM, alpha: clamp(k1) });
      const t2 = kind ? L(1) : L(2) + 0.6;
      for (let j = 0; j < 5; j++) {
        const kj = popIn(t, t2 + j * 0.12, 0.4);
        if (kj <= 0) continue;
        const x = 1000 + j * 140;
        ctx.save();
        if (j === 4) { ctx.beginPath(); ctx.rect(x - 70, y - 90, 140 * (S.ratio - 4), 180); ctx.clip(); }
        glow(ctx, col, x, y, 80, 0.35 * clamp(kj));
        face(ctx, kk(j + 9), x, y, 100 * clamp(kj, 0, 1.2), clamp(kj));
        ctx.restore();
      }
      text(ctx, '其实认得', 1280, y + 130, { size: 34, family: 'Sans', weight: 700, color: CREAM, alpha: popIn(t, t2, 0.4) });
      const kc = popIn(t, t2 + 0.5, 0.5);
      richText(ctx, [['1 : ', CREAM], [String(S.ratio.toFixed(1)), GOLD]], 760, y + 22, { size: 64, family: 'Head', weight: 900, alpha: clamp(kc), shadow: 14 });
      if (dashed) text(ctx, '（假设）', 300, y + 60, { size: 32, family: 'Sans', weight: 700, color: DIM, alpha: clamp(k1) });
      text(ctx, kind ? '名人' : '熟人', 300, y + 14, { size: 40, family: 'Head', weight: 900, color: col, alpha: clamp(k1) });
      ctx.restore();
    };
    const up = ramp(t, L(2) - 0.3, L(2) + 0.4);
    ctx.save(); ctx.globalAlpha *= kr;
    row(lerp(470, 300, up), 1, 1, false);
    row(650, 0, up, true);
    ctx.restore();
  }
  // 944 → 放大 4.6 倍
  const k3 = ramp(t, L(3) - 0.3, L(3) + 0.5);
  if (k3 <= 0) return;
  const grow = ramp(t, L(4), L(5) + 1.0, x => x);
  const spread = ramp(t, L(4) + 0.2, L(5) + 0.8);
  ctx.save(); ctx.globalAlpha *= k3;
  drawSky(ctx, t, { grow, spread, a: 1, dimC: 0.85 * ramp(t, L(4), L(4) + 0.6) });
  ctx.restore();
  const kl = ramp(t, L(3), L(3) + 0.5) * (1 - ramp(t, L(5) - 0.3, L(5) + 0.3));
  if (kl > 0) {
    darkPad(ctx, 960, 470, 330, 140, ramp(t, L(4), L(4) + 0.5) * kl);
    richText(ctx, [[String(NT), GOLD], [' 个', CREAM]], 960, 830 - 330 * ramp(t, L(4), L(4) + 0.5), { size: 90, family: 'Head', weight: 900, alpha: kl, shadow: 18 });
    const kx = popIn(t, L(4), 0.5);
    richText(ctx, [['× ', CREAM], [S.ratio.toFixed(1), GOLD]], 960, 590, { size: 80, family: 'Head', weight: 900, alpha: clamp(kx) * kl, shadow: 18 });
  }
  // 平均大约是……
  const kq = ramp(t, L(6), L(6) + 0.5);
  if (kq > 0) {
    darkPad(ctx, 960, 470, 360, 130, kq);
    text(ctx, '……', 960, 500, { size: 120, family: 'Head', weight: 900, color: GOLD, alpha: kq * (0.6 + 0.4 * beatPulse(t, 0.3)) });
  }
};

// ---------- 揭晓：约 5000 张；落到你身上 ----------
const LOST = (() => {
  let best = NT, bd = 1e9;
  for (let i = NT; i < SKY.length; i++) { const d = Math.hypot(SKY[i].x - 1330, SKY[i].y - 330); if (d < bd) { bd = d; best = i; } }
  return SKY[best];
})();
const CLUSTERS = [[250, 250, 0.9], [620, 860, 0.7], [1700, 240, 0.8], [1640, 820, 0.75], [1150, 140, 0.55], [330, 640, 0.6], [1350, 900, 0.5], [820, 120, 0.45]];
SCENES.reveal = (ctx, t, s) => {
  const L = i => lineAt('reveal', i);
  const t0 = s.start;
  const flash = barPulse(t, 0.6) * (t < L(1) ? 1 : 0.3);
  // 镜头拉远
  const pull = ramp(t, L(5) - 0.2, L(5) + 1.8);
  const z = lerp(1, 0.2, pull);
  const dimForRange = ramp(t, L(1) - 0.3, L(1) + 0.3) * (1 - ramp(t, L(3) - 0.4, L(3) + 0.2));
  // 一张你再也没见过的脸
  const lost = LOST;
  const lostDim = ramp(t, L(3) + 0.4, L(3) + 1.6) * (1 - ramp(t, L(4), L(4) + 0.5));
  ctx.save();
  ctx.translate(960, 470); ctx.scale(z, z); ctx.translate(-960, -470);
  const skyA = 1 - 0.8 * dimForRange;
  drawSky(ctx, t, { grow: 1, spread: 1, a: skyA * (1 - 0.6 * lostDim), dimC: 0.85 * (1 - ramp(t, L(1) - 0.4, L(1))) + 0.7 * dimForRange * 0 });
  glow(ctx, '#ffe2b8', 960, 470, 900, 0.10 + 0.25 * flash);
  ctx.restore();
  // 约 5000 张
  const kb = popIn(t, t0, 0.7) * (1 - ramp(t, L(1) - 0.4, L(1)));
  if (kb > 0) {
    darkPad(ctx, 960, 520, 760, 260, clamp(kb));
    ctx.save(); ctx.translate(960, 520); const sc = 0.9 + 0.1 * clamp(kb) + 0.015 * barPulse(t); ctx.scale(sc, sc);
    richText(ctx, [['约 ', CREAM], [String(S.rounded), GOLD], [' 张', CREAM]], 0, 0, { size: 230, family: 'Head', weight: 900, alpha: clamp(kb), shadow: 50 });
    ctx.restore();
    text(ctx, `一个人平均认识的脸（算出来是 ${S.estimate}，作者取整说约 ${S.rounded}）`, 960, 640, { size: 38, family: 'Sans', weight: 700, color: CREAM, alpha: ramp(t, t0 + 0.8, t0 + 1.4) * clamp(kb) });
  }
  // 范围
  if (dimForRange > 0) {
    const x0 = 330, x1 = 1590, X = v => lerp(x0, x1, v / 10000), y = 520;
    const kk = dimForRange;
    ctx.save(); ctx.globalAlpha *= kk;
    ctx.fillStyle = 'rgba(251,241,230,0.3)'; ctx.fillRect(x0, y, x1 - x0, 3);
    [0, 2000, 4000, 6000, 8000, 10000].forEach(v => {
      ctx.fillRect(X(v) - 1, y, 2, 14);
      text(ctx, String(v), X(v), y + 52, { size: 28, family: 'Sans', weight: 400, color: DIM });
    });
    const kr = ramp(t, L(1), L(1) + 1.2, easeOut);
    const a = X(S.min), b = lerp(X(S.min), X(S.max), kr);
    const g = ctx.createLinearGradient(a, 0, X(S.max), 0);
    g.addColorStop(0, AMBER); g.addColorStop(1, ROSE);
    ctx.fillStyle = g; roundRect(ctx, a, y - 18, Math.max(1, b - a), 36, 18); ctx.fill();
    glow(ctx, GOLD, X(S.estimate), y, 70, 0.6 * kr);
    circle(ctx, X(S.estimate), y, 14 * kr); ctx.fillStyle = CREAM; ctx.fill();
    ctx.restore();
    text(ctx, String(S.min), X(S.min), y - 50, { size: 64, family: 'Head', weight: 900, color: GOLD, alpha: kk * ramp(t, L(1), L(1) + 0.4) });
    text(ctx, String(S.max), X(S.max), y - 50, { size: 64, family: 'Head', weight: 900, color: GOLD, alpha: kk * kr });
    text(ctx, `平均 ${S.estimate}`, X(S.estimate), y + 110, { size: 36, family: 'Sans', weight: 700, color: CREAM, alpha: kk * kr });
    text(ctx, `${S.participants} 位受试者里，最少和最多的人`, 960, 300, { size: 40, family: 'Serif', weight: 700, color: CREAM, alpha: kk * kr });
    // 上限？
    const ku = ramp(t, L(2), L(2) + 0.8);
    if (ku > 0) {
      ctx.save(); ctx.globalAlpha *= kk * ku;
      const g2 = ctx.createLinearGradient(x1, 0, x1 + 260, 0);
      g2.addColorStop(0, 'rgba(255,210,122,0.7)'); g2.addColorStop(1, 'rgba(255,210,122,0)');
      ctx.fillStyle = g2; ctx.fillRect(x1, y - 2, 260 * ku, 6);
      ctx.restore();
      text(ctx, '上限？', x1 + 150, y - 40, { size: 48, family: 'Head', weight: 900, color: GOLD, alpha: kk * ku });
      text(ctx, '他们测的是“已经认识多少”，不是“最多能认识多少”', 960, 760, { size: 32, family: 'Sans', weight: 400, color: DIM, alpha: kk * ku });
    }
  }
  // 再也没见过的那个人
  const kLost = ramp(t, L(3), L(3) + 0.5) * (1 - ramp(t, L(5) - 0.3, L(5) + 0.3));
  if (kLost > 0) {
    const lx = lost.x, ly = lost.y;
    const relit = ramp(t, L(4), L(4) + 0.6);
    ctx.save(); ctx.globalAlpha *= kLost;
    glow(ctx, AMBER, lx, ly, 160, (0.25 + 0.6 * relit) * (1 - 0.5 * lostDim));
    ctx.strokeStyle = rgba(CREAM, 0.8); ctx.lineWidth = 3; circle(ctx, lx, ly, 70); ctx.stroke();
    face(ctx, lost.k, lx, ly, 96, 1 - 0.75 * lostDim, false);
    if (lostDim > 0) face(ctx, lost.k, lx, ly, 96, 0.75 * lostDim, true);
    ctx.restore();
  }
  // 别人的夜空里，也有一张是你
  if (pull > 0) {
    const kYou = ramp(t, L(6), L(6) + 0.8);
    const youPts = [];
    CLUSTERS.forEach(([cx, cy, sc], j) => {
      const a = ramp(t, L(5) + 0.4 + j * 0.15, L(5) + 1.2 + j * 0.15);
      if (a <= 0) return;
      const R = 150 * sc, n = Math.round(260 * sc);
      for (let i = 0; i < n; i++) {
        const p = sunflower(i, n, cx, cy, R);
        face(ctx, (i * 7 + j) % 36, p.x, p.y + Math.sin(t + i + j) * 1.2, 7 * sc + 3, a * 0.85);
      }
      glow(ctx, j % 2 ? ROSE : AMBER, cx, cy, R * 1.6, 0.16 * a);
      const yi = (j * 53 + 17) % n, p = sunflower(yi, n, cx, cy, R);
      youPts.push([p.x, p.y, a]);
    });
    // 自己那一团的中心
    const me = [960, 470];
    if (kYou > 0) {
      youPts.forEach(([x, y, a], j) => {
        const k = ramp(t, L(6) + j * 0.12, L(6) + 0.6 + j * 0.12);
        if (k <= 0) return;
        ctx.save();
        ctx.strokeStyle = rgba(GOLD, 0.35 * k); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(me[0], me[1]); ctx.lineTo(lerp(me[0], x, k), lerp(me[1], y, k)); ctx.stroke();
        ctx.restore();
        const pul = 0.7 + 0.3 * barPulse(t, 0.5);
        glow(ctx, GOLD, x, y, 70, 0.9 * k * pul);
        face(ctx, 5, x, y, 36, k);
        ctx.strokeStyle = rgba('#fff3d6', 0.9 * k); ctx.lineWidth = 3; circle(ctx, x, y, 26 + 6 * (1 - barPulse(t, 0.5))); ctx.stroke();
      });
      glow(ctx, GOLD, me[0], me[1], 140, 0.5 * kYou);
    }
  }
};

// ---------- 封面 ----------
function drawCover(ctx) {
  drawBackground(ctx, 20);
  drawSky(ctx, 0, { grow: 1, spread: 1, a: 0.9 });
  darkPad(ctx, 960, 560, 900, 360, 1);
  glow(ctx, '#ffe2b8', 960, 520, 700, 0.12);
  text(ctx, '你认识多少张脸？', 960, 520, { size: 160, family: 'Head', weight: 900, color: CREAM, shadow: 40 });
  richText(ctx, [['有人真的数了：平均约 ', CREAM], [String(S.rounded), GOLD], [' 张', CREAM]], 960, 680, { size: 76, family: 'Head', weight: 900, shadow: 30 });
  text(ctx, '回忆 + 认照片 · 2018 年的研究', 960, 770, { size: 40, family: 'Sans', weight: 700, color: ROSE, spacing: 4 });
}
