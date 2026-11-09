"""S6 连通块：同样的测度，不同的碎片数。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 9.6


class S6Components(NSc):
    def construct(self):
        head = cn("测度管的是「有多少」，管不了「怎么摆」", 30, INK)
        head.move_to([0, 2.65, 0])
        self.play(FadeIn(head, shift=0.1 * UP), run_time=0.7)
        self.say("每一层的黑色总长都一样，但黑色被切成了几段，可以完全不同。", hold=3.0)

        # ---------------- 两种 Coin sequence 并排
        self.play(FadeOut(head), run_time=0.5)

        figs = {}
        for key, name, ytop in [("1010", "交替 1010", 1.5), ("all1", "全 1", -0.55)]:
            L = levels(7, COINS[key])
            bars = VGroup()
            for n, w in enumerate(L[2:], start=3):
                patch = runs_bar(w, W, 0.19, y=ytop - 0.30 * (n - 3))
                bars.add(patch)
            bars.shift(RIGHT * 0.75)
            lab = cn(name, 22, GOLD).move_to([-W / 2 + 0.0, ytop - 0.30 * 1.5, 0])
            figs[key] = VGroup(bars, lab)

        self.play(FadeIn(figs["1010"]), run_time=0.9)
        self.wait(1.6)
        self.play(FadeIn(figs["all1"]), run_time=0.9)
        self.say("同一套规则、同样的总长度。左边的黑色连成大片，右边碎成很多小段。", hold=3.6)

        # 数连通块
        r_alt = comps(word(9, COINS["1010"]))
        r_one = comps(word(9, COINS["all1"]))
        cnt = VGroup(
            cn(f"第 9 层：{r_alt} 段", 24, BLUE).move_to([1.9, 0.95, 0]),
            cn(f"第 9 层：{r_one} 段", 24, ROSE).move_to([1.9, -1.10, 0]),
        )
        self.play(FadeIn(cnt[0]), FadeIn(cnt[1]), run_time=0.7)
        self.say("到第 9 层，一个 128 段，一个 171 段。", hold=3.2)
        self.wait(1.0)

        self.play(FadeOut(figs["1010"]), FadeOut(figs["all1"]), FadeOut(cnt), run_time=0.8)
        self.clear_sub(0.2)

        # ---------------- 公式
        h2 = cn("连通块数 R_n 有精确公式", 28, SOFT).move_to([0, 2.55, 0])
        self.play(FadeIn(h2), run_time=0.6)

        f1 = eq(r"R_{n+1} = 2^{\,n-1} + \sum_j c_{n,j} - \sum_j c_{n,j}c_{n,j+1}", 36, GOLD)
        f1.move_to([0, 1.6, 0])
        self.play(FadeIn(f1, shift=0.12 * UP), run_time=0.8)
        self.say("每个父对贡献 1 段；若选择让黑色贴边，就多一段；相邻两段都贴边，就并成一段。", hold=4.0)

        f2 = VGroup(
            VGroup(cn("交替 1010：", 26, BLUE), eq(r"R_n = 2^{\,n-2}", 30, BLUE)).arrange(RIGHT, buff=0.2),
            VGroup(cn("全 1：", 26, ROSE), eq(r"R_n = \frac{2^{\,n} + (-1)^{\,n-1}}{3}", 30, ROSE)).arrange(RIGHT, buff=0.2),
        ).arrange(DOWN, buff=0.5).move_to([0, -0.1, 0])
        self.play(FadeIn(f2[0], shift=0.1 * UP), run_time=0.7)
        self.wait(1.8)
        self.play(FadeIn(f2[1], shift=0.1 * UP), run_time=0.7)
        self.say("全 1 的那个公式，来自 Thue–Morse 序列。", hold=2.8)

        # ---------------- 比值
        ratio_lab = VGroup(
            cn("全 1 的段数大约是", 25, SOFT),
            eq(r"2^{\,n}/3", 28, ROSE),
            cn("，交替的正好减半", 25, SOFT),
        ).arrange(RIGHT, buff=0.18).move_to([0, -1.75, 0])
        self.play(FadeIn(ratio_lab, shift=0.1 * UP), run_time=0.8)
        self.say("不论多少层，两者的段数都差着一个固定的常数倍。", hold=3.2)
        self.wait(1.2)

        self.play(*[FadeOut(m) for m in [h2, f1, f2, ratio_lab]], run_time=0.8)
        self.clear_sub(0.2)

        # ---------------- 小结
        key = VGroup(
            cn("同一个测度，同一个树结构", 30, SOFT),
            cn("欧氏几何却能区分它们", 34, GOLD),
        ).arrange(DOWN, buff=0.45).move_to([0, 0.15, 0])
        self.play(FadeIn(key[0], shift=0.1 * UP), run_time=0.7)
        self.wait(1.6)
        self.play(FadeIn(key[1], shift=0.1 * UP), run_time=0.8)
        self.say("这就是 coding sensitivity 的第一层含义。", hold=3.0)
        self.wait(1.2)
