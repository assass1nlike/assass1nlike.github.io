"""numpy 四元数工具，(w, x, y, z) 顺序，与 Blender mathutils 一致。所有函数支持批量（最后一维是 4 或 3）。"""
import numpy as np


def qmul(a, b):
    aw, ax, ay, az = np.moveaxis(np.asarray(a, float), -1, 0)
    bw, bx, by, bz = np.moveaxis(np.asarray(b, float), -1, 0)
    return np.stack([aw * bw - ax * bx - ay * by - az * bz,
                     aw * bx + ax * bw + ay * bz - az * by,
                     aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw], -1)


def qconj(q):
    q = np.asarray(q, float)
    return q * np.array([1, -1, -1, -1])


def qnorm(q):
    q = np.asarray(q, float)
    return q / np.linalg.norm(q, axis=-1, keepdims=True)


def qrot(q, v):
    """用 q 旋转向量 v。"""
    q = np.asarray(q, float)
    v = np.asarray(v, float)
    u = q[..., 1:]
    w = q[..., :1]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)


def axis_angle(axis, ang):
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis, axis=-1, keepdims=True)
    ang = np.asarray(ang, float)[..., None]
    return np.concatenate([np.cos(ang / 2), axis * np.sin(ang / 2)], -1)


def deg(axis, d):
    return axis_angle(axis, np.radians(d))


ID = np.array([1.0, 0, 0, 0])


def rx(d): return deg([1, 0, 0], d)
def ry(d): return deg([0, 1, 0], d)
def rz(d): return deg([0, 0, 1], d)


def qlog(q):
    """q -> 旋转向量（轴 × 角）。"""
    q = qnorm(q)
    q = np.where(q[..., :1] < 0, -q, q)
    v = q[..., 1:]
    s = np.linalg.norm(v, axis=-1, keepdims=True)
    ang = 2 * np.arctan2(s, q[..., :1])
    return np.where(s > 1e-9, v / np.maximum(s, 1e-12) * ang, 2 * v)


def qexp(r):
    r = np.asarray(r, float)
    a = np.linalg.norm(r, axis=-1, keepdims=True)
    ax = np.where(a > 1e-9, r / np.maximum(a, 1e-12), np.array([1.0, 0, 0]))
    return np.concatenate([np.cos(a / 2), ax * np.sin(a / 2)], -1)


def slerp(a, b, t):
    a = qnorm(a); b = qnorm(b)
    d = (a * b).sum(-1, keepdims=True)
    b = np.where(d < 0, -b, b)
    t = np.asarray(t, float)[..., None] if np.ndim(t) else t
    return qmul(a, qexp(qlog(qmul(qconj(a), b)) * t))


def from_two(u, v):
    """把单位向量 u 转到 v 的最小旋转。"""
    u = np.asarray(u, float); v = np.asarray(v, float)
    u = u / np.linalg.norm(u, axis=-1, keepdims=True)
    v = v / np.linalg.norm(v, axis=-1, keepdims=True)
    c = (u * v).sum(-1, keepdims=True)
    ax = np.cross(u, v)
    q = np.concatenate([1 + c, ax], -1)
    # 反向时任取一个垂直轴
    bad = (1 + c)[..., 0] < 1e-8
    if np.any(bad):
        alt = np.cross(u, [1.0, 0, 0])
        alt = np.where(np.linalg.norm(alt, axis=-1, keepdims=True) < 1e-6, np.cross(u, [0, 1.0, 0]), alt)
        q = np.where(bad[..., None], np.concatenate([np.zeros_like(c), alt], -1), q)
    return qnorm(q)


def from_frame(x, y):
    """由两根正交化后的轴 (x, y) 组成的标架对应的旋转（世界 X→x，Y→y）。"""
    x = np.asarray(x, float); y = np.asarray(y, float)
    x = x / np.linalg.norm(x, axis=-1, keepdims=True)
    z = np.cross(x, y); z = z / np.linalg.norm(z, axis=-1, keepdims=True)
    y = np.cross(z, x)
    m = np.stack([x, y, z], -1)
    return mat_to_q(m)


def mat_to_q(m):
    m = np.asarray(m, float)
    sh = m.shape[:-2]
    m = m.reshape(-1, 3, 3)
    out = np.zeros((len(m), 4))
    for i, r in enumerate(m):
        t = np.trace(r)
        if t > 0:
            s = np.sqrt(t + 1) * 2
            out[i] = [0.25 * s, (r[2, 1] - r[1, 2]) / s, (r[0, 2] - r[2, 0]) / s, (r[1, 0] - r[0, 1]) / s]
        elif r[0, 0] > r[1, 1] and r[0, 0] > r[2, 2]:
            s = np.sqrt(1 + r[0, 0] - r[1, 1] - r[2, 2]) * 2
            out[i] = [(r[2, 1] - r[1, 2]) / s, 0.25 * s, (r[0, 1] + r[1, 0]) / s, (r[0, 2] + r[2, 0]) / s]
        elif r[1, 1] > r[2, 2]:
            s = np.sqrt(1 + r[1, 1] - r[0, 0] - r[2, 2]) * 2
            out[i] = [(r[0, 2] - r[2, 0]) / s, (r[0, 1] + r[1, 0]) / s, 0.25 * s, (r[1, 2] + r[2, 1]) / s]
        else:
            s = np.sqrt(1 + r[2, 2] - r[0, 0] - r[1, 1]) * 2
            out[i] = [(r[1, 0] - r[0, 1]) / s, (r[0, 2] + r[2, 0]) / s, (r[1, 2] + r[2, 1]) / s, 0.25 * s]
    return qnorm(out).reshape(*sh, 4)


def q_to_mat(q):
    q = qnorm(q)
    w, x, y, z = np.moveaxis(q, -1, 0)
    return np.stack([np.stack([1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], -1),
                     np.stack([2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], -1),
                     np.stack([2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)], -1)], -2)


def euler(xyz_deg, order="XYZ"):
    """内旋欧拉角（依次绕自身轴），返回四元数。"""
    q = ID
    for ax, d in zip(order, xyz_deg):
        q = qmul(q, deg({"X": [1, 0, 0], "Y": [0, 1, 0], "Z": [0, 0, 1]}[ax], d))
    return q
