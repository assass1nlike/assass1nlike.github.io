"""声音 + 画面 → 成片 out/<视频目录名>.mp4。

用法：python pipeline/mux.py <视频目录>
读 build/narration.wav、build/silent.mp4、build/sfx.json。配乐和音效都在这里用代码合成：
配乐是缓慢变化的合成器铺底（D 小调，Dm–B♭–F–C 循环），强弱取 script.json 里每个场景的 "music"（0~1，默认 0.5）；
旁白说话时自动压低。音效种类见 sfx_sound。
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from scipy.signal import lfilter

SR = 48000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(0)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lowpass(x, cutoff):
    """一阶低通。cutoff 可以是随时间变化的数组，此时按 512 个采样一段分块滤波。"""
    if np.isscalar(cutoff):
        a = np.exp(-2 * np.pi * cutoff / SR)
        return lfilter([1 - a], [1, -a], x)
    y, zi = np.empty_like(x), np.zeros(1)
    for i in range(0, len(x), 512):
        a = np.exp(-2 * np.pi * cutoff[i] / SR)
        y[i:i + 512], zi = lfilter([1 - a], [1, -a], x[i:i + 512], zi=zi)
    return y


def tone(freq, n, partials=((1, 1), (2, 0.35), (3, 0.15), (4, 0.06)), detune=0.0):
    t = np.arange(n) / SR
    y = np.zeros(n)
    for d in (-detune, 0, detune) if detune else (0,):
        f = freq * (1 + d)
        y += sum(a * np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) for k, a in partials)
    return y


def place(buf, start, y, gain=1.0):
    i = int(start * SR)
    if i >= len(buf) or i + len(y) <= 0:
        return
    if i < 0:
        y, i = y[-i:], 0
    m = min(len(y), len(buf) - i)
    buf[i:i + m] += gain * y[:m]


def adsr(n, a, r):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 2
    e[n - nr:] *= np.linspace(1, 0, nr) ** 2
    return e


# ---------- 配乐 ----------
CHORDS = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]]  # Dm B♭ F C


def score(total, level):
    """level(t) → 0~1，控制每个和弦的音量和亮度。"""
    out = np.zeros(int(total * SR) + 1)
    bar = 8.0
    for b in range(int(total / bar) + 1):
        t0 = b * bar
        ch = CHORDS[b % 4]
        lv = level(t0 + bar / 2)
        n = int((bar + 4) * SR)
        env = adsr(n, 3.0, 4.0)
        pad = sum(tone(midi(m), n, detune=0.003) for m in ch)
        pad = lowpass(pad, 400 + 1400 * lv)
        place(out, t0, pad * env * (0.010 + 0.022 * lv))
        sub = tone(midi(ch[0] - 12), n, ((1, 1), (2, 0.2)))
        place(out, t0, sub * env * (0.020 + 0.03 * lv))
        # 高处偶尔一个稀疏的音，像远处的信号
        if lv > 0.3 and b % 2 == 0:
            m = int(1.2 * SR)
            y = tone(midi(ch[2] + 24), m, ((1, 1), (2, 0.1))) * np.exp(-np.arange(m) / SR / 0.6)
            place(out, t0 + 2.0, y * 0.012 * lv)
    fade = np.ones_like(out)
    nf = int(3 * SR)
    fade[:nf] = np.linspace(0, 1, nf)
    fade[-nf:] = np.linspace(1, 0, nf)
    return out * fade


# ---------- 音效 ----------
def sfx_sound(kind):
    if kind == "blip":          # 射电信号的嘟声，按素数分组
        out = np.zeros(int(4 * SR))
        t = 0.0
        for p in (2, 3, 5):
            for _ in range(p):
                m = int(0.07 * SR)
                place(out, t, tone(1320, m, ((1, 1),)) * adsr(m, 0.005, 0.03))
                t += 0.14
            t += 0.35
        return out * 0.4
    if kind == "ignite":        # 引擎点火：低频轰鸣渐强
        m = int(7 * SR)
        k = np.linspace(0, 1, m)
        y = lowpass(rng.normal(0, 1, m), 120 + 400 * k) * 3
        y += tone(38, m, ((1, 1), (2, 0.5))) * 0.6
        return y * np.minimum(1, k * 3) * np.linspace(1, 0.4, m)
    if kind == "beacon":        # 信标脉冲，越来越快
        out = np.zeros(int(40 * SR))
        t, gap = 0.0, 1.6
        while t < 38:
            m = int(0.25 * SR)
            y = tone(880, m, ((1, 1), (3, 0.2))) * np.exp(-np.arange(m) / SR / 0.08)
            place(out, t, y * 0.25)
            t += gap
            gap = max(0.25, gap * 0.94)
        return out
    if kind == "flyby":         # 交会：上扬的呼啸 + 一记低沉的冲击
        m = int(3.5 * SR)
        k = np.linspace(0, 1, m)
        rise = lowpass(rng.normal(0, 1, m), 200 + 6000 * k ** 3) * k ** 4
        y = rise * 2
        hit = int(0.25 * SR)
        n2 = m - hit
        boom = tone(45, n2, ((1, 1), (2, 0.3))) * np.exp(-np.arange(n2) / SR / 0.9)
        y[hit:] += boom * 0.9
        return y
    if kind == "decode":        # 解码：一串上行的亮音
        out = np.zeros(int(4 * SR))
        for i, m_ in enumerate([74, 77, 81, 84, 86, 89, 93, 96, 98]):
            m = int(1.0 * SR)
            place(out, i * 0.25, tone(midi(m_), m, ((1, 1), (2, 0.15))) * np.exp(-np.arange(m) / SR / 0.35) * 0.18)
        return out
    if kind == "swell":         # 情绪起势：D 大三和弦缓缓涨起
        m = int(7 * SR)
        y = sum(tone(midi(x), m, detune=0.002) for x in (50, 57, 62, 66, 69))
        return lowpass(y, 1500) * adsr(m, 4.0, 2.5) * 0.12
    if kind == "title":         # 片名：低音冲击 + 钟声
        m = int(6 * SR)
        y = tone(36.7, m, ((1, 1), (2, 0.4))) * np.exp(-np.arange(m) / SR / 1.8) * 0.8
        y += tone(midi(74), m, ((1, 1), (2.76, 0.3), (5.4, 0.1))) * np.exp(-np.arange(m) / SR / 2.2) * 0.25
        return y
    raise ValueError(kind)


def main(root):
    build = root / "build"
    tl = json.loads((build / "timeline.json").read_text(encoding="utf-8"))
    total = tl["duration"]
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(build / "narration.wav"), "-f", "s16le", "-ac", "1",
                          "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768
    n = int(total * SR) + 1
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]

    # 场景的配乐强弱
    script = json.loads((root / "script.json").read_text(encoding="utf-8"))
    LEVEL = {sc["id"]: sc.get("music", 0.5) for sc in script["scenes"]}
    scenes = tl["scenes"]

    def level(t):
        for s in scenes:
            if s["start"] <= t < s["end"]:
                return LEVEL.get(s["id"], 0.5)
        return 0.5

    # 说话时把配乐压到 45%
    mask = np.zeros(n)
    for sc in scenes:
        for line in sc["lines"]:
            mask[int(line["start"] * SR):int(line["end"] * SR)] = 1
    k = int(0.4 * SR)
    c = np.concatenate([[0], np.cumsum(mask)])
    mask = np.interp(np.arange(n), np.arange(n - k + 1) + k // 2, (c[k:] - c[:-k]) / k)
    music = score(total, level)[:n] * (1 - 0.55 * mask)

    fx = np.zeros(n)
    for ev in json.loads((build / "sfx.json").read_text(encoding="utf-8")):
        y = sfx_sound(ev["kind"])
        y = y / np.abs(y).max()
        if "dur" in ev:   # 截短并淡出
            y = y[:int(ev["dur"] * SR)].copy()
            nf = min(len(y), int(0.3 * SR))
            y[-nf:] *= np.linspace(1, 0, nf)
        place(fx, ev["t"], y, ev.get("gain", 0.5))

    mix = voice * 1.0 + music * 1.6 + fx * 0.5
    mix = mix / max(1.0, np.abs(mix).max() / 0.95)
    pcm = (mix * 32767).astype(np.int16)
    wav = build / "mix.wav"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-i", "-", str(wav)],
                   input=pcm.tobytes(), check=True)
    out_dir = root / "out"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"{root.name}.mp4"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(build / "silent.mp4"), "-i", str(wav),
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)],
                   check=True)
    print(out)


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
