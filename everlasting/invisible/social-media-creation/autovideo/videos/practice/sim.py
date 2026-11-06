"""“练得一样多，水平差多远”的示意散点，结果写到 sim.json。

设定：Macnamara 等（2014；2018 年更正）元分析里，练习量和表现的平均相关系数 r = 0.38。
按这个相关系数生成 N 个人的（练习量, 水平），两者都是标准正态，没有单位。
这只是“相关 0.38 长什么样”的示意，不代表任何具体领域的真实数据。
"""
import json
from pathlib import Path

import numpy as np

R = 0.38
N = 160
SEED = 20140708

rng = np.random.default_rng(SEED)
x = rng.standard_normal(N)
y = R * x + np.sqrt(1 - R**2) * rng.standard_normal(N)

r_sample = float(np.corrcoef(x, y)[0, 1])
# 练习量差不多的一群人：练习量落在 [0.5, 1.0] 个标准差之间
band = (0.5, 1.0)
inb = (x >= band[0]) & (x <= band[1])

out = {
    "r_target": R,
    "n": N,
    "seed": SEED,
    "r_sample": round(r_sample, 3),
    "band": band,
    "band_n": int(inb.sum()),
    "band_ymin": round(float(y[inb].min()), 3),
    "band_ymax": round(float(y[inb].max()), 3),
    "points": [[round(float(a), 3), round(float(b), 3)] for a, b in zip(x, y)],
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print({k: v for k, v in out.items() if k != "points"})
