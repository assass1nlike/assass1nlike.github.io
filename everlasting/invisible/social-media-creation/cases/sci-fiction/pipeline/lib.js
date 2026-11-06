// 全片共用的绘图工具。scene.js 定义 SCENES[场景id](ctx, t, s)，可选 setup()。
// 渲染器注入 TL（时间轴）、DATA（data/ 下的 json）、ASSETS（assets/ 下的图片与视频帧目录）。
const W = 1920, H = 1080;
const BAR = 139;                                  // 2.39:1 遮幅的上下黑边
const FRAME = { x: 0, y: BAR, w: W, h: H - 2 * BAR };
const FAMILY = { Head: '"Head"', Sans: '"BodySans"', Hud: '"Hud"' };
const FONTS = ['900 40px "Head"', '400 40px "BodySans"', '500 40px "BodySans"', '700 40px "BodySans"', '400 40px "Hud"'];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeIn = k => k * k * k;
const ramp = (t, a, b, f = easeInOut) => f(prog(t, a, b));
const window01 = (t, a, b, d = 0.6) => Math.min(ramp(t, a, a + d), 1 - ramp(t, b - d, b));

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 时间轴 ----------
const sceneOf = id => {
  const s = TL.scenes.find(x => x.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  return s;
};
const lineAt = (id, n) => sceneOf(id).lines[n].start;
const lineEnd = (id, n) => sceneOf(id).lines[n].end;
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

// ---------- 文字 ----------
function font(ctx, size, family = 'Sans', weight = 500) {
  ctx.font = `${weight} ${size}px ${FAMILY[family] || family}`;
}
function text(ctx, str, x, y, { size = 40, family = 'Sans', weight = 500, color = '#fff', align = 'center',
  baseline = 'alphabetic', alpha = 1, glow = 0, spacing = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, family, weight);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

// ---------- 图片与视频片段 ----------
const IMG = {};
const PENDING = [];
function loadImage(url) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error(url)); im.src = url; });
}
async function loadAssets() {
  await Promise.all(Object.entries(ASSETS.images).map(async ([k, url]) => { IMG[k] = await loadImage(url); }));
}
// 视频片段按帧取图：没缓存的帧登记到 PENDING，渲染器加载后重画这一帧
const FRAME_CACHE = new Map();
function clipFrame(name, localT) {
  const c = ASSETS.clips[name];
  if (!c) return null;
  const i = clamp(Math.floor(localT * c.fps), 0, c.n - 1) + 1;
  const url = `${c.dir}/${String(i).padStart(4, '0')}.jpg`;
  const hit = FRAME_CACHE.get(url);
  if (hit) return hit;
  PENDING.push(loadImage(url).then(im => {
    FRAME_CACHE.set(url, im);
    if (FRAME_CACHE.size > 90) FRAME_CACHE.delete(FRAME_CACHE.keys().next().value);
  }));
  return null;
}

// 把图片铺满 rect，zoom≥1，(fx, fy) ∈ [-1, 1] 是画面中心的偏移（推拉摇移用）
function cover(ctx, src, { rect = FRAME, zoom = 1, fx = 0, fy = 0, alpha = 1, filter = null } = {}) {
  if (alpha <= 0) return;
  const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
  const s = Math.max(rect.w / sw, rect.h / sh) * zoom;
  const dw = sw * s, dh = sh * s;
  const x = rect.x + (rect.w - dw) / 2 - fx * (dw - rect.w) / 2;
  const y = rect.y + (rect.h - dh) / 2 - fy * (dh - rect.h) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.globalAlpha *= alpha;
  if (filter) ctx.filter = filter;
  ctx.drawImage(src, x, y, dw, dh);
  ctx.restore();
}

