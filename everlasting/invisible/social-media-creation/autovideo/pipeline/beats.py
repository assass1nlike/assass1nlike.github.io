"""配乐模式：讲稿 + 固定配乐 → 时间轴（没有人声，字幕按节拍出现）。

用法：python pipeline/beats.py videos/<name>
script.json 写 "music": "<music/ 下的曲名>"，每个场景用 "at" 指定起点（秒，自动吸附到最近的小节线），
"end" 指定全片结尾（同样吸附到小节线）。每句字幕占整数拍：按字数估阅读时间，凑成整小节；
也可以给某句写 "beats" 指定拍数。场景里排不下会报错，排完剩下的拍数会打印出来，供调讲稿。
输出 build/timeline.json，格式与 voice.py 相同，另加 music 字段（节拍、小节线、响度包络）。
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
READ_BASE = 0.5   # 每句字幕至少留给读的时间（秒）
READ_CHAR = 0.12  # 每个字再加的时间（秒）
FADE_OUT = 2.5


def snap(t, grid):
    return min(grid, key=lambda g: abs(g - t))


def natural_beats(text, beat):
    n = sum(1 for c in text if not c.isspace())
    need = READ_BASE + READ_CHAR * n
    b = math.ceil(need / beat)
    return 4 if b <= 4 else 6 if b <= 6 else 8


def main(video_dir):
    video_dir = Path(video_dir)
    script = json.loads((video_dir / "script.json").read_text(encoding="utf-8"))
    music = json.loads((ROOT / "music" / f"{script['music']}.json").read_text(encoding="utf-8"))
    beats = music["beats"]
    beat = music["beat"]
    bars = beats[music["downbeat_phase"]::4]

    anchors = [0.0] + [snap(sc["at"], bars) for sc in script["scenes"][1:]]
    end = snap(script["end"], bars)
    if end > music["duration"] - 0.5:
        sys.exit(f"结尾 {end:.2f}s 超出配乐长度 {music['duration']:.1f}s")

    scenes, subs = [], []
    for si, sc in enumerate(script["scenes"]):
        a = anchors[si]
        b = anchors[si + 1] if si + 1 < len(anchors) else end
        # 第一个场景从第一条小节线开始出字幕，其它场景从锚点开始
        t_idx = next(i for i, x in enumerate(beats) if x >= a - 1e-6) + sc.get("delay", 0)
        lines = []
        for line in sc["lines"]:
            if isinstance(line, str):
                line = {"text": line}
            nb = line.get("beats") or natural_beats(line["text"], beat)
            if t_idx + nb >= len(beats) or beats[t_idx + nb] > b + 1e-6:
                sys.exit(f"场景 {sc['id']} 排不下：在“{line['text']}”处超出 {b:.2f}s")
            start, stop = beats[t_idx], beats[t_idx + nb]
            text = line["text"]
            k = len(text)
            span = min((stop - start) * 0.6, 0.12 * k)
            chars = [round(start + span * i / max(1, k), 3) for i in range(k)]
            lines.append({"text": text, "say": text, "start": start, "end": stop, "chars": chars,
                          **({"style": line["style"]} if "style" in line else {})})
            if not line.get("silent"):
                subs.append({"text": text, "start": start, "end": stop - 0.12})
            t_idx += nb
        slack = sum(1 for x in beats if beats[t_idx] <= x < b - 1e-6) if beats[t_idx] < b else 0
        print(f"{sc['id']:10s} {a:6.2f} → {b:6.2f}  剩余 {slack} 拍")
        scenes.append({"id": sc["id"], "start": a, "end": b, "lines": lines})

    total = end + FADE_OUT
    scenes[-1]["end"] = total
    timeline = {
        "duration": total,
        "music": {"file": music["file"], "beat": beat, "beats": [x for x in beats if x < total + 1],
                  "bars": [x for x in bars if x < total + 1], "sections": music["sections"],
                  "rms_hz": music["rms_hz"], "rms": music["rms"][: int(total * music["rms_hz"]) + 10],
                  "fade_out": FADE_OUT, "end": end},
        "scenes": scenes,
        "subs": subs,
    }
    build = video_dir / "build"
    build.mkdir(exist_ok=True)
    (build / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"total {total:.2f}s, {len(subs)} subtitles")


if __name__ == "__main__":
    main(sys.argv[1])
