"""分析配乐，输出 build/music.json：节拍网格、小节、各鼓件起音、逐帧频段包络。
用法：python tools/analyze.py build/music.wav [fps]
"""
import json
import sys

import librosa
import numpy as np

src = sys.argv[1]
FPS = int(sys.argv[2]) if len(sys.argv) > 2 else 60
SR, HOP = 44100, 441  # 100 Hz 分析帧
y, _ = librosa.load(src, sr=SR, mono=True)
dur = len(y) / SR
S = np.abs(librosa.stft(y, n_fft=4096, hop_length=HOP))
freqs = librosa.fft_frequencies(sr=SR, n_fft=4096)
t_an = librosa.frames_to_time(np.arange(S.shape[1]), sr=SR, hop_length=HOP)

# 节拍：电子乐速度恒定，直接搜索使起音强度在网格点上总和最大的周期和相位
on_all = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
_, beats = librosa.beat.beat_track(y=y, sr=SR, hop_length=HOP, units="time")
p0 = float(np.median(np.diff(beats)))
best = (-1, p0, 0.0)
for period in np.arange(p0 - 0.008, p0 + 0.008, 0.00002):
    g = np.arange(0, dur - period, period)
    for ph in np.arange(0, period, 0.002):
        sc = np.interp(g + ph, t_an, on_all).sum()
        if sc > best[0]:
            best = (sc, period, ph)
_, period, first = best
grid = np.arange(first, dur, period)

def band_env(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return np.sqrt((S[m] ** 2).sum(0))


def onset_env(lo, hi):
    db = librosa.amplitude_to_db(S[(freqs >= lo) & (freqs < hi)], ref=np.max)
    return np.maximum(0, np.diff(db, axis=1, prepend=db[:, :1])).mean(0)


# 底鼓的拍位当作每小节第一拍
kick_on = onset_env(30, 120)
strength = np.interp(grid, t_an, kick_on)
down = int(np.argmax([strength[i::4].mean() for i in range(4)]))
bars = grid[down::4]


def hits(lo, hi, delta, wait):
    env = onset_env(lo, hi)
    env = env / (np.percentile(env, 99.5) + 1e-9)
    idx = librosa.util.peak_pick(env, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=delta, wait=wait)
    return [[round(float(t_an[i]), 3), round(float(min(env[i], 1.5)), 3)] for i in idx]


bands = {"sub": (25, 90), "bass": (90, 250), "lowmid": (250, 1500), "mid": (1500, 5000), "high": (5000, 16000)}
t_v = np.arange(int(dur * FPS)) / FPS
env_out = {}
for name, (lo, hi) in bands.items():
    e = band_env(lo, hi)
    e = np.interp(t_v, t_an, e)
    e = e / (np.percentile(e, 99) + 1e-9)
    env_out[name] = [round(float(min(v, 1.2)), 3) for v in e]
rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0]
rms = np.interp(t_v, t_an, rms)
env_out["rms"] = [round(float(v), 3) for v in rms / np.percentile(rms, 99)]

out = {
    "duration": dur, "fps": FPS, "bpm": 60 / period, "beat": period,
    "grid0": float(first), "downbeat_phase": down, "bar0": float(bars[0]),
    "kick": hits(30, 120, 0.25, 8),
    "snare": hits(1500, 6000, 0.3, 8),
    "hat": hits(8000, 16000, 0.25, 4),
    "env": env_out,
}
json.dump(out, open("build/music.json", "w"))
print(f"bpm {out['bpm']:.3f} beat {period:.4f}s grid0 {first:.3f} downbeat phase {down} bar0 {bars[0]:.3f} "
      "")
print(f"kicks {len(out['kick'])} snares {len(out['snare'])} hats {len(out['hat'])}")

# 逐小节特征表：用来人工划分段落
kt = np.array([h[0] for h in out["kick"]]); st = np.array([h[0] for h in out["snare"]]); ht = np.array([h[0] for h in out["hat"]])
E = {n: np.array(v) for n, v in env_out.items()}
print(" bar   time   sub  bass lowmd  mid  high   rms  #k #s #h")
for i, b in enumerate(bars):
    e = b + 4 * period
    m = (t_v >= b) & (t_v < e)
    if not m.any():
        break
    row = " ".join(f"{E[n][m].mean():5.2f}" for n in ["sub", "bass", "lowmid", "mid", "high", "rms"])
    cnt = [int(((a >= b) & (a < e)).sum()) for a in (kt, st, ht)]
    print(f"{i:4d} {b:6.2f} {row} {cnt[0]:2d} {cnt[1]:2d} {cnt[2]:2d}")
