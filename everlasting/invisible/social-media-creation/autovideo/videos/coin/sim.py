"""押“抛前朝上那面”能赢多少：模拟结果写到 sim.json，供字幕和动画使用。

设定：每局押 1 块，猜对赢 1 块、猜错输 1 块（即论文里“付 1 块入场，赢了拿回 2 块”的赌法）。
- 押抛前那面：每局猜对的概率取论文合并数据 178,079 / 350,757 ≈ 50.77%；
- 对照：公平硬币，猜对概率 50%。
各模拟 1000 个人，每人连赌 10,000 局，局与局相互独立。
"""
import json
from pathlib import Path

import numpy as np

SEED = 20261106
SAME, FLIPS = 178_079, 350_757
P_SAME = SAME / FLIPS
PLAYERS, ROUNDS, EVERY = 1000, 10_000, 50

rng = np.random.default_rng(SEED)


def play(p):
    steps = np.where(rng.random((PLAYERS, ROUNDS)) < p, 1, -1).astype(np.int32)
    return np.cumsum(steps, axis=1)


def summary(paths):
    final = paths[:, -1]
    idx = np.arange(EVERY - 1, ROUNDS, EVERY)
    sub = np.concatenate([np.zeros((PLAYERS, 1), dtype=np.int32), paths[:, idx]], axis=1)
    return {
        "mean_final": float(final.mean()),
        "median_final": float(np.median(final)),
        "share_ahead": float((final > 0).mean()),
        "share_ahead_at": {str(n): float((paths[:, n - 1] > 0).mean()) for n in (10, 100, 1000, 10_000)},
        "band": {q: np.percentile(sub, int(q[1:]), axis=0).round(1).tolist() for q in ("p5", "p50", "p95")},
        "ahead": int((final > 0).sum()),
        "paths": sub[:60].tolist(),
        "finals": final.tolist(),
    }


same = summary(play(P_SAME))
fair = summary(play(0.5))

out = {
    "seed": SEED,
    "p_same": P_SAME,
    "players": PLAYERS,
    "rounds": ROUNDS,
    "every": EVERY,
    "edge": 2 * P_SAME - 1,
    "expect_final": ROUNDS * (2 * P_SAME - 1),
    "same": same,
    "fair": fair,
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")

for k in ("same", "fair"):
    s = out[k]
    print(k, {x: s[x] for x in ("mean_final", "median_final", "share_ahead", "ahead", "share_ahead_at")})
print("p_same", P_SAME, "edge", out["edge"], "expect", out["expect_final"])
