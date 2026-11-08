"""Mixamo 动作（tools/mixamo_bake.py 的输出）重定向到角色骨架，输出对齐旋转（见 skel.py）。"""
import numpy as np

from quat import qmul, qconj, qrot, from_two, qnorm, ID

# 我们的骨骼 → Mixamo 骨骼
MAP = {"Hips": "Hips", "LowerBack": "Spine", "Spine": "Spine1", "Spine1": "Spine2", "Neck": "Neck", "Neck1": "Neck",
       "Head": "Head"}
for s in ("Left", "Right"):
    MAP.update({f"{s}Shoulder": f"{s}Shoulder", f"{s}Arm": f"{s}Arm", f"{s}ForeArm": f"{s}ForeArm",
                f"{s}Hand": f"{s}Hand", f"{s}UpLeg": f"{s}UpLeg", f"{s}Leg": f"{s}Leg", f"{s}Foot": f"{s}Foot",
                f"{s}ToeBase": f"{s}ToeBase", f"{s}FingerBase": f"{s}HandMiddle1",
                f"{s}HandFinger1": f"{s}HandMiddle2", f"{s[0]}Thumb": f"{s}HandThumb1"})
# 骨骼方向取自骨骼头 → 这个子骨骼的骨骼头
CHILD = {"Hips": "Spine", "Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head", "Head": "HeadTop_End"}
for s in ("Left", "Right"):
    CHILD.update({f"{s}Shoulder": f"{s}Arm", f"{s}Arm": f"{s}ForeArm", f"{s}ForeArm": f"{s}Hand",
                  f"{s}Hand": f"{s}HandMiddle1", f"{s}UpLeg": f"{s}Leg", f"{s}Leg": f"{s}Foot",
                  f"{s}Foot": f"{s}ToeBase", f"{s}ToeBase": f"{s}Toe_End", f"{s}HandMiddle1": f"{s}HandMiddle2",
                  f"{s}HandMiddle2": f"{s}HandMiddle3", f"{s}HandThumb1": f"{s}HandThumb2"})


def load(path):
    d = np.load(path)
    return {k: d[k] for k in d.files}


def retarget(d, sk):
    names = list(d["names"])
    ix = {n: i for i, n in enumerate(names)}
    rq, rp, Q, P = d["rest_q"], d["rest_p"], d["q"], d["p"]
    nf = len(Q)
    Wt = np.tile(ID, (nf, sk.n, 1))
    for b, name in enumerate(sk.names):
        s = MAP.get(name)
        if s is None or s not in ix:
            Wt[:, b] = Wt[:, sk.parent[b]] if sk.parent[b] >= 0 else ID
            continue
        j = ix[s]
        delta = qmul(Q[:, j], qconj(rq[j]))         # 从静止姿势到当前姿势的世界旋转
        if name == "Hips":
            Wt[:, b] = delta
            continue
        c = CHILD.get(s)
        ds = rp[ix[c]] - rp[j] if c in ix else qrot(rq[j], [0, 1.0, 0])
        dt = sk.tail[b] - sk.head[b]
        Wt[:, b] = qmul(delta, from_two(dt, ds))
    q = np.zeros_like(Wt)
    for b in range(sk.n):
        p = sk.parent[b]
        q[:, b] = Wt[:, b] if p < 0 else qmul(qconj(Wt[:, p]), Wt[:, b])
    # 位移按腿长缩放
    lt = np.linalg.norm(rp[ix["LeftLeg"]] - rp[ix["LeftUpLeg"]]) + np.linalg.norm(rp[ix["LeftFoot"]] - rp[ix["LeftLeg"]])
    scale = sk.leg / lt
    hip_rest = rp[ix["Hips"]]
    root = (P[:, ix["Hips"]] - hip_rest * np.array([1, 1, 0])) * scale
    root[:, 2] += sk.hip_h - hip_rest[2] * scale
    return root, qnorm(q)
