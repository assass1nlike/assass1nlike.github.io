"""读 CMU BVH 并重定向到角色骨架（输出对齐旋转，见 skel.py）。"""
import numpy as np

from quat import qmul, qconj, qrot, rx, deg, from_two, ID, qnorm

# BVH 是 Y 向上、角色面朝 +Z；我们是 Z 向上、面朝 -Y。绕 X 转 90° 正好对应。
QM = rx(90)


class BVH:
    def __init__(self, path):
        tok = open(path).read().split()
        self.names, self.parent, self.offset, self.chans = [], [], [], []
        self.end = {}
        stack, i, last = [], 0, -1
        while tok[i] != "MOTION":
            t = tok[i]
            if t in ("ROOT", "JOINT"):
                self.names.append(tok[i + 1]); self.parent.append(stack[-1] if stack else -1)
                last = len(self.names) - 1; i += 2
            elif t == "End":
                last = ("end", stack[-1]); i += 2
            elif t == "{":
                stack.append(last if not isinstance(last, tuple) else last); i += 1
            elif t == "}":
                stack.pop(); i += 1
            elif t == "OFFSET":
                v = [float(x) for x in tok[i + 1:i + 4]]
                if isinstance(stack[-1], tuple):
                    self.end[stack[-1][1]] = v
                else:
                    self.offset.append(v)
                i += 4
            elif t == "CHANNELS":
                n = int(tok[i + 1]); self.chans.append(tok[i + 2:i + 2 + n]); i += 2 + n
            else:
                i += 1
        nf = int(tok[i + 2]); self.dt = float(tok[i + 5])
        data = np.array(tok[i + 6:], float).reshape(nf, -1)
        # cgspeed 转换版第一帧是 T-pose 标定帧，去掉
        data = data[1:]; nf -= 1
        self.n = len(self.names)
        self.offset = np.array(self.offset)
        self.nf = nf
        # 解析通道 → 根位置 + 每个关节的局部旋转（BVH 坐标）
        self.root = np.zeros((nf, 3))
        self.q = np.tile(ID, (nf, self.n, 1))
        c = 0
        for j, ch in enumerate(self.chans):
            q = np.tile(ID, (nf, 1))
            for name in ch:
                v = data[:, c]; c += 1
                if name.endswith("position"):
                    self.root[:, "XYZ".index(name[0])] = v
                else:
                    q = qmul(q, deg({"X": [1, 0, 0], "Y": [0, 1, 0], "Z": [0, 0, 1]}[name[0]], v))
            self.q[:, j] = q
        # 转到我们的坐标系
        self.root = qrot(QM, self.root)
        self.offset = qrot(QM, self.offset)
        self.q = qmul(qmul(QM, self.q), qconj(QM))
        for k in self.end:
            self.end[k] = qrot(QM, np.array(self.end[k]))
        self.idx = {n: i for i, n in enumerate(self.names)}

    def world(self):
        W = np.zeros_like(self.q)
        P = np.zeros(self.q.shape[:-1] + (3,))
        for j in range(self.n):
            p = self.parent[j]
            if p < 0:
                W[:, j] = self.q[:, j]; P[:, j] = self.root + self.offset[j]
            else:
                W[:, j] = qmul(W[:, p], self.q[:, j]); P[:, j] = P[:, p] + qrot(W[:, p], self.offset[j])
        return W, P

    def rest_dir(self, j):
        """静止时关节 j 指向其第一个子关节（或末端）的方向。"""
        kids = [k for k in range(self.n) if self.parent[k] == j and np.linalg.norm(self.offset[k]) > 1e-6]
        v = self.offset[kids[0]] if kids else np.asarray(self.end.get(j, [0, 0, 1.0]))
        if j == self.idx.get("Hips"):
            v = self.offset[self.idx["LowerBack"]] if np.linalg.norm(self.offset[self.idx["LowerBack"]]) > 1e-6 else np.array([0, 0, 1.0])
        return v / max(np.linalg.norm(v), 1e-9)

    def leg_len(self):
        a, b = self.idx["LeftLeg"], self.idx["LeftFoot"]
        return np.linalg.norm(self.offset[a]) + np.linalg.norm(self.offset[b])


NAME_MAP = {"LeftHandFinger1": "LeftHandIndex1", "RightHandFinger1": "RightHandIndex1"}


def retarget(bvh, sk, fps=None):
    """返回 (root (nf,3), q (nf,n,4))，按 fps 重采样（None 表示保持原帧率）。"""
    Ws, Ps = bvh.world()
    nf = bvh.nf
    Wt = np.tile(ID, (nf, sk.n, 1))
    for b, name in enumerate(sk.names):
        s = bvh.idx.get(NAME_MAP.get(name, name))
        if s is None:
            Wt[:, b] = Wt[:, sk.parent[b]] if sk.parent[b] >= 0 else ID
            continue
        dt = sk.tail[b] - sk.head[b]
        ds = bvh.rest_dir(s)
        if name == "Hips":
            A = ID          # 骨盆用整体朝向，不按骨骼方向修正
        else:
            A = from_two(dt, ds)
        Wt[:, b] = qmul(Ws[:, s], A)
    q = np.zeros_like(Wt)
    for b in range(sk.n):
        p = sk.parent[b]
        q[:, b] = Wt[:, b] if p < 0 else qmul(qconj(Wt[:, p]), Wt[:, b])
    scale = sk.leg / bvh.leg_len() * 0.5 * 2  # 腿长比
    # 用小腿+大腿比较：sk.leg 是髋到踝
    scale = sk.leg / (np.linalg.norm(bvh.offset[bvh.idx["LeftLeg"]]) + np.linalg.norm(bvh.offset[bvh.idx["LeftFoot"]]))
    root = Ps[:, bvh.idx["Hips"]] * scale
    if fps:
        t_src = np.arange(nf) * bvh.dt
        t = np.arange(0, t_src[-1], 1 / fps)
        root, q = resample(t_src, root, q, t)
    return root, qnorm(q)


def resample(t_src, root, q, t):
    from quat import slerp
    k = np.clip(np.searchsorted(t_src, t, side="right") - 1, 0, len(t_src) - 2)
    a = ((t - t_src[k]) / (t_src[k + 1] - t_src[k]))
    r = root[k] * (1 - a[:, None]) + root[k + 1] * a[:, None]
    qq = slerp(q[k], q[k + 1], a[:, None])
    return r, qq
