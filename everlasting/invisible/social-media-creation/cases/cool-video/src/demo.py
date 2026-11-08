"""demo 段（第 30–40 小节，75.46–102 s）的表演编排。

动作时间（sim）在 83.0 s 之前等于屏幕时间；83.0 s 起的 double cork 在屏幕上用慢放拉长到 85.51 s 落地，
之后的动作时间 = 屏幕时间 − KAI_SHIFT。
"""
import numpy as np

import clips
from camera import beat_t
from perf import Perf, HZ

B = beat_t
KAI_TAKEOFF = B(33)          # 83.00 drop：起跳跨楼
KAI_AIR = 1.25               # 跨楼 double cork 的真实腾空时间
KAI_SHIFT = B(34) - (KAI_TAKEOFF + KAI_AIR)   # 落地在屏幕上对准 85.51

STAIR_TOP = 3.2
STAIR_Y = (7.0, 11.0)
R2_Z = -1.5


def kai(sk):
    P = Perf(sk)
    C = lambda n: clips.get(sk, n)
    # 1. 楼梯间顶上站着
    P.stand(B(30) - 0.5, B(31, 2) + 0.02, [0, 10.6, STAIR_TOP], 0)
    # 2. 79.2 低音进来，起步冲刺
    t = P.clip(C("Idle_To_Sprint"), B(31, 2), heading=0, at=[0, 10.6], ground=STAIR_TOP)
    t = P.clip(C("Two_Cycle_Sprint"), t - 0.02, cs=0.16, heading=0, ground=STAIR_TOP)
    # 3. 80.49 第 32 小节起点：从楼梯间顶前空翻下到屋面
    F0 = P._feet_pts([0, STAIR_Y[0] + 0.15, STAIR_TOP], 0, 0.22)
    F1 = P._feet_pts([0, 2.6, 0], 0, 0.3)
    t_land1 = B(32) + 0.95
    P.jump(B(32) - 0.22, B(32), t_land1, t_land1 + 0.28, F0, F1, 0, flips=1.0,
           shapes=(("tuck", 0.22), ("tuck", 0.62), ("spot", 0.86)), end="land", end_pose="land",
           absorb=0.22, land_back=0.02, name="frontflip")
    # 4. 冲刺到楼边
    t = P.clip(C("Two_Cycle_Sprint"), t_land1 + 0.2, cs=0.6, heading=0, ground=0.0)
    t = P.clip(C("Two_Cycle_Sprint"), t - 0.02, cs=0.16, heading=0, ground=0.0)
    # 5. 83.00 drop：起跳跨过楼间缺口，double cork，落到低 1.5 米的邻楼
    F0 = P._feet_pts([0.15, -5.95, 0.12], 0, 0.2)
    F1 = P._feet_pts([0, -12.6, R2_Z], 0, 0.32)
    tl = KAI_TAKEOFF + KAI_AIR
    P.jump(KAI_TAKEOFF - 0.2, KAI_TAKEOFF, tl, tl + 0.3, F0, F1, 0, flips=-2.0, twists=2.0, tilt=38,
           shapes=(("drive", 0.05), ("wrap", 0.16), ("wrap", 0.72), ("spot", 0.88)), end="land", end_pose="land",
           twist_window=(0.08, 0.78), absorb=0.24, land_back=0.05, name="cork")
    return P


def report(P):
    sk = P.sk
    t, root, q = P.solve()
    W, Pp, T = sk.fk(root, q)
    for tt in np.arange(t[0], t[-1], 0.25):
        k = int((tt - t[0]) * HZ)
        print(f"{tt:7.2f} root {root[k].round(2)}  head z {Pp[k, sk.i('Head'), 2]:.2f}")
    return t, root, q
