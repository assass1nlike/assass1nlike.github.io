"""S2b 与 Cantor 的对照：嵌套收缩 vs 守恒平移。只做一次对照。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 10.2


def cantor_levels(n):
    out = [[1, 0, 1, 0] if False else [1, 0, 0, 1]]
    # 标准 Cantor：每段保留两侧，中间留空
    cur = [(0.0, 1.0)]
    L = []
    for _ in range(n):
        nxt = []
        for a, b in cur:
            m = (a + b) / 2
            third = (b - a) / 3
            nxt.append((a, a + third))
            nxt.append((b - third, b))
        cur = nxt
        L.append(list(cur))
    return L


class S2bCantor(NSc):
    def construct(self):
        head = cn("和 Cantor 集比一下，差别在哪里", 32, INK).move_to([0, 2.65, 0])
        self.play(FadeIn(head, shift=0.1 * UP), run_time=0.7)

        # ---------------- Cantor
        lab_c = cn("Cantor：越缩越小，层层包含", 25, SOFT).move_to([0, 1.95, 0])
        self.play(FadeIn(lab_c), run_time=0.5)

        CL = cantor_levels(6)
        rows = VGroup()
        for i, segs in enumerate(CL):
            g = VGroup()
            y = 1.35 - 0.42 * i
            for a, b in segs:
                r = Rectangle(width=(b - a) * W, height=0.26,
                              fill_color=INK, fill_opacity=1, stroke_width=0)
                r.move_to([-W / 2 + (a + b) / 2 * W, y, 0])
                g.add(r)
            rows.add(g)
        for g in rows:
            self.play(FadeIn(g), run_time=0.35)
        self.say("每一层的黑色都在上一层里面，越缩越细。", hold=3.0)

        pre = eq(r"\lambda(A_n) = \left(\tfrac{2}{3}\right)^n \to 0", 30, ROSE)
        pre.move_to([0, -1.75, 0])
        self.play(FadeIn(pre, shift=0.1 * LEFT), run_time=0.7)
        self.say("测度一路掉到 0，剩下的就是那个零测的极限集。", hold=3.2)
        self.wait(1.0)

        # ---------------- 项链
        self.play(*[FadeOut(m) for m in [*rows, pre, lab_c]], run_time=0.8)
        self.clear_sub(0.2)

        lab_n = cn("项链：位置在动，总长度不动", 25, SOFT).move_to([0, 1.95, 0])
        self.play(FadeIn(lab_n), run_time=0.5)

        L = levels(7, COINS["1010"])
        nrows = VGroup()
        for i, w in enumerate(L[1:]):
            g = runs_bar(w, W, 0.26, y=1.35 - 0.42 * i)
            nrows.add(g)
        for g in nrows:
            self.play(FadeIn(g), run_time=0.35)
        self.say("每一层都不包含上一层，可每一层的总长度都是 1/2。", hold=3.2)

        keep = eq(r"\lambda(A_n) = \tfrac{1}{2}, \quad \forall n", 30, BLUE)
        keep.move_to([0, -1.75, 0])
        self.play(FadeIn(keep, shift=0.1 * LEFT), run_time=0.7)
        self.say("所以它既没有极限集可以求交，也没有测度可以丢掉。", hold=3.4)
        self.wait(1.2)

        # ---------------- 一句话
        self.play(*[FadeOut(m) for m in [*nrows, keep, lab_n, head]], run_time=0.9)
        self.clear_sub(0.2)

        cmp_ = VGroup(
            cn("Cantor 用「包含」定义极限", 28, SOFT),
            cn("项链用「守恒」定义每一层", 30, GOLD),
        ).arrange(DOWN, buff=0.5).move_to([0, 0.2, 0])
        self.play(FadeIn(cmp_[0], shift=0.1 * UP), run_time=0.7)
        self.wait(1.6)
        self.play(FadeIn(cmp_[1], shift=0.1 * UP), run_time=0.8)
        self.say("后面所有的反直觉，都是从这一条差别长出来的。", hold=3.4)
        self.wait(1.4)
