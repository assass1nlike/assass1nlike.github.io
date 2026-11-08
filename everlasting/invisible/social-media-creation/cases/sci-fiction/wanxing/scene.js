// 《晚星》的全部画面。时间都对齐到旁白：lineAt(场景, 第几句) 是那句话开始的时刻，cue(场景, 词) 是那个词开始的时刻。
const M = DATA.mission;
const AMBER = '#ffd9a0', AMBER_DIM = 'rgba(255,196,120,0.55)', ICE = '#bfe3ff', RED = '#ff8a6e';
const SFX = [];

// ---------- 时间点 ----------
const IGNITE = cue('launch', '点火');
const ENTRY = cue('landing', '开始进入');               // 着陆舱进入大气层（长庚号的时钟从这里走）
const TOUCH = lineAt('landing', 4);                      // 落地
const TITLE = lineEnd('evening', 4) + 1.2;
const DELAY = M.delay_arrive * 60;                       // 着陆时单程通信延迟（秒）

function setup() {
  const sfx = (t, kind, gain = 0.5, dur) => SFX.push({ t, kind, gain, ...(dur ? { dur } : {}) });
  sfx(IGNITE + 0.1, 'launch', 0.9);
  sfx(lineAt('cruise', 2) - 0.3, 'msg', 0.3);
  sfx(lineAt('landing', 2) - 0.2, 'entry', 0.8, TOUCH - lineAt('landing', 2) + 0.2);
  sfx(TOUCH - 0.1, 'thud', 0.8);
  sfx(lineAt('landing', 5) + 1.0, 'swell', 0.7);
  sfx(lineAt('explore', 3) + 0.5, 'wind', 0.5);
  sfx(lineAt('conjunction', 0) + 0.5, 'static', 0.35, lineEnd('conjunction', 0) - lineAt('conjunction', 0));
  for (let i = 0; i < 9; i++) sfx(cue('conjunction', '一起涌') + 0.18 * i, 'msg', 0.25);
  sfx(lineAt('evening', 2) - 0.4, 'swell', 0.6);
  sfx(TITLE, 'title', 0.7);
}

// 长庚号上、从进入大气层算起的时间（秒）：旁白里的 7 分钟压缩到“进入”到“落地”这一段
function shipClock(t) {
  return 420 * prog(t, ENTRY, TOUCH);
}

const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// 女儿的视频留言：铺满画面，左上角是接收信息
function videoMsg(ctx, name, local, { alpha = 1, info = '', zoom = 1.04, fx = 0, fy = -0.2 } = {}) {
  if (alpha <= 0) return;
  shot(ctx, name, local, { zoom: zoom + 0.03 * clamp(local / 8), fx, fy, alpha });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff6b5a';
  ctx.beginPath(); ctx.arc(76, BAR + 44, 7, 0, 7); ctx.fill();
  label(ctx, `地球来信　${info}`, 96, BAR + 52, { color: '#f4efe6' });
  ctx.restore();
}

// 叠在画面上的一行仪表文字，带暗色阴影，压在亮的画面上也看得清
function label(ctx, str, x, y, { size = 24, color = AMBER, align = 'left', alpha = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, 'Hud', 400);
  ctx.textAlign = align;
  ctx.letterSpacing = '1px';
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.fillText(str, x, y);
  ctx.restore();
}

// 舱内屏幕：深色底、扫描线、轻微噪点
function screen(ctx, t, alpha, draw) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#05080b'; ctx.fillRect(0, BAR, W, H - 2 * BAR);
  draw();
  ctx.globalAlpha = alpha * 0.08;
  ctx.fillStyle = '#000';
  for (let y = BAR; y < H - BAR; y += 4) ctx.fillRect(0, y, W, 2);
  ctx.restore();
}

