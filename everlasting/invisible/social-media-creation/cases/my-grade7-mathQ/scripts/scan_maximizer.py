"""Exact maximisers of G(n, m) = F(ka, kb, n, m) - F(a, b, n, m) for a range of a.

Usage:  python scan_maximizer.py S B A_MAX

S = kb and B = b are integers with S > B, so k = S/B.  For every a <= A_MAX with ka an integer the
script finds all maximisers (n, m) of G over n > m >= 1, an >= b, groups consecutive a with the
same maximiser into runs, and prints them together with p* = 1 - k^(-1/(kb-b)) and its continued
fraction.

Search region.  Write s = kb, p = m/n, g(p) = (1-p)^b - (1-p)^s, g* = max g.
  * H_b(an, am) <= (1-p)^b.
  * If ka(n-m) >= s:  H_s(kan, kam) >= (1-p)^s - C(s,2) p (1-p)^(s-1) / (kan - s + 1), hence
    G <= g(p) + C_s / (kan - s + 1) with C_s = max_p C(s,2) p (1-p)^(s-1) = (s-1)/2 (1-1/s)^(s-1).
  * If ka(n-m) < s:   H_s = 0 and G = H_b <= (1-p)^b < (s/(kan))^b.
All n <= N_FULL are scanned completely.  For n > N_FULL the third case is ruled out by an assertion,
and only the m with g(m/n) >= G_best - C_s / (kan - s + 1) are evaluated; the scan stops at the
first n with g* + C_s / (kan - s + 1) < G_best.  Candidates within 1e-9 of the best floating point
value are compared in exact rational arithmetic.
"""
import sys
import time
from decimal import Decimal, getcontext
from fractions import Fraction
from math import ceil, floor

import numpy as np

N_FULL = 60


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


def maximisers(s, b, a):
    ka = s * a // b
    k = s / b
    xs = k ** (-1 / (k - 1))  # maximiser of phi(x) = x - x^k, with x = (1-p)^b
    gstar = xs - xs ** k
    Cs = (s - 1) / 2 * (1 - 1 / s) ** (s - 1)
    best = -1.0
    near = []  # (float value, n, m) for points within 1e-6 of the best value at the time

    def phi(x):
        return x - x ** k

    def evaluate(n, lo, hi):
        nonlocal best
        if lo > hi:
            return
        ms = np.arange(lo, hi + 1)
        vals = H_float(a * n, a * ms, b) - H_float(ka * n, ka * ms, s)
        best = max(best, float(vals.max()))
        keep = vals >= best - 1e-6
        near.extend(zip(vals[keep].tolist(), [n] * int(keep.sum()), ms[keep].tolist()))

    def root(t, lo, hi, increasing):
        # phi increases on [0, x*] and decreases on [x*, 1]; bracket the solution of phi(x) = t
        for _ in range(100):
            mid = (lo + hi) / 2
            if (phi(mid) < t) == increasing:
                lo = mid
            else:
                hi = mid
        return lo, hi

    for n in range(max(2, -(-b // a)), N_FULL + 1):
        evaluate(n, 1, n - 1)
    assert a * (N_FULL + 1) >= b and (s / (ka * (N_FULL + 1))) ** b < best
    n = N_FULL
    while True:
        n += 1
        slack = Cs / (ka * n - s + 1)
        if gstar + slack < best - 1e-12:
            break
        t = best - slack - 1e-12
        if t <= 0:
            lo, hi = 1, n - 1
        else:
            x_lo = root(t, 0.0, xs, True)[0]
            x_hi = root(t, xs, 1.0, False)[1]
            p_lo, p_hi = 1 - x_hi ** (1 / b), 1 - x_lo ** (1 / b)
            lo, hi = max(1, floor(p_lo * n) - 1), min(n - 1, ceil(p_hi * n) + 1)
        evaluate(n, lo, hi)
    top = {(n, m) for v, n, m in near if v >= best - 1e-9}
    exact = {nm: H_exact(a * nm[0], a * nm[1], b) - H_exact(ka * nm[0], ka * nm[1], s) for nm in top}
    G_max = max(exact.values())
    return sorted(nm for nm, v in exact.items() if v == G_max)


def p_star_cf(s, b, terms=12):
    getcontext().prec = 60
    k = Decimal(s) / Decimal(b)
    p = 1 - k ** (Decimal(-1) / Decimal(s - b))
    cf, convs = [], []
    h_prev, h, q_prev, q = 0, 1, 1, 0
    x = p
    for _ in range(terms):
        t = int(x)
        cf.append(t)
        h_prev, h = h, t * h + h_prev
        q_prev, q = q, t * q + q_prev
        convs.append(f"{h}/{q}")
        if x - t < Decimal(10) ** -40:
            break
        x = 1 / (x - t)
    return p, cf, convs


def main():
    s, b, a_max = (int(v) for v in sys.argv[1:4])
    assert s > b >= 1
    p, cf, convs = p_star_cf(s, b)
    print(f"# kb = {s}, b = {b} (k = {s}/{b}); every a <= {a_max} with ka an integer")
    print(f"# p* = 1 - k^(-1/(kb-b)) = {p:.15f}")
    print(f"# continued fraction of p*: [{cf[0]}; {', '.join(map(str, cf[1:]))}, ...]")
    print(f"# convergents: {', '.join(convs)}")
    print(f"# python {sys.version.split()[0]}, numpy {np.__version__}")
    t0 = time.time()
    runs = []
    for a in range(1, a_max + 1):
        if s * a % b:
            continue
        w = maximisers(s, b, a)
        if runs and runs[-1][2] == w:
            runs[-1][1] = a
        else:
            runs.append([a, a, w])
    for a1, a2, w in runs:
        pts = " and ".join(f"({n}, {m})" for n, m in w)
        print(f"a in [{a1}, {a2}]: maximiser {pts}, m/n = {w[0][1] / w[0][0]:.6f}")
    print(f"# {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