// AI 画面：有视频片段时用片段，否则用静帧；都没有时画占位卡，写明这里该放什么
function shot(ctx, name, localT, opts = {}) {
  const fr = clipFrame(name, localT);
  if (fr) return cover(ctx, fr, opts);
  if (IMG[name]) return cover(ctx, IMG[name], opts);
  placeholder(ctx, name, opts);
}
function placeholder(ctx, name, { rect = FRAME, alpha = 1, zoom = 1 } = {}) {
  const p = (DATA.prompts || {})[name] || {};
  ctx.save();
  ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#141a24'); g.addColorStop(1, '#2a2230');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(rect.x + 30, rect.y + 30, rect.w - 60, rect.h - 60);
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  text(ctx, `AI 画面 · ${name}`, cx, cy - 20, { size: 44 * Math.min(1, rect.w / W * 1.6), color: '#cfd8e6', weight: 700 });
  text(ctx, p.zh || '', cx, cy + 40, { size: 30 * Math.min(1, rect.w / W * 1.6), color: '#8f9bb0' });
  ctx.restore();
}

// ---------- 黑体颜色 ----------
function bbIndex(T) {
  const b = DATA.blackbody;
  return clamp(Math.round((Math.log10(T) - b.logT0) / b.dlogT), 0, b.rgb.length - 1);
}
const bbLogLum = T => DATA.blackbody.loglum[bbIndex(T)];
const bbRGB = T => DATA.blackbody.rgb[bbIndex(T)];

// ---------- 星空 ----------
// 恒星在银河系静止参照系里的方向、可见光流量 f、温度 T。飞船沿 +z 方向运动。
let STARS = null;
function makeStars(seed = 7) {
  const r = mulberry32(seed);
  const N1 = 7000, N2 = 26000, N = N1 + N2;
  const S = { n: N, x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
    f: new Float32Array(N), T: new Float32Array(N), ll: new Float32Array(N) };
  const temp = () => {
    const u = r();
    if (u < 0.55) return 3300 + 1700 * r();
    if (u < 0.85) return 5000 + 2500 * r();
    if (u < 0.97) return 7500 + 7500 * r();
    return 15000 + 20000 * r();
  };
  // 银河：法向量 nb 的大圆附近
  const nb = [0.35, 0.86, -0.37], nl = Math.hypot(...nb); nb.forEach((v, i) => nb[i] = v / nl);
  const e1 = [nb[1], -nb[0], 0], l1 = Math.hypot(...e1); e1.forEach((v, i) => e1[i] = v / l1);
  const e2 = [nb[1] * e1[2] - nb[2] * e1[1], nb[2] * e1[0] - nb[0] * e1[2], nb[0] * e1[1] - nb[1] * e1[0]];
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < N1) {
      z = 2 * r() - 1; const ph = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z);
      x = s * Math.cos(ph); y = s * Math.sin(ph);
      S.f[i] = Math.min(30, 0.03 * Math.pow(r(), -1 / 1.4));
    } else {
      const ph = 2 * Math.PI * r();
      // 银心方向更密
      const off = (r() + r() + r() - 1.5) * 0.16 * (1.2 - 0.6 * Math.max(0, Math.cos(ph - 0.8)));
      x = Math.cos(ph) * e1[0] + Math.sin(ph) * e2[0] + off * nb[0];
      y = Math.cos(ph) * e1[1] + Math.sin(ph) * e2[1] + off * nb[1];
      z = Math.cos(ph) * e1[2] + Math.sin(ph) * e2[2] + off * nb[2];
      const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      S.f[i] = Math.min(3, 0.008 * Math.pow(r(), -1 / 1.6));
    }
    S.x[i] = x; S.y[i] = y; S.z[i] = z;
    S.T[i] = temp();
    S.ll[i] = bbLogLum(S.T[i]);
  }
  return S;
}