// ---------- 一、发射 ----------
const SCENES = {};
SCENES.launch = (ctx, t, s) => {
  const L = i => lineAt('launch', i);
  // 夜晚的发射台
  const a0 = ramp(t, 0.2, 1.8) * (1 - ramp(t, L(1) - 0.5, L(1) + 0.3));
  if (a0 > 0) {
    shot(ctx, 'pad', 0, { zoom: 1.1 - 0.06 * prog(t, 0, L(1)), fy: 0.2, alpha: a0 });
    label(ctx, '2033 年 4 月　文昌航天发射场', 60, BAR + 52, { color: '#f4efe6', alpha: a0 * ramp(t, 1.5, 2.5) });
  }
  // 发射前一晚：推向女儿，回答时转向父亲
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, L(5) - 0.5, L(5) + 0.3));
  if (a1 > 0) {
    const toHim = ramp(t, L(3) - 0.3, L(3) + 0.8) * (1 - ramp(t, L(4) - 0.3, L(4) + 0.8));
    shot(ctx, 'night', t - L(1), { zoom: lerp(1.04, 1.2, prog(t, L(1), L(5))), fx: lerp(-0.35, 0.35, toHim), fy: -0.1, alpha: a1 });
  }
  // 倒数、点火、升空
  const a2 = ramp(t, L(5) - 0.5, L(5) + 0.3);
  if (a2 > 0) shot(ctx, 'pad', Math.max(0, t - IGNITE), { zoom: 1.0 + 0.04 * prog(t, IGNITE, s.end), alpha: a2 });
};

// ---------- 二、航行 ----------
XF.cruise = 1.4;
SCENES.cruise = (ctx, t, s) => {
  const L = i => lineAt('cruise', i);
  const a0 = 1 - ramp(t, L(1) - 0.5, L(1) + 0.3);
  if (a0 > 0) shot(ctx, 'ship', t - s.start, { zoom: 1.12 - 0.08 * prog(t, s.start, L(1)), fx: lerp(-0.4, 0.2, prog(t, s.start, L(1))), alpha: a0 });
  const v = cue('cruise', '女儿的视频');
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, v - 0.4, v + 0.3));
  if (a1 > 0) shot(ctx, 'earthwindow', t - L(1), { zoom: lerp(1.0, 1.1, prog(t, L(1), v)), alpha: a1 });
  // 视频留言：延迟从几秒涨到几分钟
  const d = lerp(3, 252, ramp(t, v, cue('cruise', '我们没法'), easeIn));
  videoMsg(ctx, 'daughter6', t - v, { alpha: ramp(t, v - 0.4, v + 0.3), info: `延迟 ${Math.floor(d / 60)} 分 ${String(Math.floor(d % 60)).padStart(2, '0')} 秒` });
};

// ---------- 三、着陆 ----------
// 两个时钟：长庚号的，和地球收到“开始进入大气层”还要等多久
function clocks(ctx, t, { big = false, alpha = 1 } = {}) {
  if (alpha <= 0) return;
  const ship = shipClock(t), wait = Math.max(0, DELAY - ship);
  const landed = t >= TOUCH;
  ctx.save(); ctx.globalAlpha = alpha;
  if (big) {
    const y = H / 2 - 30;
    label(ctx, '长庚号　进入大气层后', W / 2 - 420, y - 90, { size: 30, color: AMBER_DIM, align: 'center' });
    text(ctx, mmss(ship), W / 2 - 420, y + 40, { size: 150, family: 'Hud', color: AMBER, glow: 16 });
    label(ctx, '地球　收到这条消息还要', W / 2 + 420, y - 90, { size: 30, color: 'rgba(191,227,255,0.6)', align: 'center' });
    text(ctx, mmss(wait), W / 2 + 420, y + 40, { size: 150, family: 'Hud', color: ICE, glow: 16 });
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(W / 2 - 1, y - 140, 2, 220);
    label(ctx, '发往地球：开始进入大气层', W / 2, y + 160, { size: 28, color: '#f4efe6', align: 'center', alpha: ramp(t, ENTRY, ENTRY + 0.5) });
  } else {
    const x = W - 60, y = BAR + 50;
    label(ctx, `长庚号 ${mmss(ship)}${landed ? '　已落地' : ''}`, x, y, { size: 26, color: AMBER, align: 'right' });
    label(ctx, `地球收到“进入大气层”还要 ${mmss(wait)}`, x, y + 36, { size: 22, color: ICE, align: 'right' });
  }
  ctx.restore();
}

