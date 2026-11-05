"""Markdown → 知乎编辑器能识别的 HTML（用于粘贴）。"""
import html
import re
from urllib.parse import quote

import markdown


def _eq(tex):
    tex = tex.strip()
    return (f'<img src="https://www.zhihu.com/equation?tex={quote(tex)}" '
            f'alt="{html.escape(tex)}" eeimg="1">')


def to_html(md):
    # 先把公式换成占位符，避免被 markdown 转义
    eqs = []
    def stash(m, block):
        eqs.append((m.group(1), block))
        return f"\x00EQ{len(eqs) - 1}\x00"
    md = re.sub(r"\$\$(.+?)\$\$", lambda m: stash(m, True), md, flags=re.S)
    md = re.sub(r"(?<![\\$])\$([^$\n]+?)\$", lambda m: stash(m, False), md)

    out = markdown.markdown(md, extensions=["fenced_code", "sane_lists"])
    for i, (tex, block) in enumerate(eqs):
        img = _eq(tex)
        if block:
            out = out.replace(f"<p>\x00EQ{i}\x00</p>", f"<p>{img}</p>")
        out = out.replace(f"\x00EQ{i}\x00", img)
    # 知乎不支持一级标题，降为二级
    return re.sub(r"<(/?)h1>", r"<\1h2>", out)
