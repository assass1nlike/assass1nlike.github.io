"""Gamow–Stern 电梯悖论的模拟，结果写到 sim.json 供字幕和动画使用。

模型（Knuth 1969 的设定）：每部电梯以恒定速度在 1 楼和顶楼之间不停地来回跑，
不在中途停靠；各部电梯互相独立，你到达时它们在往返周期里的位置是均匀随机的。
你在某层随机时刻开始等，记录第一部经过你这层的电梯是往上还是往下。
"""
import json
from pathlib import Path

import numpy as np

FLOORS = 7            # Gamow 和 Stern 的楼是 7 层
GAMOW, STERN = 2, 6
TRIALS = 100_000
SEED = 19580101
CARS = [1, 2, 3, 4, 8, 16]

rng = np.random.default_rng(SEED)
L = 2 * (FLOORS - 1)  # 一个往返周期（以“跑一层的时间”为单位）


def wait(floor, cars, trials):
    """返回 (是否往下, 等待时间)，形状 (trials,)。"""
    phase = rng.random((trials, cars)) * L   # 周期内位置：[0, F-1) 往上，[F-1, L) 往下
    up_at, down_at = floor - 1, L - (floor - 1)
    d_up = (up_at - phase) % L
    d_down = (down_at - phase) % L
    if floor == 1:
        d_down = np.full_like(d_down, np.inf)
    if floor == FLOORS:
        d_up = np.full_like(d_up, np.inf)
    d = np.minimum(d_up, d_down)
    first = d.argmin(axis=1)
    rows = np.arange(trials)
    down = d_down[rows, first] < d_up[rows, first]
    return down, d[rows, first]


def theory_single(floor):
    """单部电梯：它在你上面的时间占比。1 楼和顶楼只有一个方向，不算。"""
    if floor in (1, FLOORS):
        return None
    return (FLOORS - floor) / (FLOORS - 1)


# 每种电梯数、每层（2 ~ 6 楼）各等 TRIALS 次
curves, keep = {}, {}
for k in CARS:
    row = [None] * FLOORS
    for f in range(2, FLOORS):
        down, _ = wait(f, k, TRIALS)
        row[f - 1] = float(down.mean())
        if k == 1 and f == GAMOW:
            keep["gamow"] = down
    curves[k] = row

# Gamow 在 2 楼等的那 10 万次：累计“往下”比例怎么收敛
down = keep["gamow"]
cum = np.cumsum(down) / np.arange(1, TRIALS + 1)
checkpoints = np.unique(np.round(np.logspace(0, np.log10(TRIALS), 80)).astype(int))
converge = [[int(n), float(cum[n - 1])] for n in checkpoints]

# 动画里逐次演示用的 16 次等待（不挑选，按顺序取下一批随机数）
demo_g = wait(GAMOW, 1, 16)[0].astype(int).tolist()
demo_s = wait(STERN, 1, 16)[0].astype(int).tolist()

out = {
    "seed": SEED,
    "trials": TRIALS,
    "floors": FLOORS,
    "gamow_floor": GAMOW,
    "stern_floor": STERN,
    "theory_single": [theory_single(f) for f in range(1, FLOORS + 1)],
    "cars": CARS,
    "curves": {str(k): v for k, v in curves.items()},
    "knuth_two_cars": 13 / 18,
    "gamow_down_count": int(down.sum()),
    "converge": converge,
    "demo_gamow": demo_g,
    "demo_stern": demo_s,
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({k: v for k, v in out.items() if k != "converge"}, ensure_ascii=False, indent=1))
