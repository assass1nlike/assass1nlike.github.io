// 时间轴：按小节划分段落，每段指定镜头（场景、变体、配色）和后期参数。
// 依赖 music.js 的 signals / barT / BEAT。
const PAL = {
  ice:    [[0.55, 0.85, 1.0], [0.1, 0.35, 1.0], [0.9, 0.95, 1.0]],
  cyber:  [[0.0, 0.85, 1.0], [1.0, 0.1, 0.6], [0.35, 0.1, 1.0]],
  fire:   [[1.0, 0.35, 0.05], [1.0, 0.8, 0.25], [0.8, 0.04, 0.12]],
  acid:   [[0.45, 1.0, 0.1], [0.0, 0.9, 0.65], [1.0, 1.0, 0.3]],
  synth:  [[1.0, 0.15, 0.65], [1.0, 0.55, 0.1], [0.25, 0.08, 0.85]],
  blood:  [[1.0, 0.08, 0.15], [1.0, 0.95, 0.95], [0.35, 0.0, 0.05]],
  violet: [[0.6, 0.2, 1.0], [0.1, 0.9, 1.0], [1.0, 0.3, 0.9]],
  gold:   [[1.0, 0.7, 0.25], [1.0, 1.0, 0.9], [0.6, 0.25, 0.05]],
};

// 场景各自的前进速度比例（全局累计距离 × 比例）
const SCENE_SPEED = { warp: 1, tunnel: 9, fractal: 1.6, kaleido: .35, cubes: 6, core: .5, liquid: .25, grid: 7 };