// 以速度 beta 运动的观察者看到的星空。
// 光行差：cosθ' = (cosθ + β) / (1 + β cosθ)；多普勒因子 D = γ(1 + β cosθ)，观测温度 T' = D T。
// 光源仍是黑体，可见光辐亮度变为 L(T')，立体角缩小 D² 倍，所以点源的可见光流量乘以 L(T') / (L(T) D²)。
// 镜头：yaw 绕竖轴、pitch 绕横轴转动（度），fov 为水平视场角。
function drawSky(ctx, { beta = 0, yaw = 0, pitch = 0, fov = 75, exposure = 1, rect = FRAME, cmb = false, alpha = 1 } = {}) {
  if (!STARS) STARS = makeStars();
  const S = STARS, g = 1 / Math.sqrt(1 - beta * beta);
  const cy = Math.cos(yaw * Math.PI / 180), sy = Math.sin(yaw * Math.PI / 180);
  const cp = Math.cos(pitch * Math.PI / 180), sp = Math.sin(pitch * Math.PI / 180);
  const F = (rect.w / 2) / Math.tan(fov * Math.PI / 360);
  const ox = rect.x + rect.w / 2, oy = rect.y + rect.h / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  for (let i = 0; i < S.n; i++) {
    const c = S.z[i], s = Math.sqrt(Math.max(0, 1 - c * c));
    const den = 1 + beta * c;
    const c2 = (c + beta) / den, s2 = s / (g * den);
    const k = s > 1e-9 ? s2 / s : 0;
    let x = S.x[i] * k, y = S.y[i] * k, z = c2;
    // 镜头转动
    let x1 = cy * x - sy * z, z1 = sy * x + cy * z;
    let y1 = cp * y - sp * z1, z2 = sp * y + cp * z1;
    if (z2 <= 1e-6) continue;
    const px = ox + F * x1 / z2, py = oy - F * y1 / z2;
    if (px < rect.x - 4 || px > rect.x + rect.w + 4 || py < rect.y - 4 || py > rect.y + rect.h + 4) continue;
    const D = g * den, T2 = S.T[i] * D;
    const b = 3 * S.f[i] * exposure * Math.pow(10, bbLogLum(T2) - S.ll[i]) / (D * D);
    if (b < 0.002) continue;
    const col = bbRGB(T2);
    const a = 1 - Math.exp(-2.2 * b);
    const R = col[0] * 255 | 0, G = col[1] * 255 | 0, B = col[2] * 255 | 0;
    if (b < 0.5) {
      ctx.fillStyle = `rgba(${R},${G},${B},${a})`;
      ctx.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
    } else {
      const rad = 1.1 + 1.5 * Math.sqrt(Math.min(b, 12));
      const gr = ctx.createRadialGradient(px, py, 0, px, py, rad * 3.2);
      gr.addColorStop(0, `rgba(${Math.min(255, R + 60)},${Math.min(255, G + 60)},${Math.min(255, B + 60)},1)`);
      gr.addColorStop(0.25, `rgba(${R},${G},${B},${0.6 * a})`);
      gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(px - rad * 3.2, py - rad * 3.2, rad * 6.4, rad * 6.4);
    }
  }
  // 宇宙微波背景：在正前方被蓝移成 T' = 2.725 K × D 的黑体辉光
  if (cmb && beta > 0.99) {
    const dirx = -sy, diry = -sp * cy, dirz = cp * cy;   // 运动方向经镜头转动后的坐标
    if (dirz > 0) {
      const px = ox + F * dirx / dirz, py = oy - F * diry / dirz;
      const maxR = F * Math.tan(Math.acos(Math.max(-1, (1 - 1 / g) / beta)));   // D = 1 的张角
      const gr = ctx.createRadialGradient(px, py, 0, px, py, Math.min(maxR, rect.w));
      for (let k = 0; k <= 12; k++) {
        const th = Math.atan((k / 12) * Math.min(maxR, rect.w) / F);
        const D = 1 / (g * (1 - beta * Math.cos(th)));
        const T2 = 2.725 * D;
        const lum = 6e5 * Math.pow(10, bbLogLum(T2)) * exposure;
        const col = bbRGB(T2), a = 1 - Math.exp(-lum);
        gr.addColorStop(k / 12, `rgba(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0},${a})`);
      }
      ctx.fillStyle = gr;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  }
  ctx.restore();
}

// ---------- 航行仪表 ----------
// leg: 'out' 去程 / 'back' 回程；tau: 该程已过的船时
function legState(tau, leg = 'out') {
  const P = DATA.physics, L = P.leg;
  const k = clamp(tau / P.tau_leg) * (L.tau.length - 1), i = Math.min(L.tau.length - 2, Math.floor(k)), f = k - i;
  const t = lerp(L.t[i], L.t[i + 1], f), v = lerp(L.v[i], L.v[i + 1], f), x = lerp(L.x[i], L.x[i + 1], f);
  // x 是离出发点的距离；news 是此刻收到的地球信号的发出年份
  const year = (leg === 'out' ? P.t_depart : P.t_leave) + t;
  const news = year - (leg === 'out' ? x : P.d - x);
  return { tau, year, x, v, news, gamma: 1 / Math.sqrt(1 - v * v) };
}
function hud(ctx, { shipYears, year, v, accel = 1, alpha = 1 }) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const x0 = 1180, y0 = 60;
  const cells = [
    ['船时', `${shipYears.toFixed(2)} 年`],
    ['地球纪年', `${year.toFixed(1)}`],
    ['v / c', v > 0.9999 ? v.toFixed(7) : v.toFixed(4)],
    ['加速度', `${accel.toFixed(2)} g`],
  ];
  cells.forEach(([k, val], i) => {
    const x = x0 + i * 180;
    text(ctx, k, x, y0, { size: 20, family: 'Hud', color: 'rgba(255,196,120,0.65)', align: 'left', spacing: 2 });
    text(ctx, val, x, y0 + 36, { size: 30, family: 'Hud', color: '#ffd9a0', align: 'left' });
  });
  ctx.fillStyle = 'rgba(255,196,120,0.35)';
  ctx.fillRect(x0, y0 + 52, 700, 1.5);
  ctx.restore();
}

