"""S8 余下未解的问题 + 一句总结。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *


class S8Open(NSc):
    def construct(self):
        head = cn("还剩什么没搞清楚", 36, INK, weight=BOLD).move_to([0, 2.6, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.8)
        self.say("这套构造最干净的地方，是把「符号的等价」和「几何的差异」分开了。", hold=3.4)

        items = [
            (r"d_k", "能否从自动机的转移图直接算出来？", BLUE),
            (r"R_n", "能不能从连通块序列反推 Coin sequence？", GOLD),
            (r"K_\sigma", "什么时候两个闭包是 bi-Lipschitz 等价的？", ROSE),
            (r"\dim_F", "Fourier 维数是否等于 Hausdorff 维数？", GREEN),
        ]
        rows = VGroup()
        for tex, note, col in items:
            rows.add(VGroup(
                eq(tex, 32, col),
                cn(note, 24, SOFT),
            ).arrange(RIGHT, buff=0.5))
        rows.arrange(DOWN, buff=0.5, aligned_edge=LEFT).move_to([-1.4, 0.55, 0])

        for i, r in enumerate(rows):
            self.play(FadeIn(r, shift=0.1 * UP), run_time=0.6)
            self.wait(2.6)

        self.say("论文里这些都还是 conjecture 或 open problem，不是定理。", hold=3.4)

        # 收尾一句
        self.play(FadeOut(rows), FadeOut(head), run_time=0.8)
        self.clear_sub(0.2)

        q = VGroup(
            cn("一个局部平衡的替换规则", 30, SOFT),
            cn("在两种几何里，长成了两种样子", 32, INK),
            cn("这就是 coding sensitivity", 34, GOLD),
        ).arrange(DOWN, buff=0.45).move_to([0, 0.2, 0])
        self.play(FadeIn(q[0], shift=0.12 * UP), run_time=0.8)
        self.play(FadeIn(q[1], shift=0.12 * UP), run_time=0.8)
        self.play(FadeIn(q[2], shift=0.12 * UP), run_time=0.9)
        self.wait(4.0)
        self.play(FadeOut(q), run_time=1.4)

        # ---------------- 结束卡
        t1 = cn("Neruthes 项链", 52, INK, weight=BOLD)
        t2 = cn("一个局部平衡规则，两种几何", 28, SOFT)
        t3 = cn("测度守恒 · 确定性的独立随机 · 可数集的盒维数", 24, BLUE)
        credit = cn("配乐：Kevin MacLeod《Ambiment》，CC BY 4.0", 18, DIM)
        card = VGroup(t1, t2, t3).arrange(DOWN, buff=0.42).move_to([0, 0.55, 0])
        credit.move_to([0, -1.85, 0])
        self.play(FadeIn(t1, shift=0.2 * UP), run_time=1.0)
        self.play(FadeIn(t2, shift=0.12 * UP), run_time=0.7)
        self.play(FadeIn(t3, shift=0.12 * UP), run_time=0.7)
        self.play(FadeIn(credit), run_time=0.6)
        self.wait(3.6)
        self.play(FadeOut(card), FadeOut(credit), run_time=1.2)
