"""S5b 可数 vs 闭包：把 L 里的点真的画出来，看它为什么撑得起维数。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 11.0


def legal_words_of_length(m, k, tail_free=False):
    """长度 m 的不含 0^k 的字（可选：还要求尾部是 0101... 形式的前缀）。"""
    out = []

    def rec(pref, run):
        if len(pref) == m:
            out.append(tuple(pref))
            return
        if run + 1 < k:
            rec(pref + [0], run + 1)
        rec(pref + [1], 0)

    rec([], 0)
    return out


class S5bCountVsClosure(NSc):
    def construct(self):
        head = cn("可数的点，怎么撑起正的维数", 32, INK).move_to([0, 2.7, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.7)
        self.say("liminf 里的每个点，都对应一条「不出现 00、且尾部交替」的二进制串。", hold=3.2)

        # ---------------- 逐层画出 L 的候选点
        lab = cn("把候选点的位置标出来（k=2）", 24, SOFT).move_to([0, 2.05, 0])
        self.play(FadeIn(lab), run_time=0.5)

        depth = 8
        marks = VGroup()
        prev = None
        ybase = 1.35
        for m in range(2, depth + 1):
            ws = legal_words_of_length(m, 2)
            y = ybase - 0.42 * (m - 2)
            g = VGroup()
            for w in ws:
                idx = int("".join(map(str, w)), 2)
                x = -W / 2 + (idx + 0.5) * (W / 2 ** m)
                g.add(Line([x, y - 0.13, 0], [x, y + 0.13, 0],
                           stroke_color=BLUE, stroke_width=2.2))
            marks.add(g)
            new = g if prev is None else g
            self.play(FadeIn(g), run_time=0.4)
            prev = g
        self.say("层数加深，候选点越来越多，但每一层都只是有限多个。", hold=3.2)

        # ---------------- 密度
        dens = cn("在每个小区间里，都能找到它们", 26, GOLD)
        dens.move_to([0, -2.55, 0])
        self.play(FadeIn(dens, shift=0.1 * UP), run_time=0.7)
        self.say("这是关键：它们可数，却在每个小区间里都出现。", hold=3.2)
        self.wait(1.2)

        self.play(FadeOut(marks), FadeOut(dens), FadeOut(lab), run_time=0.9)
        self.clear_sub(0.2)

        # ---------------- 两种维数对比
        self.play(FadeOut(head), run_time=0.5)
        h2 = cn("于是两种维数给出了不同的答案", 28, SOFT).move_to([0, 2.6, 0])
        self.play(FadeIn(h2), run_time=0.6)

        rows = VGroup(
            VGroup(cn("Hausdorff 维数", 28, SOFT),
                   eq(r"\dim_H L = 0", 32, BLUE),
                   cn("可数集，测度意义上「几乎不存在」", 22, SOFT)).arrange(RIGHT, buff=0.45),
            VGroup(cn("盒维数", 28, SOFT),
                   eq(r"\underline{\dim}_B L = \overline{\dim}_B L = d_k", 32, GOLD),
                   cn("盖格子时，显得和闭包一样大", 22, SOFT)).arrange(RIGHT, buff=0.45),
        ).arrange(DOWN, buff=0.7, aligned_edge=LEFT).move_to([0, 0.75, 0])

        self.play(FadeIn(rows[0], shift=0.1 * UP), run_time=0.8)
        self.wait(2.0)
        self.play(FadeIn(rows[1], shift=0.1 * UP), run_time=0.8)
        self.say("同一个集合，两个维数，一个 0，一个 0.694。", hold=3.6)
        self.wait(1.2)

        self.play(FadeOut(rows), FadeOut(h2), run_time=0.8)
        self.clear_sub(0.2)

        # ---------------- 一句话
        fin = VGroup(
            cn("可数 ≠ 小", 40, GOLD, weight=BOLD),
            cn("「有多少个点」和「要多少格子去盖」是两回事", 26, SOFT),
        ).arrange(DOWN, buff=0.45).move_to([0, 0.15, 0])
        self.play(FadeIn(fin[0], shift=0.12 * UP), run_time=0.9)
        self.wait(1.8)
        self.play(FadeIn(fin[1], shift=0.12 * UP), run_time=0.7)
        self.say("这就是这段构造最反直觉的地方。", hold=3.2)
        self.wait(1.4)
