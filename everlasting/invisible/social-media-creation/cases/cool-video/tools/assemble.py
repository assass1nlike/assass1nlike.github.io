"""把渲染好的各镜头帧按时间接起来，做后期并配上音乐。

python tools/assemble.py <输出.mp4> <镜头名 ...>
帧来自 build/frames/<镜头名>/<全局帧号>.png（全局帧号 = round(屏幕时间 × 60)）；缺帧时用上一帧补。
"""
import os
import subprocess
import sys

import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
from camera import FPS, beat_t as B  # noqa: E402

FF = imageio_ffmpeg.get_ffmpeg_exe()
FLASH = [B(33), B(37)]          # 两次 drop 的闪白
FADE_OUT = 1.2


def main():
    out, names = sys.argv[1], sys.argv[2:]
    sys.argv = sys.argv[:1]
    import shots
    seq = []
    for n in names:
        t0, t1 = shots.SHOTS[n]["t"]
        d = os.path.join(ROOT, "build", "frames", n)
        last = None
        for f in range(int(round(t0 * FPS)), int(round(t1 * FPS))):
            p = os.path.join(d, f"{f:04d}.png")
            if os.path.exists(p):
                last = p
            if last:
                seq.append(last)
    t_start = shots.SHOTS[names[0]]["t"][0]
    dur = len(seq) / FPS
    lst = os.path.join(ROOT, "build", "edit_list.txt")
    with open(lst, "w") as f:
        for p in seq:
            f.write(f"file '{p}'\nduration {1 / FPS:.6f}\n")
    flashes = "".join(f",eq=brightness=0.6:enable='between(t,{ft - t_start:.3f},{ft - t_start + 2 / FPS:.3f})'"
                      f",eq=brightness=0.25:enable='between(t,{ft - t_start + 2 / FPS:.3f},{ft - t_start + 5 / FPS:.3f})'"
                      for ft in FLASH if t_start <= ft < t_start + dur)
    vf = (f"scale=1920:804,vignette=PI/4.5,noise=alls=5:allf=t{flashes},"
          f"fade=t=out:st={dur - FADE_OUT:.3f}:d={FADE_OUT},pad=1920:1080:0:138:black,format=yuv420p")
    af = f"afade=t=in:d=0.25,afade=t=out:st={dur - FADE_OUT:.3f}:d={FADE_OUT}"
    cmd = [FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
           "-ss", f"{t_start:.3f}", "-t", f"{dur:.3f}", "-i", os.path.join(ROOT, "base-music.mp3"),
           "-map", "0:v", "-map", "1:a", "-vf", vf, "-af", af, "-r", str(FPS),
           "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-c:a", "aac", "-b:a", "256k", "-shortest", out]
    subprocess.run(cmd, check=True)
    print(out, f"{dur:.2f}s", len(seq), "frames")


if __name__ == "__main__":
    main()
