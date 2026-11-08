"""姿势库：用关节角和方向描述姿势，转成对齐旋转（见 skel.py）。

坐标约定（静止时、身体局部）：X 指向角色左侧，Y 指向身后，Z 向上。
腿：flex 前抬为正，abd 外展为正，rot 外旋为正；knee 屈膝为正；ankle 勾脚为正（绷脚为负）。
手臂：raise 从下垂 0° 到举过头 180°；plane 0° 在身前平面、90° 在体侧、180° 在身后；elbow 屈肘角，bend 是前臂弯向的方向。
"""
import numpy as np

from quat import qmul, qconj, qrot, rx, ry, rz, ID, from_two, from_frame, slerp, axis_angle

SIDES = ("Left", "Right")


def _sgn(side):
    return 1.0 if side == "Left" else -1.0


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


class Pose(dict):
    """bone 名 → 对齐旋转。缺省为单位旋转。"""

    def copy(self):
        return Pose({k: np.array(v) for k, v in self.items()})

    def array(self, sk):
        q = sk.identity()
        for k, v in self.items():
            q[sk.i(k)] = v
        return q


def spine(p, flex=0, side=0, twist=0, w=(0.3, 0.35, 0.35)):
    """躯干三节分摊：flex 前屈为正，side 向左侧屈为正，twist 向左转为正。"""
    for b, k in zip(("LowerBack", "Spine", "Spine1"), w):
        p[b] = qmul(rz(twist * k), qmul(rx(flex * k), ry(-side * k)))


def head(p, flex=0, turn=0, tilt=0):
    p["Neck"] = qmul(rz(turn * 0.4), rx(flex * 0.5))
    p["Neck1"] = qmul(rz(turn * 0.3), rx(flex * 0.3))
    p["Head"] = qmul(rz(turn * 0.3), qmul(rx(flex * 0.2), ry(-tilt)))


def leg(p, side, flex=0, abd=0, rot=0, knee=0, ankle=0):
    s = _sgn(side)
    p[f"{side}UpLeg"] = qmul(rz(s * rot), qmul(ry(-s * abd), rx(-flex)))
    p[f"{side}Leg"] = rx(knee)
    p[f"{side}Foot"] = rx(-ankle)


def legs(p, **kw):
    for sd in SIDES:
        leg(p, sd, **kw)


