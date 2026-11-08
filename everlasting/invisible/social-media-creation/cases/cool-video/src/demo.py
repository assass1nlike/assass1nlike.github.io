"""demo 段（第 30–40 小节，75.46–102 s）的表演编排。

动作时间（sim）在 83.0 s 之前等于屏幕时间；83.0 s 起的 double cork 在屏幕上用慢放拉长到 85.51 s 落地，
之后的动作时间 = 屏幕时间 − KAI_SHIFT。
"""
import numpy as np

import clips
import layout as CY
from camera import beat_t
from perf import Perf, HZ

B = beat_t
KAI_TAKEOFF = B(33)          # 83.00 drop：起跳跨楼
KAI_AIR = 1.25               # 跨楼 double cork 的真实腾空时间
KAI_SHIFT = B(34) - (KAI_TAKEOFF + KAI_AIR)   # 落地在屏幕上对准 85.51

from layout import STAIR_TOP, STAIR_Y, R2_Z


def sprint(P, t0, t1, heading, ground, cs=0.16):
    """从 t0 冲刺到 t1：循环播放两步一周期的冲刺片段。"""
    c = clips.get(P.sk, "Two_Cycle_Sprint")
    t = t0
    while t < t1 - 2.0 / HZ:
        ce = min(c.T, cs + (t1 - t))
        t = P.clip(c, t, cs=cs, ce=ce, heading=heading, ground=ground) + 1.0 / HZ
        cs = 0.16
    return t


def kai(sk):
    P = Perf(sk)
    C = lambda n: clips.get(sk, n)
    # 1. 楼梯间顶上站着：取动捕"落地站定"片段的最后 0.4 秒，放慢到整个开场，得到自然的站姿和细微的重心变化
    idle = C("Fall_A_Land_To_Standing_Idle_01")
    span = B(31, 2) + 0.02 - (B(30) - 0.5)
    P.clip(idle, B(30) - 0.5, cs=idle.T - 0.42, ce=idle.T - 0.02, speed=0.4 / span, heading=0, at=[0, 10.6],
           ground=STAIR_TOP)
    # 2. 79.2 低音进来，起步冲刺
    t = P.clip(C("Idle_To_Sprint"), B(31, 2), heading=0, at=[0, 10.6], ground=STAIR_TOP)
    sprint(P, t - 0.02, B(32) - 0.2, 0, STAIR_TOP)
    # 3. 80.49 第 32 小节起点：从楼梯间顶前空翻下到屋面
    F0 = P._feet_pts([0, STAIR_Y[0] + 0.15, STAIR_TOP], 0, 0.22)
    F1 = P._feet_pts([0, 2.6, 0], 0, 0.3)
    t_land1 = B(32) + 0.95
    P.jump(B(32) - 0.22, B(32), t_land1, t_land1 + 0.28, F0, F1, 0, flips=1.0,
           shapes=(("tuck", 0.22), ("tuck", 0.62), ("spot", 0.86)), end="land", end_pose="land",
           absorb=0.22, land_back=0.02, name="frontflip")
    # 4. 冲刺到楼边
    sprint(P, t_land1 + 0.2, KAI_TAKEOFF - 0.18, 0, 0.0, cs=0.6)
    # 5. 83.00 drop：起跳跨过楼间缺口，double cork，落到低 1.5 米的邻楼
    F0 = P._feet_pts([0.15, -5.95, 0.12], 0, 0.2)
    F1 = P._feet_pts([0, -12.6, R2_Z], 0, 0.32)
    tl = KAI_TAKEOFF + KAI_AIR
    P.jump(KAI_TAKEOFF - 0.2, KAI_TAKEOFF, tl, tl + 0.3, F0, F1, 0, flips=-2.0, twists=2.0, tilt=38,
           shapes=(("drive", 0.05), ("wrap", 0.16), ("wrap", 0.72), ("spot", 0.88)), end="land", end_pose="land",
           twist_window=(0.08, 0.78), absorb=0.24, land_back=0.05, name="cork")
    # 6. 落地后冲刺，蹬墙后空翻：蹬墙那一脚（片段 0.55 s）在屏幕 87.40 s
    t_wall = B(34, 3) - KAI_SHIFT - 0.55
    sprint(P, tl + 0.24, t_wall + 0.02, 0, R2_Z, cs=0.6)
    P.clip(C("Run_To_Flip"), t_wall, ce=1.6, heading=0, ground=R2_Z, name="wallflip")
    # 7. 转身向 -X 起步，前空翻转体越过空调外机：起跳（片段 0.54 s）在屏幕 89.92 s
    t = P.clip(C("Idle_To_Sprint"), t_wall + 1.58, heading=-90, ground=R2_Z)
    t_tw = B(35, 3) - KAI_SHIFT - 0.54
    sprint(P, t - 0.02, t_tw + 0.02, -90, R2_Z)
    t = P.clip(C("Front_Twist_Flip"), t_tw, heading=-90, ground=R2_Z, name="twist")
    # 8. 冲到楼西侧边缘纵身跃下：起跳在屏幕 92.15 s（抽空小节里的鼓点）
    t_leap = B(36, 2.5) - KAI_SHIFT
    c, v, _, _ = P.state_at(t - 0.05)
    sprint(P, t - 0.02, t_leap - 0.1, -90, R2_Z, cs=0.3)
    edge = CY.R2_X[0] + 0.05
    F0 = P._feet_pts([edge, c[1], R2_Z], -90, 0.2)
    F1 = P._feet_pts([edge - 9, c[1], R2_Z - 22], -90, 0.3)
    P.jump(t_leap - 0.2, t_leap, t_leap + 2.4, t_leap + 2.6, F0, F1, -90, flips=0.45,
           shapes=(("drive", 0.04), ("layout", 0.2), ("layout", 1.0)), end="layout", end_pose="layout",
           land_back=None, name="leap")
    # 场景里按表演的实际位置摆放墙和障碍物
    t, root, q = P.solve()
    W_, Pp, _ = sk.fk(root, q)
    at = lambda tt: int((tt - t[0]) * HZ)
    k = at(P.events["wallflip"]["t0"] + 0.55)
    P.marks = dict(wall_y=float(min(Pp[k, sk.i("RightToeBase"), 1], Pp[k, sk.i("LeftToeBase"), 1]) - 0.08),
                   twist_xy=root[at(P.events["twist"]["t0"] + 0.93), :2].tolist(),
                   lane_y=float(root[at(P.events["twist"]["t0"]), 1]))
    P.solved = (t, root, q)
    return P


