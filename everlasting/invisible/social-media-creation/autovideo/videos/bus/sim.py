"""等车悖论的模拟，结果写到 sim.json 供画面使用。

设定：发车平均间隔 10 分钟，乘客在时间上完全随机（均匀）地到站，各自等最先来的那辆车。
1. 串车模型：每两辆车一组，偶数号车准点（0, 20, 40, ...），奇数号车晚 d 分钟（10+d, 30+d, ...），
   间隔交替为 10+d 和 10-d，平均仍是 10。d=0 准点，d=10 两车同时到、后面空 20 分钟。
2. 随机间隔：间隔服从均值 10 的 Gamma 分布（CV=1 时就是指数分布，即公交按泊松过程到站）。
理论值：平均等待 = E[H^2] / (2 E[H]) = 5 (1 + CV^2)。
"""
import json
from pathlib import Path

import numpy as np

SEED = 20261106
MU = 10.0
N_PASS = 1_000_000
N_PAIRS = 500_000         # 串车模型模拟 100 万辆车，1000 万分钟
DEMO_SPAN, DEMO_RATE = 80, 2.0   # 画面上演示用的 80 分钟里的乘客，每分钟平均 2 人

rng = np.random.default_rng(SEED)
T = 2 * MU * N_PAIRS
pax = rng.uniform(0, T, N_PASS)


def ride(bus, pax):
    """每个乘客等到的下一辆车：返回平均等待、乘客碰上的平均间隔、落在长间隔(>10)里的比例。"""
    bus = np.sort(bus, kind="stable")
    i = np.searchsorted(bus, pax, side="left")
    wait = bus[i] - pax
    gap = bus[i] - bus[i - 1]
    return wait, gap


def pair_bus(d):
    k = np.arange(-1, N_PAIRS + 2)
    return np.concatenate([2 * MU * k, 2 * MU * k + MU + d])


sweep = []
for d in np.round(np.arange(0, 10.001, 0.25), 2):
    wait, gap = ride(pair_bus(d), pax)
    sweep.append({
        "d": float(d),
        "cv": float(d / MU),
        "wait": float(wait.mean()),
        "theory": float(MU / 2 * (1 + (d / MU) ** 2)),
        "seen_gap": float(gap.mean()),
        "long_share": float((gap > MU + 1e-9).mean()),
    })

# 随机间隔：Gamma(shape=1/CV^2, scale=MU*CV^2)
random_gaps = []
for cv in [0.3, 0.6, 1.0, 1.3]:
    n_bus = int(T / MU * 1.2) + 1000
    h = rng.gamma(1 / cv**2, MU * cv**2, n_bus)
    bus = np.concatenate([[0.0], np.cumsum(h)])
    assert bus[-1] > T
    wait, gap = ride(bus, pax)
    hh = h[: np.searchsorted(bus, T)]
    random_gaps.append({
        "cv_set": cv,
        "cv": float(hh.std() / hh.mean()),
        "mean_gap": float(hh.mean()),
        "wait": float(wait.mean()),
        "theory": float(hh.mean() / 2 * (1 + (hh.std() / hh.mean()) ** 2)),
        "seen_gap": float(gap.mean()),
    })

n_demo = rng.poisson(DEMO_SPAN * DEMO_RATE)
demo = np.sort(rng.uniform(0, DEMO_SPAN, n_demo))

at = {s["d"]: s for s in sweep}
poisson = next(r for r in random_gaps if r["cv_set"] == 1.0)
# 字幕里写死的数字，必须和模拟一致
assert round(at[0.0]["wait"], 1) == 5.0
assert round(at[6.0]["wait"], 1) == 6.8
assert round(at[6.0]["long_share"], 2) == 0.80
assert round(at[10.0]["wait"], 1) == 10.0
assert round(at[10.0]["seen_gap"]) == 20
assert round(poisson["wait"]) == 10
assert round(poisson["seen_gap"]) == 20

out = {
    "seed": SEED,
    "mu": MU,
    "passengers": N_PASS,
    "buses_pair_model": 2 * N_PAIRS,
    "sweep": sweep,
    "random": random_gaps,
    "demo_span": DEMO_SPAN,
    "demo_pax": [round(float(x), 3) for x in demo],
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
for s in sweep[::4]:
    print({k: round(v, 3) for k, v in s.items()})
for r in random_gaps:
    print({k: round(v, 3) for k, v in r.items()})
print("demo pax", n_demo)
