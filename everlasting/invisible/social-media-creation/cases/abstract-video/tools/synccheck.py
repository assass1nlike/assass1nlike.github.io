"""检查画面与音乐的同步：逐帧画面变化量（亮度 + 帧差）与低频起音包络做互相关，报告峰值延迟。
用法：python tools/synccheck.py 视频 音乐起点秒
"""
import subprocess
import sys

import imageio_ffmpeg
import librosa
import numpy as np

vid, start = sys.argv[1], float(sys.argv[2])
ff = imageio_ffmpeg.get_ffmpeg_exe()
raw = subprocess.run([ff, "-v", "error", "-i", vid, "-vf", "scale=96:54,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 54, 96).astype(np.float32)
luma = fr.mean((1, 2))
motion = np.r_[0, np.abs(np.diff(fr, axis=0)).mean((1, 2))]
y, sr = librosa.load("build/music.wav", sr=22050, offset=start, duration=len(fr) / 60)
S = np.abs(librosa.stft(y, n_fft=1024, hop_length=int(sr / 60)))
f = librosa.fft_frequencies(sr=sr, n_fft=1024)
low = librosa.onset.onset_strength(S=librosa.amplitude_to_db(S[f < 150]), sr=sr)
n = min(len(low), len(luma))
def xc(a, b):
    a = (a[:n] - a[:n].mean()) / a[:n].std(); b = (b[:n] - b[:n].mean()) / b[:n].std()
    lags = range(-12, 13)
    c = [np.mean(a[max(0, -L):n - max(0, L)] * b[max(0, L):n - max(0, -L)]) for L in lags]
    i = int(np.argmax(c)); return list(lags)[i], c[i], c[12]
dl = np.r_[0, np.diff(luma)].clip(0)
for name, v in [("luma rise", dl), ("frame diff", motion)]:
    L, c, c0 = xc(low, v)
    print(f"{name:10s}: best lag {L:+d} frames ({L/60*1000:+.0f} ms), corr {c:.3f}, corr@0 {c0:.3f}")
