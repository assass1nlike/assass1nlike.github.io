// 《对表》的全部画面。时间都对齐到旁白：lineAt(场景, 第几句) 是那句话开始的时刻，cue(场景, 词) 是那个词开始的时刻。
const P = DATA.physics;
const AMBER = '#ffd9a0', AMBER_DIM = 'rgba(255,196,120,0.55)', ICE = '#bfe3ff';
const SFX = [];

// ---------- 时间点 ----------
const IGNITE = lineAt('depart', 0) + 0.3;                // 夸父号点火的镜头开始
const FLASH = lineEnd('flyby', 2) + 0.4;                 // 交会的一瞬
const TITLE = lineEnd('reunion', 5) + 1.4;

function setup() {
  STARS = makeStars();
  // 望舒放在正前方（+z），也就是夸父号的航向
  STARS.x[0] = 0; STARS.y[0] = 0; STARS.z[0] = 1; STARS.f[0] = 5; STARS.T[0] = 5600; STARS.ll[0] = bbLogLum(5600);
  const sfx = (t, kind, gain = 0.5, dur) => SFX.push({ t, kind, gain, ...(dur ? { dur } : {}) });
  sfx(0.6, 'blip', 0.35);
  sfx(IGNITE + 0.6, 'ignite', 0.8);
  sfx(lineAt('flyby', 0) + 0.3, 'beacon', 0.4, FLASH - lineAt('flyby', 0) - 0.3);
  sfx(FLASH - 0.25, 'flyby', 0.9);
  sfx(cue('flyby', '同一句') + 0.4, 'decode', 0.5);
  sfx(lineAt('arrive', 1) - 0.2, 'swell', 0.7);
  sfx(lineAt('return', 4) - 0.6, 'swell', 0.6);
  sfx(lineAt('reunion', 2) - 0.3, 'swell', 0.6);
  sfx(TITLE, 'title', 0.8);
}

// 片中每一刻的航行状态：返回 {leg, tau}，不在航行中返回 null。
// 回程的船时按小满的年龄安排：画面上收到的消息年份要和她的样子对得上。
function voyageAt(t) {
  const sb = sceneOf('starbow'), fb = sceneOf('flyby'), ar = sceneOf('arrive'), rt = sceneOf('return');
  const seg = (a, b, x, y, f = k => k) => lerp(x, y, f(prog(t, a, b)));
  if (t >= sb.start && t < sb.end) {
    const a = lineEnd('starbow', 0);
    return { leg: 'out', tau: t < a ? seg(sb.start, a, 0, 3, easeInOut) : seg(a, sb.end, 3, 5.5) };
  }
  if (t >= fb.start && t < fb.end) return { leg: 'out', tau: t < FLASH ? seg(fb.start, FLASH, 5.5, P.tau_meet) : seg(FLASH, fb.end, P.tau_meet, 5.62) };
  if (t >= ar.start && t < lineAt('arrive', 1)) return { leg: 'out', tau: seg(ar.start, lineEnd('arrive', 0) + 0.3, 5.62, P.tau_leg, easeInOut) };
  if (t >= rt.start && t < rt.end) {
    const L = i => lineAt('return', i);
    const keys = [[rt.start, 0], [L(1), 1.0], [L(2), 1.9], [cue('return', '头发'), 3.75], [cue('return', '最后一封'), 4.2],
      [L(6), 4.25], [L(7) - 0.3, 5.96], [rt.end, 6.3]];
    for (let i = 0; i < keys.length - 1; i++) {
      if (t < keys[i + 1][0]) return { leg: 'back', tau: seg(keys[i][0], keys[i + 1][0], keys[i][1], keys[i + 1][1]) };
    }
    return { leg: 'back', tau: 6.3 };
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
    const arrived = vg.leg === 'out' && vg.tau >= P.tau_leg - 1e-3;
    st = { shipYears: vg.leg === 'out' ? vg.tau : P.tau_leg + 1 + vg.tau, year: s.year, v: s.v, accel: arrived ? 0 : 1 };
    alpha = 1;
    if (vg.leg === 'out' && t > lineAt('arrive', 1) - 1.2) alpha = 1 - prog(t, lineAt('arrive', 1) - 1.2, lineAt('arrive', 1));
  } else if (t >= rs.start && t < lineAt('reunion', 1)) {
    st = { shipYears: 2 * P.tau_leg + 1, year: P.t_home, v: 0, accel: 0 };
    alpha = 1 - prog(t, lineAt('reunion', 1) - 1, lineAt('reunion', 1));
  }
  if (st) hud(ctx, { ...st, alpha: alpha * ramp(t, sceneOf('starbow').start, sceneOf('starbow').start + 1) });
}

