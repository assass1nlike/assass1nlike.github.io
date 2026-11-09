"""S7 树共轭与失效：符号空间里全等，投影到区间就散架。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *


class S7Tree(NSc):
    def construct(self):
        head = cn("为什么会有这种差异？把构造搬到二叉树上看看", 29, INK)
        head.move_to([0, 2.7, 0])
        self.play(FadeIn(head, shift=0.1 * UP), run_time=0.7)
        self.say("每个二进制位，就是树上往左还是往右的一步。", hold=2.8)

        # ---------------- 一棵小树
        ys = [1.55, 0.65, -0.25]
        nodes = {}
        for d in range(3):
            for i in range(2 ** d):
                x = (i - (2 ** d - 1) / 2) * (9.0 / 2 ** d)
                nodes[(d, i)] = Dot([x, ys[d], 0], radius=0.075, color=SOFT)
        edges = VGroup()
        for d in range(2):
            for i in range(2 ** d):
                a, b = nodes[(d, i)], nodes[(d + 1, 2 * i)]
                c = nodes[(d + 1, 2 * i + 1)]
                edges.add(Line(a.get_center(), b.get_center(), stroke_color=DIM, stroke_width=1.6))
                edges.add(Line(a.get_center(), c.get_center(), stroke_color=DIM, stroke_width=1.6))
        tree = VGroup(edges, *nodes.values())
        self.play(Create(edges), run_time=0.9)
        self.play(*[FadeIn(n) for n in nodes.values()], run_time=0.6)
        self.say("每一层，就是树的一整层。", hold=2.0)

        flip = VGroup(
            cn("Coin sequence 只做一件事：把每个节点的两个子节点对调", 26, GOLD)
        ).move_to([0, -1.0, 0])
        self.play(FadeIn(flip, shift=0.1 * UP), run_time=0.8)
        self.say("对调子节点，不改变树的形状，也不改变两个点分开的早晚。", hold=3.4)

        iso = eq(r"d(\beta,\gamma) = 2^{-k} \;\Longrightarrow\; d(T_\sigma\beta, T_\sigma\gamma) = 2^{-k}",
                 32, GREEN).move_to([0, -1.85, 0])
        self.play(FadeIn(iso, shift=0.1 * UP), run_time=0.8)
        self.say("所以任意两条 Coin sequence，在树这个意义下是精确等距的。", hold=3.4)
        self.wait(1.0)

        self.play(FadeOut(tree), FadeOut(flip), FadeOut(iso), FadeOut(head), run_time=0.9)
        self.clear_sub(0.2)

        # ---------------- 投影破坏一切
        h2 = cn("但树不是实数轴", 32, ROSE, weight=BOLD).move_to([0, 2.55, 0])
        self.play(FadeIn(h2, shift=0.12 * UP), run_time=0.7)

        two = VGroup(
            VGroup(eq(r"0.0111\ldots_2", 32), cn("=", 28, SOFT), eq(r"0.1000\ldots_2", 32),
                   cn("=", 28, SOFT), eq(r"\tfrac{1}{2}", 32, GOLD)).arrange(RIGHT, buff=0.18),
            cn("同一个实数，两串二进制", 24, SOFT),
        ).arrange(DOWN, buff=0.28).move_to([0, 1.6, 0])
        self.play(FadeIn(two, shift=0.1 * UP), run_time=0.8)
        self.say("二进制展开不唯一：同一个实数，可以有两串完全不同的二进制。", hold=3.4)

        # 两串分别映到 0 和 1
        arrow = VGroup(
            VGroup(cn("第一串 →", 22, SOFT), eq(r"0.000\ldots_2 = 0", 26, ROSE)).arrange(RIGHT, buff=0.14),
            VGroup(cn("第二串 →", 22, SOFT), eq(r"1.111\ldots_2 = 1", 26, ROSE)).arrange(RIGHT, buff=0.14),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([0, 0.25, 0])
        self.play(FadeIn(arrow, shift=0.08 * UP), run_time=0.8)
        self.say("树上的一个对调，把这两串分别送去了 0 和 1。", hold=3.2)

        # ---------------- 距离被拉长
        dist = VGroup(
            VGroup(eq(r"|\tfrac{1}{3} - \tfrac{2}{3}| = \tfrac{1}{3}", 30),
                   cn("→", 26, SOFT),
                   eq(r"|\tfrac{1}{6} - \tfrac{5}{6}| = \tfrac{2}{3}", 30, ROSE)).arrange(RIGHT, buff=0.25),
            cn("距离被改写了：等距在区间上不成立", 24, SOFT),
        ).arrange(DOWN, buff=0.3).move_to([0, -1.25, 0])
        self.play(FadeIn(dist[0], shift=0.1 * UP), run_time=0.8)
        self.play(FadeIn(dist[1]), run_time=0.5)
        self.say("树上的等距，投影到实数轴上就不再是等距。", hold=3.4)
        self.wait(1.2)

        self.play(*[FadeOut(m) for m in [h2, two, arrow, dist]], run_time=0.9)
        self.clear_sub(0.2)

        # ---------------- 收尾
        final = VGroup(
            cn("符号空间里，所有项链是同一个", 30, SOFT),
            cn("实数轴上，它们各不相同", 32, GOLD),
        ).arrange(DOWN, buff=0.5).move_to([0, 1.0, 0])
        self.play(FadeIn(final[0], shift=0.1 * UP), run_time=0.8)
        self.wait(1.6)
        self.play(FadeIn(final[1], shift=0.1 * UP), run_time=0.8)
        self.say("这就是 coding sensitivity：编码怎么选，几何就怎么变。", hold=3.6)
        self.wait(1.4)

        self.play(FadeOut(final), run_time=0.9)
        self.clear_sub(0.2)

        # 结束卡移到 S8 末尾