XF.landing = 1.2;
SCENES.landing = (ctx, t, s) => {
  const L = i => lineAt('landing', i);
  // 火星占满舷窗
  const a0 = 1 - ramp(t, L(1) - 0.5, L(1) + 0.3);
  if (a0 > 0) shot(ctx, 'marswindow', t - s.start, { zoom: lerp(1.0, 1.12, prog(t, s.start, L(1))), alpha: a0 });
  // 两个时钟
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, L(2) - 0.4, L(2) + 0.3));
  screen(ctx, t, a1, () => clocks(ctx, t, { big: true }));
  // 进入大气层 → 降落伞 → 地球上的等待 → 落地
  const c1 = L(3), c2 = cue('landing', '那七分钟') - 0.6, c3 = lineEnd('landing', 3) + 0.6;
  const a2 = ramp(t, L(2) - 0.4, L(2) + 0.3) * (1 - ramp(t, c1 - 0.3, c1 + 0.3));
  if (a2 > 0) shot(ctx, 'entry', t - (L(2) - 0.4), { zoom: 1.04, alpha: a2 });
  const a3 = ramp(t, c1 - 0.3, c1 + 0.3) * (1 - ramp(t, c2 - 0.3, c2 + 0.3));
  if (a3 > 0) shot(ctx, 'chute', t - c1, { zoom: lerp(1.15, 1.02, prog(t, c1, c2)), fy: lerp(0.3, -0.2, prog(t, c1, c2)), alpha: a3 });
  const a4 = ramp(t, c2 - 0.3, c2 + 0.3) * (1 - ramp(t, c3 - 0.3, c3 + 0.3));
  if (a4 > 0) shot(ctx, 'control', t - c2, { zoom: lerp(1.04, 1.14, prog(t, c2, c3)), alpha: a4 });
  // 落地：尘土扬起，随后定格安静
  const a5 = ramp(t, c3 - 0.3, c3 + 0.3) * (1 - ramp(t, L(5) - 0.4, L(5) + 0.3));
  if (a5 > 0) {
    const shake = t < TOUCH ? 6 * Math.sin(t * 37) * prog(t, c3, TOUCH) : 0;
    shot(ctx, 'touchdown', t - c3, { zoom: 1.12 - 0.04 * prog(t, c3, L(5)), fx: shake / 400, alpha: a5 });
  }
  clocks(ctx, t, { alpha: ramp(t, L(2) - 0.2, L(2) + 0.4) * (1 - ramp(t, L(5) - 0.4, L(5))) * (a4 > 0.5 ? 0 : 1) });
  // 地球上的那一边：屏幕上标出地球这时收到的是什么
  if (a4 > 0) label(ctx, '地球　此刻收到：长庚号仍在火星轨道上', 60, BAR + 52, { color: ICE, alpha: a4 });
  // 二十分钟后，地球的欢呼
  const a6 = ramp(t, L(5) - 0.4, L(5) + 0.3);
  if (a6 > 0) {
    shot(ctx, 'cheer', t - L(5), { zoom: lerp(1.02, 1.1, prog(t, L(5), s.end)), alpha: a6 });
    label(ctx, '长庚号　落地后 20:00　收到地球信号', 60, BAR + 52, { color: AMBER, alpha: a6 });
  }
};