class Rig:
    """依赖具体骨架的姿势工具（手臂方向、两节 IK）。"""

    def __init__(self, sk):
        self.sk = sk
        H, T = sk.head, sk.tail
        self.r = {}
        for sd in SIDES:
            ua, fa = sk.i(f"{sd}Arm"), sk.i(f"{sd}ForeArm")
            u = unit(T[ua] - H[ua]); f = unit(T[fa] - H[fa])
            bend = f - u * (f @ u)
            self.r[sd] = dict(u=u, f=f, bend=unit(bend) if np.linalg.norm(bend) > 1e-3 else np.array([0, -1.0, 0]))
            th, sh = sk.i(f"{sd}UpLeg"), sk.i(f"{sd}Leg")
            self.r[sd + "leg"] = dict(u=unit(T[th] - H[th]), f=unit(T[sh] - H[sh]))
            ft = sk.i(f"{sd}Foot")
            self.r[sd + "foot"] = unit(T[ft] - H[ft])
            self.r[sd + "len"] = (np.linalg.norm(H[fa] - H[ua]), np.linalg.norm(H[sk.i(f"{sd}Hand")] - H[fa]))
            self.r[sd + "leglen"] = (np.linalg.norm(H[sh] - H[th]), np.linalg.norm(H[ft] - H[sh]))

    # ---------- 手臂 ----------
    def arm_dirs(self, p, side, d_up, d_fore, bend_hint=None):
        """在肩（锁骨）骨骼的对齐坐标系里给定上臂、前臂方向。"""
        r = self.r[side]
        d_up = unit(d_up); d_fore = unit(d_fore)
        pole = d_fore - d_up * (d_fore @ d_up)
        if np.linalg.norm(pole) < 1e-3:
            pole = bend_hint if bend_hint is not None else np.array([0, -1.0, 0])
            pole = pole - d_up * (pole @ d_up)
        pole = unit(pole)
        Rr = from_frame(r["u"], r["bend"])
        Rd = from_frame(d_up, pole)
        qu = qmul(Rd, qconj(Rr))
        f_now = qrot(qu, r["f"])
        qf_world = qmul(from_two(f_now, d_fore), qu)
        p[f"{side}Arm"] = qu
        p[f"{side}ForeArm"] = qmul(qconj(qu), qf_world)

    def arm(self, p, side, raise_=10, plane=60, elbow=15, bend=None):
        s = _sgn(side)
        th, ph = np.radians(raise_), np.radians(plane)
        d = np.array([s * np.sin(th) * np.sin(ph), -np.sin(th) * np.cos(ph), -np.cos(th)])
        if bend is None:
            bend = [0, -1.0, 0.0] if raise_ < 120 else [0, 0.3, 1.0]
        b = unit(bend)
        h = b - d * (b @ d)
        if np.linalg.norm(h) < 1e-3:
            h = np.array([0, 0, 1.0]) - d * d[2]
        h = unit(h)
        e = np.radians(elbow)
        f = d * np.cos(e) + h * np.sin(e)
        self.arm_dirs(p, side, d, f, h)

    def arms(self, p, **kw):
        for sd in SIDES:
            self.arm(p, sd, **kw)

    def leg_dirs(self, p, side, d_up, d_lo):
        """大腿、小腿方向（骨盆对齐坐标系） → 髋、膝旋转。膝盖朝向由两者所在平面决定。"""
        r = self.r[side + "leg"]
        d_up = unit(d_up); d_lo = unit(d_lo)
        knee_fwd = -(d_lo - d_up * (d_lo @ d_up))        # 小腿往后折，膝盖朝前
        if np.linalg.norm(knee_fwd) < 1e-3:
            knee_fwd = np.array([0, -1.0, 0]) - d_up * (-d_up[1])
        Rr = from_frame(r["u"], np.array([0, -1.0, 0]) - r["u"] * (-r["u"][1]))
        Rd = from_frame(d_up, unit(knee_fwd))
        qu = qmul(Rd, qconj(Rr))
        f_now = qrot(qu, r["f"])
        qf_world = qmul(from_two(f_now, d_lo), qu)
        p[f"{side}UpLeg"] = qu
        p[f"{side}Leg"] = qmul(qconj(qu), qf_world)

    # ---------- 两节 IK ----------
    @staticmethod
    def two_bone(a, target, l1, l2, pole):
        """返回 (上段方向, 下段方向)。a 根关节位置，pole 是中间关节弯向的方向。"""
        v = np.asarray(target, float) - a
        dist = np.linalg.norm(v)
        dist_c = np.clip(dist, abs(l1 - l2) + 1e-4, (l1 + l2) * 0.9995)
        dv = v / max(dist, 1e-9)
        cos_a = (l1 ** 2 + dist_c ** 2 - l2 ** 2) / (2 * l1 * dist_c)
        ang = np.arccos(np.clip(cos_a, -1, 1))
        pole = np.asarray(pole, float)
        pp = pole - dv * (pole @ dv)
        pp = unit(pp) if np.linalg.norm(pp) > 1e-6 else unit(np.cross(dv, [1.0, 0, 0]))
        up = dv * np.cos(ang) + pp * np.sin(ang)
        mid = a + up * l1
        lo = unit(a + dv * dist_c - mid)
        return up, lo


def blend(a, b, t):
    out = Pose()
    for k in set(a) | set(b):
        out[k] = slerp(a.get(k, ID), b.get(k, ID), t)
    return out


