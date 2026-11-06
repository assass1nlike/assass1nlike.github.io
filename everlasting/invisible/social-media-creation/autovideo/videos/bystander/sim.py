"""示意模拟：每个人出手的概率随人数变小，但“至少有一人出手”的概率仍随人数上升。

这不是论文数据，只是帮助理解两个效应可以同时成立。设定：
现场有 n 个路人，每人独立地以 p(n) = P1 * n^(-ALPHA) 的概率出手（人越多，每个人越犹豫）；
对每个 n 模拟 TRIALS 次冲突，统计至少有一人出手的比例。
"""
import json
from pathlib import Path

import numpy as np

P1 = 0.4       # 只有一个路人时，他出手的概率（假设）
ALPHA = 0.6    # 人数每翻一倍，每个人出手的概率乘 2^-0.6 ≈ 0.66（假设）
N_MAX = 40
TRIALS = 20_000
SEED = 20261106
SHOW = 24      # 动画里一排小人的人数上限：每拍一次“重放”
REPLAYS = 24

rng = np.random.default_rng(SEED)

ns = np.arange(1, N_MAX + 1)
p = P1 * ns.astype(float) ** -ALPHA
any_help = []
for n, pn in zip(ns, p):
    helped = rng.random((TRIALS, n)) < pn
    any_help.append(float(helped.any(axis=1).mean()))

# 动画用：n 从 1 涨到 SHOW 时，每拍重放一次，记录谁出手了
replays = []
for k in range(REPLAYS):
    n = 1 + round((SHOW - 1) * k / (REPLAYS - 1))
    replays.append({"n": int(n), "help": (rng.random(n) < P1 * n ** -ALPHA).astype(int).tolist()})

out = {
    "setting": {"P1": P1, "ALPHA": ALPHA, "TRIALS": TRIALS, "SEED": SEED},
    "n": ns.tolist(),
    "p_each": [round(float(x), 4) for x in p],
    "p_any": [round(x, 4) for x in any_help],
    "replays": replays,
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
for n in (1, 2, 5, 10, 20, 40):
    print(f"n={n:2d}  each={p[n-1]:.3f}  any={any_help[n-1]:.3f}")
