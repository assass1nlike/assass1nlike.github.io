"""按顺序拼接各场景的 1080p 片段，配背景音乐，输出成片。

用法：
  python tools/assemble.py --render          # 先以 1080p30 渲染全部场景（复用已渲染的片段）
  python tools/assemble.py                   # 只拼接与配乐
  python tools/assemble.py --quality l       # 用低清片段快速试拼

音乐沿用 cases/abstract-video/base-music.mp3（Syuenn《big song (self insert)》），
压低到 -22 dB 作为背景，首尾各 2 秒淡入淡出。
"""
import argparse
import glob
import os
import re
import subprocess
import sys

import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, "build", "tmp", "media", "videos")
OUT = os.path.join(ROOT, "out")
MUSIC = os.path.normpath(os.path.join(ROOT, "..", "abstract-video", "base-music.mp3"))

ORDER = [
    ("s0_hook", "S0Hook"),
    ("s1_rule", "S1Rule"),
    ("s2_move", "S2Move"),
    ("s2b_cantor", "S2bCantor"),
    ("s3_indep", "S3Indep"),
    ("s4_countable", "S4Countable"),
    ("s7_tree", "S7Tree"),
    ("s4b_dim_intro", "S4bDimIntro"),
    ("s5_dimension", "S5Dimension"),
    ("s5b_count_vs_closure", "S5bCountVsClosure"),
    ("s6_components", "S6Components"),
    ("s6b_five", "S6bFive"),
    ("s8_open", "S8Open"),
]


def ff():
    return imageio_ffmpeg.get_ffmpeg_exe()


def probe(path):
    out = subprocess.run([ff(), "-i", path], capture_output=True, text=True).stderr
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def find(name, scene, quality):
    res = "1080p30" if quality == "h" else "480p30"
    hits = glob.glob(os.path.join(MEDIA, name, res, f"{scene}.mp4"))
    if not hits:
        sys.exit(f"missing {name}/{scene} @ {res}; render first")
    return hits[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", action="store_true", help="先 1080p30 渲染")
    ap.add_argument("--quality", default="h", choices=["h", "l"])
    ap.add_argument("--no-music", action="store_true")
    args = ap.parse_args()

    if args.render:
        scenes = sorted(glob.glob(os.path.join(ROOT, "src", "scenes", "s*.py")))
        for path in scenes:
            base = os.path.basename(path)
            mod = base[:-3]
            cls = None
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    m = re.match(r"class (\w+)\(NSc\)", line)
                    if m:
                        cls = m.group(1)
            if not cls:
                print("skip", base)
                continue
            print(f"== {cls} ==", flush=True)
            subprocess.run([sys.executable, "-m", "manim", "-qh", "--media_dir",
                            os.path.join(ROOT, "build", "tmp", "media"), path, cls],
                           cwd=ROOT, check=True)

    os.makedirs(OUT, exist_ok=True)
    segs = [find(n, s, args.quality) for n, s in ORDER]
    for p in segs:
        print(f"{probe(p):7.1f}s  {os.path.relpath(p, ROOT)}")

    # 拼接
    listfile = os.path.join(ROOT, "build", "tmp", "concat.txt")
    with open(listfile, "w", encoding="utf-8") as fh:
        for p in segs:
            fh.write("file '%s'\n" % p.replace("\\", "/"))

    silent = os.path.join(ROOT, "build", "tmp", "silent.mp4")
    subprocess.run([ff(), "-y", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", listfile, "-c", "copy", silent], check=True)
    total = probe(silent)
    print(f"silent: {total:.1f}s")

    final = os.path.join(OUT, "neruthes-necklace.mp4")
    if args.no_music or not os.path.exists(MUSIC):
        subprocess.run([ff(), "-y", "-v", "error", "-i", silent, "-c", "copy", final],
                       check=True)
    else:
        fade_out = max(total - 3.0, 0)
        subprocess.run([
            ff(), "-y", "-v", "error",
            "-i", silent,
            "-i", MUSIC,
            "-filter_complex",
            f"[1:a]volume=-22dB,atrim=0:{total:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d=2,afade=t=out:st={fade_out:.3f}:d=3[a]",
            "-map", "0:v", "-map", "[a]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
            final,
        ], check=True)
    print(f"done: {final}  {probe(final):.1f}s")


if __name__ == "__main__":
    main()
