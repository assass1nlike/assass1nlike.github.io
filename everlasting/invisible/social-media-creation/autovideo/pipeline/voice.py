"""讲稿 → 配音 + 时间轴。

用法：python pipeline/voice.py videos/<name>
读 script.json，逐句调用 Edge TTS（按讲稿内容缓存），输出
  build/narration.wav   整条旁白
  build/timeline.json   每个场景、每句话、每条字幕的起止时刻，以及每个字的发音时刻
"""
import asyncio
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np

SR = 48000
LEAD = 0.8         # 片头第一句之前的留白
LINE_GAP = 0.3     # 同一场景内句与句之间
SCENE_GAP = 0.7    # 场景与场景之间
TAIL = 2.5         # 最后一句之后的留白
PUNCT = "，。？！；："
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


async def synth(text, voice, rate, mp3_path):
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"text": chunk["text"],
                              "start": chunk["offset"] / 1e7,
                              "end": (chunk["offset"] + chunk["duration"]) / 1e7})
    return words


def decode(mp3_path):
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(mp3_path), "-f", "s16le",
                          "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def char_times(say, words):
    """把 TTS 的词边界对到讲稿的每个字上，返回每个字的 (起, 止)，标点取前后插值。"""
    times = [None] * len(say)
    cur = 0
    for w in words:
        i = say.find(w["text"], cur)
        if i < 0:
            continue
        n = len(w["text"])
        for k in range(n):
            a = w["start"] + (w["end"] - w["start"]) * k / n
            b = w["start"] + (w["end"] - w["start"]) * (k + 1) / n
            times[i + k] = (a, b)
        cur = i + n
    last = 0.0
    for i, t in enumerate(times):
        if t is None:
            times[i] = (last, last)
        else:
            last = t[1]
    return times


def split_phrases(s):
    """按标点切成短句，返回 [(短句, 在原串中的起点)]，短句保留结尾的问号。"""
    out, start = [], 0
    for m in re.finditer(f"[{PUNCT}]", s):
        seg = s[start:m.end()]
        if seg.strip(PUNCT + " "):
            out.append((seg, start))
        start = m.end()
    if s[start:].strip():
        out.append((s[start:], start))
    return out


def clean(seg):
    return seg.strip().rstrip("，。；：").strip()


def main(video_dir):
    video_dir = Path(video_dir)
    script = json.loads((video_dir / "script.json").read_text(encoding="utf-8"))
    build = video_dir / "build"
    cache = build / "tts"
    cache.mkdir(parents=True, exist_ok=True)
    voice, rate = script["voice"], script.get("rate", "+0%")

    t = LEAD
    pieces, scenes, subs = [], [], []
    for si, sc in enumerate(script["scenes"]):
        if si:
            t += SCENE_GAP - LINE_GAP
        s_start = t if si else 0.0
        lines = []
        for li, line in enumerate(sc["lines"]):
            if isinstance(line, str):
                line = {"text": line}
            text, say = line["text"], line.get("say", line["text"])
            key = hashlib.sha1(f"{voice}|{rate}|{say}".encode()).hexdigest()[:16]
            mp3, meta = cache / f"{key}.mp3", cache / f"{key}.json"
            if not mp3.exists() or not meta.exists():
                words = asyncio.run(synth(say, voice, rate, mp3))
                meta.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
            words = json.loads(meta.read_text(encoding="utf-8"))
            audio = decode(mp3)
            dur = len(audio) / SR
            ct = [(t + a, t + b) for a, b in char_times(say, words)]
            pieces.append((t, audio))

            tp, sp = split_phrases(text), split_phrases(say)
            if len(tp) != len(sp):
                sys.exit(f"字幕与朗读文本的标点不一致：{text!r} / {say!r}")
            line_subs = []
            for (seg, _), (sseg, si0) in zip(tp, sp):
                body = sseg.strip(PUNCT + " ")
                j0 = si0 + sseg.find(body)
                j1 = j0 + len(body) - 1
                line_subs.append({"text": clean(seg), "start": ct[j0][0], "end": ct[j1][1]})
            for k in range(len(line_subs) - 1):
                line_subs[k]["end"] = line_subs[k + 1]["start"]
            line_subs[-1]["end"] = max(line_subs[-1]["end"], t + dur - 0.05)
            subs += line_subs
            lines.append({"text": text, "say": say, "start": t, "end": t + dur,
                          "chars": [round(a, 3) for a, _ in ct]})
            t += dur + LINE_GAP
        t += sc.get("hold", 0)
        scenes.append({"id": sc["id"], "start": s_start, "lines": lines})
    total = t - LINE_GAP + TAIL
    for a, b in zip(scenes, scenes[1:] + [None]):
        a["end"] = b["start"] if b else total

    mix = np.zeros(int(total * SR) + 1, dtype=np.float32)
    for start, audio in pieces:
        i = int(start * SR)
        mix[i:i + len(audio)] += audio[:len(mix) - i]
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    subprocess.run([FFMPEG, "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-i", "-",
                    str(build / "narration.wav")], input=pcm.tobytes(), check=True)

    timeline = {"duration": total, "scenes": scenes, "subs": subs}
    (build / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    for sc in scenes:
        print(f"{sc['id']:10s} {sc['start']:6.2f} → {sc['end']:6.2f}")
    print(f"total {total:.2f}s, {len(subs)} subtitles")


if __name__ == "__main__":
    main(sys.argv[1])