// 镜头视场随速度收窄，让聚拢到前方的星光始终占画面中央一块
function fovFor(v) {
  if (v < 0.3) return 75;
  const g = 1 / Math.sqrt(1 - v * v);
  const th = Math.acos(clamp((1 - 1 / g) / v, -1, 1)) * 180 / Math.PI;
  return clamp(th * 3.6, 14, 75);
}
function skyAt(ctx, vg, opts = {}) {
  const s = legState(vg.tau, vg.leg);
  drawSky(ctx, { beta: s.v, fov: opts.fov ?? fovFor(s.v), cmb: true, ...opts });
  return s;
}

// 小满的视频留言：铺满画面，左上角是接收信息
function videoMsg(ctx, name, local, { alpha = 1, sent = null, zoom = 1.04, fx = 0, fy = -0.2 } = {}) {
  if (alpha <= 0) return;
  shot(ctx, name, local, { zoom: zoom + 0.03 * clamp(local / 8), fx, fy, alpha });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff6b5a';
  ctx.beginPath(); ctx.arc(76, BAR + 44, 7, 0, 7); ctx.fill();
  text(ctx, sent ? `地球来信　发出于 ${sent}` : '地球来信', 96, BAR + 52, { size: 24, family: 'Hud', color: '#f4efe6', align: 'left', spacing: 1 });
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
    ctx.save(); ctx.globalAlpha = a3 * ramp(t, t2 + 1.5, t2 + 2.5);
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
XF.depart = 1.4;
SCENES.depart = (ctx, t, s) => {
  const L = i => lineAt('depart', i);
  // 夸父号点火
  const a0 = 1 - ramp(t, L(1) - 0.5, L(1) + 0.3);
  if (a0 > 0) shot(ctx, 'kuafu', t - IGNITE, { zoom: 1.0 + 0.04 * prog(t, IGNITE, L(1) + 0.3), alpha: a0 });
  // 出发前一天：哥哥蹲下来和小满说话，推向她的脸；他回答时转向他
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, L(4) - 0.5, L(4) + 0.3));
  if (a1 > 0) {
    const toHim = ramp(t, L(3) - 0.3, L(3) + 0.6);
    shot(ctx, 'goodbye', t - L(1), { zoom: lerp(1.04, 1.22, prog(t, L(1), L(4))), fx: lerp(-0.4, 0.4, toHim), fy: -0.1, alpha: a1 });
  }
  // 那是最大的谎：发射看台上，小满和爷爷仰望尾迹
  const a2 = ramp(t, L(4) - 0.5, L(4) + 0.3);
  if (a2 > 0) shot(ctx, 'farewell', t - L(4), { zoom: 1.0 + 0.07 * prog(t, L(4), s.end + 1), fy: 0.2, alpha: a2 });
};

