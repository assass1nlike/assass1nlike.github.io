"""超市排队的模拟，结果写到 sim.json 供字幕和动画使用。

设定：一直处在高峰期的超市，3 台收银机。顾客按泊松过程到达，每小时 75 人；
每人结账时间服从指数分布，平均 2 分钟（每台收银机的繁忙程度 75/60 × 2 / 3 ≈ 0.83）。
“等待”指从排进队到开始结账的时间。

比较三种排法：
- 分开排·随便挑：每台各一队，来的人随机挑一队，排了不换（教科书里的 3 个 M/M/1）；
- 分开排·挑最短：每台各一队，来的人挑人最少的一队（一样少就随机），排了不换；
- 一条总队：所有人排一队，哪台空了去哪台（M/M/3）。
另外单独模拟“你”看见隔壁人少了就换过去，和不换相比（其他人都不换）。
"""
import heapq
import json
from collections import deque
from pathlib import Path

import numpy as np

SEED = 20261106
C = 3
LAM = 75 / 60        # 每分钟到达人数
MEAN_SVC = 2.0       # 平均结账分钟数
N = 1_000_000        # 每种排法模拟的顾客数
WARM = 10_000        # 丢掉开头，避免从空店开始的影响
EPISODES = 40_000    # 换队实验的次数

rng = np.random.default_rng(SEED)


def stream(n):
    arr = np.cumsum(rng.exponential(1 / LAM, n))
    svc = rng.exponential(MEAN_SVC, n)
    return arr, svc


def separate(arr, svc, pick_shortest):
    """每台各一队、排了不换。返回每人的等待、到达时各队人数、各队“清空现有的人”还要多久、选了哪队。"""
    n = len(arr)
    lanes = [deque() for _ in range(C)]   # 每队里各人的离开时刻
    last = np.zeros(C)
    wait = np.empty(n)
    lens = np.empty((n, C), dtype=np.int16)
    backlog = np.empty((n, C))
    chosen = np.empty(n, dtype=np.int8)
    dep = np.empty(n)
    tie = rng.random((n, C))
    rand_lane = rng.integers(C, size=n)
    for i in range(n):
        t = arr[i]
        for q in lanes:
            while q and q[0] <= t:
                q.popleft()
        L = [len(q) for q in lanes]
        lens[i] = L
        backlog[i] = np.maximum(last - t, 0)
        if pick_shortest:
            m = min(L)
            k = max((j for j in range(C) if L[j] == m), key=lambda j: tie[i, j])
        else:
            k = rand_lane[i]
        start = max(t, last[k])
        last[k] = start + svc[i]
        lanes[k].append(last[k])
        wait[i] = start - t
        chosen[i] = k
        dep[i] = last[k]
    return wait, lens, backlog, chosen, dep, tie


def single(arr, svc):
    free = [0.0] * C
    wait = np.empty(len(arr))
    for i, t in enumerate(arr):
        f = heapq.heappop(free)
        start = max(t, f)
        wait[i] = start - t
        heapq.heappush(free, start + svc[i])
    return wait


def summary(w):
    w = w[WARM:]
    return {"mean": float(w.mean()), "p50": float(np.median(w)), "p90": float(np.percentile(w, 90)),
            "p99": float(np.percentile(w, 99)), "zero": float((w <= 1e-12).mean()),
            "over10": float((w > 10).mean()), "std": float(w.std())}


def rank_of(backlog, chosen, mask):
    """你那队在三队里排第几（按开始结账的先后，1 = 最快）。"""
    b = backlog[mask]
    mine = b[np.arange(len(b)), chosen[mask]]
    rank = 1 + (b < mine[:, None]).sum(1)
    return [float((rank == r).mean()) for r in (1, 2, 3)], int(mask.sum())


arr, svc = stream(N)
w_rand, L_rand, B_rand, k_rand, _, _ = separate(arr, svc, pick_shortest=False)
w_jsq, L_jsq, B_jsq, k_jsq, d_jsq, tie_jsq = separate(arr, svc, pick_shortest=True)
w_one = single(arr, svc)