// ---------- 四、探索 ----------
XF.explore = 1.2;
SCENES.explore = (ctx, t, s) => {
  const L = i => lineAt('explore', i);
  const a0 = 1 - ramp(t, L(1) - 0.5, L(1) + 0.3);
  if (a0 > 0) shot(ctx, 'bound', t - s.start, { zoom: 1.04 + 0.04 * prog(t, s.start, L(1)), alpha: a0 });
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, L(2) - 0.4, L(2) + 0.3));
  if (a1 > 0) shot(ctx, 'delta', t - L(1), { zoom: lerp(1.2, 1.04, prog(t, L(1), L(2))), fx: lerp(0.4, -0.2, prog(t, L(1), L(2))), alpha: a1 });
  const a2 = ramp(t, L(2) - 0.4, L(2) + 0.3) * (1 - ramp(t, L(3) - 0.4, L(3) + 0.3));
  if (a2 > 0) shot(ctx, 'delta', 0, { zoom: lerp(1.5, 1.6, prog(t, L(2), L(3))), fx: -0.3, fy: 0.5, alpha: a2 });
  const a3 = ramp(t, L(3) - 0.4, L(3) + 0.3) * (1 - ramp(t, L(4) - 0.4, L(4) + 0.3));
  if (a3 > 0) shot(ctx, 'dustdevil', t - L(3), { zoom: lerp(1.0, 1.1, prog(t, L(3), L(4))), fx: 0.2, alpha: a3 });
  const a4 = ramp(t, L(4) - 0.4, L(4) + 0.3);
  if (a4 > 0) shot(ctx, 'phobos', t - L(4), { zoom: 1.12, fy: lerp(0.4, -0.4, prog(t, L(4), s.end + 1)), alpha: a4 });
};

// ---------- 五、合日 ----------
function blackout(ctx, t, a, alpha, day) {
  screen(ctx, t, alpha, () => {
    const r = mulberry32(Math.floor(t * 24));
    ctx.save(); ctx.globalAlpha *= 0.25;
    for (let i = 0; i < 900; i++) { ctx.fillStyle = r() < 0.5 ? '#3a4650' : '#1b2228'; ctx.fillRect(r() * W, BAR + r() * (H - 2 * BAR), 3, 2); }
    ctx.restore();
    const blink = 0.55 + 0.45 * Math.sign(Math.sin(t * 4));
    label(ctx, '与地球的连接', W / 2, H / 2 - 110, { size: 30, color: 'rgba(255,255,255,0.5)', align: 'center' });
    text(ctx, '信号中断', W / 2, H / 2 + 10, { size: 110, family: 'Head', weight: 900, color: RED, alpha: blink, spacing: 20 });
    label(ctx, `太阳位于地球与火星之间　·　中断第 ${day} 天　·　预计恢复：${14 - day} 天后`, W / 2, H / 2 + 100, { size: 26, color: AMBER_DIM, align: 'center' });
  });
}

// 合日断联期间（2034-08-12 起约两周）积压的消息，按发出日期排序；最早的一条是女儿生日那天录的
const QUEUE = [
  ['08-13', '女儿', '视频　0:38'], ['08-13', '地球指挥中心', '日常通报'], ['08-15', '地球指挥中心', '轨道数据'],
  ['08-16', '新闻摘要', '文字'], ['08-18', '女儿', '视频　1:12'], ['08-20', '地球指挥中心', '日常通报'],
  ['08-21', '妻子', '语音　2:05'], ['08-23', '女儿', '视频　0:51'], ['08-25', '地球指挥中心', '恢复通信测试'],
];
function inbox(ctx, t, a, alpha) {
  screen(ctx, t, alpha, () => {
    label(ctx, '连接已恢复　·　正在接收积压的消息', 300, BAR + 90, { size: 28, color: ICE });
    QUEUE.forEach(([d, who, what], i) => {
      const k = ramp(t, a + 0.18 * i, a + 0.18 * i + 0.3);
      const y = BAR + 160 + i * 56;
      const hi = i === 0 ? 1 : 0;
      label(ctx, `2034-${d}`, 300, y, { size: 26, color: hi ? '#fff' : AMBER_DIM, alpha: k });
      label(ctx, who, 560, y, { size: 26, color: hi ? '#fff' : '#d8dde6', alpha: k });
      label(ctx, what, 900, y, { size: 26, color: hi ? '#fff' : 'rgba(216,221,230,0.6)', alpha: k });
      if (hi) { ctx.save(); ctx.globalAlpha = alpha * k * 0.12; ctx.fillStyle = '#fff'; ctx.fillRect(280, y - 36, 1360, 50); ctx.restore(); }
    });
  });
}

