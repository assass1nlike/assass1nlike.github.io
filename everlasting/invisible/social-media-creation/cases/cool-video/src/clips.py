"""动捕片段库：Mixamo / CMU 动作重定向到角色骨架后按 perf.HZ 采样，并检测脚的着地区间和腾空区间。"""
import functools
import glob
import os

import numpy as np

import mixamo
from bvh import BVH, retarget as bvh_retarget, resample
from perf import HZ

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Clip:
    def __init__(self, name, root, q, sk):
        self.name = name
        self.root, self.q = root, q
        self.T = (len(root) - 1) / HZ
        W, P, T = sk.fk(root, q)
        self.toe = {s: P[:, sk.i(f"{s}ToeBase")] for s in ("Left", "Right")}
        self.ankle = {s: P[:, sk.i(f"{s}Foot")] for s in ("Left", "Right")}
        self.hand = {s: P[:, sk.i(f"{s}Hand")] for s in ("Left", "Right")}
        g = min(min(self.toe[s][:, 2].min(), self.ankle[s][:, 2].min() - sk.ankle_h) for s in self.toe)
        self.ground = g          # 片段里地面的高度（取脚的最低点）
        self.contacts = {s: self._contacts(s, sk) for s in ("Left", "Right")}

    def _contacts(self, side, sk, h=0.07, v=0.9):
        """脚着地的区间 [(t0, t1)]：脚前掌或脚踝足够低，且水平速度足够小。"""
        toe = self.toe[side]; ank = self.ankle[side]
        low = np.minimum(toe[:, 2] - self.ground, ank[:, 2] - sk.ankle_h - self.ground) < h
        spd = np.linalg.norm(np.gradient(toe[:, :2], axis=0) * HZ, axis=1)
        on = low & (spd < v)
        out, start = [], None
        for k, o in enumerate(on):
            if o and start is None:
                start = k
            if (not o or k == len(on) - 1) and start is not None:
                if k - start > HZ * 0.04:
                    out.append((start / HZ, k / HZ))
                start = None
        return out

    def airborne(self):
        """两只脚都不着地的最长区间 (起跳, 落地)。"""
        on = np.zeros(len(self.root), bool)
        for s in self.contacts:
            for a, b in self.contacts[s]:
                on[int(a * HZ):int(b * HZ) + 1] = True
        best, start = (0, 0), None
        for k, o in enumerate(on):
            if not o and start is None:
                start = k
            if (o or k == len(on) - 1) and start is not None:
                if k - start > best[1] - best[0]:
                    best = (start, k)
                start = None
        return best[0] / HZ, best[1] / HZ

    def heading_dir(self, t0=0.0, t1=None):
        """片段在 [t0,t1] 内骨盆的水平位移方向。"""
        t1 = self.T if t1 is None else t1
        a = self.root[int(t0 * HZ)]; b = self.root[min(int(t1 * HZ), len(self.root) - 1)]
        d = b - a; d[2] = 0
        return d / max(np.linalg.norm(d), 1e-9)


@functools.lru_cache(maxsize=None)
def _load(sk_name, name):
    from skel import Skel
    sk = Skel(sk_name)
    if name.startswith("cmu:"):
        root, q = bvh_retarget(BVH(os.path.join(ROOT, "vendor", "bvh", name[4:] + ".bvh")), sk)
        src_dt = 1 / 120
    else:
        f = glob.glob(os.path.join(ROOT, "build", "mixamo", name + "*.npz"))
        if not f:
            raise FileNotFoundError(name)
        d = mixamo.load(f[0])
        root, q = mixamo.retarget(d, sk)
        src_dt = 1 / float(d["fps"])
    t_src = np.arange(len(root)) * src_dt
    t = np.arange(0, t_src[-1], 1 / HZ)
    root, q = resample(t_src, root, q, t)
    return Clip(name, root, q, sk)


def get(sk, name):
    return _load(sk.name, name)
