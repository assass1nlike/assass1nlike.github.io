"""习惯形成曲线的示意数据。

论文：Lally, van Jaarsveld, Potts & Wardle (2010), Eur. J. Soc. Psychol. 40, 998-1009。
每人的“自动化程度”（SRHI 中 7 个条目，0~42 分）按 y = a - b·exp(-c·x) 拟合，x 是第几天；
到达平台 95% 的天数 = ln(20b/a)/c。39 位拟合良好者：a 中位数 35，b 中位数 30，
到达 95% 的天数中位数 66，范围 18~254（254 超出 84 天观察期，是曲线外推）。
漏做一次后，自动化分数平均下降 0.29；之后恢复做的那天，比漏做前高 0.55。

这里取 a、b 为中位数，按 18 / 66 / 254 天反解 c，画三条示意曲线；
再在 66 天那条上加噪声生成 84 天的“每日打分”点，纯属示意，不是论文数据。
"""
import json
import math
from pathlib import Path

import numpy as np

SEED = 2010
A, B = 35.0, 30.0
T95 = {"fast": 18, "median": 66, "slow": 254}
MAX_SCORE = 42
STUDY_DAYS = 84
MISS_DROP, MISS_REBOUND = 0.29, 0.55

rng = np.random.default_rng(SEED)
curve = lambda x, c: A - B * math.exp(-c * x)
c = {k: math.log(20 * B / A) / t for k, t in T95.items()}

# 示意的每日打分：在 66 天那条曲线上加噪声，取整到 0~42，约 15% 的天没记录
dots = []
for d in range(1, STUDY_DAYS + 1):
    if rng.random() < 0.15:
        continue
    y = curve(d, c["median"]) + rng.normal(0, 2.2)
    dots.append([d, int(np.clip(round(y), 0, MAX_SCORE))])

out = {
    "seed": SEED,
    "a": A, "b": B, "max": MAX_SCORE, "days": STUDY_DAYS,
    "t95": T95, "c": c,
    "miss": {"drop": MISS_DROP, "rebound": MISS_REBOUND},
    # 66 天那条曲线在第 21 天的值、以及占平台的比例
    "at21": {"y": curve(21, c["median"]), "frac": curve(21, c["median"]) / A},
    "dots": dots,
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print({k: v for k, v in out.items() if k != "dots"}, len(dots), "dots")
