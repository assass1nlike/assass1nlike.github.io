"""S6b 五条 Coin sequence 并排，外加一个还没证明的模 4 巧合。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

CAM_W = 2.05


class S6bFive(NSc):
    def construct(self):
        head = cn("五条 Coin sequence 放在一起", 32, INK).move_to([0, 2.75, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.7)
        self.say("同样的层数，同样的总长度，五种完全不同的黑格分布。", hold=3.0)

        keys = ["all1", "all0", "1010", "0101", "TM"]
        xs = [-5.3, -2.65, 0.0, 2.65, 5.3]
        cols = []
        for key, x in zip(keys, xs):
            L = levels(8, COINS[key])
            col = VGroup()
            for n, w in enumerate(L[3:], start=4):
                col.add(runs_bar(w, CAM_W, 0.12, y=1.55 - 0.245 * (n - 4)))
            lab = VGroup(
                cn(LABELS[key], 19, GOLD),
                eq(rf"R_9={comps(word(9, COINS[key]))}", 17, SOFT),
            ).arrange(DOWN, buff=0.06)
            cols.append(VGroup(col, lab).move_to([x, 0.55, 0]))

        for c in cols:
            self.play(FadeIn(c), run_time=0.45)
        self.say("全 1、全 0、两种交替、Thue–Morse：每一层的段数都不同。", hold=3.2)
        self.wait(1.4)

        self.play(*[FadeOut(c) for c in cols], FadeOut(head), run_time=0.9)
        self.clear_sub(0.2)

        # ---------------- 段数表
        h2 = cn("第 n 层的连通块数", 28, SOFT).move_to([0, 2.6, 0])
        self.play(FadeIn(h2), run_time=0.6)

        rowspec = [("n", "全 1", "全 0", "1010", "Thue–Morse")]
        for n in [6, 7, 8, 9]:
            rowspec.append((
                str(n),
                str(comps(word(n, COINS["all1"]))),
                str(comps(word(n, COINS["all0"]))),
                str(comps(word(n, COINS["1010"]))),
                str(comps(word(n, COINS["TM"]))),
            ))

        colx = [-2.6, -1.1, 0.25, 1.5, 3.0]
        cells = VGroup()
        for r, row in enumerate(rowspec):
            for c, txt in enumerate(row):
                col_ = SOFT if (r == 0 or c == 0) else INK
                cells.add(cn(txt, 22, col_).move_to([colx[c], 1.75 - 0.48 * r, 0]))
        self.play(FadeIn(cells), run_time=0.8)

        # 高亮 mod 4
        hl = VGroup()
        for r, n in enumerate([6, 7, 8, 9], start=1):
            if n % 4 == 0:
                hl.add(cn(rowspec[r][4], 22, GOLD).move_to([colx[4], 1.75 - 0.48 * r, 0]))
            elif n % 4 == 2:
                hl.add(cn(rowspec[r][4], 22, GOLD).move_to([colx[4], 1.75 - 0.48 * r, 0]))
        self.say("注意最后一列：它是从两条常数序列那里借来的。", hold=3.2)

        rule = VGroup(
            VGroup(eq(r"n \equiv 0 \pmod 4", 24, BLUE),
                   cn("时与全 1 相同", 22, SOFT)).arrange(RIGHT, buff=0.15),
            VGroup(eq(r"n \equiv 2 \pmod 4", 24, ROSE),
                   cn("时与全 0 相同", 22, SOFT)).arrange(RIGHT, buff=0.15),
            VGroup(eq(r"n", 24, GOLD), cn("为奇数时三者相同", 22, SOFT)).arrange(RIGHT, buff=0.15),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([0.0, -1.35, 0])
        self.play(FadeIn(rule, shift=0.1 * UP), run_time=0.9)
        self.say("论文里这是 conjecture，不是定理，算到 31 层都对。", hold=3.6)
        self.wait(1.4)
