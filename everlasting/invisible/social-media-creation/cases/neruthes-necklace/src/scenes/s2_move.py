"""S2 不嵌套：黑色的位置在平移。由此引出 limsup / liminf。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from theme import *
from necklace import *

W = 11.6
H = 0.34


class S2Move(NSc):
    def construct(self):
        L = levels(6, COINS["all1"])
        ys = [1.95, 1.15, 0.35]
        groups = []
        for i in range(3):
            bar = runs_bar(L[3 + i], W, H, y=ys[i])
            fr = frame_bar(W, H, y=ys[i])
            groups.append(VGroup(bar, fr))

        tags = VGroup(*[
            cn(f"第 {4 + i} 层", 22, SOFT).move_to([-W / 2 - 0.75, ys[i], 0])
            for i in range(3)
        ])
        self.play(FadeIn(tags), run_time=0.5)
        for g in groups:
            self.play(FadeIn(g), run_time=0.5)
        self.say("把相邻的几层叠在一起看。", hold=1.8)

        # ---------------- 取一个黑格，看它的孩子
        w4 = L[3]
        rr = runs(w4)
        start, stop = rr[1]
        cw4 = W / len(w4)
        x0 = -W / 2 + cw4 * start
        x1 = -W / 2 + cw4 * stop
        y4 = ys[0]
        hl = Rectangle(width=x1 - x0, height=H, stroke_color=GOLD, stroke_width=3,
                       fill_opacity=0).move_to([(x0 + x1) / 2, y4, 0])
        self.play(Create(hl), run_time=0.7)
        self.say("取一个黑格。", hold=1.5)

        w5 = L[4]
        ys5 = -0.75
        sub_h = 0.62
        cw5 = W / len(w5)
        xa = -W / 2 + cw5 * (2 * start)
        xb = -W / 2 + cw5 * (2 * stop)
        n_sub = 2 * stop - 2 * start

        big_frame = frame_bar(xb - xa, sub_h, y=ys5, color=SOFT, sw=1.6).move_to(
            [(xa + xb) / 2, ys5, 0])
        big_cells = VGroup()
        for i in range(n_sub):
            bit = w5[2 * start + i]
            r = Rectangle(width=(xb - xa) / n_sub * 0.97, height=sub_h,
                          fill_color=INK if bit else BG, fill_opacity=1 if bit else 0,
                          stroke_color=SOFT, stroke_width=1.4)
            r.move_to([xa + (xb - xa) / n_sub * (i + 0.5), ys5, 0])
            big_cells.add(r)
        self.play(FadeIn(big_frame), FadeIn(big_cells), run_time=0.7)

        idx = 0 if big_cells[0].get_fill_opacity() > 0.5 else 1
        arrow = Arrow([big_cells[idx].get_center()[0], y4 - H / 2 - 0.05, 0],
                      [big_cells[idx].get_center()[0], ys5 + sub_h / 2 + 0.05, 0],
                      color=GOLD, stroke_width=2.6, buff=0.06,
                      max_tip_length_to_length_ratio=0.12)
        self.play(GrowArrow(arrow), run_time=0.6)
        self.say("它的两个孩子，一个黑一个白：黑色挪到了另一侧。", hold=2.8)

        w6 = L[5]
        ys6 = -1.95
        cw6 = (xb - xa) / (2 * n_sub)
        big6 = VGroup()
        for i in range(2 * n_sub):
            bit = w6[4 * start + i]
            r = Rectangle(width=cw6 * 0.94, height=0.5,
                          fill_color=INK if bit else BG, fill_opacity=1 if bit else 0,
                          stroke_color=SOFT, stroke_width=1.0)
            r.move_to([xa + cw6 * (i + 0.5), ys6, 0])
            big6.add(r)
        self.play(FadeIn(big6), run_time=0.7)
        self.say("再走一层，它又跳回去了。", hold=2.0)

        self.play(FadeOut(arrow), FadeOut(hl), run_time=0.5)
        self.clear_sub(0.25)
        concl = VGroup(
            cn("下一层不在上一层里", 34, ROSE, weight=BOLD),
            cn("「越缩越小」的直觉，在这里失效", 26, SOFT),
        ).arrange(DOWN, buff=0.22).move_to([0, -2.75, 0])
        self.play(FadeIn(concl, shift=0.12 * UP), run_time=0.8)
        self.wait(2.6)

        self.play(*[FadeOut(m) for m in
                    [*groups, tags, big_frame, big_cells, big6, concl]], run_time=0.9)
        self.clear_sub(0.2)

        # ---------------- 两种极限
        head = cn("于是有两个完全不同的「极限」", 34, INK).move_to([0, 2.6, 0])
        self.play(FadeIn(head, shift=0.12 * UP), run_time=0.7)

        sup = VGroup(
            cn("limsup", 30, GOLD),
            cn("属于无穷多个层", 27, SOFT),
        ).arrange(RIGHT, buff=0.22)
        inf = VGroup(
            cn("liminf", 30, BLUE),
            cn("从某一层起，永远属于", 27, SOFT),
        ).arrange(RIGHT, buff=0.22)
        both = VGroup(sup, inf).arrange(DOWN, buff=0.55, aligned_edge=LEFT)
        both.move_to([0, 1.15, 0])
        self.play(FadeIn(sup, shift=0.12 * UP), run_time=0.7)
        self.wait(2.0)
        self.play(FadeIn(inf, shift=0.12 * UP), run_time=0.7)
        self.say("前者是「无穷多次进来」，后者是「最后一次出去之后再没出去」。", hold=3.2)

        # 二进制条带
        yb = -0.85
        bits = [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        n = len(bits)
        bw = 9.0 / n
        strip = VGroup()
        for i, b in enumerate(bits):
            r = Rectangle(width=bw * 0.88, height=0.44,
                          fill_color=INK if b else BG, fill_opacity=1 if b else 0,
                          stroke_color=SOFT, stroke_width=0.9)
            r.move_to([-4.5 + bw * (i + 0.5), yb, 0])
            strip.add(r)
        self.play(FadeIn(strip), run_time=0.7)
        self.say("一个点在这几层里的身份，就是一条 0/1 串。", hold=2.6)

        t_inf = Brace(VGroup(*strip[11:]), DOWN, color=BLUE)
        t_lab = cn("尾部全 1 → 在 liminf 里", 22, BLUE).next_to(t_inf, DOWN, buff=0.12)
        self.play(GrowFromCenter(t_inf), FadeIn(t_lab), run_time=0.8)
        self.say("尾巴变成全黑，它才算是「最终留下」。", hold=2.6)
        self.wait(0.8)
