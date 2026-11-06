"""分析固定配乐，输出 <曲名>.json：节拍、每拍所在小节的位置、段落边界、响度包络。
用法：python music/analyze.py music/qiannian.m4a
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import librosa
import numpy as np

SR = 22050
src = Path(sys.argv[1])
raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", str(src), "-f", "s16le", "-ac", "1",
                      "-ar", str(SR), "-"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.int16).astype(np.float32) / 32768

tempo, beats = librosa.beat.beat_track(y=y, sr=SR, units="time")
# 速度有细微漂移，直接用逐拍检测结果，只在开头往前补齐
period = float(np.median(np.diff(beats)))
head = np.arange(beats[0] - period, 0, -period)[::-1]
grid = np.concatenate([head, beats])

# 低频起音最强的相位当作每小节第一拍
env = librosa.onset.onset_strength(y=y, sr=SR, fmax=300)
t_env = librosa.times_like(env, sr=SR)
strength = np.interp(grid, t_env, env)
down = int(np.argmax([strength[k::4].mean() for k in range(4)]))

C = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=2048)
M = librosa.feature.mfcc(y=y, sr=SR, hop_length=2048, n_mfcc=13)
F = np.vstack([librosa.util.normalize(C, axis=0), M / (np.abs(M).max(1, keepdims=True) + 1e-9)])
sections = librosa.frames_to_time(librosa.segment.agglomerative(F, 10), sr=SR, hop_length=2048)
# 段落边界吸附到最近的小节线；响度骤增的“起势点”也算段落边界
bars = grid[down::4]
rms_s = librosa.feature.rms(y=y, hop_length=SR // 10)[0]
jumps = [i / 10 for i in range(5, len(rms_s)) if rms_s[i] > 2.5 * rms_s[i - 5:i].mean() and rms_s[i] > 0.5 * rms_s.max()]
cands = list(sections[1:]) + jumps
sections = sorted({float(bars[np.argmin(abs(bars - s))]) for s in cands})

rms = librosa.feature.rms(y=y, hop_length=SR // 10)[0]
out = {
    "file": src.name,
    "duration": len(y) / SR,
    "bpm": 60 / period,
    "beat": period,
    "beats": [round(float(b), 3) for b in grid],
    "downbeat_phase": down,
    "sections": [0.0] + [round(s, 3) for s in sections],
    "rms_hz": 10,
    "rms": [round(float(v / rms.max()), 3) for v in rms],
}
src.with_suffix(".json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(f"bpm {out['bpm']:.1f}, beat {period:.3f}s, first beat {grid[0]:.3f}, downbeat phase {down}")
print("bars:", " ".join(f"{b:.2f}" for b in bars[:12]), "...")
print("sections:", out["sections"])
