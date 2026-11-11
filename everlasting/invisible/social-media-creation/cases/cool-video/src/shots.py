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
    loc = lerp(V(-9, -9, 8.5), V(1.3, 13.3, 4.4), u) + hand(ts, 0.05, 1)
    tgt = lerp(k + V(0, 0, -0.3), k + V(-0.3, -6, -0.8), u ** 2)
    return loc, tgt, lerp(32, 26, u), lerp(-6, 2, u)


def cam_A2(ctx, ts, tm):
    """低机位迎面：相机贴在楼梯间顶边沿，Kai 冲着镜头跑来。"""
    c = ctx.com(tm)
    loc = V(-0.9, 7.35, 3.42) + hand(ts, 0.02, 2, 1.5)
    return loc, c + V(0, 0, 0.25), 18, 4


def cam_A3(ctx, ts, tm):
    """侧面广角跟摇：前空翻跳下楼梯间。"""
    c = ctx.com(tm)
    dx, dy = shake(ts, [(demo.B(32) + 0.95, 1.0)], amp=0.03)
    loc = V(4.2, 3.6, 1.1) + V(0, (c[1] - 5) * 0.3, 0) + hand(ts, 0.04, 3, 1.0) + V(dx, 0, dy)
    return loc, c + V(0, -0.3, 0.1), 20, -3


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

def cam_A6(ctx, ts, tm):
    """邻楼屋面上贴地迎面：double cork 落地的冲击，接着他从镜头旁冲过去。"""
    c = ctx.com(tm)
    dx, dy = shake(ts, [(B(34), 1.6)], amp=0.06)
    loc = V(1.1, -15.4, -1.25) + hand(ts, 0.03, 7, 1.5) + V(dx, 0, dy)
    return loc, c + V(0, 0, 0.1), 18, -4


def cam_A7(ctx, ts, tm):
    """侧面广角：冲向机房外墙、蹬墙后空翻。"""
    c = ctx.com(tm)
    dx, dy = shake(ts, [(B(34, 3), 0.6)], amp=0.03)
    loc = V(5.8, -18.4, -1.0) + hand(ts, 0.03, 8, 1.2) + V(dx, 0, dy)
    return loc, c + V(0, -0.5, 0.2), 20, 3


def cam_A8(ctx, ts, tm):
    """平行跟拍：他转身向西冲刺，前空翻转体越过空调外机，镜头在南侧和他同速平移。"""
    c = ctx.com(tm)
    lag = ctx.com(tm - 0.12)
    loc = V(lag[0] - 0.6, lag[1] - 3.6, R2Z + 0.55) + hand(ts, 0.04, 9, 1.6)
    return loc, c + V(-0.4, 0, 0.1), 22, 0


def cam_A9(ctx, ts, tm):
    """抽空的一小节：身后跟拍他冲向楼边，起跳后镜头停在楼边，俯看他慢放中跃入城市深渊。"""
    c = ctx.com(tm)
    x = max(c[0] + 3.0, demo.CY.R2_X[0] + 1.6)
    u = ease((ts - B(36, 2.5)) / 0.8)
    loc = V(x, c[1] + lerp(0.9, 0.3, u), lerp(-0.6, 0.9, u)) + hand(ts, 0.04, 10, 1.0)
    return loc, c + V(-0.3, 0, lerp(0.3, -0.4, u)), lerp(20, 26, u), lerp(0, -6, u)


A9_RAMP = Ramp([(B(36), B(36) - demo.KAI_SHIFT), (B(36, 2.5), B(36, 2.5) - demo.KAI_SHIFT),
                (B(36, 2.5) + 0.2, B(36, 2.5) - demo.KAI_SHIFT + 0.15), (B(37), B(36, 2.5) - demo.KAI_SHIFT + 0.5)])
R2Z = demo.R2_Z
SH = demo.KAI_SHIFT

