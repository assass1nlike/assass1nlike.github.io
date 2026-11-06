// 《对表》的全部画面。时间都对齐到旁白：lineAt(场景, 第几句) 是那句话开始的时刻。
const P = DATA.physics;
const AMBER = '#ffd9a0', AMBER_DIM = 'rgba(255,196,120,0.55)', ICE = '#bfe3ff';
const SFX = [];

function setup() {
  STARS = makeStars();
  // 望舒放在正前方（+z），也就是夸父号的航向
  STARS.x[0] = 0; STARS.y[0] = 0; STARS.z[0] = 1; STARS.f[0] = 5; STARS.T[0] = 5600; STARS.ll[0] = bbLogLum(5600);
  const sfx = (t, kind, gain = 0.5, dur) => SFX.push({ t, kind, gain, ...(dur ? { dur } : {}) });
  sfx(0.6, 'blip', 0.35);
  sfx(lineAt('depart', 2) + 0.2, 'ignite', 0.8);
  sfx(lineAt('flyby', 0) + 0.3, 'beacon', 0.4, FLASH - lineAt('flyby', 0) - 0.3);
  sfx(FLASH - 0.25, 'flyby', 0.9);
  sfx(lineAt('flyby', 5) + 0.4, 'decode', 0.5);
  sfx(lineAt('arrive', 2) - 0.2, 'swell', 0.7);
  sfx(lineAt('reunion', 2) - 0.3, 'swell', 0.6);
  sfx(TITLE, 'title', 0.8);
}

// ---------- 时间点 ----------
const FLASH = lineAt('flyby', 4) + 0.3;            // 交会的一瞬
const FLIP = [lineAt('arrive', 0) + 2.2, lineAt('arrive', 0) + 6.4];   // 调头、失重
const TITLE = lineEnd('reunion', 3) + 1.0;

// 片中每一刻的航行状态：返回 {leg, tau}，不在航行中返回 null
function voyageAt(t) {
  const sb = sceneOf('starbow'), fb = sceneOf('flyby'), ar = sceneOf('arrive'), rt = sceneOf('return');
  const seg = (a, b, x, y, f = k => k) => lerp(x, y, f(prog(t, a, b)));
  if (t >= sb.start && t < sb.end) {
    const a = lineEnd('starbow', 0);
    return { leg: 'out', tau: t < a ? seg(sb.start, a, 0, 3, easeInOut) : seg(a, sb.end, 3, 5.5) };
  }
  if (t >= fb.start && t < fb.end) return { leg: 'out', tau: t < FLASH ? seg(fb.start, FLASH, 5.5, P.tau_meet) : seg(FLASH, fb.end, P.tau_meet, 5.62) };
  if (t >= ar.start && t < lineAt('arrive', 2)) {
    const a = lineAt('arrive', 1), b = lineEnd('arrive', 1) - 1.5;
    if (t < a) return { leg: 'out', tau: seg(ar.start, a, 5.62, 6.0) };
    return { leg: 'out', tau: seg(a, b, 6.0, P.tau_leg, easeInOut) };
  }
  if (t >= rt.start && t < rt.end) {
    const a = lineEnd('return', 0), b = lineAt('return', 3);
    if (t < a) return { leg: 'back', tau: seg(rt.start, a, 0, 2.5, easeIn) };
    if (t < b) return { leg: 'back', tau: seg(a, b, 2.5, 5.96) };   // 回程第 6 年收到 2757 年的画面
    return { leg: 'back', tau: seg(b, rt.end, 5.96, P.tau_leg - 0.3) };
  }
  return null;
}

function drawOverlay(ctx, t) {
  // 航行仪表，放在上方黑边里
  const vg = voyageAt(t);
  const rs = sceneOf('reunion');
  let st = null, alpha = 0;
  if (vg) {
    const s = legState(vg.tau, vg.leg);
    const flipping = vg.leg === 'out' && t > FLIP[0] && t < FLIP[1];
    const arrived = vg.leg === 'out' && vg.tau >= P.tau_leg - 1e-3;
    st = { shipYears: vg.leg === 'out' ? vg.tau : P.tau_leg + 1 + vg.tau, year: s.year, v: s.v,
      accel: flipping ? 0 : arrived ? 0 : 1 };
    alpha = 1;
    if (vg.leg === 'out' && t > lineAt('arrive', 2) - 1.2) alpha = 1 - prog(t, lineAt('arrive', 2) - 1.2, lineAt('arrive', 2));
  } else if (t >= rs.start && t < lineAt('reunion', 1)) {
    st = { shipYears: 2 * P.tau_leg + 1, year: P.t_home, v: 0, accel: 0 };
    alpha = 1 - prog(t, lineAt('reunion', 1) - 1, lineAt('reunion', 1));
  }
  if (st) hud(ctx, { ...st, alpha: alpha * ramp(t, sceneOf('starbow').start, sceneOf('starbow').start + 1) });
}

