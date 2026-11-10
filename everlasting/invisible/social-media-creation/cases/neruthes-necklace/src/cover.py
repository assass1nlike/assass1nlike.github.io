"""封面候选。渲染：python -m manim -qh -s --media_dir build/tmp/media src/cover.py CoverA"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from theme import *
from necklace import *


def necklace_stack(key, n, width, top, dy, h):
    g = VGroup()
    for i, w in enumerate(levels(n, COINS[key])):
        g.add(runs_bar(w, width, h, y=top - dy * i))
    return g


def dust(k, depth, width, top, dy, h, color=INK):
    g = VGroup()
    for m in range(1, depth + 1):
        cw = width / 2 ** m
        row = VGroup()
        for wd in no_k_words(m, k):
            idx = int("".join(map(str, wd)), 2)
            row.add(Rectangle(width=cw * 0.9, height=h, fill_color=color,
                              fill_opacity=1, stroke_width=0)
                    .move_to([-width / 2 + cw * (idx + 0.5), top - dy * (m - 1), 0]))
        g.add(row)
    return g


class CoverA(Scene):
    """项链层叠 + 大字结论。"""

    def construct(self):
        stack = necklace_stack("TM", 8, 13.4, 3.55, 0.36, 0.27)
        stack.set_opacity(0.9)
        self.add(stack)
        l1 = cn("一个可数集", 64, INK, weight=BOLD)
        l2 = VGroup(cn("维数却是", 64, INK, weight=BOLD),
                    cn("0.694", 96, GOLD, weight=BOLD)).arrange(RIGHT, buff=0.3,
                                                                  aligned_edge=DOWN)
        sub = cn("每层都是一半，却从不嵌套的分形", 34, SOFT)
        txt = VGroup(l1, l2, sub).arrange(DOWN, buff=0.32, aligned_edge=LEFT)
        txt.move_to([-1.2, -1.85, 0])
        self.add(txt)


class CoverB(Scene):
    """k=2 维数尘埃 + 公式。"""

    def construct(self):
        d = dust(2, 8, 13.4, 3.5, 0.42, 0.3)
        self.add(d)
        big = cn("可数，却有维数", 76, INK, weight=BOLD)
        val = VGroup(eq(r"\dim_B = \log_2 \varphi", 64, GOLD),
                     eq(r"\approx 0.694", 64, GOLD)).arrange(RIGHT, buff=0.3)
        sub = cn("Neruthes 项链：测度 · 维数 · 欧氏几何", 32, SOFT)
        txt = VGroup(big, val, sub).arrange(DOWN, buff=0.35).move_to([0, -1.95, 0])
        self.add(txt)


class CoverC(Scene):
    """左右对比：Cantor 收缩 vs 项链守恒。"""

    def construct(self):
        cur = [(0.0, 1.0)]
        cant = VGroup()
        for i in range(6):
            row = VGroup(*[Rectangle(width=(b - a) * 5.6, height=0.26, fill_color=SOFT,
                                     fill_opacity=1, stroke_width=0)
                           .move_to([-6.6 + (a + b) / 2 * 5.6, 3.3 - 0.4 * i, 0])
                           for a, b in cur])
            cant.add(row)
            cur = [s for a, b in cur for s in ((a, a + (b - a) / 3), (b - (b - a) / 3, b))]
        neck = necklace_stack("TM", 6, 5.6, 3.3, 0.4, 0.26).shift(RIGHT * 3.8)
        lc = cn("越缩越小", 30, SOFT).move_to([-3.8, 0.75, 0])
        ln = cn("永远一半", 30, GOLD).move_to([3.8, 0.75, 0])
        vs = cn("vs", 34, DIM).move_to([0, 2.3, 0])
        self.add(cant, neck, lc, ln, vs)
        big = VGroup(cn("一个可数集，维数却是", 58, INK, weight=BOLD),
                     cn("0.694", 80, GOLD, weight=BOLD)).arrange(RIGHT, buff=0.25,
                                                                   aligned_edge=DOWN)
        big.move_to([0, -1.6, 0])
        sub = cn("每层都是一半，却从不嵌套的分形", 32, SOFT).move_to([0, -2.75, 0])
        self.add(big, sub)