SHOTS = {
    "A1": dict(scene="rooftop", char="kai", t=(B(30), B(31, 2)), cam=cam_A1),
    "A2": dict(scene="rooftop", char="kai", t=(B(31, 2), B(32)), cam=cam_A2),
    "A3": dict(scene="rooftop", char="kai", t=(B(32), B(32, 2)), cam=cam_A3),
    "A4a": dict(scene="rooftop", char="kai", t=(B(32, 2), B(32, 3)), cam=cam_A4a),
    "A4b": dict(scene="rooftop", char="kai", t=(B(32, 3), B(33)), cam=cam_A4b),
    "A5": dict(scene="rooftop", char="kai", t=(B(33), B(34)), cam=cam_A5, ramp=A5_RAMP),
    "A6": dict(scene="rooftop", char="kai", t=(B(34), B(34, 2)), cam=cam_A6, shift=SH),
    "A7": dict(scene="rooftop", char="kai", t=(B(34, 2), B(35)), cam=cam_A7, shift=SH),
    "A8": dict(scene="rooftop", char="kai", t=(B(35), B(36)), cam=cam_A8, shift=SH),
    "A9": dict(scene="rooftop", char="kai", t=(B(36), B(37)), cam=cam_A9, ramp=A9_RAMP),
}


# ---------------- Milo 峡谷 ----------------
def cam_B1a(ctx, ts, tm):
    """低机位：Milo 从天而降砸在台地上，相机在落点前方贴地，落地瞬间震动。"""
    c = ctx.com(tm)
    dx, dy = shake(ts, [(demo.MILO_LAND0, 1.4)], amp=0.05)
    loc = V(1.6, 9.2, 0.35) + hand(ts, 0.03, 11, 1.2) + V(dx, 0, dy)
    return loc, c + V(0, 0, 0.2), 20, 3


def cam_B1b(ctx, ts, tm):
    """身后低空跟拍他冲向崖边，前方露出峡谷、石柱和落日。"""
    c = ctx.com(tm)
    loc = V(c[0] + 0.9, c[1] + 3.0, 1.1) + hand(ts, 0.04, 12, 1.8)
    return loc, V(0, -12, -1.5), 18, -5


def cam_B2(ctx, ts, tm):
    """侧面航拍：在峡谷上空、略低于崖边，看他慢放中 cork 飞到石柱顶，随后推近。"""
    c = ctx.com(tm)
    u = ease((ts - B(38)) / (B(39) - B(38)))
    loc = lerp(V(9.5, -0.5, -1.4), V(5.5, -4.5, 0.9), u) + hand(ts, 0.05, 13, 0.6)
    return loc, c + V(0, -0.3, -0.1), lerp(26, 34, u), 0


def cam_B3(ctx, ts, tm):
    """对面台地低处仰拍：逆着落日，他从石柱上后空翻两周朝镜头落下，落地后相机慢慢推近。"""
    c = ctx.com(tm)
    land = demo.MILO_END
    dx, dy = shake(ts, [(land, 1.6)], amp=0.06)
    u = ease((ts - land) / 1.8)
    loc = lerp(V(2.6, -16.5, -3.55), V(1.5, -14.6, -3.3), u) + hand(ts, 0.03, 14, 0.8) + V(dx, 0, dy)
    tgt = lerp(V(0, -9, -1.0), ctx.com(tm) + V(0, 0, 0.1), ease((ts - B(39, 2)) / 1.5))
    return loc, tgt, lerp(18, 28, u), 0


B2_RAMP = Ramp([(B(38), demo.MILO_CORK), (B(38) + 0.12, demo.MILO_CORK + 0.12),
                (demo.MILO_CORK_SCREEN_LAND - 0.18, demo.MILO_CORK + demo.MILO_CORK_AIR - 0.12),
                (demo.MILO_CORK_SCREEN_LAND, demo.MILO_CORK + demo.MILO_CORK_AIR),
                (B(39), B(39) - demo.MILO_SHIFT1)])
B3_RAMP = Ramp([(B(39), demo.MILO_DB_SIM), (B(39) + 0.12, demo.MILO_DB_SIM + 0.12),
                (demo.MILO_END - 0.22, demo.MILO_DB_SIM + demo.MILO_DB_AIR - 0.2),
                (demo.MILO_END, demo.MILO_DB_SIM + demo.MILO_DB_AIR),
                (demo.MILO_END + 2.0, demo.MILO_DB_SIM + demo.MILO_DB_AIR + 2.0)])

SHOTS.update({
    "B1a": dict(scene="canyon", char="milo", t=(B(37), B(37, 2)), cam=cam_B1a),
    "B1b": dict(scene="canyon", char="milo", t=(B(37, 2), B(38)), cam=cam_B1b),
    "B2": dict(scene="canyon", char="milo", t=(B(38), B(39)), cam=cam_B2, ramp=B2_RAMP),
    "B3": dict(scene="canyon", char="milo", t=(B(39), B(40) + 1.9), cam=cam_B3, ramp=B3_RAMP),
})