body = slice(WARM, None)
# 三队一样长（都有人）时，你随便挑一条
Lj, Bj, kj = L_jsq[body], B_jsq[body], k_jsq[body]
equal = (Lj.min(1) == Lj.max(1)) & (Lj.min(1) >= 1)
rank_equal, n_equal = rank_of(Bj, kj, equal)
# 挑了最短的那队，并且需要等
waited = Bj[np.arange(len(Bj)), kj] > 0
rank_short, n_short = rank_of(Bj, kj, waited)
# 随便挑一队（3 个 M/M/1），三队都有人时
Lr, Br, kr = L_rand[body], B_rand[body], k_rand[body]
busy3 = Lr.min(1) >= 1
rank_rand, n_rand = rank_of(Br, kr, busy3)


def idle_while_waiting(L):
    """有收银机空着、别的队却有人在等（按到达时刻抽样；泊松到达看到的就是时间平均）。"""
    L = L[body]
    return float(((L == 0).any(1) & (L >= 2).any(1)).mean())


def overtaken(wait):
    """被比自己晚到的人先开始结账的比例。"""
    start = arr + wait
    later_min = np.minimum.accumulate(start[::-1])[::-1]
    later_min = np.append(later_min[1:], np.inf)
    return float((later_min[body] < start[body]).mean())


# ---------- 换队：只有你换，其他人挑最短、排了不换 ----------
# 从“分开排·挑最短”那一百万人里随机抽人当“你”，从你到达那一刻的真实状态出发，
# 用同一批后来的人、同样的结账时间各走一遍：不换 / 看见隔壁人更少就换。
def episode(you):
    t0 = arr[you]
    lo = max(0, you - 400)
    lanes = [deque() for _ in range(C)]
    fin = [np.inf] * C
    for j in range(lo, you):
        if d_jsq[j] > t0:
            lanes[k_jsq[j]].append(j)
    for k in range(C):
        if lanes[k]:
            fin[k] = d_jsq[lanes[k][0]]

    def run(switch):
        q_ = [deque(q) for q in lanes]
        f_ = list(fin)
        i, lane_you, moves = you, None, 0
        while True:
            tn = arr[i]
            k = int(np.argmin(f_))
            if f_[k] <= tn:                   # 有人结完离开
                t = f_[k]
                q_[k].popleft()
                f_[k] = t + svc[q_[k][0]] if q_[k] else np.inf
                if q_[k] and q_[k][0] == you:
                    return t - t0, moves
            else:                             # 有人到达，挑最短的队
                t = tn
                L = [len(q) for q in q_]
                m = min(L)
                k = max((j for j in range(C) if L[j] == m), key=lambda j: tie_jsq[i, j])
                q_[k].append(i)
                if len(q_[k]) == 1:
                    f_[k] = t + svc[i]
                    if i == you:
                        return 0.0, 0
                if i == you:
                    lane_you = k
                i += 1
            if switch and lane_you is not None:
                q = q_[lane_you]
                ahead = q.index(you)
                if ahead >= 1:
                    L = [len(x) for x in q_]
                    best = min((j for j in range(C) if j != lane_you), key=lambda j: L[j])
                    if L[best] < ahead:       # 隔壁的人比你前面的人少，就换过去排在队尾
                        q.remove(you)
                        q_[best].append(you)
                        moves += 1
                        if len(q_[best]) == 1:   # 换过去直接轮到
                            f_[best] = t + svc[you]
                            return t - t0, moves
                        lane_you = best

    w0, _ = run(False)
    w1, m = run(True)
    return w0, w1, m


picks = np.sort(rng.choice(np.arange(WARM, N - 1000), EPISODES, replace=False))
res = np.array([episode(int(x)) for x in picks])
assert np.allclose(res[:, 0], w_jsq[picks]), "不换的那一遍应该和一百万人的模拟完全一致"
stay, sw, moves = res[:, 0], res[:, 1], res[:, 2]
did = moves > 0
diff = stay - sw     # 正数 = 换了以后少等


# ---------- 动画用的模拟片段 ----------
def lanes_trace(init, arrivals, picks=None):
    """分开排的小片段：init = 每队开场时的人（结账时间），arrivals = [(到达时刻, 结账时间)]。"""
    people = []
    last = [0.0] * C
    for k, q in enumerate(init):
        for x in q:
            st = last[k]
            last[k] = st + x
            people.append({"lane": k, "arr": -1.0, "start": st, "end": last[k]})
    for idx, (t, x) in enumerate(arrivals):
        if picks is not None:
            k = picks[idx]
        else:
            L = [sum(1 for p in people if p["lane"] == j and p["end"] > t) for j in range(C)]
            k = int(np.argmin(L))
        st = max(t, last[k])
        last[k] = st + x
        people.append({"lane": k, "arr": t, "start": st, "end": last[k]})
    return people


