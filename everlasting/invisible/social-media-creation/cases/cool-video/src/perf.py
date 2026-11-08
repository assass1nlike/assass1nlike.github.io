"""一段表演 = 若干片段（站立、动捕跑动、跳跃翻腾、手/脚支撑）首尾相接。

每个片段在自己的时间区间里给出三样东西，采样率 HZ：
  C  质心的世界位置；B  骨盆（Hips）的世界朝向；Q  其余骨骼的对齐旋转（身体形状）。
相邻片段在接缝处交叉淡化。最后由 C、B、Q 反推 Hips 位置，再按支撑点（pins）解腿和手臂的 IK。

跳跃片段的物理：
  腾空段质心走抛物线，两端点由起跳、落地时脚的位置和当时的姿势确定，飞行时间由音乐给定；
  空翻角速度 ∝ 包络 / 转动惯量（团身时惯量小、转得快），转体同理；包络在蹬地阶段从 0 升起，
  落地后衰减到 0，总角度归一化到招式要求的圈数。
"""
import numpy as np

from quat import qmul, qconj, qrot, qnorm, slerp, axis_angle, rz, ID, from_two
from pose import Pose, Rig, blend, ease, library, unit

HZ = 240
G = np.array([0, 0, -9.81])


def hermite(t, t0, p0, v0, t1, p1, v1):
    T = t1 - t0
    s = np.clip((t - t0) / T, 0, 1)[:, None]
    h00 = 2 * s ** 3 - 3 * s ** 2 + 1; h10 = s ** 3 - 2 * s ** 2 + s
    h01 = -2 * s ** 3 + 3 * s ** 2; h11 = s ** 3 - s ** 2
    return h00 * p0 + h10 * T * v0 + h01 * p1 + h11 * T * v1


def spline(t, keys):
    """keys: [(t, p, v或None)]，分段 Hermite，缺省速度用相邻点差分（Catmull-Rom）。"""
    ks = sorted(keys, key=lambda k: k[0])
    ts = np.array([k[0] for k in ks]); ps = np.array([k[1] for k in ks], float)
    vs = []
    for i, k in enumerate(ks):
        if k[2] is not None:
            vs.append(np.asarray(k[2], float))
        else:
            a, b = max(i - 1, 0), min(i + 1, len(ks) - 1)
            vs.append((ps[b] - ps[a]) / max(ts[b] - ts[a], 1e-6))
    out = np.zeros((len(t), 3))
    for i in range(len(ks) - 1):
        m = (t >= ts[i]) & (t <= ts[i + 1])
        out[m] = hermite(t[m], ts[i], ps[i], vs[i], ts[i + 1], ps[i + 1], vs[i + 1])
    out[t < ts[0]] = ps[0]; out[t > ts[-1]] = ps[-1]
    return out


def yaw(deg_):
    return rz(deg_)


class Seg:
    """片段的公共结果：t, C, B, Q, pins。"""

    def __init__(self, t):
        self.t = t


