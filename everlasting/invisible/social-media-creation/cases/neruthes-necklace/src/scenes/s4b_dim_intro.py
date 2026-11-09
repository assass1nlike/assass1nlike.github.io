"""S4b 维数是什么：用 ε 格子去数，看数目的增长指数。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *


def cover_squares(n, x0, y0, size, color=BLUE, sw=0.8, frac=1.0):
    """把 [x0, x0+size] x [y0, y0+size] 切成 n×n 个格子，返回网格线。"""
    g = VGroup()
    step = size / n
    for i in range(n + 1):
        g.add(Line([x0 + step * i, y0, 0], [x0 + step * i, y0 + size, 0],
                   stroke_color=color, stroke_width=sw, stroke_opacity=frac))
        g.add(Line([x0, y0 + step * i, 0], [x0 + size, y0 + step * i, 0],
                   stroke_color=color, stroke_width=sw, stroke_opacity=frac))
    return g


class S4bDimIntro(NSc):
    def construct(self):
        head = cn("先弄清楚「维数」到底在量什么", 32, INK).move_to([0, 2.65, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.7)
        self.say("办法很朴素：拿一把小尺子，去盖住这个集合。", hold=2.8)

        # ---------------- 尺子
        y = 1.55
        ruler = VGroup(*[
            Line([-5.4 + 1.2 * i, y, 0], [-5.4 + 1.2 * (i + 1), y, 0],
                 stroke_color=GOLD, stroke_width=4) for i in range(3)
        ])
        eps = eq(r"\varepsilon", 26, GOLD).next_to(ruler, DOWN, buff=0.2)
        self.play(Create(ruler), FadeIn(eps), run_time=0.8)
        self.say("每隔 ε 长度放一把尺子，数一数最少要几把才能盖住。", hold=3.0)

        formula = eq(r"N(\varepsilon) \;\sim\; \varepsilon^{-d}", 40, BLUE)
        formula.move_to([0, 0.55, 0])
        self.play(FadeIn(formula, shift=0.12 * UP), run_time=0.9)
        self.say("如果 ε 减半，需要的小格子数按某个幂次增长，那个指数就是维数。", hold=3.6)
        self.wait(0.8)

        # ---------------- 三个例子
        self.play(FadeOut(ruler), FadeOut(eps), FadeOut(formula), run_time=0.5)

        # 线段
        seg = Line([-5.6, 1.3, 0], [-3.9, 1.3, 0], stroke_color=INK, stroke_width=7)
        seg_l = VGroup(cn("线段", 24, SOFT), eq(r"d=1", 26, BLUE)).arrange(DOWN, buff=0.16)
        seg_l.move_to([-4.75, 0.55, 0])
        self.play(Create(seg), FadeIn(seg_l), run_time=0.7)

        # 正方形
        sq = Rectangle(width=1.7, height=1.7, fill_color=INK, fill_opacity=0.85,
                       stroke_width=0).move_to([0, 1.3, 0])
        sq_l = VGroup(cn("正方形", 24, SOFT), eq(r"d=2", 26, BLUE)).arrange(DOWN, buff=0.16)
        sq_l.move_to([0, 0.55, 0])
        self.play(FadeIn(sq), FadeIn(sq_l), run_time=0.7)

        # Cantor
        cant = VGroup()
        cur = [(0.0, 1.0)]
        for _ in range(5):
            nxt = []
            for a, b in cur:
                t = (b - a) / 3
                nxt += [(a, a + t), (b - t, b)]
            cur = nxt
        for a, b in cur:
            r = Rectangle(width=(b - a) * 1.7, height=0.5, fill_color=INK,
                          fill_opacity=1, stroke_width=0)
            r.move_to([4.75 - 0.85 + (a + b) / 2 * 1.7, 1.3, 0])
            cant.add(r)
        cant_l = VGroup(cn("Cantor 集", 24, SOFT),
                        eq(r"d=\log_3 2\approx 0.63", 24, GOLD)).arrange(DOWN, buff=0.16)
        cant_l.move_to([4.75, 0.55, 0])
        self.play(FadeIn(cant), FadeIn(cant_l), run_time=0.7)
        self.say("线段是一维，正方形是二维，Cantor 集夹在中间。", hold=3.2)
        self.wait(1.0)

        # ---------------- 关键：这不要求集合是「实心」的
        self.play(*[FadeOut(m) for m in [seg, seg_l, sq, sq_l, cant, cant_l, head]],
                  run_time=0.9)
        self.clear_sub(0.2)

        key = VGroup(
            cn("维数不要求集合是「实心」的", 30, GOLD),
            cn("它只问：小格子数长得多快", 28, SOFT),
        ).arrange(DOWN, buff=0.4).move_to([0, 1.55, 0])
        self.play(FadeIn(key[0], shift=0.12 * UP), run_time=0.8)
        self.wait(1.6)
        self.play(FadeIn(key[1], shift=0.12 * UP), run_time=0.7)
        self.say("这正是我们的 liminf 需要的东西：它可数、稀疏，却可能占住很多小格子。", hold=3.8)
        self.wait(1.2)

        self.play(FadeOut(key), run_time=0.8)