// 镜头视场随速度收窄：让 D = 1 的锥面（星光聚拢的边界）大致占画面一半宽
function fovFor(v) {
  if (v < 0.3) return 75;
  const g = 1 / Math.sqrt(1 - v * v);
  const th = Math.acos(clamp((1 - 1 / g) / v, -1, 1)) * 180 / Math.PI;
  return clamp(th * 3.6, 14, 75);
}
function skyAt(ctx, vg, opts = {}) {
  const s = legState(vg.tau, vg.leg);
  const fov = opts.fov ?? fovFor(s.v);
  drawSky(ctx, { beta: s.v, fov, cmb: true, ...opts });
  return { s, fov };
}
function fovLabel(ctx, fov, label = '前视 · 运动方向') {
  text(ctx, `${label}　视场角 ${fov.toFixed(0)}°`, 60, BAR + 50, { size: 22, family: 'Hud', color: AMBER_DIM, align: 'left', spacing: 1 });
}
function inset(ctx, x, y, w, h, label, draw, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const r = { x, y, w, h };
  ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
  draw(r);
  ctx.strokeStyle = 'rgba(255,196,120,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
  text(ctx, label, x + 12, y + 28, { size: 20, family: 'Hud', color: AMBER, align: 'left' });
  ctx.restore();
}

// ---------- 一、信号 ----------
const PRIMES = [2, 3, 5, 7, 11, 13];
function waveform(ctx, t, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const cy = H / 2, r = mulberry32(Math.floor(t * 30));
  ctx.strokeStyle = AMBER; ctx.lineWidth = 2; ctx.shadowColor = AMBER; ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 3) {
    const u = (x - W) / 260 + t * 1.6;       // 信号从右往左走
    let y = (r() - 0.5) * 6;
    // 素数个脉冲为一组：2, 3, 5, 7, 11, 13
    let base = 0;
    for (const p of PRIMES) {
      for (let k = 0; k < p; k++) {
        const d = u - (base + k * 0.28);
        y += -70 * Math.exp(-d * d / 0.0025);
      }
      base += p * 0.28 + 1.2;
    }
    if (x === 0) ctx.moveTo(x, cy + y); else ctx.lineTo(x, cy + y);
  }
  ctx.stroke();
  ctx.restore();
  text(ctx, '射电信号　1420.406 MHz　2287-04-17　03:12 UTC', 60, BAR + 50, { size: 22, family: 'Hud', color: AMBER_DIM, align: 'left', alpha, spacing: 1 });
}

const SCENES = {};
SCENES.signal = (ctx, t, s) => {
  const t1 = lineAt('signal', 0) + 3.4, t2 = lineAt('signal', 2) - 0.3;
  // 黑场里的波形
  waveform(ctx, t, ramp(t, 0.3, 1.5) * (1 - ramp(t, t1, t1 + 1.2)));
  // 望远镜阵列
  const a2 = ramp(t, t1, t1 + 1.2) * (1 - ramp(t, t2, t2 + 1.2));
  if (a2 > 0) {
    shot(ctx, 'array', t - t1, { zoom: 1.04 + 0.05 * prog(t, t1, t2 + 1.2), fy: 0.3, alpha: a2 });
    ctx.save(); ctx.globalAlpha = a2 * 0.35; waveform(ctx, t, 1); ctx.restore();
  }
  // 推近望舒
  const a3 = ramp(t, t2, t2 + 1.2);
  if (a3 > 0) {
    const k = ramp(t, t2, s.end, easeInOut);
    ctx.save(); ctx.globalAlpha = a3;
    drawSky(ctx, { fov: lerp(70, 16, k), yaw: lerp(18, 0, k), pitch: lerp(-6, 0, k) });
    ctx.restore();
    const cx = W / 2, cy = H / 2;
    const ra = a3 * ramp(t, t2 + 1.5, t2 + 2.5);
    ctx.save(); ctx.globalAlpha = ra;
    ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5;
    if (k > 0.96) {
      ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 2 * Math.PI); ctx.stroke();
      text(ctx, '望舒　距离 470 光年', cx + 52, cy - 8, { size: 26, family: 'Hud', color: AMBER, align: 'left' });
      text(ctx, '信号发出 1817 年　·　收到 2287 年', cx + 52, cy + 26, { size: 22, family: 'Hud', color: AMBER_DIM, align: 'left' });
    }
    ctx.restore();
  }
};