def ease(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ---------------- 关键姿势 ----------------
def library(rig):
    L = {}

    def mk(f):
        p = Pose(); f(p); return p

    def stand(p):
        legs(p, flex=4, knee=6, ankle=2); spine(p, 2); head(p, -2)
        rig.arms(p, raise_=10, plane=75, elbow=20)
    L["stand"] = mk(stand)

    def crouch(p):     # 起跳前下蹲，手臂后摆
        legs(p, flex=75, knee=105, ankle=28, abd=6); spine(p, 32); head(p, -25)
        rig.arms(p, raise_=55, plane=175, elbow=15)
    L["crouch"] = mk(crouch)

    def drive(p):      # 蹬伸：腿蹬直、手臂上甩
        legs(p, flex=-6, knee=4, ankle=-35); spine(p, -12); head(p, -15)
        rig.arms(p, raise_=165, plane=25, elbow=12)
    L["drive"] = mk(drive)

    def tuck(p):       # 团身抱膝
        legs(p, flex=128, knee=140, ankle=-25, abd=8); spine(p, 38); head(p, 25)
        rig.arms(p, raise_=62, plane=8, elbow=70, bend=[0, 0, -1])
    L["tuck"] = mk(tuck)

    def pike(p):       # 屈体
        legs(p, flex=118, knee=0, ankle=-40); spine(p, 32); head(p, 20)
        rig.arms(p, raise_=100, plane=5, elbow=10)
    L["pike"] = mk(pike)

    def layout(p):     # 直体，手臂侧平举
        legs(p, flex=-8, knee=2, ankle=-40, abd=-2); spine(p, -14); head(p, -12)
        rig.arms(p, raise_=88, plane=88, elbow=8, bend=[0, 0, 1])
    L["layout"] = mk(layout)

    def wrap(p):       # 转体：并腿绷直，双臂抱胸
        legs(p, flex=2, knee=3, ankle=-45, abd=-4); spine(p, -3); head(p, 4)
        for sd in SIDES:   # 上臂贴体侧，前臂横收到胸前
            rig.arm(p, sd, raise_=35, plane=35, elbow=125, bend=[-_sgn(sd), -0.6, 0.5])
    L["wrap"] = mk(wrap)

    def spot(p):       # 打开找落点：手臂侧上举，屈髋屈膝准备落地
        legs(p, flex=35, knee=45, ankle=-10, abd=5); spine(p, 12); head(p, 15)
        rig.arms(p, raise_=115, plane=60, elbow=20, bend=[0, 0, 1])
    L["spot"] = mk(spot)

    def land(p):       # 落地缓冲
        legs(p, flex=82, knee=105, ankle=28, abd=8); spine(p, 32); head(p, -20)
        rig.arms(p, raise_=70, plane=35, elbow=25)
    L["land"] = mk(land)

    def hero(p):       # 落地后定格：一手撑地的低姿态
        leg(p, "Left", flex=95, knee=125, ankle=30, abd=20, rot=15)
        leg(p, "Right", flex=40, knee=110, ankle=10, abd=25, rot=-10)
        spine(p, 30, twist=10); head(p, -30)
        rig.arm(p, "Right", raise_=40, plane=20, elbow=10)
        rig.arm(p, "Left", raise_=75, plane=110, elbow=15, bend=[0, 0, 1])
    L["hero"] = mk(hero)

    def scissor(p):    # 蝴蝶转体/旋子：两腿前后劈开，手臂张开
        leg(p, "Left", flex=50, knee=10, ankle=-40); leg(p, "Right", flex=-35, knee=25, ankle=-40)
        spine(p, -10); head(p, -5)
        rig.arms(p, raise_=95, plane=95, elbow=10, bend=[0, 0, 1])
    L["scissor"] = mk(scissor)

    def run_air(p):    # 腾空跨步
        leg(p, "Left", flex=70, knee=80, ankle=10); leg(p, "Right", flex=-25, knee=70, ankle=-30)
        spine(p, 12); head(p, -5)
        rig.arm(p, "Right", raise_=70, plane=10, elbow=80); rig.arm(p, "Left", raise_=45, plane=170, elbow=60)
    L["run_air"] = mk(run_air)
    return L
