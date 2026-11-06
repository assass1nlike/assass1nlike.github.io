// 所有视频共用的绘图工具。scene.js 需要定义 drawBackground(ctx, t) 和 SCENES[id](ctx, t, s)，
// 可选 setup() 和 SFX（音效事件 [{t, kind, gain}]）。渲染器注入 TL（时间轴）和 DATA（视频目录下的 json）。
const W = 1920, H = 1080;
// 代码里用 Head / Serif / Sans 指代，实际字体名避开 CSS 通用关键字 serif、sans
const FAMILY = { Head: '"Head"', Serif: '"BodySerif"', Sans: '"BodySans"' };
const FONTS = ['900 40px "Head"', '700 40px "BodySerif"', '400 40px "BodySerif"', '400 40px "BodySans"', '700 40px "BodySans"'];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const easeBack = k => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
// a→b 段内从 0 平滑到 1
const ramp = (t, a, b, f = easeInOut) => f(prog(t, a, b));
// 在 [a, b] 内淡入、淡出各 d 秒
const window01 = (t, a, b, d = 0.4) => Math.min(ramp(t, a, a + d), 1 - ramp(t, b - d, b));

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// 时间轴查询
const sceneOf = id => {
  const s = TL.scenes.find(x => x.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  return s;
};
// 场景 id 中第 n 次出现 sub（按朗读文本查）的那个字开始发音的时刻
function cue(id, sub, n = 0) {
  for (const line of sceneOf(id).lines) {
    let i = -1;
    while ((i = line.say.indexOf(sub, i + 1)) >= 0) {
      if (n-- === 0) return line.chars[i];
    }
  }
  throw new Error(`cue not found: ${id} / ${sub}`);
}

// 配乐（只在配乐模式下有）：响度包络、节拍
function musicLevel(t) {
  if (!TL.music) return 0;
  const r = TL.music.rms, x = t * TL.music.rms_hz, i = Math.floor(x);
  if (i < 0) return r[0];
  if (i >= r.length - 1) return r[r.length - 1];
  return lerp(r[i], r[i + 1], x - i);
}
// 最近一拍（或一小节）之后经过的时间
function sinceLast(t, list) {
  let lo = 0, hi = list.length - 1;
  if (t < list[0]) return Infinity;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (list[m] <= t) lo = m; else hi = m - 1; }
  return t - list[lo];
}
const beatPulse = (t, decay = 0.18) => Math.exp(-sinceLast(t, TL.music.beats) / decay);
const barPulse = (t, decay = 0.35) => Math.exp(-sinceLast(t, TL.music.bars) / decay);
// 从时刻 a 起的第 k 拍
function beatAfter(a, k = 0) {
  const b = TL.music.beats;
  const i = b.findIndex(x => x >= a - 1e-6);
  return b[Math.min(b.length - 1, i + k)];
}
// 场景 id 的第 n 句字幕出现的时刻
const lineAt = (id, n) => sceneOf(id).lines[n].start;

function font(ctx, size, family = 'Serif', weight = 700) {
  ctx.font = `${weight} ${size}px ${FAMILY[family] || family}`;
}

function text(ctx, str, x, y, { size = 40, family = 'Serif', weight = 700, color = '#fff', align = 'center',
  baseline = 'alphabetic', alpha = 1, shadow = 0, spacing = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, family, weight);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = shadow; }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

// 一行内多种颜色：parts = [[文字, 颜色], ...]，整体按 align 对齐
function richText(ctx, parts, x, y, { size = 40, family = 'Serif', weight = 700, align = 'center', alpha = 1, shadow = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, family, weight);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const widths = parts.map(p => ctx.measureText(p[0]).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = shadow; }
  parts.forEach((p, i) => { ctx.fillStyle = p[1]; ctx.fillText(p[0], cx, y); cx += widths[i]; });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// 字幕：数字自动用强调色
const SUB_STYLE = { size: 46, y: 1012, color: '#fbf3e4', accent: '#ffcf6e' };
if (TL.music) Object.assign(SUB_STYLE, { size: 56, y: 1000 });
function drawSubtitles(ctx, t) {
  const s = TL.subs.find(x => t >= x.start - 0.05 && t < x.end + 0.15);
  if (!s) return;
  const a = Math.min(prog(t, s.start - 0.05, s.start + 0.1), 1 - prog(t, s.end, s.end + 0.15));
  const parts = s.text.split(/(\d[\d,./]*)/).filter(Boolean)
    .map(p => [p, /^\d/.test(p) ? SUB_STYLE.accent : SUB_STYLE.color]);
  ctx.save();
  ctx.globalAlpha = a;
  font(ctx, SUB_STYLE.size, 'Serif', 700);
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  const widths = parts.map(p => ctx.measureText(p[0]).width);
  let x = W / 2 - widths.reduce((p, q) => p + q, 0) / 2;
  parts.forEach((p, i) => {
    ctx.strokeStyle = 'rgba(10,6,16,0.75)';
    ctx.lineWidth = 7;
    ctx.strokeText(p[0], x, SUB_STYLE.y);
    ctx.fillStyle = p[1];
    ctx.fillText(p[0], x, SUB_STYLE.y);
    x += widths[i];
  });
  ctx.restore();
}

// 场景层：每个场景画在自己的离屏画布上，场景交界处交叉淡化
const XFADE = 0.45;
let layers = null;
function render(t) {
  const ctx = document.getElementById('c').getContext('2d');
  if (!layers) layers = [0, 1].map(() => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; return c;
  });
  ctx.save();
  drawBackground(ctx, t);
  const scenes = TL.scenes;
  const i = scenes.findIndex(s => t >= s.start && t < s.end);
  const idx = i < 0 ? scenes.length - 1 : i;
  const active = [[idx, 1]];
  const s = scenes[idx];
  if (idx + 1 < scenes.length && t > s.end - XFADE) {
    const k = easeInOut(prog(t, s.end - XFADE, s.end + XFADE));
    active[0][1] = 1 - k;
    active.push([idx + 1, k]);
  }
  if (idx > 0 && t < s.start + XFADE) {
    const k = easeInOut(prog(t, s.start - XFADE, s.start + XFADE));
    active[0][1] = k;
    active.unshift([idx - 1, 1 - k]);
  }
  active.forEach(([j, a], n) => {
    if (a <= 0.001) return;
    const sc = scenes[j];
    const lc = layers[n].getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, W, H);
    lc.save();
    SCENES[sc.id](lc, t, sc);
    lc.restore();
    ctx.globalAlpha = a;
    ctx.drawImage(layers[n], 0, 0);
    ctx.globalAlpha = 1;
  });
  if (typeof drawOverlay === 'function') drawOverlay(ctx, t);
  drawSubtitles(ctx, t);
  ctx.restore();
}