def report(P):
    sk = P.sk
    t, root, q = P.solve()
    W, Pp, T = sk.fk(root, q)
    for tt in np.arange(t[0], t[-1], 0.25):
        k = int((tt - t[0]) * HZ)
        print(f"{tt:7.2f} root {root[k].round(2)}  head z {Pp[k, sk.i('Head'), 2]:.2f}")
    return t, root, q


# ---------------- Milo：峡谷 ----------------
MILO_LAND0 = B(37)                 # 93.05 第二次 drop：从天而降落在台地上
MILO_CORK = B(38)                  # 95.57 起跳，cork 转体 1.5 周落到石柱顶
MILO_CORK_AIR = 0.95
MILO_CORK_SCREEN_LAND = B(38, 2.3)  # 慢放后在屏幕上的落地时刻
MILO_SHIFT1 = MILO_CORK_SCREEN_LAND - (MILO_CORK + MILO_CORK_AIR)
MILO_DB = B(39)                    # 98.08 从石柱向后 double back
MILO_DB_SIM = MILO_DB - MILO_SHIFT1
MILO_DB_AIR = 1.45
MILO_END = B(40)                   # 100.59 重拍落地
MILO_SHIFT2 = MILO_END - (MILO_DB_SIM + MILO_DB_AIR)


def milo(sk):
    P = Perf(sk)
    C = lambda n: clips.get(sk, n)
    c = C("Fall_A_Land_To_Run_Forward")
    t = P.clip(c, MILO_LAND0 - 0.04, heading=0, at=[0.1, 12.6], ground=0.0, name="land0")
    sprint(P, t - 0.02, MILO_CORK - 0.18, 0, 0.0)
    # cork：起跳在台地崖边，转体 1.5 周，落到石柱顶时面朝来的方向
    F0 = P._feet_pts([0.1, 0.18, 0.0], 0, 0.2)
    F1 = P._feet_pts([0, CY.PILLAR_Y + 0.35, CY.PILLAR_Z], 180, 0.34)
    tl = MILO_CORK + MILO_CORK_AIR
    P.jump(MILO_CORK - 0.2, MILO_CORK, tl, MILO_DB_SIM - 0.32, F0, F1, 0, flips=-1.0, twists=1.5, tilt=32,
           heading1=180, shapes=(("drive", 0.05), ("wrap", 0.18), ("wrap", 0.7), ("spot", 0.86)),
           end="land", end_pose="land", absorb=0.25, land_back=0.0, name="cork")
    # 石柱上原地向后 double back，下到低 4.8 米的对面台地，落地成英雄姿态
    F0 = P._feet_pts([0, CY.PILLAR_Y + 0.35, CY.PILLAR_Z], 180, 0.3)
    F1 = P._feet_pts([0, CY.M2_EDGE - 2.4, CY.M2_Z], 180, 0.36)
    tl = MILO_DB_SIM + MILO_DB_AIR
    P.jump(MILO_DB_SIM - 0.32, MILO_DB_SIM, tl, tl + 2.2, F0, F1, 180, flips=-2.0,
           shapes=(("drive", 0.04), ("tuck", 0.16), ("tuck", 0.72), ("spot", 0.88)),
           end="hero", end_pose="hero", absorb=0.3, land_back=-0.05, name="dback")
    return P
