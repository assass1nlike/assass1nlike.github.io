"""黑体的可见光亮度和颜色表，供星空的多普勒着色使用。

用法：python pipeline/blackbody.py   写出 data/blackbody.json
表按 log10(T) 等间隔取样：lum 是 400~720 nm 内按人眼视见函数加权的辐亮度（任意单位），rgb 是归一化到最大分量为 1 的 sRGB 颜色。
CIE 1931 配色函数用 Wyman, Sloan & Shirley (2013) 的多高斯近似。
"""
import json
from pathlib import Path

import numpy as np

h, c, k = 6.62607e-34, 2.99792458e8, 1.380649e-23
lam = np.linspace(380e-9, 780e-9, 401)


def g(x, mu, s1, s2):
    s = np.where(x < mu, s1, s2)
    return np.exp(-0.5 * ((x - mu) / s) ** 2)


nm = lam * 1e9
xb = 1.056 * g(nm, 599.8, 37.9, 31.0) + 0.362 * g(nm, 442.0, 16.0, 26.7) - 0.065 * g(nm, 501.1, 20.4, 26.2)
yb = 0.821 * g(nm, 568.8, 46.9, 40.5) + 0.286 * g(nm, 530.9, 16.3, 31.1)
zb = 1.217 * g(nm, 437.0, 11.8, 36.0) + 0.681 * g(nm, 459.0, 26.0, 13.8)
M = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])

logT = np.linspace(2.5, 8.5, 241)
lum, rgb = [], []
for T in 10 ** logT:
    with np.errstate(over="ignore"):
        B = 2 * h * c ** 2 / lam ** 5 / np.expm1(h * c / (lam * k * T))
    X, Y, Z = (np.trapezoid(B * f, lam) for f in (xb, yb, zb))
    v = M @ np.array([X, Y, Z])
    v = np.clip(v, 0, None)
    rgb.append((v / v.max()).round(4).tolist() if v.max() > 0 else [1, 0, 0])
    lum.append(float(Y))
lum = np.array(lum)
out = {"logT0": float(logT[0]), "dlogT": float(logT[1] - logT[0]),
       "loglum": np.log10(np.maximum(lum, 1e-300) / lum[np.searchsorted(logT, np.log10(5800))]).round(4).tolist(),
       "rgb": rgb}
Path(__file__).resolve().parent.parent.joinpath("data", "blackbody.json").write_text(json.dumps(out), encoding="utf-8")
for T in (1330, 3000, 5800, 1e4, 3e4, 1e6):
    i = int(round((np.log10(T) - logT[0]) / (logT[1] - logT[0])))
    print(f"T={T:>9.0f}K  log10 L/L(5800K)={out['loglum'][i]:7.2f}  rgb={out['rgb'][i]}")
