// 画面主体：铬合金人形（跑、跳舞、飞、站）和飞船。这里算骨骼关节、主体位姿和相机，交给 subject.glsl。
// 依赖 music.js（BEAT、barT、signals）和 timeline.js（ramp、partF）。

// ---- 向量与旋转 ----
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vnorm = a => vmul(a, 1 / Math.hypot(a[0], a[1], a[2]));
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rotX = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
const rotY = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
const rotZ = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
const DOWN = [0, -1, 0];
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

// ---- 姿态 → 关节 ----
// 角度约定（弧度）：armF 手臂前举，armOut 侧举，elbow 屈肘；legF 抬腿向前，legOut 侧分，knee 屈膝；
// lean 上身前倾，twist 上身扭转，side 侧弯，head 低头（负数为仰头），bob 骨盆上下。人物面朝 +z，左手在 +x。
const POSE0 = { lean: 0, twist: 0, side: 0, head: 0, bob: 0,
  L: { armF: 0, armOut: .15, elbow: .2, legF: 0, legOut: .06, knee: .05 },
  R: { armF: 0, armOut: .15, elbow: .2, legF: 0, legOut: .06, knee: .05 } };

function skeleton(P) {
  const pel = [0, .98 + P.bob, 0];
  const torso = v => rotY(rotZ(rotX(v, P.lean), P.side), P.twist);
  const hipR = v => rotY(v, P.twist * .3);
  const J = new Array(16);
  J[0] = pel;
  J[1] = vadd(pel, torso([0, .42, 0]));
  J[2] = vadd(pel, torso([0, .58, 0]));
  J[3] = vadd(J[2], torso(rotX([0, .14, 0], P.head)));
  [['L', 1, 4, 10], ['R', -1, 7, 13]].forEach(([k, sg, ia, il]) => {
    const A = P[k];
    const sh = vadd(pel, torso([.19 * sg, .52, 0]));
    const up = torso(rotZ(rotX(DOWN, -A.armF), sg * A.armOut));
    const el = vadd(sh, vmul(up, .29));
    const fo = torso(rotZ(rotX(DOWN, -(A.armF + A.elbow)), sg * A.armOut));
    J[ia] = sh; J[ia + 1] = el; J[ia + 2] = vadd(el, vmul(fo, .27));
    const hip = vadd(pel, hipR([.1 * sg, -.03, 0]));
    const th = hipR(rotZ(rotX(DOWN, -A.legF), sg * A.legOut));
    const kn = vadd(hip, vmul(th, .45));
    const sn = hipR(rotZ(rotX(DOWN, -(A.legF - A.knee)), sg * A.legOut));
    J[il] = hip; J[il + 1] = kn; J[il + 2] = vadd(kn, vmul(sn, .45));
  });
  return J;
}

function lerpPose(a, b, f) {
  const o = {};
  for (const k of ['lean', 'twist', 'side', 'head', 'bob']) o[k] = a[k] + (b[k] - a[k]) * f;
  for (const s of ['L', 'R']) { o[s] = {}; for (const k in a[s]) o[s][k] = a[s][k] + (b[s][k] - a[s][k]) * f; }
  return o;
}
const pose = (o, L, R) => Object.assign({}, POSE0, o, { L: Object.assign({}, POSE0.L, L), R: Object.assign({}, POSE0.R, R || L) });
const mirror = P => Object.assign({}, P, { L: P.R, R: P.L, twist: -P.twist, side: -P.side });

// 冲刺：一拍一个步态周期，左右脚分别落在正拍和后半拍（八分音符）
function runPose(beat) {
  const ph = beat * 2 * Math.PI, c = Math.cos(ph), s = Math.sin(ph);
  const leg = (cc, ss) => ({ legF: .85 * cc, knee: .25 + 1.4 * Math.max(0, -ss), legOut: .04 });
  const arm = cc => ({ armF: -.8 * cc, elbow: 1.5, armOut: .12 });
  return Object.assign(pose({ lean: .32, twist: .18 * c, head: -.25, bob: .05 * (1 - Math.abs(c)) - .03 }),
    { L: Object.assign(leg(c, s), arm(-c)), R: Object.assign(leg(-c, -s), arm(c)) });
}