// ---------- 三、去程 ----------
XF.starbow = 2.0;
SCENES.starbow = (ctx, t, s) => {
  const L = i => lineAt('starbow', i);
  const vg = voyageAt(clamp(t, s.start, s.end - 1e-3));
  const st = skyAt(ctx, vg);
  // 船舱里看视频
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, cue('starbow', '可我们') - 0.4, cue('starbow', '可我们') + 0.3));
  if (a1 > 0) shot(ctx, 'cabin', t - L(1), { zoom: 1.04 + 0.05 * prog(t, L(1), L(2)), fx: 0.2, alpha: a1 });
  // 七岁的小满：消息的发出年份走得很慢
  const c = cue('starbow', '可我们'), last = cue('starbow', '最后一封信');
  const a2 = ramp(t, c - 0.4, c + 0.3) * (1 - ramp(t, last - 0.4, last + 0.3));
  videoMsg(ctx, 'sister7', t - c, { alpha: a2, sent: `${st.news.toFixed(2)} 年` });
  // 九岁：去程的最后一封信
  videoMsg(ctx, 'sister9', t - last, { alpha: ramp(t, last - 0.4, last + 0.3), sent: '2303 年' });
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
  skyAt(ctx, voyageAt(clamp(t, s.start, s.end - 1e-3)));
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
  flash(ctx, t);
  decode(ctx, t, cue('flyby', '同一句') + 0.8, ramp(t, L(3) - 0.2, L(3) + 0.4) * (1 - ramp(t, s.end - 0.6, s.end)));
};

