"""demo 的镜头表。每个镜头：屏幕时间段、动作时间映射、相机函数。

相机函数 cam(ctx, ts, tm) 返回 (位置, 注视点, 焦距 mm, 滚转度)，ts 屏幕时间、tm 动作时间（标量）。
ctx.at(骨骼名, tm) 给出角色骨骼在动作时间 tm 的世界位置，ctx.com(tm) 是质心。
"""
import numpy as np

import demo
from camera import Ramp, beat_t as B, noise, shake

V = lambda *a: np.array(a, float)


def lerp(a, b, u):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * u


def ease(u):
    u = np.clip(u, 0, 1)
    return u * u * (3 - 2 * u)


def hand(ts, amp, seed, freq=0.7):
    """手持感：位置的低频漂移。"""
    return V(noise(ts, seed, freq), noise(ts, seed + 1, freq), noise(ts, seed + 2, freq)) * amp


# ---------------- Kai 楼顶 ----------------
def cam_A1(ctx, ts, tm):
    """大全景：从城市上空斜后方降下来，落到 Kai 身后低处，越过他的肩膀看向楼间缺口和城市。"""
    u = ease((ts - B(30)) / (B(31, 2) - B(30)))
    k = ctx.at("Head", tm)
    loc = lerp(V(9, 26, 16), V(1.1, 13.4, 4.15), u ** 0.8) + hand(ts, 0.05, 1)
    tgt = lerp(k + V(-1, -3, -1.5), k + V(-0.4, -6, -0.9), u)
    return loc, tgt, lerp(20, 30, u), lerp(-8, 2, u)


def cam_A2(ctx, ts, tm):
    """低机位迎面：相机贴在楼梯间顶边沿，Kai 冲着镜头跑来。"""
    c = ctx.com(tm)
    loc = V(-0.9, 7.35, 3.42) + hand(ts, 0.02, 2, 1.5)
    return loc, c + V(0, 0, 0.25), 18, 4


def cam_A3(ctx, ts, tm):
    """侧面广角跟摇：前空翻跳下楼梯间。"""
    c = ctx.com(tm)
    dx, dy = shake(ts, [(demo.B(32) + 0.95, 1.0)], amp=0.03)
    loc = V(7.5, 4.0, 1.0) + V(0, (c[1] - 5) * 0.25, 0) + hand(ts, 0.04, 3, 1.0) + V(dx, 0, dy)
    return loc, c + V(0, -0.4, 0.1), 22, -3


def cam_A4a(ctx, ts, tm):
    """贴地倒退跟拍：相机在 Kai 前方低处和他同速后退。"""
    c = ctx.com(tm)
    loc = V(c[0] + 1.0, c[1] - 2.6, 0.35) + hand(ts, 0.03, 4, 2.0)
    return loc, c + V(0, 0, 0.15), 16, 6


def cam_A4b(ctx, ts, tm):
    """身后跟拍，越过他看到前方的楼间缺口。"""
    c = ctx.com(tm)
    loc = V(c[0] - 0.7, c[1] + 2.9, 1.5) + hand(ts, 0.04, 5, 2.0)
    return loc, V(c[0] * 0.5, c[1] - 8, 0.2), 20, -4


def cam_A5(ctx, ts, tm):
    """跨楼 double cork：慢放中相机绕他转半圈，由侧前方转到侧后方，低于他仰拍城市夜空。"""
    c = ctx.com(tm)
    u = ease((ts - B(33)) / (B(34) - B(33)))
    ang = np.radians(lerp(-35, 150, u))
    r = lerp(3.4, 4.2, u)
    loc = c + V(r * np.cos(ang), r * np.sin(ang), lerp(-1.2, -0.4, u)) + hand(ts, 0.03, 6, 0.8)
    return loc, c, lerp(22, 28, u), lerp(-10, 8, u)


A5_RAMP = Ramp([(B(33), B(33)), (B(33) + 0.14, B(33) + 0.14), (B(34) - 0.32, demo.KAI_TAKEOFF + 0.98),
                (B(34), demo.KAI_TAKEOFF + demo.KAI_AIR)])

SHOTS = {
    "A1": dict(scene="rooftop", char="kai", t=(B(30), B(31, 2)), cam=cam_A1),
    "A2": dict(scene="rooftop", char="kai", t=(B(31, 2), B(32)), cam=cam_A2),
    "A3": dict(scene="rooftop", char="kai", t=(B(32), B(32, 2)), cam=cam_A3),
    "A4a": dict(scene="rooftop", char="kai", t=(B(32, 2), B(32, 3)), cam=cam_A4a),
    "A4b": dict(scene="rooftop", char="kai", t=(B(32, 3), B(33)), cam=cam_A4b),
    "A5": dict(scene="rooftop", char="kai", t=(B(33), B(34)), cam=cam_A5, ramp=A5_RAMP),
}
