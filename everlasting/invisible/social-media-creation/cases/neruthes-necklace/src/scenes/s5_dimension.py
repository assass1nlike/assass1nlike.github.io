"""S5 维数族：禁字约束如何生成精确的维数 d_k。全片高潮。"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 11.4


def no_k_words(m, k):
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


def draw_dust(words, m, width, height, y, color=INK):
    cw = width / (2 ** m)
    g = VGroup()
    for wd in words:
        idx = int("".join(map(str, wd)), 2) if m else 0
        r = Rectangle(width=max(cw * 0.92, 0.004), height=height,
                      fill_color=color, fill_opacity=1.0, stroke_width=0)
        r.move_to([-width / 2 + cw * (idx + 0.5), y, 0])
        g.add(r)
    return g


class S5Dimension(NSc):
    def construct(self):
        stage = []          # 本场所有需要清理的 mobject

        head = cn("现在来挑 Coin sequence：让 liminf 有确定的维数", 30, INK)
        head.move_to([0, 2.7, 0])
        self.play(FadeIn(head, shift=0.1 * UP), run_time=0.7)
        self.say("上一节的 liminf 只是「可数」。可数，不等于没有形状。", hold=3.0)
        self.play(FadeOut(head), run_time=0.5)

        # ---------------- 禁字约束
        rule = VGroup(
            cn("约束：不许出现连续", 28),
            eq(r"k", 30, BLUE),
            cn("个 0", 28),
        ).arrange(RIGHT, buff=0.12).move_to([0, 2.45, 0])
        self.play(FadeIn(rule, shift=0.1 * UP), run_time=0.7)

        ex = VGroup(*[
            VGroup(eq(rf"k={k}", 26, GOLD), cn("：禁止", 22, SOFT),
                   eq(rf"0^{{{k}}}", 26, ROSE)).arrange(RIGHT, buff=0.1)
            for k in (2, 3)
        ]).arrange(RIGHT, buff=1.6).move_to([0, 1.78, 0])
        self.play(FadeIn(ex), run_time=0.6)
        self.say("只改这一条约束，别的全部照旧。", hold=2.4)

        gb = VGroup(
            VGroup(eq(r"1011010", 24, GREEN), cn("合法", 20, SOFT)).arrange(RIGHT, buff=0.15),
            VGroup(eq(r"1010010", 24, ROSE), cn("非法", 20, SOFT)).arrange(RIGHT, buff=0.15),
        ).arrange(RIGHT, buff=1.2).move_to([0, 1.05, 0])
        self.play(FadeIn(gb), run_time=0.6)
        self.wait(1.6)

        self.play(FadeOut(gb), FadeOut(ex), FadeOut(rule), run_time=0.7)

        # ---------------- 闭包 K_k
        lab1 = cn("把合法序列投影到区间，取闭包，得到 K_k", 28, INK)
        lab1.move_to([0, 2.5, 0])
        self.play(FadeIn(lab1, shift=0.1 * UP), run_time=0.7)
        self.say("它自己跟自己相似：前面空 j 个 0，接一个 1，然后再重复一次。", hold=3.2)

        maps = eq(r"K_k = \bigcup_{j=0}^{k-1} f_j(K_k), \qquad f_j(x) = 2^{-(j+1)}(1+x)",
                  32, GOLD).move_to([0, 1.85, 0])
        self.play(FadeIn(maps, shift=0.1 * UP), run_time=0.8)

        dust = VGroup()
        ys = [0.95, 0.42, 0.02, -0.3, -0.56, -0.78]
        for i, m in enumerate([2, 3, 4, 5, 6, 7]):
            g = draw_dust(no_k_words(m, 2), m, W, 0.20, ys[i])
            dust.add(g)
            self.play(FadeIn(g), run_time=0.4)
        self.say("每一层只是把上一层的每一块，按两个固定的比例再复制一次。", hold=3.2)

        ratio = VGroup(
            cn("比例：", 26, SOFT),
            eq(r"2^{-1},\; 2^{-2},\; \dots,\; 2^{-k}", 30, BLUE),
        ).arrange(RIGHT, buff=0.2).move_to([0, -1.45, 0])
        self.play(FadeIn(ratio, shift=0.1 * UP), run_time=0.6)
        self.wait(1.8)

        # ---------------- 维数方程
        self.play(FadeOut(dust), FadeOut(ratio), FadeOut(maps), FadeOut(lab1), run_time=0.9)

        h2 = cn("自相似集的维数，解这个方程", 28, SOFT).move_to([0, 2.45, 0])
        self.play(FadeIn(h2), run_time=0.6)

        e1 = eq(r"\sum_{j=1}^{k} 2^{-j\,d} = 1", 44, GOLD).move_to([0, 1.4, 0])
        self.play(FadeIn(e1, shift=0.12 * UP), run_time=0.9)
        self.say("每一块缩小 2 的 −j 次方，维数 d 要让总面积刚好守恒。", hold=3.0)

        e2 = eq(r"\lambda_k^{\,k} = \lambda_k^{\,k-1} + \cdots + \lambda_k + 1, \qquad d_k = \log_2 \lambda_k",
                32, BLUE).move_to([0, 0.62, 0])
        self.play(FadeIn(e2, shift=0.1 * UP), run_time=0.8)
        self.say("等价地：λ 是那个 k 步递推的特征根。k=2，就是黄金比例。", hold=3.4)

        # ---------------- 数值
        vals = [(k, *solve_dim(k)) for k in (2, 3, 4, 5)]
        rows = VGroup()
        for k, lam, d in vals:
            rows.add(VGroup(
                eq(rf"k={k}", 26, SOFT),
                eq(rf"\lambda={lam:.4f}", 26),
                eq(rf"d_k={d:.4f}", 28, GOLD),
            ).arrange(RIGHT, buff=0.5))
        rows.arrange(DOWN, buff=0.26, aligned_edge=LEFT).move_to([-3.3, -1.15, 0])

        for r in rows:
            self.play(FadeIn(r, shift=0.08 * UP), run_time=0.35)
        tail_txt = VGroup(
            eq(r"k\to\infty", 26, SOFT),
            eq(r"\lambda\to 2", 26),
            eq(r"d_k\to 1", 28, GOLD),
        ).arrange(RIGHT, buff=0.5).next_to(rows, DOWN, buff=0.26).align_to(rows, LEFT)
        self.play(FadeIn(tail_txt), run_time=0.4)
        self.say("禁得越松，维数越接近 1。", hold=2.6)

        # 右侧曲线
        ax = Axes(x_range=[2, 8, 2], y_range=[0.6, 1.02, 0.1],
                  x_length=4.2, y_length=2.4,
                  axis_config={"color": DIM, "stroke_width": 1.2,
                               "include_tip": False, "font_size": 16})
        ax.move_to([3.3, -0.95, 0])
        pts = VGroup(*[Dot(ax.c2p(k, solve_dim(k)[1]), radius=0.045, color=BLUE)
                       for k in range(2, 9)])
        self.play(Create(ax), run_time=0.5)
        self.play(LaggedStart(*[FadeIn(p) for p in pts], lag_ratio=0.1), run_time=1.1)
        self.wait(2.0)

        # ---------------- 高潮
        self.play(FadeOut(h2), FadeOut(e1), FadeOut(e2),
                  FadeOut(rows), FadeOut(tail_txt), FadeOut(ax), FadeOut(pts), run_time=0.9)

        claim = VGroup(
            VGroup(cn("liminf 本身可数", 30, SOFT),
                   eq(r"\Rightarrow\; \dim_H = 0", 32, BLUE)).arrange(RIGHT, buff=0.3),
            VGroup(cn("但它的盒维数", 30, SOFT),
                   eq(r"= d_k > 0", 34, GOLD)).arrange(RIGHT, buff=0.3),
        ).arrange(DOWN, buff=0.6).move_to([0, 1.6, 0])
        self.play(FadeIn(claim[0], shift=0.12 * UP), run_time=0.8)
        self.wait(1.8)
        self.play(FadeIn(claim[1], shift=0.12 * UP), run_time=0.8)
        self.say("一个可数集，Hausdorff 维数是 0，盒维数却是正的。", hold=3.6)
        self.wait(1.0)
        self.play(FadeOut(claim), run_time=0.6)

        # ---------------- 盒计数
        bc_lab = cn("盒计数：用长度 2 的 −m 次方的小格子去盖", 26, SOFT)
        bc_lab.move_to([0, 2.6, 0])
        self.play(FadeIn(bc_lab), run_time=0.6)

        rowsb = VGroup()
        for i, m in enumerate([4, 6, 8, 10]):
            rowsb.add(draw_dust(no_k_words(m, 2), m, 9.6, 0.18, 1.45 - 0.55 * i))
        for g in rowsb:
            self.play(FadeIn(g), run_time=0.4)
        self.say("格子每细一倍，命中的格子数就乘上一个固定的因子。", hold=3.0)

        counts = VGroup(*[
            eq(rf"N(2^{{-{m}}})={len(no_k_words(m,2))}", 20, SOFT)
            for m in (4, 6, 8, 10)
        ])
        for i, c in enumerate(counts):
            c.move_to([-4.6 + 3.0 * (i % 2) * 2, 1.9 - 0.55 * i, 0])
        self.play(*[FadeIn(c) for c in counts], run_time=0.7)
        self.wait(2.2)

        self.play(FadeOut(rowsb), FadeOut(counts), FadeOut(bc_lab), run_time=0.8)

        ax2 = Axes(x_range=[0, 12, 2], y_range=[0, 14, 2],
                   x_length=7.4, y_length=4.0,
                   axis_config={"color": DIM, "stroke_width": 1.4,
                                "include_tip": False, "font_size": 18})
        ax2.move_to([-0.9, 0.3, 0])
        xl = eq(r"m", 26, SOFT).next_to(ax2.x_axis.get_right(), DOWN, buff=0.15)
        yl = eq(r"\log_2 N", 26, SOFT).next_to(ax2.y_axis.get_top(), LEFT, buff=0.12)
        self.play(Create(ax2), FadeIn(xl), FadeIn(yl), run_time=0.8)

        pts2 = VGroup()
        for m in range(1, 12):
            n = len(no_k_words(m, 2))
            if n:
                pts2.add(Dot(ax2.c2p(m, math.log2(n)), radius=0.042, color=GOLD))
        slope = ax2.plot(lambda x: 0.694242 * x + 0.0, x_range=[1, 11.5],
                         color=BLUE, stroke_width=2.6)
        self.play(LaggedStart(*[FadeIn(p) for p in pts2], lag_ratio=0.07), run_time=1.1)
        self.play(Create(slope), run_time=1.0)

        slope_lab = VGroup(
            cn("斜率", 26, SOFT),
            eq(r"= d_2 = 0.694", 28, BLUE),
        ).arrange(RIGHT, buff=0.15).move_to([2.9, 1.4, 0])
        self.play(FadeIn(slope_lab, shift=0.1 * UP), run_time=0.7)
        self.say("取对数，斜率就是维数：0.694，黄金比例的对数。", hold=3.8)
        self.wait(1.4)
