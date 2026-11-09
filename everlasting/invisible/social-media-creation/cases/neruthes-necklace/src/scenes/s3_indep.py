"""S3 独立公平：确定性规则，却给出 i.i.d. 公平比特。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 11.0


class S3Indep(NSc):
    def construct(self):
        # ---------------- 二进制展开
        head = cn("把区间里的点写成二进制", 32, INK).move_to([0, 2.65, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.7)

        bits = VGroup(eq(r"x = 0.", 40), *[
            eq(f"x_{i}", 40) for i in range(1, 7)
        ], eq(r"\cdots", 40)).arrange(RIGHT, buff=0.12).move_to([0, 1.65, 0])
        self.play(FadeIn(bits, shift=0.1 * UP), run_time=0.7)
        self.say("每个 x 的二进制位，在 Lebesgue 测度下就是一枚枚独立公平的硬币。", hold=2.8)

        # ---------------- 一个父对，两个孩子
        yA = -0.15
        cw = 2.0
        par = Rectangle(width=2 * cw, height=0.62, fill_opacity=0, stroke_color=GOLD,
                        stroke_width=2.2).move_to([0, yA, 0])
        left = Rectangle(width=cw * 0.96, height=0.6, fill_color=INK, fill_opacity=1,
                         stroke_color=SOFT, stroke_width=1.2).move_to([-cw / 2, yA, 0])
        right = Rectangle(width=cw * 0.96, height=0.6, fill_color=BG, fill_opacity=0,
                          stroke_color=SOFT, stroke_width=1.2).move_to([cw / 2, yA, 0])
        ltag = eq(r"x_n = 0", 26, SOFT).move_to([-cw / 2, yA - 0.62, 0])
        rtag = eq(r"x_n = 1", 26, SOFT).move_to([cw / 2, yA - 0.62, 0])

        self.play(FadeIn(par), FadeIn(left), FadeIn(right), run_time=0.6)
        self.play(FadeIn(ltag), FadeIn(rtag), run_time=0.5)
        self.say("看某一层的任意一个父对：前 n−1 位固定了它，最后一位决定落在哪半。", hold=3.0)

        left_on = Rectangle(width=cw * 0.96, height=0.6, stroke_color=BLUE, stroke_width=3,
                            fill_opacity=0).move_to([-cw / 2, yA, 0])
        right_on = Rectangle(width=cw * 0.96, height=0.6, stroke_color=BLUE, stroke_width=3,
                             fill_opacity=0).move_to([cw / 2, yA, 0])
        self.play(Create(left_on), run_time=0.5)
        self.say("x 的末位是 0，落在黑的那半 → 被占据。", hold=2.4)
        self.play(FadeOut(left_on), Create(right_on), run_time=0.5)
        self.say("末位是 1，落在白的那半 → 不被占据。", hold=2.4)

        # ---------------- 三角表示
        self.play(FadeOut(right_on), run_time=0.3)
        phi = eq(r"\mathbf{1}_{A_n}(x) = x_n \oplus \varphi_n(x_1,\dots,x_{n-1})", 42, BLUE)
        phi.move_to([0, 1.5, 0])
        self.play(FadeOut(head), FadeOut(bits), run_time=0.6)
        self.play(FadeIn(phi, shift=0.15 * UP), run_time=0.9)
        self.say("写成一句话：是不是黑格，就是「最后一位」异或「一个只由前缀决定的位」。", hold=3.4)

        # ---------------- 独立性链条
        self.play(FadeOut(par), FadeOut(left), FadeOut(right),
                  FadeOut(ltag), FadeOut(rtag), run_time=0.7)
        self.clear_sub(0.2)

        steps = [
            (eq(r"x_n", 34, GOLD), "固定前缀后，仍是公平硬币"),
            (VGroup(eq(r"\varphi_n", 34, SOFT), cn("（前缀）", 22, SOFT)).arrange(RIGHT, buff=0.08),
             "前缀固定，它就是常数 0 或 1"),
            (VGroup(eq(r"x_n \oplus", 34, GOLD), cn("常数", 22, SOFT)).arrange(RIGHT, buff=0.1),
             "公平硬币翻不翻转，还是公平"),
            (eq(r"Y_n \perp \sigma(x_1,\dots,x_{n-1})", 34, GREEN),
             "与前面所有层独立"),
        ]
        y_top = 0.50
        dy = 0.72
        lines = VGroup()
        for i, (m, note) in enumerate(steps):
            n_txt = cn(note, 23, SOFT)
            row = VGroup(m, n_txt).arrange(RIGHT, buff=0.55).move_to([0, y_top - dy * i, 0])
            lines.add(row)

        for i, row in enumerate(lines):
            self.play(FadeIn(row, shift=0.1 * UP), run_time=0.65)
            self.wait(1.6)

        res = eq(r"Y_1, Y_2, Y_3, \dots \;\text{i.i.d. fair Bernoulli}", 34, GREEN)
        res.move_to([0, -2.45, 0])
        self.play(FadeIn(res, shift=0.12 * UP), run_time=0.9)
        self.say("对任何一条确定性 Coin sequence，这都成立。", hold=3.0)
        self.wait(0.8)

        # ---------------- 推论
        self.play(*[FadeOut(m) for m in [*lines, res, phi]], run_time=0.8)
        self.clear_sub(0.2)

        cons = VGroup(
            VGroup(eq(r"\frac{1}{N}\sum_{n\le N} Y_n(x) \longrightarrow \frac{1}{2}", 34),
                   cn("几乎处处", 23, SOFT)).arrange(RIGHT, buff=0.35),
            VGroup(eq(r"\lambda(\limsup A_n) = 1", 34, GOLD),
                   cn("几乎每个点都回来无穷多次", 23, SOFT)).arrange(RIGHT, buff=0.35),
            VGroup(eq(r"\lambda(\liminf A_n) = 0", 34, BLUE),
                   cn("几乎没有点能永远留下", 23, SOFT)).arrange(RIGHT, buff=0.35),
        ).arrange(DOWN, buff=0.62, aligned_edge=LEFT).move_to([0, 0.75, 0])
        for i, row in enumerate(cons):
            self.play(FadeIn(row, shift=0.1 * UP), run_time=0.7)
            self.wait(2.0)
        self.say("随机性来自「你在看哪里」，而不是来自规则本身。", hold=3.2)
        self.wait(1.0)
