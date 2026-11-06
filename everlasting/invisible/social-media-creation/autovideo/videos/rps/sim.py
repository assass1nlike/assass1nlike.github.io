"""石头剪刀布：按论文里人的“条件反应”造一个对手，再让一个针对它的策略和它打一万局。结果写到 sim.json。

数据来源：Wang, Xu & Zhou (2014), Social cycling and conditional responses in the Rock-Paper-Scissors game,
Scientific Reports 4, 5830。论文正文没有给出条件概率的数值，只在 Fig. 3G 里画了柱状图；
下面 CR 是从 Fig. 3G（a = 2，即赢 2 分、平 1 分、输 0 分，和普通石头剪刀布策略上等价）的柱高读出、
再归一化到每组和为 1 的近似值，误差约 ±0.01。
记号同论文：上一把结果为 O（W 赢 / T 平 / L 输）后，
  O0 = 下一把出同一个；
  O+ = 逆时针换：石头→布、布→剪刀、剪刀→石头（换成能赢自己上一手的）；
  O- = 顺时针换：石头→剪刀、剪刀→布、布→石头（换成被自己上一手赢的）。
MARGINAL 是论文 Supplementary Table S1 中全部 354 名玩家出石头、布、剪刀的平均比例。

模拟设定：
- “人”：第一局三种等概率；之后只看自己上一把出了什么、结果如何，按 CR 的三个概率决定下一手。
- 针对它的策略：知道对手上一把出了什么、结果如何，按 CR 算出对手下一手的分布，
  选使“赢的概率 − 输的概率”最大的那一手（第一局随机）。
- 一对一连打 GAMES 局；另做一组：同样的策略对上完全随机的对手。
局限：论文的参数来自 6 人一组、每轮随机配对的实验，这里假设这个“人”一对一面对同一个对手时仍按同样的比例反应。
"""
import json
from pathlib import Path

import numpy as np

SEED = 2014
GAMES = 10_000
R, P, S = 0, 1, 2  # 石头、布、剪刀
BEATS = lambda x: (x + 1) % 3   # 能赢 x 的那一手：石头←布←剪刀←石头
PREY = lambda x: (x + 2) % 3    # 被 x 赢的那一手

RAW = {  # Fig. 3G 读数（未归一化）：O-, O0, O+
    "W": [0.252, 0.534, 0.230],
    "T": [0.239, 0.439, 0.339],
    "L": [0.370, 0.366, 0.280],
}
CR = {k: (np.array(v) / sum(v)).tolist() for k, v in RAW.items()}
MARGINAL = {"rock": 0.36, "paper": 0.33, "scissors": 0.32}


def outcome(a, b):
    """a 对 b：W / T / L"""
    if a == b:
        return "T"
    return "W" if a == BEATS(b) else "L"


def next_dist(last, res):
    """论文 CR 模型：上一手 last、结果 res 时下一手的分布（按 石头、布、剪刀）"""
    m, z, p = CR[res]
    d = np.zeros(3)
    d[PREY(last)] += m   # 顺时针
    d[last] += z
    d[BEATS(last)] += p  # 逆时针
    return d


def best_reply(dist):
    """对手下一手分布为 dist 时，使 赢 − 输 最大的出法"""
    edge = [dist[PREY(y)] - dist[BEATS(y)] for y in range(3)]
    return int(np.argmax(edge))


def play(rng, opponent_random):
    wins = ties = losses = 0
    opp_counts = np.zeros(3, int)
    curve = {"W": [], "T": [], "L": []}  # 每 50 局记一次累计局数
    o_last = o_res = None
    for g in range(GAMES):
        if o_last is None or opponent_random:
            o = int(rng.integers(3))
        else:
            o = int(rng.choice(3, p=next_dist(o_last, o_res)))
        me = int(rng.integers(3)) if o_last is None else best_reply(next_dist(o_last, o_res))
        r = outcome(me, o)
        wins += r == "W"; ties += r == "T"; losses += r == "L"
        opp_counts[o] += 1
        o_last, o_res = o, outcome(o, me)
        if (g + 1) % 50 == 0:
            curve["W"].append(wins); curve["T"].append(ties); curve["L"].append(losses)
    return {"games": GAMES, "wins": wins, "ties": ties, "losses": losses,
            "win_rate": wins / GAMES, "tie_rate": ties / GAMES, "loss_rate": losses / GAMES,
            "opp_share": (opp_counts / GAMES).tolist(), "curve": curve, "curve_step": 50}


def exact():
    """针对策略对 CR 对手的长期期望：对手上一把结果 (W, T, L) 构成马尔可夫链"""
    order = "WTL"
    M = np.zeros((3, 3))
    for i, res in enumerate(order):
        d = next_dist(R, res)
        me = best_reply(d)
        for o in range(3):
            M[i, order.index(outcome(o, me))] += d[o]
    w, v = np.linalg.eig(M.T)
    pi = np.real(v[:, np.argmin(abs(w - 1))]); pi /= pi.sum()
    # 对手输 = 我赢
    return {"win": float(pi[2]), "tie": float(pi[1]), "loss": float(pi[0]),
            "reply": {res: ["same", "beats_last", "prey_of_last"][[R, BEATS(R), PREY(R)].index(best_reply(next_dist(R, res)))]
                      for res in order}}


def pct(v):
    """三个比例四舍五入成和为 100 的整数百分比（最大余数法）"""
    x = np.array(v) * 100
    f = np.floor(x).astype(int)
    for i in np.argsort(-(x - f))[: 100 - f.sum()]:
        f[i] += 1
    return f.tolist()


rng = np.random.default_rng(SEED)
vs_human = play(rng, opponent_random=False)
vs_random = play(rng, opponent_random=True)
out = {
    "seed": SEED,
    "cr": CR,
    "cr_pct": {k: dict(zip(["shift_cw", "stay", "shift_ccw"], pct(v))) for k, v in CR.items()},
    "marginal": MARGINAL,
    "vs_human": vs_human,
    "vs_random": vs_random,
    "exact": exact(),
}
Path(__file__).with_name("sim.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
for k in ("vs_human", "vs_random"):
    d = out[k]
    print(k, d["wins"], d["ties"], d["losses"], [round(x, 3) for x in d["opp_share"]])
print("exact", out["exact"])
print("cr_pct", out["cr_pct"])