class Perf:
    def __init__(self, sk):
        self.sk = sk
        self.rig = Rig(sk)
        self.L = library(self.rig)
        self.segs = []
        self.pins = []      # dict(limb, t0, t1, pos, yaw, normal, heel(t)->角度, fade)
        self.events = {}    # 名字 → 时间（起跳、落地等，给镜头和剪辑用）

    # ---------- 身体局部的正向运动学 ----------
    def body_fk(self, Q, B, root=None):
        q = Q.copy()
        q[:, self.sk.i("Hips")] = B
        r = np.zeros((len(Q), 3)) if root is None else root
        return self.sk.fk(r, q)

    def com_rel(self, Q, B):
        W, P, T = self.body_fk(Q, B)
        return self.sk.com(P, T)

    def toe_rel(self, Q, B):
        W, P, T = self.body_fk(Q, B)
        return P[:, self.sk.i("LeftToeBase")], P[:, self.sk.i("RightToeBase")]

    def state_at(self, t):
        """已有片段在 t 时刻的 (C, V, B, Q)。"""
        s = self.segs[-1]
        k = int(np.clip(np.searchsorted(s.t, t), 1, len(s.t) - 1))
        V = (s.C[k] - s.C[k - 1]) * HZ
        return s.C[k], V, s.B[k], s.Q[k]

    def _qtrack(self, t, keys):
        """keys: [(t, Pose或(n,4))] → (N, n, 4)，相邻关键姿势之间平滑过渡。"""
        ks = sorted(keys, key=lambda k: k[0])
        arr = [k[1].array(self.sk) if isinstance(k[1], Pose) else np.asarray(k[1]) for k in ks]
        ts = np.array([k[0] for k in ks])
        out = np.zeros((len(t), self.sk.n, 4))
        for j, tt in enumerate(t):
            i = int(np.clip(np.searchsorted(ts, tt) - 1, 0, len(ts) - 2)) if len(ts) > 1 else 0
            if len(ts) == 1 or tt <= ts[0]:
                out[j] = arr[0]; continue
            if tt >= ts[-1]:
                out[j] = arr[-1]; continue
            u = ease((tt - ts[i]) / (ts[i + 1] - ts[i]))
            out[j] = slerp(arr[i], arr[i + 1], u)
        return out

    # ---------- 片段 ----------
    def stand(self, t0, t1, pos, heading, pose="stand", feet_w=0.24):
        """静止站立（或摆姿势）。heading：面朝方向相对 -Y 的偏航角（度，逆时针为正）。"""
        t = np.arange(t0, t1, 1 / HZ)
        s = Seg(t)
        p = self.L[pose] if isinstance(pose, str) else pose
        s.Q = self._qtrack(t, [(t0, p)])
        s.B = np.tile(yaw(heading), (len(t), 1))
        feet = self._feet_pts(pos, heading, feet_w)
        root = self._root_for_feet(s.Q[:1], s.B[:1], feet, heel=0)
        s.C = np.tile(root + self.com_rel(s.Q[:1], s.B[:1])[0], (len(t), 1))
        self._add(s)
        for sd, fp in zip(("Left", "Right"), feet):
            self.pins.append(dict(limb=sd + "Foot", t0=t0, t1=t1, pos=fp, yaw=heading, heel=lambda tt: 0 * tt))
        return s

    def mocap(self, clip, t0, t1, pos, heading, clip_t0=0.0, speed=1.0):
        """播放一段动捕（root, q 按 HZ 采样），使 clip_t0 时刻的骨盆水平位置落在 pos、整体朝向 heading。"""
        root, q = clip
        t = np.arange(t0, t1, 1 / HZ)
        ct = clip_t0 + (t - t0) * speed
        k = np.clip(ct * HZ, 0, len(root) - 1.001)
        i = k.astype(int); a = (k - i)[:, None]
        r = root[i] * (1 - a) + root[i + 1] * a
        qq = slerp(q[i], q[i + 1], a)
        k0 = int(np.clip(clip_t0 * HZ, 0, len(root) - 1))
        # 动捕本身的前进方向（-Y）对齐到 heading
        Y = yaw(heading)
        r = qrot(Y, r - np.array([root[k0, 0], root[k0, 1], 0]))
        r[:, :2] += np.asarray(pos)[:2]
        r[:, 2] += pos[2]
        s = Seg(t)
        s.Q = qq.copy()
        s.B = qmul(Y, qq[:, self.sk.i("Hips")])
        W, P, T = self.sk.fk(r, np.concatenate([qq[:, :0], qq], 1) if False else self._with_hips(qq, s.B))
        s.C = self.sk.com(P, T)
        self._add(s)
        return s

    def clip(self, c, t0, cs=0.0, ce=None, speed=1.0, heading=0.0, at=None, anchors=(), ground=0.0, name=None):
        """播放动捕片段 c（clips.Clip）的 [cs, ce] 段，从 sim 时间 t0 开始，播放速度 speed。

        朝向：把片段在这段时间里的水平前进方向转到 heading。
        位置：at 给定时把 cs 时刻的骨盆水平位置放到 at；否则接着上一片段的骨盆位置。片段的地面放到高度 ground。
        anchors：[(片段时间, 世界坐标 xy 或 xyz)]，要求骨盆在这些时刻经过这些位置。修正量只在双脚离地的帧里累积，
        所以落脚点不会滑动；修正只改变腾空段的距离和高度。
        """
        ce = c.T if ce is None else ce
        ct = np.arange(cs, ce, speed / HZ)
        t = t0 + (ct - cs) / speed
        k = np.clip(ct * HZ, 0, len(c.root) - 1.001)
        i = k.astype(int); a = (k - i)
        r = c.root[i] * (1 - a[:, None]) + c.root[i + 1] * a[:, None]
        qq = slerp(c.q[i], c.q[i + 1], a[:, None])
        fwd = c.heading_dir(cs, ce)
        clip_yaw = np.degrees(np.arctan2(fwd[0], -fwd[1]))     # 相对 -Y 的偏航（逆时针为正：-Y 转向 +X 为正）
        Y = yaw(heading - clip_yaw)
        k0 = int(np.clip(cs * HZ, 0, len(c.root) - 1))
        r = qrot(Y, r - np.array([c.root[k0, 0], c.root[k0, 1], c.ground]))
        if at is not None:
            start = np.array([at[0], at[1], ground])
        elif self.segs:
            prev = self.segs[-1]
            j = min(np.searchsorted(prev.t, t0), len(prev.t) - 1)
            pr = prev.C[j] - self.com_rel(prev.Q[j:j + 1], prev.B[j:j + 1])[0]
            start = np.array([pr[0], pr[1], ground])
        else:
            start = np.array([0, 0, ground])
        r += start
        # 锚点修正
        if anchors:
            air = np.ones(len(ct))
            for sd in c.contacts:
                for a0, a1 in c.contacts[sd]:
                    air[(ct >= a0) & (ct <= a1)] = 0
            pts = [(ct[0], np.zeros(3))]
            for at_t, pos in anchors:
                j = int(np.clip((at_t - cs) / speed * HZ, 0, len(ct) - 1))
                pos = np.asarray(pos, float)
                tgt = np.array([pos[0], pos[1], r[j, 2] if len(pos) < 3 else pos[2]])
                pts.append((ct[j], tgt - r[j]))
            off = np.zeros((len(ct), 3))
            for (ta, oa), (tb, ob) in zip(pts[:-1], pts[1:]):
                m = (ct >= ta) & (ct <= tb)
                w = np.cumsum(air[m]); w = w / w[-1] if w[-1] > 0 else np.linspace(0, 1, m.sum())
                off[m] = oa + (ob - oa) * w[:, None]
                off[ct > tb] = ob
            r += off
        s = Seg(t)
        s.Q = qq.copy()
        s.B = qmul(Y, qq[:, self.sk.i("Hips")])
        W, P, T = self.sk.fk(r, self._with_hips(qq, s.B))
        s.C = self.sk.com(P, T)
        self._add(s)
        if name:
            self.events[name] = dict(t0=t0, t1=t[-1], speed=speed, cs=cs, clip=c,
                                     to_sim=lambda x, _t0=t0, _cs=cs, _sp=speed: _t0 + (x - _cs) / _sp)
        return t[-1]

    def _with_hips(self, Q, B):
        q = Q.copy(); q[:, self.sk.i("Hips")] = B
        return q

    def jump(self, t_a, t_off, t_land, t_b, F0, F1, heading, flips=0.0, twists=0.0, axis="lat", tilt=0.0,
             shapes=(("tuck", 0.25), ("tuck", 0.6), ("spot", 0.85)), start="crouch", dip=0.12,
             end="land", end_pose="stand", v_end=None, lean=None, twist_window=(0.1, 0.72), heading1=None,
             gscale=1.0, heel_lift=50, absorb=0.18, land_back=0.08, name="jump"):
        """起跳—腾空—落地。

        F0/F1：起跳/落地时两脚前掌的位置 [左, 右]；heading：起跳时面朝方向；heading1：落地后面朝方向
        （缺省按转体圈数推算）。flips 正为前空翻、负为后空翻；axis：lat 左右轴（前后空翻）、fwd 前后轴（侧空翻）、
        up 竖直轴（旋子、蝴蝶转体，配合 lean 把身体放平）。tilt：空翻轴倾斜（cork 类）。
        shapes：[(姿势名, 飞行进度 0..1)]。lean：[(t, 绕左右轴度数, 绕前后轴度数)] 额外的身体倾斜。
        """
        sk = self.sk
        t = np.arange(t_a, t_b, 1 / HZ)
        T = t_land - t_off
        s = Seg(t)
        if heading1 is None:
            heading1 = heading + 360 * twists
        # 1. 身体形状
        keys = [(t_a, self.L[start] if isinstance(start, str) else start),
                (t_a + (t_off - t_a) * 0.55, self.L["crouch"]),
                (t_off - 0.02, self.L["drive"])]
        for nm, u in shapes:
            keys.append((t_off + u * T, self.L[nm] if isinstance(nm, str) else nm))
        keys += [(t_land, self.L["spot"]), (t_land + absorb, self.L[end]), (t_b, self.L[end_pose])]
        # 起跳前的姿势沿用上一片段，保证接缝处形状一致
        if self.segs:
            _, _, _, Qa = self.state_at(t_a)
            keys[0] = (t_a, Qa)
        s.Q = self._qtrack(t, keys)
        # 2. 旋转：flip 轴（起跳时的朝向坐标系里）和转体
        H = yaw(heading)
        ax_local = {"lat": [1.0, 0, 0], "fwd": [0, -1.0, 0], "up": [0, 0, 1.0]}[axis]
        if tilt:
            ax_local = qrot(axis_angle([0, -1.0, 0], np.radians(tilt)), ax_local)
        ax_world = qrot(H, ax_local)
        Lq = np.tile(ID, (len(t), 1))
        if lean:
            lt = np.array([l[0] for l in lean])
            for j, tt in enumerate(t):
                a = np.interp(tt, lt, [l[1] for l in lean]); b = np.interp(tt, lt, [l[2] for l in lean])
                Lq[j] = qmul(axis_angle([1.0, 0, 0], np.radians(a)), axis_angle([0, -1.0, 0], np.radians(b)))
        # 转动惯量（身体坐标系）
        W, P, Tt = self.body_fk(s.Q, np.tile(ID, (len(t), 1)))
        ax_body = qrot(qconj(Lq), np.tile(ax_local, (len(t), 1)))
        I_flip = sk.inertia(P, Tt, ax_body)
        I_long = sk.inertia(P, Tt, np.tile([0, 0, 1.0], (len(t), 1)))
        env = np.interp(t, [t_a, t_a + (t_off - t_a) * 0.45, t_off, t_land, t_land + 0.08],
                        [0, 0, 1, 1, 0])
        rate = env / I_flip
        phi = np.cumsum(rate) / HZ
        phi = phi / max(phi[-1], 1e-9) * flips * 2 * np.pi if flips else phi * 0
        u = (t - t_off) / T
        tw_env = np.interp(u, [twist_window[0] - 0.08, twist_window[0], twist_window[1], twist_window[1] + 0.12], [0, 1, 1, 0])
        rate2 = tw_env / I_long
        psi = np.cumsum(rate2) / HZ
        psi = psi / max(psi[-1], 1e-9) * twists * 2 * np.pi if twists else psi * 0
        # 落地后朝向从起跳朝向过渡到 heading1（转体圈数不是整数时由 psi 带过去）
        s.B = qnorm(qmul(qmul(axis_angle(np.tile(ax_world, (len(t), 1)), phi), qmul(np.tile(H, (len(t), 1)), Lq)),
                         axis_angle(np.tile([0, 0, 1.0], (len(t), 1)), psi)))
        # 3. 落地姿态修正：落地瞬间质心应在两脚后方 land_back 米（沿前进方向），否则绕脚把身体整体前倾/后仰，
        #    修正量在腾空后半段渐入、落地缓冲后渐出
        i_off = int((t_off - t_a) * HZ); i_land = min(int((t_land - t_a) * HZ), len(t) - 1)
        i_end = len(t) - 1
        f1m = np.mean(np.asarray(F1, float), 0)
        trav = f1m - np.mean(np.asarray(F0, float), 0); trav[2] = 0
        if land_back is not None and np.linalg.norm(trav) > 0.3:
            trav = unit(trav)
            n_ax = unit(np.cross([0, 0, 1.0], trav))
            wfix = np.interp(t, [t_off + 0.5 * T, t_land, t_land + absorb, t_b], [0, 1, 0.6, 0])
            alpha = 0.0
            for it in range(3):
                Bl = qmul(axis_angle(n_ax, alpha), s.B[i_land])[None]
                cl = self._root_for_feet(s.Q[i_land:i_land + 1], Bl, F1, toes=True) + self.com_rel(s.Q[i_land:i_land + 1], Bl)[0]
                d = (cl - f1m) @ trav
                h = max(cl[2] - f1m[2], 0.3)
                alpha += np.arcsin(np.clip((-land_back - d) / h, -0.9, 0.9))
            s.B = qnorm(qmul(axis_angle(np.tile(n_ax, (len(t), 1)), alpha * wfix), s.B))
        # 4. 质心
        c_off = self._root_for_feet(s.Q[i_off:i_off + 1], s.B[i_off:i_off + 1], F0, toes=True) + \
            self.com_rel(s.Q[i_off:i_off + 1], s.B[i_off:i_off + 1])[0]
        c_land = self._root_for_feet(s.Q[i_land:i_land + 1], s.B[i_land:i_land + 1], F1, toes=True) + \
            self.com_rel(s.Q[i_land:i_land + 1], s.B[i_land:i_land + 1])[0]
        g = G * gscale
        v0 = (c_land - c_off) / T - 0.5 * g * T
        v1 = v0 + g * T
        if self.segs:
            c_a, v_a, B_a, _ = self.state_at(t_a)
        else:
            c_a = self._root_for_feet(s.Q[:1], s.B[:1], F0, heel=0) + self.com_rel(s.Q[:1], s.B[:1])[0]
            v_a = np.zeros(3)
        i_dip = int((t_off - t_a) * 0.55 * HZ)
        c_dip = self._root_for_feet(s.Q[i_dip:i_dip + 1], s.B[i_dip:i_dip + 1], F0, heel=0) + \
            self.com_rel(s.Q[i_dip:i_dip + 1], s.B[i_dip:i_dip + 1])[0]
        c_dip = c_dip + (c_off - c_dip) * 0.0
        c_end = self._root_for_feet(s.Q[i_end:], s.B[i_end:], F1, heel=0) + self.com_rel(s.Q[i_end:], s.B[i_end:])[0]
        i_abs = min(int((t_land + absorb - t_a) * HZ), len(t) - 1)
        c_abs = self._root_for_feet(s.Q[i_abs:i_abs + 1], s.B[i_abs:i_abs + 1], F1, heel=0) + \
            self.com_rel(s.Q[i_abs:i_abs + 1], s.B[i_abs:i_abs + 1])[0]
        ground = [(t_a, c_a, v_a), (t_a + (t_off - t_a) * 0.55, c_dip, None), (t_off, c_off, v0)]
        C = np.zeros((len(t), 3))
        m = t <= t_off
        C[m] = spline(t[m], ground)
        m = (t > t_off) & (t < t_land)
        tf = (t[m] - t_off)[:, None]
        C[m] = c_off + v0 * tf + 0.5 * g * tf ** 2
        m = t >= t_land
        ve = np.zeros(3) if v_end is None else np.asarray(v_end, float)
        C[m] = spline(t[m], [(t_land, c_land, v1), (t_land + absorb, c_abs, v1 * 0.08 + ve * 0.5), (t_b, c_end, ve)])
        s.C = C
        self._add(s)
        heel0 = lambda tt: np.interp(tt, [t_a, t_off - (t_off - t_a) * 0.4, t_off], [0, 0, heel_lift])
        heel1 = lambda tt: np.interp(tt, [t_land, t_land + 0.06], [heel_lift * 0.6, 0])
        for sd, f0, f1 in zip(("Left", "Right"), F0, F1):
            self.pins.append(dict(limb=sd + "Foot", t0=t_a, t1=t_off, pos=np.asarray(f0, float), yaw=heading,
                                  heel=heel0, toes=True, fade_in=0.08 if self.segs else 0))
            self.pins.append(dict(limb=sd + "Foot", t0=t_land, t1=t_b, pos=np.asarray(f1, float), yaw=heading1,
                                  heel=heel1, toes=True))
        self.events[name] = dict(t_a=t_a, t_off=t_off, t_land=t_land, t_b=t_b, c_off=c_off, c_land=c_land,
                                 apex=c_off + v0 * (-v0[2] / g[2]) + 0.5 * g * (-v0[2] / g[2]) ** 2)
        return s

    # ---------- 工具 ----------
    def _feet_pts(self, pos, heading, w):
        side = qrot(yaw(heading), [w / 2, 0, 0])
        return [np.asarray(pos, float) + side, np.asarray(pos, float) - side]

    def _root_for_feet(self, Q, B, feet, toes=False, heel=None):
        """姿势 (Q,B) 下，使两脚（前掌或脚踝投影）中点落在 feet 中点时的 root 位置。"""
        W, P, T = self.body_fk(Q, B)
        sk = self.sk
        if toes:
            a = P[0, sk.i("LeftToeBase")]; b = P[0, sk.i("RightToeBase")]
            off = np.array([0, 0, 0.02])
        else:
            a = P[0, sk.i("LeftFoot")]; b = P[0, sk.i("RightFoot")]
            off = np.array([0, 0, sk.ankle_h])
        return np.mean(np.asarray(feet, float), 0) + off - (a + b) / 2

    def _add(self, s):
        """接到已有片段后面：重叠部分用后一片段，但在接缝后 XF 秒内淡入 B、Q。"""
        XF = 0.12
        if not self.segs:
            self.segs.append(s); return
        prev = self.segs[-1]
        t0 = s.t[0]
        keep = prev.t < t0 - 1e-9
        # 淡入
        n = min(int(XF * HZ), len(s.t))
        k = np.clip(np.searchsorted(prev.t, s.t[:n]), 0, len(prev.t) - 1)
        w = ease(np.arange(n) / max(n - 1, 1))
        s.B[:n] = slerp(prev.B[k], s.B[:n], w)
        s.Q[:n] = slerp(prev.Q[k], s.Q[:n], w[:, None])
        # 质心如果片段自己没从上一片段的状态接续，也做位置淡入
        dc = prev.C[k[0]] - s.C[0]
        if np.linalg.norm(dc) > 1e-3:
            s.C[:n] += dc * (1 - w)[:, None]
        merged = Seg(np.concatenate([prev.t[keep], s.t]))
        merged.C = np.concatenate([prev.C[keep], s.C]); merged.B = np.concatenate([prev.B[keep], s.B])
        merged.Q = np.concatenate([prev.Q[keep], s.Q])
        self.segs[-1] = merged

    # ---------- 输出 ----------
    def solve(self):
        """返回 (t, root, q)。"""
        sk = self.sk
        s = self.segs[-1]
        t, C, B, Q = s.t, s.C, qnorm(s.B), s.Q.copy()
        root = C - self.com_rel(Q, B)
        q = self._with_hips(Q, B)
        # 解两次：IK 改变腿的姿势后质心会稍微变化，再校正一次 root
        for it in range(2):
            q = self._ik(t, root, q)
            if it == 0:
                root = C - self.com_rel(q, B)
        return t, root, qnorm(q)

    def _ik(self, t, root, q):
        sk, rig = self.sk, self.rig
        q = q.copy()
        W, P, T = sk.fk(root, q)
        for pin in self.pins:
            limb = pin["limb"]; side = "Left" if limb.startswith("Left") else "Right"
            m = np.where((t >= pin["t0"]) & (t < pin["t1"]))[0]
            if not len(m):
                continue
            fade_in = pin.get("fade_in", 0)
            for j in m:
                w = 1.0
                if fade_in:
                    w = ease((t[j] - pin["t0"]) / fade_in)
                w = min(w, ease((pin["t1"] - t[j]) / 0.04 + 0.0)) if pin.get("fade_out") else w
                self._ik_foot(q, W, P, j, side, pin, w, t[j])
        return q

    def _ik_foot(self, q, W, P, j, side, pin, w, tt):
        sk, rig = self.sk, self.rig
        hip, knee, foot, toe = sk.i(f"{side}UpLeg"), sk.i(f"{side}Leg"), sk.i(f"{side}Foot"), sk.i(f"{side}ToeBase")
        # 期望的脚的世界朝向：贴地、朝 yaw，再绕脚尖抬脚跟 heel 度
        Y = yaw(pin["yaw"])
        heel = float(pin["heel"](tt))
        fw = qmul(Y, axis_angle([1.0, 0, 0], np.radians(-heel)))  # 绕左右轴转，脚跟抬起
        rest_toe = sk.head[toe] - sk.head[foot]
        if pin.get("toes"):
            ankle = pin["pos"] + np.array([0, 0, 0.02]) - qrot(fw, rest_toe)
        else:
            ankle = pin["pos"] + np.array([0, 0, sk.ankle_h])
        # 当前骨盆坐标系下解两节 IK
        Wp = W[j, sk.parent[hip]]
        a = P[j, hip]
        l1, l2 = rig.r[side + "leglen"]
        knee_dir = qrot(W[j, sk.i("Hips")], [0, -1.0, 0.25])
        up, lo = Rig.two_bone(a, ankle, l1, l2, knee_dir)
        tmp = Pose()
        rig.leg_dirs(tmp, side, qrot(qconj(Wp), up), qrot(qconj(Wp), lo))
        q_hip = tmp[f"{side}UpLeg"]; q_knee = tmp[f"{side}Leg"]
        Wk = qmul(qmul(Wp, q_hip), q_knee)
        q_foot = qmul(qconj(Wk), fw)
        q[j, hip] = slerp(q[j, hip], q_hip, w)
        q[j, knee] = slerp(q[j, knee], q_knee, w)
        q[j, foot] = slerp(q[j, foot], q_foot, w)
