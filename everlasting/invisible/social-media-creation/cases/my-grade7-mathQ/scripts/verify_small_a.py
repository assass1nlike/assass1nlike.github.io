"""Exhaustive check of the case kb = b + 1 for every b >= 2 with a <= 30.

Here k = (b+1)/b, so ka is an integer exactly when b | a; write a = b*c.  For each of the 81
pairs (b, c) with b >= 2 and b*c <= 30 the script proves that (n, m) = (b+1, 1) is the unique
maximiser of

    G(n, m) = F(ka, kb, n, m) - F(a, b, n, m) = H_b(an, am) - H_{b+1}(kan, kam),
    H_j(N, M) = C(N-M, j) / C(N, j),

over all integers n > m >= 1.

Search region.  With p = m/n and g(p) = p (1-p)^b,
    H_b(an, am) <= (1-p)^b,
    H_{b+1}(kan, kam) >= (1-p)^{b+1} - C(b+1, 2) p (1-p)^b / (kan - b),
so G(n, m) <= g(p) f(n) with f(n) = 1 + C(b+1, 2) / ((b+1) c n - b).  Since g <= g* = g(1/(b+1))
and f decreases in n, no n with g* f(n) < G0 = G(b+1, 1) can reach G0, and for the remaining n
only the m with g(m/n) f(n) >= G0 can (g is unimodal with its peak at 1/(b+1)).

Every point of this finite region is evaluated in floating point.  Points within 1e-9 of G0 and
the best competitor are then compared with G0 in exact rational arithmetic.  Floating point
errors here are below 1e-14, so a point more than 1e-9 below G0 in floating point is below G0.
"""
import sys
import time
from fractions import Fraction
from math import comb

import numpy as np


def H_float(N, M, j):
    """C(N-M, j) / C(N, j) for an integer array M."""
    U = N - np.asarray(M, dtype=np.float64)
    r = np.ones_like(U)
    for i in range(j):
        r *= np.maximum(U - i, 0.0) / (N - i)
    return r


def H_exact(N, M, j):
    if N - M < j:
        return Fraction(0)
    r = Fraction(1)
    for i in range(j):
        r *= Fraction(N - M - i, N - i)
    return r


def check(b, c):
    a, ka = b * c, (b + 1) * c

    def G(n, m):
        return H_exact(a * n, a * m, b) - H_exact(ka * n, ka * m, b + 1)

    def g(p):
        return p * (1 - p) ** b

    G0 = G(b + 1, 1)
    G0f = float(G0)
    gstar = g(1 / (b + 1))
    assert G0f > gstar * (1 + 1e-9), (b, c)  # otherwise the search region would be infinite
    C2 = comb(b + 1, 2)
    best_v, best_nm = -1.0, None
    close, evaluated = [], 0
    n = 1
    while True:
        n += 1
        f = 1 + C2 / ((b + 1) * c * n - b)
        if gstar * f < G0f * (1 - 1e-12):
            break
        t = G0f / f * (1 - 1e-12)
        m0 = max(1, n // (b + 1))
        ms = []
        m = m0
        while m >= 1 and g(m / n) >= t:
            ms.append(m)
            m -= 1
        m = m0 + 1
        while m <= n - 1 and g(m / n) >= t:
            ms.append(m)
            m += 1
        if not ms:
            continue
        arr = np.array(ms)
        vals = H_float(a * n, a * arr, b) - H_float(ka * n, ka * arr, b + 1)
        evaluated += len(ms)
        for m, v in zip(ms, vals.tolist()):
            if (n, m) == (b + 1, 1):
                continue
            if v > best_v:
                best_v, best_nm = v, (n, m)
            if v >= G0f - 1e-9:
                close.append((n, m))
    for nm in close:
        assert G(*nm) < G0, (b, c, nm)
    gap = G0 - G(*best_nm)
    assert gap > 0, (b, c, best_nm)
    return n, evaluated, best_nm, float(gap / G0)


def main():
    pairs = [(b, c) for b in range(2, 31) for c in range(1, 30 // b + 1)]
    print(f"# kb = b+1, b >= 2, a = b*c <= 30: {len(pairs)} pairs")
    print(f"# python {sys.version.split()[0]}, numpy {np.__version__}")
    print("# n_cut: first n excluded by the bound; evaluated: number of points evaluated;")
    print("# best: best competitor (n, m); rel_gap: (G(b+1,1) - G(best)) / G(b+1,1), exact")
    print(f"#{'b':>3} {'c':>3} {'a':>3} {'n_cut':>7} {'evaluated':>10} {'best':>10} {'rel_gap':>10}")
    t0 = time.time()
    for b, c in pairs:
        n_cut, evaluated, best, rel_gap = check(b, c)
        print(f"{b:4d} {c:3d} {b * c:3d} {n_cut:7d} {evaluated:10d} {str(best):>10} {rel_gap:10.3e}")
    print(f"# all {len(pairs)} pairs: (b+1, 1) is the unique maximiser ({time.time() - t0:.0f} s)")


if __name__ == "__main__":
    main()