XF.conjunction = 1.2;
SCENES.conjunction = (ctx, t, s) => {
  const L = i => lineAt('conjunction', i);
  blackout(ctx, t, s.start, 1 - ramp(t, L(1) - 0.5, L(1) + 0.3), 1);
  const a1 = ramp(t, L(1) - 0.5, L(1) + 0.3) * (1 - ramp(t, L(3) - 0.4, L(3) + 0.3));
  if (a1 > 0) shot(ctx, 'rock', t - L(1), { zoom: lerp(1.0, 1.25, prog(t, L(1), L(3))), alpha: a1 });
  const a2 = ramp(t, L(3) - 0.4, L(3) + 0.3) * (1 - ramp(t, L(4) - 0.4, L(4) + 0.3));
  if (a2 > 0) shot(ctx, 'phobos', 0, { zoom: lerp(1.3, 1.4, prog(t, L(3), L(4))), fy: 0.6, alpha: a2 });
  blackout(ctx, t, L(4), ramp(t, L(4) - 0.4, L(4) + 0.3) * (1 - ramp(t, L(5) - 0.4, L(5) + 0.3)), 5);
  inbox(ctx, t, cue('conjunction', '一起涌'), ramp(t, L(5) - 0.4, L(5) + 0.3) * (1 - ramp(t, L(6) - 0.4, L(6) + 0.3)));
  videoMsg(ctx, 'daughter8', t - L(6), { alpha: ramp(t, L(6) - 0.4, L(6) + 0.3), info: '发出于 2034-08-13' });
};

// ---------- 六、晚星 ----------
// 暮色里的地球：淡蓝色的点，轻轻闪烁。EARTH_AT 是它在 dusk 图上的相对位置，选在西方天空的空处
const EARTH_AT = { u: 0.27, v: 0.3 };
function earthStar(ctx, alpha, view) {
  if (alpha <= 0) return;
  const { x, y, scale } = coverPoint('dusk', EARTH_AT.u, EARTH_AT.v, view);
  const r = 22 * Math.sqrt(scale);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(235,245,255,1)'); g.addColorStop(0.15, 'rgba(170,205,255,0.9)'); g.addColorStop(1, 'rgba(90,140,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}

XF.evening = 1.6;
SCENES.evening = (ctx, t, s) => {
  const L = i => lineAt('evening', i);
  const a0 = 1 - ramp(t, L(1) - 0.6, L(1) + 0.4);
  if (a0 > 0) shot(ctx, 'sunset', t - s.start, { zoom: 1.02 + 0.04 * prog(t, s.start, L(1)), alpha: a0 });
  const a1 = ramp(t, L(1) - 0.6, L(1) + 0.4) * (1 - ramp(t, TITLE - 1.0, TITLE));
  if (a1 > 0) {
    const k = ramp(t, L(1), TITLE);
    const view = { zoom: lerp(1.0, 1.2, k), fx: -0.4 * k, fy: -0.4 * k };
    shot(ctx, 'dusk', t - L(1), { ...view, alpha: a1 });
    const tw = 0.85 + 0.15 * Math.sin(t * 7) * Math.sin(t * 3.1);
    earthStar(ctx, a1 * ramp(t, cue('evening', '亮起') - 0.2, cue('evening', '亮起') + 1.5) * tw, view);
  }
  const at = ramp(t, TITLE, TITLE + 1.5) * (1 - ramp(t, s.end - 1.5, s.end));
  text(ctx, '晚 星', W / 2, H / 2 + 40, { size: 150, family: 'Head', weight: 900, color: '#f2efe8', alpha: at, spacing: 40 });
};