// b：[起始小节, 结束小节)。数值参数可写 [起, 止] 表示段内线性变化。
// cut：蒙太奇每个镜头的拍数，镜头在 shots 里循环。
const PARTS = [
  { b: [0, 4], shots: [['warp', 1, 'ice']], int: [.1, .55], speed: [.12, 2.4], rise: [0, 1], trail: .4, punch: .01, fadeIn: 2.4 },
  { b: [4, 8], shots: [['tunnel', 0, 'cyber'], ['tunnel', 1, 'violet']], cut: 8, int: .55, speed: 1.1, trail: .45, flash: 1.2, punch: .03, shake: .4 },
  { b: [8, 12], shots: [['fractal', 0, 'cyber'], ['fractal', 1, 'fire']], cut: 8, int: .8, speed: 1.5, trail: .4, flash: 1, punch: .045, shake: .7, glitch: .5 },
  { b: [12, 16], shots: [['kaleido', 0, 'violet'], ['kaleido', 1, 'cyber'], ['kaleido', 2, 'gold'], ['kaleido', 3, 'synth']], cut: 4, int: .8, speed: 1.4, trail: .55, flash: .8, cutFlash: .35, punch: .05, shake: .4, glitch: .4 },
  { b: [16, 20], shots: [['cubes', 0, 'cyber'], ['cubes', 1, 'acid']], cut: 8, int: .9, speed: 1.9, trail: .35, flash: 1.2, punch: .06, shake: 1, glitch: .6 },
  { b: [20, 21], shots: [['core', 0, 'blood']], int: .5, speed: .6, stutter: .5, trail: .2, flash: .6, glitch: 1, scan: .6, punch: .02, rise: [0, .8] },
  { b: [21, 24], shots: [['cubes', 2, 'fire'], ['tunnel', 2, 'blood'], ['cubes', 3, 'cyber']], cut: 4, int: 1, speed: 2.1, trail: .3, flash: 1.4, cutFlash: .5, punch: .07, shake: 1.2, glitch: .8 },
  { b: [24, 28], shots: [['liquid', 0, 'violet'], ['liquid', 1, 'acid']], cut: 8, int: .65, speed: 1, trail: .5, flash: .8, punch: .04, shake: .4, glitch: .7 },
  { b: [28, 31], shots: [['grid', 0, 'synth']], int: [.55, .85], speed: [1.2, 3.2], rise: [0, .7], trail: .35, flash: .8, punch: .04, shake: .5 },
  { b: [31, 32], shots: [['grid', 1, 'synth'], ['tunnel', 0, 'synth']], cut: 2, int: .9, speed: [3.2, 4], rise: [.7, .9], trail: .3, cutFlash: .6, punch: .06, shake: 1, glitch: .6 },
  { b: [32, 33], shots: [['core', 1, 'ice']], int: [.4, 1], speed: [.4, 2], rise: [.3, 1], trail: .6, implode: 1, punch: .02, glitch: .4, whiteout: 1 },
  { b: [33, 36], shots: [['fractal', 2, 'fire'], ['fractal', 3, 'blood'], ['fractal', 4, 'gold']], cut: 4, int: 1, speed: 2.2, trail: .3, flash: 2, cutFlash: .7, punch: .09, shake: 1.6, glitch: .9 },
  { b: [36, 37], shots: [['core', 2, 'violet']], int: .7, speed: .8, stutter: .25, trail: .2, flash: 1, glitch: 1, scan: .5, invert8: 1, punch: .03 },
  { b: [37, 40], shots: [['fractal', 5, 'cyber'], ['cubes', 4, 'blood'], ['tunnel', 3, 'fire'], ['kaleido', 4, 'acid'], ['cubes', 5, 'violet'], ['fractal', 6, 'synth']], cut: 2, int: 1, speed: 2.4, trail: .25, flash: 2, cutFlash: .6, punch: .09, shake: 1.6, glitch: 1 },
  { b: [40, 42], shots: [['warp', 1, 'violet']], int: .35, speed: .7, trail: .8, enter: [0, 2], punch: .015 },
  { b: [42, 44], shots: [['kaleido', 5, 'ice']], int: .45, speed: .6, trail: .85, enter: [0, 2], punch: .02 },
  { b: [44, 47], shots: [['tunnel', 4, 'ice'], ['tunnel', 5, 'cyber']], cut: 6, int: [.55, .85], speed: [1, 3], rise: [0, .7], trail: .35, flash: 1, punch: .04, shake: .6, glitch: .4 },
  { b: [47, 48], shots: [['tunnel', 1, 'gold'], ['grid', 2, 'fire']], cut: 1, int: .9, speed: [3, 4], rise: [.7, 1], trail: .3, cutFlash: .4, punch: .05, shake: .8, glitch: .6, radial: .6 },
  { b: [48, 52], shots: [['grid', 3, 'synth'], ['grid', 4, 'cyber']], cut: 8, int: 1, speed: 3, trail: .3, flash: 2, punch: .08, shake: 1.3, glitch: .8 },
  { b: [52, 56], shots: [['cubes', 6, 'gold'], ['kaleido', 6, 'fire'], ['cubes', 7, 'ice'], ['kaleido', 7, 'violet']], cut: 4, int: 1, speed: 2.2, trail: .35, flash: 1.4, cutFlash: .5, punch: .08, shake: 1.2, glitch: .8 },
  { b: [56, 58], shots: [['liquid', 2, 'gold']], int: .7, speed: 1.2, trail: .5, flash: .8, punch: .04, shake: .5, glitch: .6 },
  { b: [58, 60], shots: [['core', 3, 'cyber']], int: [.6, 1], speed: [.8, 2.5], rise: [0, 1], trail: .5, implode: .5, punch: .05, shake: .6, glitch: .5, whiteout: .5 },
  { b: [60, 64], shots: [['fractal', 7, 'cyber'], ['tunnel', 6, 'synth'], ['cubes', 8, 'fire'], ['kaleido', 8, 'acid'], ['grid', 5, 'violet'], ['liquid', 3, 'blood'], ['fractal', 8, 'gold'], ['cubes', 9, 'ice']], cut: 2, int: 1, speed: 2.6, trail: .25, flash: 2.2, cutFlash: .6, punch: .1, shake: 1.8, glitch: 1 },
  { b: [64, 68], shots: [['tunnel', 7, 'fire'], ['fractal', 9, 'blood'], ['kaleido', 9, 'cyber'], ['cubes', 10, 'synth'], ['grid', 6, 'acid'], ['core', 4, 'gold'], ['fractal', 10, 'violet'], ['tunnel', 8, 'ice']], cut: 1, int: 1, speed: 3, trail: .25, flash: 1.5, cutFlash: .7, punch: .11, shake: 2, glitch: 1, invert8: .35 },
  { b: [68, 72], shots: [['warp', 0, 'ice']], int: [.8, .25], speed: [3, .3], trail: .8, flash: 2, punch: [.04, .01], enter: [0, 0], fadeOut: [176.2, 180] },
];

const ramp = (v, f) => Array.isArray(v) ? v[0] + (v[1] - v[0]) * f : v;

// 展开成镜头列表
const SHOTS = [];
for (const P of PARTS) {
  const t0 = barT(P.b[0]), t1 = barT(P.b[1]);
  const len = P.cut ? P.cut * BEAT : t1 - t0;
  for (let k = 0, s = t0; s < t1 - 1e-6; k++, s += len) {
    const [scene, v, pal] = P.shots[k % P.shots.length];
    SHOTS.push({ scene, var: v, pal: PAL[pal], t0: s, t1: Math.min(t1, s + len), part: P, first: k === 0 });
  }
}
SHOTS[SHOTS.length - 1].t1 = 1e9;
const DURATION = 180;

const partF = (P, t) => Math.max(0, Math.min(1, (t - barT(P.b[0])) / (barT(P.b[1]) - barT(P.b[0]))));
const shotAt = t => { let i = SHOTS.findIndex(s => t < s.t1); return i < 0 ? SHOTS.length - 1 : i; };

