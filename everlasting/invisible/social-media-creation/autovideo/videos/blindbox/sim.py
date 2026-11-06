"""盲盒集齐问题的模拟，结果写到 sim.json 供讲稿和动画使用。

设定：一个一个单买，每个盒子独立地开出 12 款基础款之一（等概率）；
隐藏款按 1/144 计，开出隐藏款时这个盒子就不是基础款。
"""
import json
from pathlib import Path

import numpy as np

N = 12
P_HIDDEN = 1 / 144
TRIALS = 100_000
SEED = 20261105

rng = np.random.default_rng(SEED)


def draws_to_complete(rng, n, copies=1, p_hidden=0.0, need_hidden=False):
    """一直买到每款基础款都有 copies 个（need_hidden 时还要有隐藏款），返回买的总数。"""
    counts = np.zeros(n, dtype=int)
    got_hidden = not need_hidden
    total = 0
    while counts.min() < copies or not got_hidden:
        total += 1
        if p_hidden and rng.random() < p_hidden:
            got_hidden = True
        else:
            counts[rng.integers(n)] += 1
    return total


def summarize(xs):
    xs = np.asarray(xs)
    return {
        "mean": float(xs.mean()),
        "median": float(np.median(xs)),
        "p10": float(np.percentile(xs, 10)),
        "p90": float(np.percentile(xs, 90)),
        "p99": float(np.percentile(xs, 99)),
        "min": int(xs.min()),
        "max": int(xs.max()),
    }


solo = np.array([draws_to_complete(rng, N) for _ in range(TRIALS)])
hist = np.bincount(solo)

# 已有 k 款时，抽到新款平均要几个：N / (N - k)
step_expect = [N / (N - k) for k in range(N)]

hidden_all = np.array(
    [draws_to_complete(rng, N, p_hidden=P_HIDDEN, need_hidden=True) for _ in range(20_000)]
)

friends = {}
for k in range(1, 7):
    totals = np.array([draws_to_complete(rng, N, copies=k) for _ in range(20_000)])
    friends[k] = {"per_person_mean": float(totals.mean() / k), **summarize(totals)}

# 动画里演示用的一次“典型”拆盒序列：总数等于四舍五入后的平均数，
# 前 6 款在 8 个以内集齐，最后一款等了不少于 10 个，和讲稿里的平均情形一致
target = round(solo.mean())
while True:
    seq, seen, firsts = [], set(), []
    while len(seen) < N:
        x = int(rng.integers(N))
        seq.append(x)
        if x not in seen:
            seen.add(x)
            firsts.append(len(seq))
    if len(seq) == target and firsts[5] <= 8 and firsts[11] - firsts[10] >= 10:
        break

out = {
    "seed": SEED,
    "trials": TRIALS,
    "n": N,
    "p_hidden": P_HIDDEN,
    "solo": summarize(solo),
    "solo_share_le_12": float((solo == 12).mean()),
    "solo_share_ge_50": float((solo >= 50).mean()),
    "solo_hist": hist.tolist(),
    "theory_mean": float(sum(step_expect)),
    "step_expect": step_expect,
    "first6_expect": float(sum(step_expect[:6])),
    "hidden_alone_mean": 1 / P_HIDDEN,
    "hidden_all": summarize(hidden_all),
    "friends": friends,
    "demo_sequence": seq,
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

print(json.dumps({k: v for k, v in out.items() if k not in ("solo_hist", "demo_sequence")}, ensure_ascii=False, indent=1))
