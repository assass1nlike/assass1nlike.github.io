"""S4 可数：liminf 居然是至多可数的。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *


class S4Countable(NSc):
    def construct(self):
        head = cn("liminf 里到底有多少个点？", 34, INK).move_to([0, 2.65, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.7)

        # ---------------- 关键：一旦前缀定死，后面的位被强制
        premise = VGroup(
            cn("假设从第", 26, SOFT), eq(r"N", 28, BLUE), cn("层起，x 一直待在黑格里", 26, SOFT)
        ).arrange(RIGHT, buff=0.16).move_to([0, 1.75, 0])
        self.play(FadeIn(premise, shift=0.1 * UP), run_time=0.7)
        self.say("「最终留下」意味着：从某一层起，每一层都在黑格里。", hold=2.8)

        chain = eq(r"x_n \;=\; 1 \oplus \varphi_n(x_1,\dots,x_{n-1})", 40, GOLD)
        chain.move_to([0, 0.85, 0])
        self.play(FadeIn(chain, shift=0.12 * UP), run_time=0.8)
        self.say("但每一层的「异或位」只依赖前缀，所以这个等式把后面的式子一位一位全锁死了。", hold=3.6)

        # 前缀 → 唯一一条尾巴
        yA = -1.05
        pre = VGroup()
        for i, b in enumerate([0, 1, 1, 0]):
            r = Rectangle(width=0.55, height=0.5, fill_color=INK if b else BG,
                          fill_opacity=1 if b else 0, stroke_color=GOLD, stroke_width=1.6)
            r.move_to([-2.1 + 0.6 * i, yA, 0])
            pre.add(r)
        pre_lab = cn("前 N−1 位", 22, GOLD).next_to(pre, UP, buff=0.18)
        dots = eq(r"\cdots", 34).move_to([0.65, yA, 0])
        tail = VGroup()
        for i in range(4):
            r = Rectangle(width=0.55, height=0.5, fill_color=BLUE, fill_opacity=0.85,
                          stroke_color=BLUE, stroke_width=1.2)
            r.move_to([1.5 + 0.6 * i, yA, 0])
            tail.add(r)
        tail_lab = cn("唯一确定的尾巴", 22, BLUE).next_to(tail, UP, buff=0.18)

        self.play(FadeIn(pre), FadeIn(pre_lab), run_time=0.6)
        self.play(FadeIn(dots), run_time=0.3)
        self.play(LaggedStart(*[FadeIn(t, shift=0.08 * RIGHT) for t in tail],
                              lag_ratio=0.28), FadeIn(tail_lab), run_time=1.2)
        self.say("给定前缀，能永远留下的点最多只有一个。", hold=2.8)

        # ---------------- 计数
        self.play(FadeOut(chain), FadeOut(pre), FadeOut(pre_lab),
                  FadeOut(dots), FadeOut(tail), FadeOut(tail_lab), run_time=0.7)
        cnt = VGroup(
            VGroup(cn("每种前缀至多", 28), eq(r"1", 30), cn("个点", 28)).arrange(RIGHT, buff=0.12),
            VGroup(cn("前缀总数", 28), eq(r"2^{N-1}", 30), cn("，对所有 N 取并", 26, SOFT)).arrange(RIGHT, buff=0.12),
            cn("→ 至多可数", 30, GOLD),
        ).arrange(DOWN, buff=0.34).move_to([0, 0.25, 0])
        self.play(FadeIn(cnt, shift=0.12 * UP), run_time=0.8)
        self.say("每个 N 至多 2 的 N−1 次方个点，数到无穷也只是可数。", hold=3.4)
        self.wait(1.0)

        # ---------------- 对比：limsup 是全测度
        self.play(FadeOut(cnt), run_time=0.8)
        self.clear_sub(0.2)

        cmp_ = VGroup(
            VGroup(eq(r"\limsup", 34, GOLD), cn("全测度：几乎所有点", 26, SOFT)).arrange(RIGHT, buff=0.3),
            VGroup(eq(r"\liminf", 34, BLUE), cn("至多可数：一个零测的例外", 26, SOFT)).arrange(RIGHT, buff=0.3),
        ).arrange(DOWN, buff=0.55).move_to([0, 1.0, 0])
        self.play(FadeIn(cmp_[0], shift=0.1 * UP), run_time=0.7)
        self.wait(1.8)
        self.play(FadeIn(cmp_[1], shift=0.1 * UP), run_time=0.7)
        self.say("一个几乎占满整个区间，一个只是零碎的例外。", hold=3.0)

        # ---------------- 一个都不剩的例子
        self.play(FadeOut(cmp_), run_time=0.6)
        ex = VGroup(
            cn("取 Coin sequence = 全 1：", 28, SOFT),
            VGroup(cn("liminf", 32, BLUE), eq(r"= \varnothing", 32, BLUE)).arrange(RIGHT, buff=0.12),
        ).arrange(DOWN, buff=0.35).move_to([0, -0.75, 0])
        self.play(FadeIn(ex, shift=0.12 * UP), run_time=0.8)
        self.say("极端情况：全 1 硬币时，区间 liminf 干脆是空的。", hold=3.2)
        self.say("这不是矛盾：符号空间里那条路径还在，只是它的二进制展开不合法。", hold=3.6)
        self.wait(0.8)