// ---------- 画面质感 ----------
let GRAIN = null;
function grain(ctx, t) {
  if (!GRAIN) {
    GRAIN = document.createElement('canvas'); GRAIN.width = 512; GRAIN.height = 512;
    const g = GRAIN.getContext('2d'), im = g.createImageData(512, 512), r = mulberry32(3);
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = 'overlay';
  const f = Math.floor(t * 24), r = mulberry32(f);
  ctx.translate(-r() * 512, -r() * 512);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat');
  ctx.fillRect(0, 0, W + 512, H + 512);
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, BAR, W, H - 2 * BAR);
}

function drawSubtitles(ctx, t) {
  // 取最近一条已开始的字幕，前一条的淡出不会盖住下一条
  const s = TL.subs.filter(x => t >= x.start - 0.05).pop();
  if (!s || t >= s.end + 0.15) return;
  const a = Math.min(prog(t, s.start - 0.05, s.start + 0.12), 1 - prog(t, s.end, s.end + 0.15));
  text(ctx, s.text, W / 2, H - BAR / 2 + 14, { size: 40, weight: 500, color: '#ecebe6', alpha: a, spacing: 1 });
}

// ---------- 合成 ----------
// 场景画在各自的离屏画布上，交界处交叉淡化；scene.js 可以给场景写 XF[id] 改它进入时的淡化时长（0 为硬切）
const XFADE = 0.8;
const XF = {};
let layers = null;
function render(t) {
  const ctx = document.getElementById('c').getContext('2d');
  if (!layers) layers = [0, 1, 2].map(() => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; return c;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const scenes = TL.scenes;
  const active = [];
  scenes.forEach((sc, j) => {
    const xin = j ? (XF[sc.id] ?? XFADE) : 0;
    const nx = scenes[j + 1], xout = nx ? (XF[nx.id] ?? XFADE) : 0;
    const a0 = sc.start - xin / 2, a1 = sc.end + xout / 2;
    if (t < a0 || t >= a1) return;
    let a = 1;
    if (xin && t < sc.start + xin / 2) a = easeInOut(prog(t, a0, sc.start + xin / 2));
    if (xout && t > sc.end - xout / 2) a = Math.min(a, 1 - easeInOut(prog(t, sc.end - xout / 2, a1)));
    active.push([sc, a]);
  });
  active.forEach(([sc, a], n) => {
    const lc = layers[n].getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over'; lc.filter = 'none';
    lc.fillStyle = '#000';
    lc.fillRect(0, 0, W, H);
    lc.save();
    SCENES[sc.id](lc, t, sc);
    lc.restore();
    ctx.globalAlpha = a;
    ctx.drawImage(layers[n], 0, 0);
    ctx.globalAlpha = 1;
  });
  grain(ctx, t);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, BAR);
  ctx.fillRect(0, H - BAR, W, BAR);
  if (typeof drawOverlay === 'function') drawOverlay(ctx, t);
  drawSubtitles(ctx, t);
}

async function renderFrame(t) {
  for (let k = 0; k < 4; k++) {
    PENDING.length = 0;
    render(t);
    if (!PENDING.length) return;
    await Promise.all(PENDING);
  }
}
