"""S0 开场：把这一列一列的层次堆出来，先制造疑问。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 11.2
H = 0.30
DY = 0.40


class S0Hook(NSc):
    def construct(self):
        y0 = 1.15
        L = levels(9, COINS["1010"])

        # 第一层：两个格子
        f1 = frame_bar(W, H, y=y0)
        c1 = cells([1, 0], W, H, y=y0)
        self.play(FadeIn(f1), run_time=0.5)
        self.play(FadeIn(c1), run_time=0.6)
        self.say("从一个黑格、一个白格开始：每一层，黑白各占一半。", hold=2.2)

        # 逐层长出来
        rows = [c1]
        for n in range(2, len(L) + 1):
            y = y0 - DY * (n - 1)
            bar = runs_bar(L[n - 1], W, H, y=y)
            fr = frame_bar(W, H, y=y)
            self.add(fr)
            self.play(FadeIn(bar), run_time=0.32)
            rows.append(bar)
            self.remove(fr)
        self.wait(0.6)

        # 层增长时不损失长度
        m1 = eq(r"\lambda(A_n)=\tfrac{1}{2}", 40, BLUE)
        m1.move_to([0, 2.45, 0])
        self.play(FadeIn(m1, shift=0.2 * UP), run_time=0.7)
        self.say("不管长到第几层，黑色格子的总长度都正好是 1/2。", hold=2.4)

        q = cn("那么，一直细分下去，极限是什么？", 34, GOLD)
        q.move_to([0, 2.45, 0])
        self.play(FadeOut(m1), FadeIn(q, shift=0.2 * UP), run_time=0.7)
        self.wait(2.2)

        # 关键：不嵌套
        note = cn("注意：下一层并不在上一层里面", 30, ROSE)
        note.move_to([0, -2.65, 0])
        self.play(FadeIn(note), run_time=0.6)
        self.play(Indicate(rows[0], color=ROSE, scale_factor=1.0), run_time=0.9)
        self.play(Indicate(rows[1], color=ROSE, scale_factor=1.0), run_time=0.9)
        self.wait(1.6)
        self.play(FadeOut(note), FadeOut(q), run_time=0.6)

        # 标题
        title = cn("Neruthes 项链", 62, INK, weight=BOLD)
        sub = cn("测度 · 维数 · 欧氏几何", 30, SOFT)
        tg = VGroup(title, sub).arrange(DOWN, buff=0.42).move_to([0, 0.55, 0])
        self.play(FadeOut(VGroup(f1, *rows)), run_time=0.8)
        self.clear_sub(0.2)
        self.play(FadeIn(title, shift=0.25 * UP), run_time=1.0)
        self.play(FadeIn(sub, shift=0.15 * UP), run_time=0.8)
        self.wait(2.4)
        self.play(FadeOut(tg), run_time=0.7)