// 舞蹈定格动作库
const DANCE = [
  pose({ head: -.3 }, { armF: .3, armOut: 2.5, elbow: .2, legOut: .28, knee: .25 }),
  pose({ lean: -.1, twist: .4 }, { armF: 1.6, armOut: .1, elbow: 0, legF: .35, knee: .6 }, { armF: .2, armOut: 1.4, elbow: 1.7, legF: -.1, knee: .2, legOut: .2 }),
  pose({ lean: .55, bob: -.35, head: -.4 }, { armF: 1.2, armOut: .35, elbow: 1.6, legF: 1., knee: 1.9, legOut: .3 }),
  pose({ twist: -.3 }, { armF: -.5, armOut: .3, elbow: .4, legF: .95, knee: 1.1 }, { armF: 2.9, armOut: .1, elbow: .1, legF: -.6, knee: .2 }),
  pose({ twist: .6, head: .2 }, { armF: 1.4, armOut: -.5, elbow: 1.9, legOut: .15, knee: .35 }),
  pose({ lean: -.25, side: .15 }, { armF: .1, armOut: 1.5, elbow: .1, legF: 1.5, knee: 0, legOut: .1 }, { armF: .1, armOut: 1.5, elbow: .1, knee: .35 }),
  pose({ twist: .9, side: .2 }, { armF: 0, armOut: 1.57, elbow: 0, legOut: .3, knee: .2 }),
  pose({ lean: .75, head: .6, bob: -.08 }, { armF: .4, armOut: .3, elbow: .5, legF: .3, knee: .6, legOut: .2 }),
  pose({ bob: .22, head: -.3 }, { armF: .2, armOut: 2.1, elbow: .1, legOut: .5, knee: .1 }),
  pose({ side: -.3 }, { armF: .3, armOut: .3, elbow: .9, legF: .55, knee: .7 }, { armF: 3.05, armOut: .2, elbow: .05, legOut: .15, knee: .1 }),
  pose({ lean: .2, twist: -.5, bob: -.15 }, { armF: 1.9, armOut: .6, elbow: 1.2, legF: .6, knee: 1.1, legOut: .35 }, { armF: -.6, armOut: .5, elbow: .3, legF: -.3, knee: .4, legOut: .3 }),
];
const danceAt = k => { const p = DANCE[Math.floor(h1(k * 7.31) * DANCE.length)]; return h1(k * 3.7) > .5 ? mirror(p) : p; };
function h1(x) { x = Math.sin(x * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

// 每 every 拍换一个动作：拍点后 0.07 s 内快速到位，之后随八分音符轻微律动
function dancePose(beat, every, s) {
  const k = Math.floor(beat / every), f = (beat / every - k) * every * BEAT;
  const P = lerpPose(danceAt(k - 1), danceAt(k), ease(f / .07));
  P.bob += -.05 * s.pulse8 - .04 * s.pulse;
  P.head += .15 * s.pulse;
  return P;
}

function flyPose(t) {
  return pose({ head: -1.1, lean: .05 * Math.sin(t * 1.3) },
    { armF: 2.95, armOut: .22, elbow: .1, legF: -.08 + .05 * Math.sin(t * 2.1), knee: .18, legOut: .06 },
    { armF: 2.85, armOut: .26, elbow: .15, legF: -.05 - .05 * Math.sin(t * 2.1), knee: .12, legOut: .06 });
}

function standPose(open, s) {
  return pose({ head: -.45 - .3 * open, bob: -.02 * s.pulse }, { armF: .25 + .3 * open, armOut: .25 + 1.9 * open, elbow: .4 * (1 - open), legOut: .14, knee: .08 });
}

// ---- 主体位姿与相机 ----
function basis(yaw, pitch, roll) {
  const f = v => rotY(rotX(rotZ(v, roll), pitch), yaw);
  return [f([1, 0, 0]), f([0, 1, 0]), f([0, 0, 1])];
}
function lookAt(pos, target) {
  const z = vnorm(vsub(target, pos)), x = vnorm(vcross([0, 1, 0], z)), y = vcross(z, x);
  return [x, y, z];
}

// 每个场景默认的主体
const SUBJECT_OF = { tunnel: 'ship', fractal: 'ship', cubes: 'ship', grid: v => v % 2 ? 'ship' : 'run', warp: 'fly', kaleido: 'dance', liquid: 'dance', core: 'stand' };

function subjectUniforms(shot, t, s, su) {
  const P = shot.part;
  let kind = P.sub === false ? null : SUBJECT_OF[shot.scene];
  if (typeof kind === 'function') kind = kind(shot.var);
  if (!kind) return null;
  const f = partF(P, t), int = ramp(P.int, f), v = shot.var;
  const u = { uType: kind === 'ship' ? 2 : 1, uCamPos: [0, 0, 0], uCam: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], uFocal: 1, uRoll: 0, uUvOff: [0, 0],
    uScale: 1, uGround: 0, uBoost: 0, uRim: 1, uEnv: .7 };
  let J = null, pos, B;
  if (kind === 'ship') {
    const w = t * .8 + v * 1.7;
    // 每 4 小节的第一拍在高强度段做一次桶滚（2 拍）
    const bar = Math.floor(s.bar), bs = barT(bar);
    const barrel = int > .85 && bar % 4 === 0 ? ease((t - bs) / (2 * BEAT)) * 2 * Math.PI * (bar % 8 ? 1 : -1) : 0;
    pos = [.55 * Math.sin(w), -.62 + .12 * Math.sin(t * 1.1 + v), 3.5 + .9 * s.kick - .3 * s.pulse];
    B = basis(-.22 * Math.cos(w), -.12 + .06 * Math.cos(t * 1.1 + v), -.55 * Math.cos(w) + barrel + .15 * s.kick * Math.sin(t * 30));
    u.uScale = .62; u.uEnv = 1; u.uRim = 1.5; u.uBoost = .5 + 1.2 * s.pulse + 1.5 * s.kick + 1 * su.uRise;
  } else if (kind === 'run') {
    // 与 grid 场景完全相同的相机，脚落在地面网格上
    const cx = Math.sin(su.uT * .3 + v) * .8, ch = .55 + .15 * Math.sin(su.uT * .7);
    u.uCamPos = [cx, ch, 0]; u.uFocal = 1.2 - .15 * s.pulse; u.uUvOff = [0, .06];
    u.uRoll = Math.sin(su.uT * .45 + v) * .12 + s.kick * .03 * Math.sin(su.uT * 40);
    pos = [cx * .35, 0, 2.3]; B = basis(.25 * Math.sin(t * .4), 0, 0);
    J = skeleton(runPose(s.beat)); u.uScale = .42; u.uGround = 1; u.uEnv = .8;
  } else if (kind === 'fly') {
    pos = [.55 + .08 * Math.sin(t * .5), -.3 + .05 * Math.sin(t * 1.7), 2.2 - .2 * s.pulse];
    B = basis(-.75 + .1 * Math.sin(t * .5), 1.35, .35 * Math.sin(t * .37) + .1 * s.kick);
    J = skeleton(flyPose(t)); u.uScale = .6; u.uRim = 2.5; u.uEnv = .45;
  } else if (kind === 'dance') {
    const every = int > .95 ? .5 : int > .7 ? 1 : 2;
    const a = .5 * Math.sin(t * .3 + v) + (shot.scene === 'liquid' ? .8 : 0);
    const camH = shot.scene === 'liquid' ? .35 : 1.05, d = 3.3 + .2 * Math.sin(t * .5);
    u.uCamPos = [Math.sin(a) * d, camH + .15 * Math.sin(t * .6), -Math.cos(a) * d];
    u.uCam = lookAt(u.uCamPos, [0, shot.scene === 'liquid' ? 1.05 : .9, 0]);
    u.uFocal = 1.15 - .12 * s.pulse;
    pos = [0, 0, 0]; B = basis(Math.PI, 0, 0);
    J = skeleton(dancePose(s.beat, every, s)); u.uGround = 1;
  } else if (kind === 'stand') {
    const open = clamp01(su.uRise * 1.2 + su.uImplode * .5 + (P.rise ? 0 : .3));
    pos = [0, -.82, 2.6]; B = basis(.15 * Math.sin(t * .3), 0, 0);
    J = skeleton(standPose(open, s)); u.uScale = .42; u.uRim = 2; u.uEnv = .2; u.uFocal = 1.4;
  }
  u.uPos = pos; u.uAx = B[0]; u.uAy = B[1]; u.uAz = B[2];
  u.uCamX = u.uCam[0]; u.uCamY = u.uCam[1]; u.uCamZ = u.uCam[2]; delete u.uCam;
  if (J) u.uJ = new Float32Array(J.flat());
  return u;
}
