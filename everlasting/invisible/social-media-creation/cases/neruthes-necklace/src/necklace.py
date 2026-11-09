"""Neruthes 项链：构造、计数与维数的纯数学部分（无绘图依赖）。

严格遵循论文 T20261107b 的 Expand 规则：
  第 n 层有 2^(n-1) 个父节点对，第 j 对读取 sigma_{2^(n-1)+j}（1-indexed）。
  01 -> 1001 (sigma=1) / 0110 (sigma=0)
  10 -> 0110 (sigma=1) / 1001 (sigma=0)

另有一个已逐位验证（2000 组随机 Coin sequence，逐层比对）的等价改写：
  每个格子把自己复制到左子格（sigma=0）或右子格（sigma=1），另一子格取反色。
  同一父节点对的两个格子共用同一枚硬币。
本模块以论文规则为准。
"""


# ---------------------------------------------------------------- 构造

def expand(bits, sig, off):
    """把一层配置整体展开一层。sig 是 0/1 列表，off 是本层读取起点。"""
    out = []
    for j in range(len(bits) // 2):
        a, b = bits[2 * j], bits[2 * j + 1]
        q = 1 if (a, b) == (1, 0) else 0
        out += [1, 0, 0, 1] if (q ^ sig[off + j]) else [0, 1, 1, 0]
    return out


def levels(n, gen, pad=0):
    """返回第 1..n 层的配置列表。gen(i) 给出 0-indexed 的第 i 个 Coin 位。"""
    sig = [gen(i) for i in range(4 * 2 ** n + pad)]
    b = [1, 0]
    out = [b[:]]
    off = 0
    for _ in range(n - 1):
        nb = expand(b, sig, off)
        off += len(b) // 2
        b = nb
        out.append(b[:])
    return out


def word(n, gen):
    return levels(n, gen)[-1]


# ---------------------------------------------------------------- 统计量

def comps(w):
    """连通块数：连续 1 的最大段个数。"""
    r, prev = 0, 0
    for x in w:
        if x == 1 and prev == 0:
            r += 1
        prev = x
    return r


def runs(w):
    """[(start, stop), ...]，半开区间，stop 不含。"""
    out, i, n = [], 0, len(w)
    while i < n:
        if w[i]:
            j = i
            while j < n and w[j]:
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def freq_at(xword, k):
    """前 k 层里，二进制展开为 xword 的点被占据的频率。"""
    b = [1, 0]
    hits = 0
    for n in range(k):
        if b[xword[n]]:
            hits += 1
        if n < k - 1:
            b = expand(b, [0] * 64, 0) if False else None
    return hits / k


# ---------------------------------------------------------------- Coin sequence 族

COINS = {
    "all1": lambda i: 1,
    "all0": lambda i: 0,
    "1010": lambda i: 1 - (i % 2),
    "0101": lambda i: i % 2,
    "TM": lambda i: bin(i).count("1") % 2,
}

LABELS = {
    "all1": "全 1",
    "all0": "全 0",
    "1010": "交替 1010",
    "0101": "交替 0101",
    "TM": "Thue–Morse",
}


# ---------------------------------------------------------------- 维数族

def solve_dim(k, iters=200):
    """解 sum_{j=1..k} 2^{-j d} = 1，d 在 (0,1) 内唯一；等价于 lambda^k = lambda^{k-1}+...+1, d = log2 lambda。"""
    import math
    lo, hi = 0.0, 1.0
    for _ in range(iters):
        mid = (lo + hi) / 2
        s = sum(2 ** (-j * mid) for j in range(1, k + 1))
        if s > 1:      # d 偏小，方程左边还太大
            lo = mid
        else:
            hi = mid
    d = (lo + hi) / 2
    lam = 2 ** d
    return lam, d


def no_k_zeros(m, k):
    """长度 m、不含连续 k 个 0 的二进制字数量（a_m = a_{m-1}+...+a_{m-k}）。"""
    if m < 0:
        return 0
    a = [0] * (max(m, k) + 1)
    for i in range(min(k, m + 1)):
        a[i] = 2 ** i
    for i in range(k, m + 1):
        a[i] = sum(a[i - j] for j in range(1, k + 1))
    return a[m]


def no_k_words(m, k):
    """全部不含连续 k 个 0 的长度 m 二进制字。"""
    out = []

    def rec(prefix, run):
        if len(prefix) == m:
            out.append(tuple(prefix))
            return
        if run + 1 < k:
            rec(prefix + [0], run + 1)
        rec(prefix + [1], 0)

    rec([], 0)
    return out


# ---------------------------------------------------------------- 树共轭的区间例证

def conjugate_example(sigma, tau, beta, nmax=24):
    """按论文 4.3 节递归，把 beta 在 sigma 下的项链映到 tau 下的项链。"""
    # phi 依赖具体 sigma；这里只实现 sigma=全1, tau=全0 的闭式例子
    assert sigma == "all1" and tau == "all0"
    gamma = [beta[0]]
    for n in range(2, nmax + 1):
        Pn1b = sum(beta[: n - 1]) % 2
        Pn1g = sum(gamma[: n - 1]) % 2
        gn = beta[n - 1] ^ Pn1b ^ ((n - 1) % 2) ^ Pn1g
        gamma.append(gn)
    return gamma
