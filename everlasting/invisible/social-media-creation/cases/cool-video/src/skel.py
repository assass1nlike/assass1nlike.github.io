"""骨架与正向运动学。

姿态的表示：每根骨骼一个"对齐旋转" q[b]，是在父骨骼当前姿态下、以静止时的世界坐标轴为轴的旋转。
所有骨骼静止时 q = 单位四元数；X 轴指向角色左侧，Y 指向身后，Z 向上（角色面朝 -Y）。
世界旋转 W[b] = W[parent] · q[b]；骨骼头的位置 P[b] = P[parent] + W[parent]·(rest_head[b] - rest_head[parent])。
Hips 的 q 就是整个身体的世界旋转，root 是 Hips 头部的世界位置。
"""
import json
import os

import numpy as np

from quat import qmul, qrot, qconj, ID

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 各节段占体重的比例（参考 de Leva 1996），质心取在骨骼中点
MASS = {"Hips": 0.11, "LowerBack": 0.12, "Spine": 0.13, "Spine1": 0.14, "Neck": 0.01, "Neck1": 0.01, "Head": 0.065,
        "LeftArm": 0.027, "RightArm": 0.027, "LeftForeArm": 0.016, "RightForeArm": 0.016,
        "LeftHand": 0.006, "RightHand": 0.006, "LeftFingerBase": 0.0, "RightFingerBase": 0.0,
        "LeftUpLeg": 0.10, "RightUpLeg": 0.10, "LeftLeg": 0.045, "RightLeg": 0.045,
        "LeftFoot": 0.013, "RightFoot": 0.013}


def export_from_blender(rig, path):
    """在 Blender 里调用：把骨架静止数据写成 json。"""
    bones = []
    for b in rig.data.bones:
        bones.append(dict(name=b.name, parent=b.parent.name if b.parent else None,
                          head=list(b.head_local), tail=list(b.tail_local),
                          mat=[list(r) for r in b.matrix_local.to_3x3()]))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(dict(bones=bones), open(path, "w"), indent=1)


class Skel:
    def __init__(self, name):
        d = json.load(open(os.path.join(ROOT, "build", "skel", f"{name}.json")))
        self.name = name
        self.names = [b["name"] for b in d["bones"]]
        self.idx = {n: i for i, n in enumerate(self.names)}
        self.parent = [self.idx[b["parent"]] if b["parent"] else -1 for b in d["bones"]]
        self.head = np.array([b["head"] for b in d["bones"]])
        self.tail = np.array([b["tail"] for b in d["bones"]])
        self.rest = np.array([b["mat"] for b in d["bones"]])      # 3x3，骨骼局部 → 骨架空间
        self.n = len(self.names)
        # 保证父骨骼在前
        assert all(p < i for i, p in enumerate(self.parent))
        self.mass = np.array([MASS.get(n, 0.0) for n in self.names])
        self.mass /= self.mass.sum()
        self.leg = np.linalg.norm(self.head[self.idx["LeftUpLeg"]] - self.head[self.idx["LeftFoot"]])
        self.hip_h = self.head[self.idx["Hips"]][2]
        # 脚底到踝关节的高度
        self.ankle_h = self.head[self.idx["LeftFoot"]][2]

    def i(self, n):
        return self.idx[n]

    def fk(self, root, q):
        """root (..., 3)，q (..., n, 4) → 世界旋转 W (..., n, 4)、骨骼头 P、骨骼尾 T。"""
        q = np.asarray(q, float)
        sh = q.shape[:-2]
        W = np.zeros(sh + (self.n, 4))
        P = np.zeros(sh + (self.n, 3))
        for b in range(self.n):
            p = self.parent[b]
            if p < 0:
                W[..., b, :] = q[..., b, :]
                P[..., b, :] = root
            else:
                W[..., b, :] = qmul(W[..., p, :], q[..., b, :])
                P[..., b, :] = P[..., p, :] + qrot(W[..., p, :], self.head[b] - self.head[p])
        T = P + qrot(W, self.tail - self.head)
        return W, P, T

    def com(self, P, T):
        mid = 0.5 * (P + T)
        return (mid * self.mass[:, None]).sum(-2)

    def inertia(self, P, T, axis):
        """绕过质心、方向为 axis 的轴的转动惯量（单位体重）。"""
        mid = 0.5 * (P + T)
        c = (mid * self.mass[:, None]).sum(-2, keepdims=True)
        r = mid - c
        a = np.asarray(axis, float)
        a = a / np.linalg.norm(a, axis=-1, keepdims=True)
        rp = r - (r * a[..., None, :]).sum(-1, keepdims=True) * a[..., None, :]
        # 加一点节段自身的惯量（长度²/12）
        L2 = ((T - P) ** 2).sum(-1)
        return ((rp ** 2).sum(-1) * self.mass + self.mass * L2 / 12 * 0.5).sum(-1)

    def to_blender(self, q):
        """对齐旋转 → Blender pose_bone.rotation_quaternion（骨骼局部）。"""
        from quat import mat_to_q
        R = mat_to_q(self.rest)
        return qmul(qmul(qconj(R), q), R)

    def root_to_blender(self, root):
        h = self.i("Hips")
        d = np.asarray(root) - self.head[h]
        return np.einsum("ji,...j->...i", self.rest[h], d)

    def identity(self, *shape):
        return np.broadcast_to(ID, shape + (self.n, 4)).copy()
