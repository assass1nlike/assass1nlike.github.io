"""全片统一的视觉语言：暗底、暖白格、三种强调色；中文字幕。"""
from manim import *

# ---------------------------------------------------------------- 配色
BG    = "#0B0E14"
INK   = "#EDE6D8"   # 被占据的格子
DIM   = "#6B6559"   # 空网格线、次要文字
SOFT  = "#A8A294"   # 说明文字
BLUE  = "#5BC8E8"   # 主要强调：测度、维数
GOLD  = "#F5C451"   # 第二强调：硬币、结论
ROSE  = "#F97B72"   # 反例、失效、警示
GREEN = "#7BD88F"   # 成立、等价

FONT = "Noto Serif SC"

config.background_color = BG
config.frame_rate = 30


# ---------------------------------------------------------------- 文本

def cn(text, size=36, color=INK, weight=NORMAL, **kw):
    return Text(text, font=FONT, font_size=size, color=color, weight=weight, **kw)


def eq(tex, size=44, color=INK, **kw):
    return MathTex(tex, font_size=size, color=color, **kw)


# ---------------------------------------------------------------- 字幕

SUB_Y = -3.45


class NSc(Scene):
    """带一条字幕轨的场景基类。"""

    def setup(self):
        self.sub = None

    def say(self, text, hold=1.6, size=30, color=INK, fade=0.35):
        new = cn(text, size=size, color=color).move_to([0, SUB_Y, 0])
        if self.sub is None:
            self.play(FadeIn(new, shift=0.15 * UP), run_time=fade)
        else:
            self.play(FadeOut(self.sub, shift=0.1 * UP), run_time=fade * 0.6)
            self.play(FadeIn(new, shift=0.15 * UP), run_time=fade * 0.8)
        self.sub = new
        if hold:
            self.wait(hold)
        return new

    def clear_sub(self, fade=0.3):
        if self.sub is not None:
            self.play(FadeOut(self.sub), run_time=fade)
            self.sub = None

    def beat(self, t=1.2):
        self.wait(t)


# ---------------------------------------------------------------- 方块

def cells(word, width, height, y=0, color=INK, gap=0.0, stroke=None):
    """一整层的格子，逐个画（用于层数较浅、需要逐格动画的场合）。"""
    n = len(word)
    cw = width / n
    g = VGroup()
    for i, b in enumerate(word):
        r = Rectangle(
            width=max(cw - gap, 0.002), height=height,
            fill_color=color if b else BG,
            fill_opacity=1.0 if b else 0.0,
            stroke_color=stroke or DIM, stroke_width=1.0 if stroke else 0.6,
        )
        r.move_to([-width / 2 + cw * (i + 0.5), y, 0])
        g.add(r)
    return g


def runs_bar(word, width, height, y=0, color=INK):
    """把连续黑格合并成一个矩形，深层的层也不卡。"""
    n = len(word)
    if n == 0:
        return VGroup()
    cw = width / n
    g = VGroup()
    i = 0
    while i < n:
        if word[i]:
            j = i
            while j < n and word[j]:
                j += 1
            r = Rectangle(
                width=cw * (j - i), height=height,
                fill_color=color, fill_opacity=1.0,
                stroke_width=0,
            )
            r.move_to([-width / 2 + cw * ((i + j) / 2), y, 0])
            g.add(r)
            i = j
        else:
            i += 1
    return g


def frame_bar(width, height, y=0, color=DIM, sw=0.8):
    r = Rectangle(width=width, height=height, stroke_color=color, stroke_width=sw)
    r.move_to([0, y, 0])
    return r


def gridlines(word, width, height, y=0, color=DIM, sw=0.5, opacity=0.35):
    """每格一条分界线（层数浅时用）。"""
    n = len(word)
    cw = width / n
    g = VGroup()
    for i in range(1, n):
        x = -width / 2 + cw * i
        g.add(Line([x, y - height / 2, 0], [x, y + height / 2, 0],
                   stroke_color=color, stroke_width=sw, stroke_opacity=opacity))
    return g