def single_trace(init_busy, queue_svc, arrivals):
    """一条总队的小片段：init_busy = 3 台正在结账的人，queue_svc = 开场时总队里的人。"""
    free = []
    people = []
    for k, x in enumerate(init_busy):
        people.append({"lane": k, "arr": -1.0, "start": 0.0, "end": x})
        free.append((x, k))
    heapq.heapify(free)
    for t, x in [(-1.0, x) for x in queue_svc] + list(arrivals):
        f, k = heapq.heappop(free)
        st = max(t, f)
        people.append({"lane": k, "arr": t, "start": st, "end": st + x})
        heapq.heappush(free, (st + x, k))
    return people


def r3(people):
    return [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in p.items()} for p in people]


demo_rng = np.random.default_rng(SEED + 2)
# 开场片段：三队各 3 个人，你排进中间那队，结果你那队最后一个轮到
while True:
    init = [list(demo_rng.exponential(MEAN_SVC, 3)) for _ in range(C)]
    totals = [sum(q) for q in init]
    if totals[1] == max(totals) and totals[1] - sorted(totals)[1] > 1.5 and totals[1] < 9 and min(totals) < 4.5:
        break
hook = lanes_trace(init, [(0.0, 2.0)], picks=[1])   # 最后这位就是“你”

# 对比片段：同一批人、同样的结账时间，分开排（挑最短）和一条总队各走一遍
while True:
    busy = list(demo_rng.exponential(MEAN_SVC, 3))
    qsv = list(demo_rng.exponential(MEAN_SVC, 6))
    at = np.cumsum(demo_rng.exponential(1 / LAM, 30))
    av = demo_rng.exponential(MEAN_SVC, 30)
    arrivals = [(float(t), float(x)) for t, x in zip(at, av) if t < 16]
    init = [[busy[k]] + qsv[2 * k:2 * k + 2] for k in range(C)]
    sep = lanes_trace(init, arrivals)
    one = single_trace(busy, qsv, arrivals)
    ws = np.array([p["start"] - max(p["arr"], 0) for p in sep])
    wo = np.array([p["start"] - max(p["arr"], 0) for p in one])
    gap = ws.mean() - wo.mean()
    if 0.5 < gap < 3.0 and ws.max() > wo.max() + 2:
        break

out = {
    "seed": SEED,
    "params": {"cashiers": C, "per_hour": 75, "mean_service_min": MEAN_SVC, "customers": N, "warmup": WARM,
               "utilization": LAM * MEAN_SVC / C, "episodes": EPISODES},
    "total_customers": 3 * N,
    "rank_equal": rank_equal, "n_equal": n_equal,
    "rank_shortest": rank_short, "n_shortest": n_short,
    "rank_random": rank_rand, "n_random": n_rand,
    "separate_random": summary(w_rand),
    "separate_shortest": summary(w_jsq),
    "single": summary(w_one),
    "overtaken": {"random": overtaken(w_rand), "shortest": overtaken(w_jsq), "single": overtaken(w_one)},
    "idle_while_waiting": {"random": idle_while_waiting(L_rand), "shortest": idle_while_waiting(L_jsq)},
    "switch": {
        "episodes": EPISODES,
        "share_switched": float(did.mean()),
        "stay_mean": float(stay.mean()), "switch_mean": float(sw.mean()),
        "saved_mean_all": float(diff.mean()),
        "saved_mean_if_switched": float(diff[did].mean()),
        "share_better_if_switched": float((diff[did] > 1e-9).mean()),
        "share_worse_if_switched": float((diff[did] < -1e-9).mean()),
        "share_same_if_switched": float((np.abs(diff[did]) <= 1e-9).mean()),
        "stay_mean_if_switched": float(stay[did].mean()),
        "switch_mean_if_switched": float(sw[did].mean()),
        "moves_mean_if_switched": float(moves[did].mean()),
    },
    "demo_hook": r3(hook),
    "demo_separate": r3(sep),
    "demo_single": r3(one),
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({k: v for k, v in out.items() if not k.startswith("demo")}, ensure_ascii=False, indent=1))