// 累计距离：速度 = 段落基础速度 ×（1 + 每拍冲击 + 低频起音），按 240 Hz 积分
const DHZ = 240;
const DIST = new Float32Array(DURATION * DHZ + 2), SPEED = new Float32Array(DURATION * DHZ + 2);
{
  let d = 0;
  for (let i = 0; i < DIST.length; i++) {
    const t = i / DHZ, sh = SHOTS[shotAt(t)], P = sh.part, s = signals(t);
    const v = ramp(P.speed, partF(P, t)) * (1 + .9 * s.pulse * ramp(P.int, partF(P, t)) + .6 * s.kick);
    SPEED[i] = v; DIST[i] = d; d += v / DHZ;
  }
}
const sampleArr = (a, t) => { const x = Math.max(0, Math.min(a.length - 1.001, t * DHZ)), i = Math.floor(x), f = x - i; return a[i] * (1 - f) + a[i + 1] * f; };

function sceneUniforms(shot, t) {
  const P = shot.part;
  // 定格：镜头内时间按拍的分数量化，画面在每个量化格内重复
  let ts = t;
  if (P.stutter) { const q = P.stutter * BEAT; ts = shot.t0 + Math.floor((t - shot.t0) / q) * q; }
  const s = signals(ts), f = partF(P, ts);
  const sp = SCENE_SPEED[shot.scene];
  return {
    uT: ts, uBeat: s.beat, uDist: sampleArr(DIST, ts) * sp + shot.var * 37.1, uSpeed: sampleArr(SPEED, ts),
    uPulse: s.pulse, uPulse8: s.pulse8, uKick: s.kick, uSnare: s.snare, uHat: s.hat,
    uSub: s.sub, uBass: s.bass, uLow: s.low, uMid: s.mid, uHigh: s.high, uRms: s.rms,
    uInt: ramp(P.int, f), uRise: P.rise ? ramp(P.rise, f) : 0, uVar: shot.var, uImplode: P.implode ? f * P.implode : 0,
    uC1: shot.pal[0], uC2: shot.pal[1], uC3: shot.pal[2],
  };
}

function frameState(t) {
  const i = shotAt(t);
  let shot = SHOTS[i], next = null, mix = 0, mixKind = 0;
  if (window.FORCE) shot = Object.assign({}, shot, { scene: FORCE[0], var: FORCE[1], pal: PAL[FORCE[2]] });
  const P = shot.part, f = partF(P, t), s = signals(t);
  if (P.enter && shot.first && i > 0) {
    const d = P.enter[1] * BEAT;
    if (d > 0 && t - shot.t0 < d) { next = shot; shot = SHOTS[i - 1]; mix = (t - next.t0) / d; mixKind = P.enter[0]; }
  }
  const int = ramp(P.int, f), since = t - SHOTS[i].t0;
  const flash = Math.min(1, (SHOTS[i].first ? (P.flash || 0) : (P.cutFlash || 0)) * Math.exp(-since / .06));
  const shake = (P.shake || 0) * (s.kick * .6 + s.pulse * .4) * int;
  const ang = Math.floor(t * 60) * 1.7;
  const rise = P.rise ? ramp(P.rise, f) : 0;
  // whiteout：段落最后若干拍逐渐变白（单位：拍）
  const wLeft = (barT(P.b[1]) - t) / BEAT;
  const white = P.whiteout ? Math.pow(Math.max(0, 1 - wLeft / P.whiteout), 2) * .9 : 0;
  let fade = 1;
  if (P.fadeIn) fade = Math.min(1, Math.pow(t / P.fadeIn, 1.5));
  if (P.fadeOut) fade = Math.max(0, Math.min(1, (P.fadeOut[1] - t) / (P.fadeOut[1] - P.fadeOut[0])));
  const inv8 = P.invert8 ? (Math.floor(s.beat * 2) % 2 === 1 && s.pulse8 > .5 ? P.invert8 : 0) : 0;
  return {
    shot, next, mix, mixKind,
    post: { trail: P.trail ?? .3, trailZoom: 1 + .012 + .02 * s.pulse * int + .03 * rise, trailRot: .004 * Math.sin(t * .3), bloomThr: .7 },
    postU: {
      uZoom: 1 + ramp(P.punch || 0, f) * s.pulse + .03 * s.kick * int + (P.implode ? -.0 : 0),
      uShake: [Math.sin(ang) * shake * .012, Math.cos(ang * 1.3) * shake * .008],
      uRoll: (P.shake || 0) * s.kick * int * .02 * Math.sin(ang * .7),
      uAberr: .0015 + .006 * s.pulse * int + .012 * s.kick * int + .01 * rise + .02 * flash,
      uGlitch: Math.min(1, (P.glitch || 0) * (s.snare * 1.2 + (P.stutter ? .5 : 0)) * (.3 + int)),
      uGlitchSeed: Math.floor(t * 30) % 97,
      uFlash: Math.min(1.5, flash + white), uFlashCol: [1, 1, 1],
      uInvert: inv8,
      uFade: fade,
      uBloomAmt: .45 + .3 * int + .3 * s.pulse * int,
      uExposure: 1 + .15 * s.pulse * int,
      uGrain: .015, uVignette: .55,
      uRadial: Math.min(1, (P.radial || 0) * s.pulse + rise * .5 + s.kick * int * .25),
      uSat: 1.15, uScan: P.scan || 0,
    },
  };
}
