"""S1 规则：一次替换，黑色格子总是翻倍。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 11.0
H = 0.34


def bit_row(bits, width, height, y=0, x_left=0.0, color=INK, sw=1.2, gapf=0.94):
    n = len(bits)
    cw = width / n
    g = VGroup()
    for i, b in enumerate(bits):
        r = Rectangle(
            width=cw * gapf, height=height,
            fill_color=color if b else BG,
            fill_opacity=1.0 if b else 0.0,
            stroke_color=SOFT, stroke_width=sw,
        )
        r.move_to([x_left + cw * (i + 0.5), y, 0])
        g.add(r)
    return g


class S1Rule(NSc):
    def construct(self):
        # ---------------- 初始两格
        yA = 1.55
        pair = cells([1, 0], W, H, y=yA)
        fr = frame_bar(W, H, y=yA)
        self.play(FadeIn(fr), FadeIn(pair), run_time=0.9)
        self.say("第 1 层只有两个格子：一黑一白。", hold=2.2)

        coin = cn("σ = ?", 32, GOLD).move_to([0, 2.55, 0])
        self.play(FadeIn(coin, shift=0.15 * UP), run_time=0.6)
        self.say("每一对黑白格子，由 Coin sequence 的一位来指挥。", hold=2.2)

        # ---------------- 两种可能输出
        yB = 0.15
        lbar = runs_bar([0, 1, 1, 0], 4.4, H, y=yB).move_to([-3.2, yB, 0])
        rbar = runs_bar([1, 0, 0, 1], 4.4, H, y=yB).move_to([3.2, yB, 0])
        lfr = frame_bar(4.4, H, y=yB).move_to([-3.2, yB, 0])
        rfr = frame_bar(4.4, H, y=yB).move_to([3.2, yB, 0])
        lname = eq(r"0110", 30, INK).move_to([-3.2, yB - 0.52, 0])
        rname = eq(r"1001", 30, INK).move_to([3.2, yB - 0.52, 0])

        self.play(FadeIn(lfr), FadeIn(rfr), run_time=0.6)
        self.play(FadeIn(lbar), FadeIn(rbar), run_time=0.7)
        self.play(FadeIn(lname), FadeIn(rname), run_time=0.5)
        self.say("允许的输出只有两种：0110 和 1001。", hold=2.4)

        self.play(Circumscribe(lbar, color=GOLD, buff=0.14),
                  Circumscribe(rbar, color=GOLD, buff=0.14), run_time=1.2)
        self.say("不管选哪个，都是两黑两白。", hold=2.4)

        # ---------------- 规则
        rule = VGroup(
            VGroup(eq(r"01 \;\longrightarrow\;", 30),
                   eq(r"1001", 30, GOLD), cn("/", 24, SOFT),
                   eq(r"0110", 30, GOLD)).arrange(RIGHT, buff=0.1),
            VGroup(eq(r"10 \;\longrightarrow\;", 30),
                   eq(r"0110", 30, GOLD), cn("/", 24, SOFT),
                   eq(r"1001", 30, GOLD)).arrange(RIGHT, buff=0.1),
        ).arrange(DOWN, buff=0.2).move_to([0, -1.25, 0])
        self.play(FadeIn(rule, shift=0.12 * UP), run_time=0.8)
        self.say("具体是哪一个，只看硬币位是 0 还是 1。", hold=2.6)

        self.play(*[FadeOut(m) for m in
                    [rule, lbar, rbar, lfr, rfr, lname, rname, coin, pair, fr]],
                  run_time=0.9)
        self.clear_sub(0.2)

        # ---------------- 等价看法：颜色交给一侧，另一侧取反
        head = cn("换个说法", 30, BLUE).move_to([0, 2.55, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.6)
        self.say("每个格子把颜色交给左半边或右半边，另一半取反色。", hold=2.8)

        # 一个父格
        yC = 0.9
        par = Rectangle(width=1.6, height=0.5, fill_color=INK, fill_opacity=1,
                        stroke_color=SOFT, stroke_width=1.2).move_to([0, yC, 0])
        self.play(FadeIn(par), run_time=0.5)

        # 子格：σ=1 时颜色去右边
        yD = -0.05
        ch_l = Rectangle(width=0.8, height=0.42, fill_color=BG, fill_opacity=0,
                         stroke_color=SOFT, stroke_width=1.2).move_to([-0.4, yD, 0])
        ch_r = Rectangle(width=0.8, height=0.42, fill_color=INK, fill_opacity=1,
                         stroke_color=SOFT, stroke_width=1.2).move_to([0.4, yD, 0])
        self.play(FadeIn(ch_l), FadeIn(ch_r), run_time=0.6)
        lab1 = cn("σ=1：交给右", 22, GOLD).move_to([0, yD - 0.55, 0])
        self.play(FadeIn(lab1), run_time=0.4)
        self.wait(1.8)

        # σ=0 时颜色去左边
        self.play(FadeOut(lab1), run_time=0.3)
        self.play(ch_l.animate.set_fill(INK, 1), ch_r.animate.set_fill(BG, 0), run_time=0.8)
        lab2 = cn("σ=0：交给左", 22, GOLD).move_to([0, yD - 0.55, 0])
        self.play(FadeIn(lab2), run_time=0.4)
        self.wait(1.8)

        right_note = cn("一个黑格 → 恰好一个黑格", 28, GREEN).move_to([3.6, 0.55, 0])
        right_note2 = cn("黑格总数必然翻倍", 28, GREEN).move_to([3.6, -0.05, 0])
        self.play(FadeIn(right_note, shift=0.1 * UP), FadeIn(right_note2, shift=0.1 * UP),
                  run_time=0.7)
        self.say("一个黑格永远生出恰好一个黑格。", hold=2.6)
        self.wait(1.2)

        # ---------------- 守恒的算术
        self.play(*[FadeOut(m) for m in
                    [head, par, ch_l, ch_r, lab2, right_note, right_note2]],
                  run_time=0.8)
        self.clear_sub(0.2)

        l1 = VGroup(eq(r"n", 30), cn("层：", 28), eq(r"2^{\,n-1}", 30),
                    cn("个父对，", 28), eq(r"2^{\,n-1}", 30),
                    cn("个黑格", 28)).arrange(RIGHT, buff=0.12)
        l2 = VGroup(eq(r"n+1", 30), cn("层：", 28), eq(r"2^{\,n}", 30),
                    cn("个格子，", 28), eq(r"2^{\,n}", 30),
                    cn("个黑格", 28)).arrange(RIGHT, buff=0.12)
        l3 = eq(r"\lambda(A_{n+1}) = \frac{2^{\,n}}{2^{\,n+1}} = \frac{1}{2}", 42, BLUE)
        calc = VGroup(l1, l2, l3).arrange(DOWN, buff=0.5).move_to([0, 0.55, 0])

        for i, line in enumerate(calc):
            self.play(FadeIn(line, shift=0.12 * UP), run_time=0.7)
            if i < 2:
                self.wait(2.0)
        self.wait(0.8)
        self.say("黑格翻倍，总格数也翻倍，比例被钉死在 1/2。", hold=3.2)
        self.wait(1.0)
