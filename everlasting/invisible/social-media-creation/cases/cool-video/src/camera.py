"""镜头工具：屏幕时间 ↔ 动作时间的变速映射、程序化相机。纯 numpy，可在 Blender 内外使用。"""
import json
import os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 60


def music():
    return json.load(open(os.path.join(ROOT, "build", "music.json")))


def beat_t(bar, beat=0.0):
    """第 bar 小节第 beat 拍（从 0 数）的时刻。"""
    m = music()
    return m["bar0"] + (bar * 4 + beat) * m["beat"]


class Ramp:
    """单调三次插值（Fritsch–Carlson）：keys = [(屏幕时间, 动作时间)]，两者都单调递增。"""

    def __init__(self, keys):
        k = sorted(keys)
        self.x = np.array([a for a, _ in k], float)
        self.y = np.array([b for _, b in k], float)
        x, y = self.x, self.y
        d = np.diff(y) / np.diff(x)
        m = np.zeros(len(x))
        m[0], m[-1] = d[0], d[-1]
        for i in range(1, len(x) - 1):   # 相邻斜率的调和平均，保证单调
            m[i] = 2 / (1 / d[i - 1] + 1 / d[i]) if d[i - 1] > 0 and d[i] > 0 else 0
        self.m = m

    def __call__(self, t):
        t = np.asarray(t, float)
        x, y, m = self.x, self.y, self.m
        i = np.clip(np.searchsorted(x, t) - 1, 0, len(x) - 2)
        h = x[i + 1] - x[i]
        s = np.clip((t - x[i]) / h, 0, 1)
        h00 = 2 * s ** 3 - 3 * s ** 2 + 1; h10 = s ** 3 - 2 * s ** 2 + s
        h01 = -2 * s ** 3 + 3 * s ** 2; h11 = s ** 3 - s ** 2
        out = h00 * y[i] + h10 * h * m[i] + h01 * y[i + 1] + h11 * h * m[i + 1]
        # 范围外线性外推
        out = np.where(t < x[0], y[0] + (t - x[0]) * m[0], out)
        out = np.where(t > x[-1], y[-1] + (t - x[-1]) * m[-1], out)
        return out


def noise(t, seed, freq=1.0, octaves=3):
    """平滑的一维噪声（几组不可公度频率的正弦叠加），幅值约 ±1。"""
    rng = np.random.default_rng(seed)
    out = 0
    amp, tot = 1.0, 0
    for o in range(octaves):
        for k in range(2):
            f = freq * (2 ** o) * rng.uniform(0.7, 1.3)
            out = out + amp * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
            tot += amp
        amp *= 0.5
    return out / tot * 1.6


def shake(t, hits, amp=1.0, decay=10.0, freq=17.0):
    """冲击震动：每个 (时刻, 强度) 产生一个衰减振荡。返回 (dx, dy) 屏幕方向的位移量（单位：相对幅度）。"""
    t = np.asarray(t, float)
    dx = np.zeros_like(t); dy = np.zeros_like(t)
    for th, a in hits:
        u = t - th
        e = np.where(u >= 0, np.exp(-decay * np.maximum(u, 0)), 0)
        dx += amp * a * e * np.sin(2 * np.pi * freq * u)
        dy += amp * a * e * np.sin(2 * np.pi * freq * 1.31 * u + 1.0)
    return dx, dy


def look_at(loc, tgt, roll=0.0):
    """返回相机的四元数 (w,x,y,z)：-Z 指向目标，Y 朝上，绕视线滚转 roll 度。"""
    from quat import from_frame, qmul, axis_angle
    f = np.asarray(tgt, float) - np.asarray(loc, float)
    f /= np.linalg.norm(f)
    up = np.array([0, 0, 1.0])
    x = np.cross(f, up)
    if np.linalg.norm(x) < 1e-6:
        x = np.array([1.0, 0, 0])
    x /= np.linalg.norm(x)
    y = np.cross(x, f)
    q = from_frame(x, y)   # 相机 X→x，Y→y，于是 -Z→f
    return qmul(q, axis_angle([0, 0, 1.0], np.radians(roll)))
