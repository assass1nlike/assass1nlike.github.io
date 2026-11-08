// 由 build/music.json 算出任意时刻的音乐信号。window.MUSIC 由驱动脚本注入。
const M = window.MUSIC;
const BEAT = M.beat;
const BAR0 = M.bar0;
const barT = i => BAR0 + i * 4 * BEAT;
const beatT = i => BAR0 + i * BEAT;
const beatPos = t => (t - BAR0) / BEAT;

// 频段包络：起音即时跟随，释放按指数衰减，避免画面随原始包络抖动
function smooth(arr, release) {
  const out = new Float32Array(arr.length), k = Math.exp(-1 / (M.fps * release));
  let y = 0;
  for (let i = 0; i < arr.length; i++) { const x = arr[i]; y = x > y ? y + 0.6 * (x - y) : y * k + x * (1 - k); out[i] = y; }
  return out;
}
const ENV = {};
for (const [name, arr] of Object.entries(M.env)) ENV[name] = smooth(arr, 0.18);
function env(name, t) {
  const a = ENV[name], x = Math.max(0, Math.min(a.length - 1.001, t * M.fps)), i = Math.floor(x), f = x - i;
  return a[i] * (1 - f) + a[i + 1] * f;
}

// 离散起音：在 t 之前最近几次起音的指数衰减包络（取最大）
function hitEnv(list, t, tau, thr) {
  let lo = 0, hi = list.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (list[m][0] <= t) lo = m + 1; else hi = m; }
  let v = 0;
  for (let i = lo - 1; i >= 0 && t - list[i][0] < tau * 6; i--) {
    const s = list[i][1]; if (s < thr) continue;
    v = Math.max(v, Math.min(1, (s - thr) / (1 - thr) + 0.25) * Math.exp(-(t - list[i][0]) / tau));
  }
  return v;
}

function signals(t) {
  const bp = beatPos(t), ph = bp - Math.floor(bp);
  const sub = env('sub', t), bass = env('bass', t);
  // 每拍的冲击：拍点后迅速衰减，强度看这一拍的低频量
  const lowAtBeat = Math.min(1, env('sub', beatT(Math.floor(bp)) + 0.06) * 1.3 + env('bass', beatT(Math.floor(bp)) + 0.06) * 0.6);
  const pulse = Math.exp(-ph * BEAT / 0.11) * (0.25 + 0.75 * lowAtBeat);
  const e8 = bp * 2 - Math.floor(bp * 2);
  return {
    t, beat: bp, bar: bp / 4, phase: ph, pulse,
    pulse8: Math.exp(-e8 * BEAT / 2 / 0.06),
    kick: hitEnv(M.kick, t, 0.13, 0.6),
    snare: hitEnv(M.snare, t, 0.09, 0.8),
    hat: hitEnv(M.hat, t, 0.05, 0.75),
    sub, bass, low: env('lowmid', t), mid: env('mid', t), high: env('high', t), rms: env('rms', t),
  };
}
