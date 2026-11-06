"""声音 + 画面 → 成片，输出 out/<name>.mp4。

用法：python pipeline/mux.py videos/<name>
旁白模式（timeline 里没有 music）：读 build/narration.wav 和 build/sfx.json，背景音乐和音效在这里用代码合成，
旁白说话时背景音乐自动压低。
配乐模式（beats.py 生成的 timeline）：直接用 music/ 下的曲子，从头截到结尾并淡出，不加别的声音。
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np

SR = 48000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(0)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def bell(freq, dur=1.2, decay=0.5, partials=((1, 1), (2.0, 0.3), (3.01, 0.12), (4.07, 0.05))):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = sum(a * np.sin(2 * np.pi * freq * k * t) * env_exp(n, decay / (1 + 0.6 * (k - 1))) for k, a in partials)
    att = np.minimum(1, np.arange(n) / (0.004 * SR))
    return y * att


def lowpass(x, cutoff):
    """一阶低通，cutoff 可以是随时间变化的数组。"""
    a = np.exp(-2 * np.pi * np.broadcast_to(cutoff, x.shape) / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


# ---------- 音效 ----------
PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91]  # F 大调五声音阶


def sfx_sound(ev):
    kind, n = ev["kind"], ev.get("n", 0)
    if kind == "pop":
        m = int(0.09 * SR)
        t = np.arange(m) / SR
        f = 620 * np.exp(-t * 9)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(m, 0.03)
        y[:200] += rng.normal(0, 0.25, 200) * np.linspace(1, 0, 200)
        return y * 0.8
    if kind == "ding":
        return bell(midi(PENTA[n % len(PENTA)] + 12 * (n // len(PENTA))), 1.2, 0.45) * 0.55
    if kind == "tap":
        m = int(0.12 * SR)
        t = np.arange(m) / SR
        y = np.sin(2 * np.pi * 210 * t) * env_exp(m, 0.035)
        y += lowpass(rng.normal(0, 1, m), 1800) * env_exp(m, 0.015) * 0.6
        return y * 0.7
    if kind == "tick":
        m = int(0.05 * SR)
        t = np.arange(m) / SR
        return np.sin(2 * np.pi * (1900 + 70 * (n % 12)) * t) * env_exp(m, 0.012) * 0.5
    if kind == "chime":
        out = np.zeros(int(1.8 * SR))
        for i, m in enumerate([77, 81, 84, 89]):
            b = bell(midi(m), 1.4, 0.6) * 0.45
            s = int(i * 0.075 * SR)
            out[s:s + len(b)] += b[:len(out) - s]
        return out
    if kind == "coin":
        out = np.zeros(int(0.7 * SR))
        a, b = bell(midi(95), 0.3, 0.06), bell(midi(100), 0.6, 0.25)
        out[:len(a)] += a
        s = int(0.07 * SR)
        out[s:s + len(b)] += b[:len(out) - s]
        return out * 0.35
    if kind == "whoosh":
        m = int(0.7 * SR)
        k = np.linspace(0, 1, m)
        y = lowpass(rng.normal(0, 1, m), 300 + 3500 * np.sin(np.pi * k) ** 2)
        return y * np.sin(np.pi * k) ** 1.5 * 0.9
    if kind == "shine":
        out = np.zeros(int(1.2 * SR))
        for i in range(7):
            b = bell(midi(rng.choice([96, 98, 101, 103, 105])), 0.6, 0.18) * 0.18
            s = int(rng.uniform(0, 0.5) * SR)
            out[s:s + len(b)] += b[:len(out) - s]
        return out
    raise ValueError(kind)


def place(buf, start, y, gain=1.0):
    i = int(start * SR)
    if i >= len(buf) or i + len(y) <= 0:
        return
    if i < 0:
        y, i = y[-i:], 0
    m = min(len(y), len(buf) - i)
    buf[i:i + m] += gain * y[:m]


# ---------- 背景音乐：八音盒琶音 + 铺底 ----------
def bgm(total):
    out = np.zeros(int(total * SR) + 1)
    beat = 60 / 76
    chords = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]]  # F  Dm  Bb  C
    arp = [0, 1, 2, 1, 0, 2, 1, 2]
    bar = 4 * beat
    nbars = int(total / bar) + 1
    for b in range(nbars):
        ch = chords[b % 4]
        t0 = b * bar
        # 铺底：三和弦正弦，缓起缓收
        m = int((bar + 1.5) * SR)
        t = np.arange(m) / SR
        envp = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, (bar + 1.5 - t) / 1.5))
        pad = sum(np.sin(2 * np.pi * midi(n) * t) + 0.25 * np.sin(2 * np.pi * midi(n) * 2.003 * t) for n in ch)
        place(out, t0, pad * envp * 0.05)
        place(out, t0, bell(midi(ch[0] - 12), 2.5, 1.2, ((1, 1), (2, 0.2))) * 0.10)
        # 八音盒：每拍两个音
        for i, k in enumerate(arp):
            note = ch[k] + 24 + (12 if (b % 8 >= 4 and i in (2, 6)) else 0)
            place(out, t0 + i * beat / 2, bell(midi(note), 1.4, 0.55) * 0.07)
    fade = np.ones_like(out)
    nf, no = int(2 * SR), int(3 * SR)
    fade[:nf] = np.linspace(0, 1, nf)
    fade[-no:] = np.linspace(1, 0, no)
    return out * fade


def music_mux(video_dir, tl):
    """配乐模式：曲子从头截到结尾、淡出，保留立体声。"""
    m = tl["music"]
    out_dir = video_dir / "out"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"{video_dir.name}.mp4"
    af = (f"atrim=0:{tl['duration']:.3f},afade=t=out:st={m['end']:.3f}:d={m['fade_out']:.3f}:curve=qsin,"
          "loudnorm=I=-16:TP=-1.5:LRA=11")
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(video_dir / "build" / "silent.mp4"),
                    "-i", str(Path(__file__).resolve().parent.parent / "music" / m["file"]),
                    "-map", "0:v", "-map", "1:a", "-af", af, "-ar", str(SR), "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)], check=True)
    print(out)


def main(video_dir):
    video_dir = Path(video_dir)
    build = video_dir / "build"
    tl = json.loads((build / "timeline.json").read_text(encoding="utf-8"))
    total = tl["duration"]
    if "music" in tl:
        music_mux(video_dir, tl)
        return
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(build / "narration.wav"), "-f", "s16le", "-ac", "1",
                          "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768
    n = int(total * SR) + 1
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]

    # 说话时把背景音乐压到 40%
    mask = np.zeros(n)
    for sc in tl["scenes"]:
        for line in sc["lines"]:
            mask[int(line["start"] * SR):int(line["end"] * SR)] = 1
    k = int(0.25 * SR)
    c = np.concatenate([[0], np.cumsum(mask)])
    mask = np.interp(np.arange(n), np.arange(n - k + 1) + k // 2, (c[k:] - c[:-k]) / k)
    music = bgm(total)[:n] * (1 - 0.6 * mask)

    fx = np.zeros(n)
    for ev in json.loads((build / "sfx.json").read_text(encoding="utf-8")):
        place(fx, ev["t"], sfx_sound(ev), ev.get("gain", 0.5))

    write_out(video_dir, voice * 1.0 + music * 0.9 + fx * 0.4)


def write_out(video_dir, mix):
    build = video_dir / "build"
    mix = mix / max(1.0, np.abs(mix).max() / 0.95)
    pcm = (mix * 32767).astype(np.int16)
    wav = build / "mix.wav"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-i", "-", str(wav)],
                   input=pcm.tobytes(), check=True)

    out_dir = video_dir / "out"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / f"{video_dir.name}.mp4"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", str(build / "silent.mp4"), "-i", str(wav),
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)],
                   check=True)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1])
