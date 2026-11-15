"""Rebuild base_hud.mp4 from base.mp4.

The HUD is driven by what the footage shows, not by the audio track: two
fingers alternately tap two adjacent keys, and each press is recovered by
measuring skin coverage over that key's cap. A press is a local peak of the
detrended coverage signal; the bar width is how long the coverage stays above
its baseline (i.e. how long the key is held down).

Pipeline
  1. decode base.mp4 to frames, measure skin coverage over each of the two keys
  2. turn the two coverage traces into press events + hold lengths
  3. draw one PNG per frame (2x supersampled, downscaled)
  4. overlay the PNG sequence onto the source video with ffmpeg

Usage:  python make_hud.py [--src base.mp4] [--out base_hud.mp4] [--keep-frames]
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from scipy.signal import find_peaks
from PIL import Image, ImageDraw, ImageFont


def find_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        exe = shutil.which("ffmpeg")
        if not exe:
            sys.exit("ffmpeg not found: install ffmpeg or `pip install imageio-ffmpeg`")
        return exe


def read_video(path, crop, scale_div, ffmpeg):
    """Yield the video as an (N, H, W, 3) uint8 array cropped to `crop`."""
    x0, y0, x1, y1 = crop
    w, h = (x1 - x0) // scale_div, (y1 - y0) // scale_div
    vf = f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0}"
    if scale_div != 1:
        vf += f",scale={w}:{h}:flags=area"
    proc = subprocess.Popen(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", path, "-vf", vf,
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE)
    frames = []
    while True:
        buf = proc.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        frames.append(np.frombuffer(buf, dtype=np.uint8).reshape(h, w, 3))
    proc.wait()
    if not frames:
        sys.exit("no frames decoded")
    return np.stack(frames), w, h


def locate_keys(frames, crop):
    """Key caps under the two fingertips, as full-frame (x, y).

    These are fixed: the keyboard's other keys also glow, so picking the
    brightest blobs is not enough (it selects an untouched key at the far
    left). The two tapped caps sit at these positions in this clip.
    """
    left, right = (1877, 1232), (2057, 1176)
    x0, y0, x1, y1 = crop
    for x, y in (left, right):
        if not (x0 <= x < x1 and y0 <= y < y1):
            sys.exit(f"key at {(x, y)} falls outside the analysis crop {crop}")
    return [left, right]


def coverage(frames, keys, crop, scale_div, key_box=(120, 200), box_shift_y=-120):
    """Fraction of skin pixels in a box above each key cap, per frame.

    `keys` and `crop` are in source-video coordinates; `scale_div` is the
    downscale factor the frames were decoded with.
    """
    x0, y0, x1, y1 = crop
    hh, ww = frames.shape[1], frames.shape[2]
    r = frames[..., 0].astype(np.int16)
    g = frames[..., 1].astype(np.int16)
    b = frames[..., 2].astype(np.int16)
    skin = (r > 100) & (r > b + 35) & (r > g + 20)
    bw, bh = key_box[0] / scale_div, key_box[1] / scale_div
    shift = box_shift_y / scale_div
    traces = []
    for cx, cy in keys:
        kx, ky = (cx - x0) / scale_div, (cy - y0) / scale_div
        bx0 = int(max(0, kx - bw / 2))
        bx1 = int(min(ww, kx + bw / 2))
        by0 = int(max(0, ky + shift - bh / 2))
        by1 = int(min(hh, ky + shift + bh / 2))
        if bx1 <= bx0 or by1 <= by0:
            sys.exit(f"analysis box for key {(cx, cy)} is empty; check crop and scale")
        traces.append(skin[:, by0:by1, bx0:bx1].mean(axis=(1, 2)))
    return traces


def smooth(a, k):
    if k <= 1:
        return a.copy()
    kk = np.ones(k) / k
    return np.convolve(a, kk, mode="same")


def key_events(traces, fps):
    """Press frames and hold lengths (ms) per key from the two coverage traces."""
    fa, fb = traces
    n = len(fa)
    common = (fa + fb) / 2        # both hands moving together: not a key press
    events = []
    for sig in (smooth(fa - common, 3), smooth(fb - common, 3)):
        d = sig - smooth(sig, 31)
        peaks, _ = find_peaks(d, prominence=d.std(), distance=4)
        holds = []
        for i in peaks:
            j = i
            while j + 1 < n and d[j + 1] > 0 and (j - i) < 40:
                j += 1
            holds.append((j - i) / fps * 1000.0)
        events.append((peaks, np.array(holds, float)))
    return events


# --- HUD drawing -----------------------------------------------------------

FPS = 60
HUD_W, HUD_H = 1180, 210
SS = 2                       # supersample factor for smooth edges
PAD = 24
ROW_H = 88
GAP = 20
SPEED = 700.0                # px/s the bars slide left
BAR_H = 40
BAR_X0, BAR_X1 = 0, 720      # bar track; entry point is BAR_X1
FADE_TAU = 0.9               # brightness decay of old bars
EDGE_FADE = 14.0             # fade-out width at the left edge
HOLD_MIN, HOLD_MAX = 15.0, 70.0
WIDTH_MIN, WIDTH_MAX = 10.0, 74.0
BPM_WINDOW = 2.0             # bpm = presses per minute over the last 2 s
COLORS = [(88, 168, 240), (72, 210, 120)]


def bar_width(hold_ms):
    h = np.clip(hold_ms, HOLD_MIN, HOLD_MAX)
    return WIDTH_MIN + (WIDTH_MAX - WIDTH_MIN) * (h - HOLD_MIN) / (HOLD_MAX - HOLD_MIN)


def stats(press_t, n_frames):
    counts = np.zeros(n_frames, int)
    bpms = np.zeros(n_frames)
    cur = 0.0
    for f in range(n_frames):
        t = f / FPS
        n = int(np.searchsorted(press_t, t, side="right"))
        k = int(np.searchsorted(press_t, t - BPM_WINDOW, side="right"))
        counts[f] = n
        cur += ((n - k) / BPM_WINDOW * 60.0 - cur) * 0.08
        bpms[f] = cur
    return counts, bpms


def load_fonts():
    path_b = "C:/Windows/Fonts/segoeuib.ttf"
    path_r = "C:/Windows/Fonts/segoeui.ttf"
    try:
        return (ImageFont.truetype(path_b, 62 * SS), ImageFont.truetype(path_r, 30 * SS),
                ImageFont.truetype(path_b, 44 * SS))
    except OSError:
        fallback = ImageFont.load_default(40 * SS)
        return fallback, fallback, fallback


def render(events, n_frames, out_dir):
    f_bpm, f_unit, f_cnt = load_fonts()
    press_frames = [e[0] for e in events]
    holds_all = [e[1] for e in events]
    presses = [p.astype(float) / FPS for p in press_frames]
    st = [stats(p, n_frames) for p in presses]
    for f in range(n_frames):
        t = f / FPS
        img = Image.new("RGBA", (HUD_W * SS, HUD_H * SS), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, HUD_W * SS - 1, HUD_H * SS - 1), radius=20 * SS,
                            fill=(4, 6, 10, 135))
        for k in range(2):
            col = COLORS[k]
            cy = (PAD + k * (ROW_H + GAP) + ROW_H // 2) * SS
            n = int(np.searchsorted(presses[k], t, side="right"))
            for i in range(n):
                age = t - presses[k][i]
                w = bar_width(holds_all[k][i]) * SS
                x = (BAR_X1 - age * SPEED) * SS - w
                if x + w < BAR_X0 * SS:
                    continue
                alpha = np.exp(-age / FADE_TAU) * min(1.0, max(0.0, (x + w) / (EDGE_FADE * SS)))
                if alpha < 0.02:
                    continue
                x0 = max(x, BAR_X0 * SS)
                if x + w <= x0:
                    continue
                d.rounded_rectangle((x0, cy - BAR_H * SS // 2, x + w, cy + BAR_H * SS // 2),
                                    radius=6 * SS,
                                    fill=(col[0], col[1], col[2], int(255 * min(alpha, 1.0))))
            cx = BAR_X1 * SS
            text = str(int(st[k][0][f]))
            cw = d.textlength(text, font=f_cnt) + 26 * SS
            d.rounded_rectangle((cx, cy - 26 * SS, cx + cw, cy + 26 * SS), radius=8 * SS,
                                fill=(col[0], col[1], col[2], 235))
            tw = d.textlength(text, font=f_cnt)
            d.text((cx + (cw - tw) / 2, cy - 22 * SS), text, font=f_cnt, fill=(8, 14, 22, 255))
            bx = cx + cw + 26 * SS
            bpm = str(int(round(st[k][1][f])))
            d.text((bx, cy - 32 * SS), bpm, font=f_bpm, fill=(240, 240, 245, 250))
            uw = d.textlength(bpm, font=f_bpm)
            d.text((bx + uw + 4 * SS, cy + 10 * SS), "bpm", font=f_unit,
                   fill=(225, 225, 235, 200))
        img.resize((HUD_W, HUD_H), Image.LANCZOS).save(f"{out_dir}/hud_{f:04d}.png")
    return presses, st


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="base.mp4")
    ap.add_argument("--out", default="base_hud.mp4")
    ap.add_argument("--keep-frames", action="store_true")
    args = ap.parse_args()

    ffmpeg = find_ffmpeg()
    crop = (1600, 900, 2300, 1400)      # region holding both key lights
    analysis_scale = 2                  # decode at half size: enough for coverage

    print("[1/4] decoding and locating the two keys")
    frames, _, _ = read_video(args.src, crop, analysis_scale, ffmpeg)
    keys = locate_keys(frames, crop)
    print("      left key %s, right key %s" % (keys[0], keys[1]))
    n_frames = len(frames)

    print("[2/4] measuring skin coverage per key")
    traces = coverage(frames, keys, crop, analysis_scale)
    del frames
    events = key_events(traces, FPS)
    for name, (p, h) in zip("AB", events):
        iv = np.diff(p) / FPS * 1000
        print(f"      key {name}: {len(p)} presses, median interval {np.median(iv):.0f} ms, "
              f"hold median {np.median(h):.0f} ms")

    frames_dir = tempfile.mkdtemp(prefix="hud_frames_")
    print("[3/4] drawing %d frames into %s" % (n_frames, frames_dir))
    render(events, n_frames, frames_dir)

    print("[4/4] overlaying and encoding")
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
                    "-i", args.src, "-framerate", str(FPS),
                    "-i", os.path.join(frames_dir, "hud_%04d.png"),
                    "-filter_complex",
                    "[0:v][1:v]overlay=1322:90:format=auto,format=yuv420p",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-c:a", "copy", "-movflags", "+faststart", args.out], check=True)
    if not args.keep_frames:
        shutil.rmtree(frames_dir, ignore_errors=True)
    print("done ->", args.out)


if __name__ == "__main__":
    main()