// ---------- 五、望舒 ----------
// 望舒人的望远镜里，九百多年前的地球：一个淡蓝色的小点
function paleDot(ctx, t, a, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  drawSky(ctx, { fov: lerp(30, 22, prog(t, a, a + 8)), yaw: 40, pitch: 10 });
  const cx = W / 2, cy = H / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
  g.addColorStop(0, 'rgba(200,225,255,1)'); g.addColorStop(0.3, 'rgba(120,170,255,0.6)'); g.addColorStop(1, 'rgba(80,140,255,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.strokeStyle = 'rgba(160,230,210,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 40, 0, 2 * Math.PI); ctx.stroke();
  ctx.restore();
}

XF.arrive = 1.2;
SCENES.arrive = (ctx, t, s) => {
  const L = i => lineAt('arrive', i);
  // 减速到停下，前方的星光散开；随后是望舒的行星
  skyAt(ctx, voyageAt(clamp(t, s.start, lineAt('arrive', 1) - 1e-3)) || { leg: 'out', tau: P.tau_leg });
  const p = lineEnd('arrive', 0);
  const a1 = ramp(t, p - 0.3, p + 0.6) * (1 - ramp(t, L(1) - 0.15, L(1) + 0.15));
  if (a1 > 0) shot(ctx, 'planet', t - p, { zoom: 1.0 + 0.06 * prog(t, p, L(1)), alpha: a1 });
  // 他们还在
  const d = cue('arrive', '九百多年前');
  const a2 = ramp(t, L(1) - 0.15, L(1) + 0.15) * (1 - ramp(t, d - 0.4, d + 0.3));
  if (a2 > 0) shot(ctx, 'aliens', t - L(1), { zoom: 1.12 - 0.08 * prog(t, L(1), d), alpha: a2 });
  paleDot(ctx, t, d, ramp(t, d - 0.4, d + 0.3) * (1 - ramp(t, L(3) - 0.4, L(3) + 0.3)));
  // 你们出发的时候，是哪一年
  const a4 = ramp(t, L(3) - 0.4, L(3) + 0.3) * (1 - ramp(t, L(4) - 0.4, L(4) + 0.3));
  if (a4 > 0) shot(ctx, 'aliens', 6 + t - L(3), { zoom: lerp(1.6, 1.75, prog(t, L(3), L(4))), fx: 0.25, fy: -0.15, alpha: a4 });
  // 两个文明见面，第一件事就是对表
  const a6 = ramp(t, L(4) - 0.4, L(4) + 0.3) * (1 - ramp(t, L(5) - 0.4, L(5) + 0.3));
  if (a6 > 0) shot(ctx, 'planet', 8 + t - L(4), { zoom: lerp(1.12, 1.2, prog(t, L(4), L(5))), fx: -0.3, alpha: a6 });
  // 我知道的最新的消息
  videoMsg(ctx, 'sister9', t - L(5), { alpha: ramp(t, cue('arrive', '最新的消息') - 0.4, cue('arrive', '最新的消息') + 0.3), sent: '2303 年', zoom: 1.1 });
  if (t < cue('arrive', '最新的消息') + 0.3) {
    const a5 = ramp(t, L(5) - 0.4, L(5) + 0.3);
    if (a5 > 0) shot(ctx, 'aliens', 12 + t - L(5), { zoom: 1.08, alpha: a5 });
  }
};

// ---------- 六、回程 ----------
const CITIES = ['city1', 'city2', 'city3', 'city4'];
XF.return = 1.2;
SCENES.return = (ctx, t, s) => {
  const L = i => lineAt('return', i);
  const st = skyAt(ctx, voyageAt(clamp(t, s.start, s.end - 1e-3)));
  const sent = `${st.news.toFixed(1)} 年`;
  // 小满的信涌进来：她一路长大、变老
  const flood = cue('return', '涌');
  const cuts = [[flood, 'sister9'], [cue('return', '上学'), 'sister16'], [cue('return', '结婚'), 'sister30'],
    [cue('return', '头发'), 'sister55'], [cue('return', '最后一封'), 'sister86']];
  const end = L(6);
  cuts.forEach(([a, name], i) => {
    const b = i + 1 < cuts.length ? cuts[i + 1][0] : end;
    const al = ramp(t, a - 0.25, a + 0.25) * (i + 1 < cuts.length ? 1 : 1 - ramp(t, end - 0.4, end + 0.3));
    if (t > a - 0.3 && t < b + 0.3) videoMsg(ctx, name, t - a, { alpha: al, sent: i === cuts.length - 1 ? '2380 年' : sent,
      zoom: i === cuts.length - 1 ? 1.04 + 0.1 * prog(t, a, end) : 1.04 });
  });
  // 地球一次又一次地变样子
  const c0 = L(6) - 0.3, c1 = L(7) - 0.3;
  const ac = ramp(t, c0, c0 + 0.5) * (1 - ramp(t, c1, c1 + 0.4));
  if (ac > 0) {
    const k = prog(t, c0, c1), i = clamp(Math.floor(k * CITIES.length), 0, CITIES.length - 1);
    videoMsg(ctx, CITIES[i], 0, { alpha: ac, sent, zoom: 1.05 + 0.05 * ((k * 4) % 1), fy: 0 });
  }
  // 2757 年的画面：望舒飞船降落地球
  const a3 = ramp(t, L(7) - 0.3, L(7) + 0.4);
  if (a3 > 0) videoMsg(ctx, 'landing', t - L(7), { alpha: a3, sent: '2757 年', zoom: 1.08 - 0.06 * prog(t, L(7), s.end), fy: 0 });
};

// ---------- 七、重逢 ----------
XF.reunion = 1.4;
SCENES.reunion = (ctx, t, s) => {
  const L = i => lineAt('reunion', i);
  const a0 = 1 - ramp(t, L(1) - 0.4, L(1) + 0.3);
  if (a0 > 0) shot(ctx, 'homecoming', t - s.start, { zoom: 1.1 - 0.07 * prog(t, s.start, L(1)), alpha: a0 });
  // 船长伸出手，镜头慢慢推近
  const a1 = ramp(t, L(1) - 0.4, L(1) + 0.3) * (1 - ramp(t, L(5) - 0.5, L(5) + 0.3));
  if (a1 > 0) shot(ctx, 'captain', t - L(1), { zoom: lerp(1.02, 1.3, prog(t, L(1), L(5))), fx: 0.1, alpha: a1 });
  // 那一年，我妹妹七岁
  const a2 = ramp(t, L(5) - 0.5, L(5) + 0.3) * (1 - ramp(t, TITLE - 1.0, TITLE));
  if (a2 > 0) shot(ctx, 'sister7', t - L(5), { zoom: lerp(1.04, 1.16, prog(t, L(5), TITLE)), fy: -0.2, alpha: a2 });
  const at = ramp(t, TITLE, TITLE + 1.5) * (1 - ramp(t, s.end - 1.5, s.end));
  text(ctx, '对 表', W / 2, H / 2 + 40, { size: 150, family: 'Head', weight: 900, color: '#f2efe8', alpha: at, spacing: 40 });
};