// ---------- 二、出发 ----------
function roundTrip(ctx, t, a, b, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const xe = 420, xw = 1500, y = H / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([4, 8]);
  ctx.beginPath(); ctx.moveTo(xe, y); ctx.lineTo(xw, y); ctx.stroke(); ctx.setLineDash([]);
  const dot = (x, c, r) => { ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0; };
  dot(xe, '#7fb8ff', 12); dot(xw, '#ffcf8a', 9);
  text(ctx, '地球', xe, y + 60, { size: 30, color: '#dfe8f5' });
  text(ctx, '望舒', xw, y + 60, { size: 30, color: '#f5e6d0' });
  text(ctx, '470 光年', (xe + xw) / 2, y - 30, { size: 24, family: 'Hud', color: AMBER_DIM });
  // 电波：去 470 年，回 470 年
  const k = prog(t, a, b);
  const px = k < 0.5 ? lerp(xe, xw, k * 2) : lerp(xw, xe, (k - 0.5) * 2);
  ctx.fillStyle = AMBER; ctx.shadowColor = AMBER; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(px, y, 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  const year = 2287 + 940 * k;
  text(ctx, `地球纪年 ${year.toFixed(0)}`, W / 2, BAR + 120, { size: 40, family: 'Hud', color: AMBER });
  text(ctx, '电波往返　940 年', W / 2, H - BAR - 80, { size: 30, color: '#e8e6e1', alpha: ramp(t, b - 1.5, b - 0.5) });
  ctx.restore();
}

function annihilation(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const cx = W / 2, cy = H / 2 - 40, k = prog(t, a, a + 2.4);
  const hit = a + 2.4;
  if (t < hit) {
    const d = lerp(520, 0, easeIn(k));
    const ball = (x, c, lab) => {
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(x, cy, 20, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      text(ctx, lab, x, cy - 44, { size: 24, color: c });
    };
    ball(cx - d, '#8fd0ff', '1 克物质');
    ball(cx + d, '#ff9b8f', '1 克反物质');
  } else {
    // 湮灭：伽马光子向四周飞出
    const u = t - hit, r = mulberry32(11);
    const fl = Math.exp(-u * 2.2);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 380);
    g.addColorStop(0, `rgba(255,255,255,${fl})`); g.addColorStop(0.3, `rgba(190,220,255,${0.5 * fl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, BAR, W, H - 2 * BAR);
    ctx.strokeStyle = 'rgba(200,230,255,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 36; i++) {
      const th = r() * 2 * Math.PI, r0 = 600 * u * (0.6 + 0.4 * r()), len = 40;
      ctx.globalAlpha = alpha * clamp(1 - u / 6);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0 * 0.6);
      ctx.lineTo(cx + Math.cos(th) * (r0 + len), cy + Math.sin(th) * (r0 + len) * 0.6); ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    const ta = ramp(t, hit + 0.6, hit + 1.6);
    text(ctx, '1.8 × 10¹⁴ 焦耳', cx, cy + 20, { size: 72, family: 'Hud', color: '#fff', alpha: ta, glow: 18 });
    text(ctx, '≈ 43 千吨 TNT　≈ 3 颗广岛原子弹', cx, cy + 90, { size: 32, color: '#d8dde6', alpha: ramp(t, hit + 1.6, hit + 2.6) });
  }
  ctx.restore();
}

function equation(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  text(ctx, 'E = mc²', W / 2, H / 2 + 40, { size: 170, family: 'Hud', color: '#fff', alpha: alpha * ramp(t, a, a + 0.8), glow: 30, spacing: 6 });
}

// 推力 = 重力：舱内一个小人，上方箭头是地板的推力
function equivalence(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  inset(ctx, 1380, BAR + 40, 480, 300, '等效原理', r => {
    const k = ramp(t, a, a + 1);
    const box = (x, lab, arrowUp) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.strokeRect(x, r.y + 70, 150, 170);
      // 小人
      ctx.fillStyle = '#e8e6e1';
      ctx.beginPath(); ctx.arc(x + 75, r.y + 150, 11, 0, 7); ctx.fill();
      ctx.fillRect(x + 69, r.y + 163, 12, 50);
      ctx.fillStyle = AMBER;
      const ax = x + 75, ay = arrowUp ? r.y + 300 : r.y + 50;
      ctx.beginPath();
      if (arrowUp) { ctx.moveTo(ax, ay - 40 * k - 15); ctx.lineTo(ax - 10, ay - 40 * k); ctx.lineTo(ax + 10, ay - 40 * k); ctx.fill(); ctx.fillRect(ax - 3, ay - 40 * k, 6, 40 * k); }
      else { ctx.moveTo(ax, r.y + 70 + 5); ctx.lineTo(ax - 10, r.y + 60); ctx.lineTo(ax + 10, r.y + 60); ctx.fill(); ctx.fillRect(ax - 3, r.y + 60 - 30 * k, 6, 30 * k); }
      text(ctx, lab, x + 75, r.y + 270, { size: 20, color: '#d8dde6' });
    };
    box(r.x + 40, '太空中以 1g 加速', true);
    box(r.x + 290, '静止在地面上', false);
    text(ctx, '≡', r.x + 240, r.y + 165, { size: 40, family: 'Hud', color: AMBER });
  }, alpha);
}

function divergence(ctx, t, a, b, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const k = ramp(t, a + 0.5, b - 0.8, easeInOut);
  const x0 = 360, x1 = 1560, y1 = H / 2 - 80, y2 = H / 2 + 80;
  const tau = 12 * k, te = P.t_leg * k;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, y1 - 6, x1 - x0, 12); ctx.fillRect(x0, y2 - 6, x1 - x0, 12);
  ctx.fillStyle = AMBER; ctx.fillRect(x0, y1 - 6, (x1 - x0) * k, 12);
  ctx.fillStyle = ICE; ctx.fillRect(x0, y2 - 6, (x1 - x0) * k, 12);
  // 刻度：船上每年一格，地球每 10 年一格
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  for (let i = 1; i < 12; i++) ctx.fillRect(x0 + (x1 - x0) * i / 12 - 1, y1 - 6, 2, 12);
  for (let i = 1; i < 48; i++) ctx.fillRect(x0 + (x1 - x0) * i * 10 / P.t_leg - 1, y2 - 6, 2, 12);
  text(ctx, '船上', x0 - 30, y1 + 10, { size: 30, align: 'right', color: AMBER });
  text(ctx, '地球', x0 - 30, y2 + 10, { size: 30, align: 'right', color: ICE });
  text(ctx, `${tau.toFixed(1)} 年`, x1 + 30, y1 + 12, { size: 36, family: 'Hud', align: 'left', color: AMBER });
  text(ctx, `${te.toFixed(0)} 年`, x1 + 30, y2 + 12, { size: 36, family: 'Hud', align: 'left', color: ICE });
  ctx.restore();
}

XF.depart = 1.4;
SCENES.depart = (ctx, t, s) => {
  const L = i => lineAt('depart', i), E = i => lineEnd('depart', i);
  const c1 = cue('depart', '我们决定');
  roundTrip(ctx, t, s.start + 0.3, c1 - 0.2, 1 - ramp(t, c1 - 0.4, c1 + 0.4));
  // 夸父号首次亮相
  const a = ramp(t, c1 - 0.4, c1 + 0.4) * (1 - ramp(t, L(1) - 0.2, L(1) + 0.6));
  if (a > 0) shot(ctx, 'kuafu', 0, { zoom: 1.12 - 0.06 * prog(t, c1, L(1) + 0.6), alpha: a });
  annihilation(ctx, t, cue('depart', '湮灭') - 2.4, ramp(t, L(1) - 0.2, L(1) + 0.6) * (1 - ramp(t, L(2) - 0.6, L(2) + 0.2)));
  // E = mc²，然后点火
  const ig = cue('depart', '引擎');
  equation(ctx, t, L(2), 1 - ramp(t, ig - 0.2, ig + 0.6));
  const a2 = ramp(t, ig - 0.2, ig + 0.6) * (1 - ramp(t, L(3) + 0.2, L(3) + 1.0));
  if (a2 > 0) {
    shot(ctx, 'kuafu', t - ig, { zoom: 1.0 + 0.03 * prog(t, ig, L(3) + 1), alpha: a2 });
    if (!ASSETS.clips.kuafu) {   // 没有视频片段时，用代码画引擎的光
      const k = ramp(t, ig + 0.3, ig + 2.5);
      const g = ctx.createRadialGradient(W * 0.5, H * 0.78, 0, W * 0.5, H * 0.78, 520 * k + 1);
      g.addColorStop(0, `rgba(220,235,255,${0.9 * a2 * k})`); g.addColorStop(1, 'rgba(120,170,255,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, BAR, W, H - 2 * BAR); ctx.restore();
    }
  }
  // 舱内甲板 + 等效原理
  const a3 = ramp(t, L(3) + 0.2, L(3) + 1.0) * (1 - ramp(t, L(4) - 0.4, L(4) + 0.4));
  if (a3 > 0) {
    shot(ctx, 'deck', t - L(3), { zoom: 1.08 - 0.06 * prog(t, L(3), L(4)), fx: -0.3, alpha: a3 });
    equivalence(ctx, t, cue('depart', '等效原理'), a3 * ramp(t, cue('depart', '等效原理') - 0.3, cue('depart', '等效原理') + 0.3));
  }
  divergence(ctx, t, L(4), E(4), ramp(t, L(4) - 0.4, L(4) + 0.4) * (1 - ramp(t, L(5) - 0.6, L(5) + 0.2)));
  const a5 = ramp(t, L(5) - 0.6, L(5) + 0.2);
  if (a5 > 0) shot(ctx, 'farewell', t - L(5), { zoom: 1.0 + 0.07 * prog(t, L(5), s.end + 1), fy: 0.2, alpha: a5 });
};

// ---------- 三、星光聚拢 ----------
XF.starbow = 2.0;
SCENES.starbow = (ctx, t, s) => {
  const vg = voyageAt(t);
  const { s: st, fov } = skyAt(ctx, vg);
  fovLabel(ctx, fov);
  // 后视：身后的星空变暗变红
  const l1 = lineAt('starbow', 1), l2 = lineAt('starbow', 2);
  inset(ctx, 60, H - BAR - 300, 480, 270, '后视　同等曝光', r => {
    drawSky(ctx, { beta: st.v, yaw: 180, fov: 75, rect: r });
    text(ctx, '星光已红移出可见光', r.x + r.w / 2, r.y + r.h / 2 + 10, { size: 24, color: 'rgba(255,140,110,0.8)' });
  },
    ramp(t, cue('starbow', '身后') - 0.4, cue('starbow', '身后') + 0.3) * (1 - ramp(t, l2 - 0.3, l2 + 0.3)));
  // 地球信号：发出年份走得很慢
  const an = ramp(t, cue('starbow', '拉长') - 0.6, cue('starbow', '拉长')) ;
  inset(ctx, 60, H - BAR - 300, 480, 270, '收到的地球信号', r => {
    shot(ctx, 'farewell', 0, { rect: r, zoom: 1.1, filter: 'grayscale(0.6) brightness(0.7)' });
    text(ctx, `发出于 ${st.news.toFixed(2)}`, r.x + r.w / 2, r.y + r.h - 24, { size: 30, family: 'Hud', color: AMBER });
  }, an);
};

// ---------- 四、交会 ----------
function glyph(ctx, seed, x, y, size, color) {
  const r = mulberry32(seed);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = size * 0.08; ctx.lineCap = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 8;
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    if (r() < 0.5) {
      ctx.moveTo(x + (r() - 0.5) * size, y + (r() - 0.5) * size);
      ctx.lineTo(x + (r() - 0.5) * size, y + (r() - 0.5) * size);
    } else {
      ctx.arc(x + (r() - 0.5) * size * 0.4, y + (r() - 0.5) * size * 0.4, size * (0.15 + 0.3 * r()), r() * 6, r() * 6 + 1 + r() * 3);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function decode(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  const msg = '我们正在去你们那里';
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, BAR, W, H - 2 * BAR);
  const rows = [['收到', 101, ICE], ['发出', 202, AMBER]];
  rows.forEach(([lab, seed, col], j) => {
    const y = H / 2 - 90 + j * 180;
    text(ctx, lab, 300, y + 12, { size: 26, color: col, align: 'right', family: 'Hud' });
    for (let i = 0; i < msg.length; i++) {
      const x = 420 + i * 140;
      const k = ramp(t, a + 0.25 * i + j * 0.1, a + 0.25 * i + j * 0.1 + 0.7);
      ctx.save(); ctx.globalAlpha = alpha * (1 - k); glyph(ctx, seed + i * 7, x, y, 80, col); ctx.restore();
      text(ctx, msg[i], x, y + 26, { size: 76, color: col, alpha: k, glow: 10 });
    }
  });
  ctx.restore();
}

function countdown(ctx, t, alpha) {
  if (alpha <= 0) return;
  const a = cue('flyby', '三分半'), left = Math.max(0, 210 * (1 - prog(t, a - 0.5, FLASH)));
  const m = Math.floor(left / 60), sec = left - 60 * m;
  text(ctx, `距交会　${String(m).padStart(2, '0')}:${sec.toFixed(1).padStart(4, '0')}`, W - 60, BAR + 50,
    { size: 28, family: 'Hud', color: '#ff9b7a', align: 'right', alpha });
}

// 时空图：横轴离地球的距离（光年），纵轴地球纪年，光线走 45°
function spacetime(ctx, t, { rect, t0, t1, x0 = -20, x1 = 490, upto = 1e9, meet = false, simul = 0, proper = 0, alpha = 1 }) {
  if (alpha <= 0) return;
  const s = Math.min(rect.w / (x1 - x0), rect.h / (t1 - t0));
  const ox = rect.x + (rect.w - s * (x1 - x0)) / 2, oy = rect.y + rect.h - (rect.h - s * (t1 - t0)) / 2;
  const X = x => ox + (x - x0) * s, Y = y => oy - (y - t0) * s;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.rect(X(x0) - 200, Y(t1), s * (x1 - x0) + 400, s * (t1 - t0)); ctx.clip();
  // 年份网格
  const step = t1 - t0 > 600 ? 200 : 50;
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
  for (let y = Math.ceil(t0 / step) * step; y <= t1; y += step) {
    ctx.beginPath(); ctx.moveTo(X(x0), Y(y)); ctx.lineTo(X(x1), Y(y)); ctx.stroke();
    text(ctx, String(y), X(x0) - 14, Y(y) + 7, { size: 18, family: 'Hud', color: 'rgba(255,255,255,0.4)', align: 'right' });
  }
  const line = (pts, color, width = 2.5, dash = []) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;
    for (const [x, y] of pts) {
      if (y > upto) break;
      if (!started) { ctx.moveTo(X(x), Y(y)); started = true; } else ctx.lineTo(X(x), Y(y));
    }
    ctx.stroke(); ctx.setLineDash([]);
  };
  line([[0, t0], [0, t1]], 'rgba(127,184,255,0.7)', 2);
  line([[P.d, t0], [P.d, t1]], 'rgba(255,207,138,0.7)', 2);
  text(ctx, '地球', X(0), Y(t1) + 30, { size: 22, color: '#a8ccf5' });
  text(ctx, '望舒', X(P.d), Y(t1) + 30, { size: 22, color: '#f5dcb0' });
  // 望舒的信号（光线）
  line([[P.d, P.t_alien_launch], [0, P.t_signal]], 'rgba(255,255,255,0.35)', 1.5, [6, 6]);
  // 望舒飞船
  line([[P.d, P.t_alien_launch], [0, P.t_alien_earth], [0, t1]], ICE, 3);
  // 夸父号：去程、停留、回程
  const L = P.leg, pts = [];
  for (let i = 0; i < L.tau.length; i += 4) pts.push([L.x[i], P.t_depart + L.t[i]]);
  pts.push([P.d, P.t_leave]);
  for (let i = 0; i < L.tau.length; i += 4) pts.push([P.d - L.x[i], P.t_leave + L.t[i]]);
  line(pts, AMBER, 3);
  if (meet && upto >= P.t_meet) {
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(X(P.x_meet), Y(P.t_meet), 7, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  // 同时线：在夸父号的参照系里 t − t_m = v (x − x_m)，在望舒飞船的参照系里 v = −0.5
  if (simul > 0) {
    const sl = (v, col, lab, k) => {
      const dx = 260;
      ctx.save(); ctx.globalAlpha = alpha * k;
      line([[P.x_meet - dx, P.t_meet - v * dx], [P.x_meet + dx, P.t_meet + v * dx]], col, 2, [10, 8]);
      text(ctx, lab, X(P.x_meet + dx) + 12, Y(P.t_meet + v * dx) + 8, { size: 22, color: col, align: 'left' });
      ctx.restore();
    };
    sl(P.v_meet, AMBER, '夸父号的“同时”', clamp(simul * 2));
    sl(-P.v_alien, ICE, '望舒飞船的“同时”', clamp(simul * 2 - 1));
  }
  ctx.restore();
  // 重逢：两段固有时
  if (proper > 0) {
    const k = clamp(proper);
    text(ctx, '望舒船长：752 年', X(0) - 24, Y(3000), { size: 30, color: ICE, align: 'right', alpha: alpha * k });
    text(ctx, '夸父号船员：19 年', X(P.d) + 24, Y(3000), { size: 30, color: AMBER, align: 'left', alpha: alpha * clamp(proper * 2 - 1) });
  }
}

function flash(ctx, t) {
  const u = t - FLASH;
  if (u < -0.6 || u > 3) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const k = u < 0 ? Math.exp(u * 6) : Math.exp(-u * 1.6);
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
  g.addColorStop(0, `rgba(235,245,255,${k})`); g.addColorStop(0.2, `rgba(160,200,255,${0.6 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, BAR, W, H - 2 * BAR);
  ctx.restore();
}

SCENES.flyby = (ctx, t, s) => {
  const L = i => lineAt('flyby', i);
  const vg = voyageAt(t);
  const { fov } = skyAt(ctx, vg);
  fovLabel(ctx, fov);
  // 信标：正前方偏一点的一颗蓝白光点，越来越亮
  const b = ramp(t, L(0) + 0.3, L(0) + 1.2);
  if (b > 0 && t < FLASH) {
    const px = W / 2 + 46, py = H / 2 - 14, pulse = 0.6 + 0.4 * Math.sin(t * 9);
    const sz = 4 + 30 * Math.pow(prog(t, L(0), FLASH), 6);
    const g = ctx.createRadialGradient(px, py, 0, px, py, sz * 4);
    g.addColorStop(0, `rgba(230,245,255,${b * pulse})`); g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(px - sz * 4, py - sz * 4, sz * 8, sz * 8); ctx.restore();
    ctx.save(); ctx.globalAlpha = b; ctx.strokeStyle = '#ff9b7a'; ctx.lineWidth = 1.5;
    const q = 26; ctx.strokeRect(px - q, py - q, 2 * q, 2 * q); ctx.restore();
    text(ctx, '未知信标', px + 40, py - 32, { size: 22, family: 'Hud', color: '#ff9b7a', align: 'left', alpha: b });
  }
  // 异星飞船
  const a1 = ramp(t, L(1) - 0.3, L(1) + 0.3) * (1 - ramp(t, L(2) - 0.3, L(2) + 0.3));
  if (a1 > 0) shot(ctx, 'alienship', t - L(1), { zoom: 1.05 + 0.1 * prog(t, L(1), L(2)), alpha: a1 });
  countdown(ctx, t, ramp(t, cue('flyby', '三分半') - 0.6, cue('flyby', '三分半')) * (1 - ramp(t, FLASH, FLASH + 0.3)));
  // 时空图与同时线
  const a3 = ramp(t, L(3) - 0.4, L(3) + 0.4) * (1 - ramp(t, L(4) - 0.6, L(4)));
  if (a3 > 0) {
    ctx.save(); ctx.globalAlpha = a3 * 0.9; ctx.fillStyle = '#000'; ctx.fillRect(0, BAR, W, H - 2 * BAR); ctx.restore();
    spacetime(ctx, t, { rect: { x: 500, y: BAR + 50, w: 1000, h: H - 2 * BAR - 100 }, t0: 2290, t1: 2620, meet: true,
      simul: prog(t, cue('flyby', '在我们的参照系'), cue('flyby', '慢的是我们') + 1), alpha: a3 });
  }
  flash(ctx, t);
  decode(ctx, t, cue('flyby', '同一句') + 0.8, ramp(t, L(5) - 0.2, L(5) + 0.4) * (1 - ramp(t, s.end - 0.6, s.end)));
};

// ---------- 五、望舒 ----------
function spectrum(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000'; ctx.fillRect(0, BAR, W, H - 2 * BAR);
  const x0 = 300, x1 = 1620, y0 = H - BAR - 150, hgt = 420;
  const lam = x => lerp(400, 900, (x - x0) / (x1 - x0));
  // 地球的反射光谱：太阳谱上叠加 O₂ 和水汽的吸收带
  const dips = [[687, 4, 0.25], [760, 5, 0.6], [720, 8, 0.15], [820, 12, 0.2], [940, 20, 0.3]];
  const k = ramp(t, a, a + 2);
  ctx.strokeStyle = '#e8e6e1'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = x0; x <= lerp(x0, x1, k); x += 2) {
    const l = lam(x);
    let f = Math.exp(-Math.pow((l - 520) / 260, 2)) * 0.9 + 0.1;
    for (const [c, w, d] of dips) f *= 1 - d * Math.exp(-Math.pow((l - c) / w, 2));
    const y = y0 - f * hgt;
    if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x0, y0, x1 - x0, 1.5);
  for (let l = 400; l <= 900; l += 100) text(ctx, `${l}`, lerp(x0, x1, (l - 400) / 500), y0 + 34, { size: 20, family: 'Hud', color: 'rgba(255,255,255,0.5)' });
  text(ctx, '波长 nm', x1, y0 + 70, { size: 20, color: 'rgba(255,255,255,0.5)', align: 'right' });
  const xa = lerp(x0, x1, (760 - 400) / 500), la = ramp(t, a + 1.6, a + 2.4);
  ctx.strokeStyle = AMBER; ctx.globalAlpha = alpha * la; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xa, y0 - hgt - 20); ctx.lineTo(xa, y0 - 40); ctx.stroke();
  ctx.globalAlpha = alpha;
  text(ctx, '氧气 O₂　760 nm', xa, y0 - hgt - 34, { size: 30, color: AMBER, alpha: la });
  text(ctx, '望舒天文台记录的地球光谱　·　约 1347 年发出的光', x0, BAR + 60, { size: 24, color: 'rgba(255,255,255,0.6)', align: 'left' });
  ctx.restore();
}

function calendar(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000'; ctx.fillRect(0, BAR, W, H - 2 * BAR);
  const rows = [
    ['', '出发', '抵达', '经过'],
    ['夸父号的钟', '0 年', '12.0 年', '12.0 年'],
    ['地球纪年', '2301 年', `${P.t_arrive.toFixed(0)} 年`, `${P.t_leg.toFixed(0)} 年`],
  ];
  const xs = [520, 860, 1160, 1440], y0 = H / 2 - 110;
  rows.forEach((r, i) => r.forEach((c, j) => {
    const k = ramp(t, a + 0.3 * i + 0.15 * j, a + 0.3 * i + 0.15 * j + 0.5);
    text(ctx, c, xs[j], y0 + i * 110, { size: i === 0 ? 28 : 44, family: j ? 'Hud' : 'Sans',
      color: i === 0 ? 'rgba(255,255,255,0.5)' : i === 1 ? AMBER : ICE, alpha: k, align: j ? 'center' : 'right' });
  }));
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(360, y0 + 30, 1240, 1.5);
  ctx.restore();
}

XF.arrive = 1.2;
SCENES.arrive = (ctx, t, s) => {
  const L = i => lineAt('arrive', i);
  const vg = voyageAt(t) || { leg: 'out', tau: P.tau_leg };
  // 调头：镜头随船首转过 180°，之后切回运动方向的前视
  const turn = ramp(t, FLIP[0], FLIP[1], easeInOut);
  const back = t > FLIP[1] + 0.8 && t < L(1) - 0.2;
  const yaw = t < L(1) - 0.2 ? 180 * turn : 0;
  const { fov } = skyAt(ctx, vg, { yaw, fov: back || turn > 0.3 ? 75 : undefined });
  fovLabel(ctx, back || turn > 0.3 ? 75 : fov, turn > 0 && t < L(1) - 0.2 ? '船首方向' : '前视 · 运动方向');
  // 星光散开之后：行星、望舒人
  const p = cue('arrive', '望舒的第二颗');
  const a1 = ramp(t, p - 0.5, p + 0.5) * (1 - ramp(t, L(2) - 0.15, L(2) + 0.15));
  if (a1 > 0) shot(ctx, 'planet', t - p, { zoom: 1.0 + 0.06 * prog(t, p, L(2)), alpha: a1 });
  const a2 = ramp(t, L(2) - 0.15, L(2) + 0.15) * (1 - ramp(t, cue('arrive', '望远镜') - 0.5, cue('arrive', '望远镜') + 0.3));
  if (a2 > 0) shot(ctx, 'aliens', t - L(2), { zoom: 1.12 - 0.08 * prog(t, L(2), L(3) + 4), alpha: a2 });
  const sp = cue('arrive', '望远镜');
  spectrum(ctx, t, sp, ramp(t, sp - 0.5, sp + 0.3) * (1 - ramp(t, L(4) - 0.5, L(4) + 0.2)));
  const a4 = ramp(t, L(4) - 0.5, L(4) + 0.2) * (1 - ramp(t, L(5) - 0.4, L(5) + 0.3));
  if (a4 > 0) shot(ctx, 'aliens', 10 + t - L(4), { zoom: 1.35, fx: 0.2, fy: -0.1, alpha: a4 });
  calendar(ctx, t, L(5) + 0.2, ramp(t, L(5) - 0.4, L(5) + 0.3));
};

// ---------- 六、回程 ----------
const CITIES = ['city1', 'city2', 'city3', 'city4'];
XF.return = 1.2;
SCENES.return = (ctx, t, s) => {
  const L = i => lineAt('return', i);
  const vg = voyageAt(t);
  const { s: st, fov } = skyAt(ctx, vg);
  fovLabel(ctx, fov);
  // 收到的地球信号：发出年份飞快翻动，城市一座座换样子
  const m0 = cue('return', '九百多年') - 0.5, m1 = L(3) - 0.3;
  const am = ramp(t, cue('return', '压缩') - 0.5, cue('return', '压缩')) * (1 - ramp(t, m1, m1 + 0.4));
  if (am > 0) {
    const k = prog(t, m0, m1);
    const i = clamp(Math.floor(k * CITIES.length), 0, CITIES.length - 1);
    const full = ramp(t, cue('return', '城市') - 0.6, cue('return', '城市'));
    const r = {
      x: lerp(60, 0, full), y: lerp(H - BAR - 300, BAR, full),
      w: lerp(480, W, full), h: lerp(270, H - 2 * BAR, full),
    };
    inset(ctx, r.x, r.y, r.w, r.h, '收到的地球信号', rr => {
      if (t > m0) {
        shot(ctx, CITIES[i], 0, { rect: rr, zoom: 1.05 + 0.05 * ((k * 4) % 1) });
        // 换画面时的信号雪花
        const edge = (k * 4) % 1;
        if (edge < 0.08) { ctx.save(); ctx.globalAlpha = 0.5 * (1 - edge / 0.08); ctx.fillStyle = '#9ab'; ctx.fillRect(rr.x, rr.y, rr.w, rr.h); ctx.restore(); }
      }
      text(ctx, `发出于 ${st.news.toFixed(1)}`, rr.x + rr.w / 2, rr.y + rr.h - 24, { size: lerp(30, 40, full), family: 'Hud', color: AMBER });
    }, am);
  }
  // 2757 年的画面：望舒飞船降落地球
  const a3 = ramp(t, L(3) - 0.3, L(3) + 0.4);
  if (a3 > 0) {
    shot(ctx, 'landing', t - cue('return', '那艘'), { zoom: 1.08 - 0.06 * prog(t, L(3), s.end), alpha: a3 });
    text(ctx, '地球信号　发出于 2757 年', 60, BAR + 50, { size: 22, family: 'Hud', color: AMBER, align: 'left', alpha: a3 });
  }
};

// ---------- 七、重逢 ----------
XF.reunion = 1.4;
SCENES.reunion = (ctx, t, s) => {
  const L = i => lineAt('reunion', i);
  const a0 = 1 - ramp(t, L(1) - 0.4, L(1) + 0.3);
  if (a0 > 0) shot(ctx, 'homecoming', t - s.start, { zoom: 1.1 - 0.07 * prog(t, s.start, L(1)), alpha: a0 });
  const a1 = ramp(t, L(1) - 0.4, L(1) + 0.3) * (1 - ramp(t, L(3) - 0.4, L(3) + 0.4));
  if (a1 > 0) shot(ctx, 'captain', t - L(1), { zoom: 1.04 + 0.08 * prog(t, L(1), L(3)), alpha: a1 });
  const a2 = ramp(t, L(3) - 0.4, L(3) + 0.4) * (1 - ramp(t, TITLE - 0.8, TITLE));
  if (a2 > 0) {
    spacetime(ctx, t, { rect: { x: 560, y: BAR + 30, w: 800, h: H - 2 * BAR - 60 }, t0: 1800, t1: 3260, meet: true,
      upto: lerp(P.t_meet, 3300, ramp(t, L(3), L(3) + 3)), proper: prog(t, cue('reunion', '他过了'), cue('reunion', '我们只过') + 1.5), alpha: a2 });
  }
  const at = ramp(t, TITLE, TITLE + 1.5) * (1 - ramp(t, s.end - 1.5, s.end));
  text(ctx, '对 表', W / 2, H / 2 + 40, { size: 150, family: 'Head', weight: 900, color: '#f2efe8', alpha: at, spacing: 40 });
};
