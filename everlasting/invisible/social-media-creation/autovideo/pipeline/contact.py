"""把 build/stills/ 下的截图拼成一张联系表，用于检查画面。
用法：python pipeline/contact.py videos/<name> [列数]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

video_dir = Path(sys.argv[1])
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 3
shots = sorted((video_dir / "build" / "stills").glob("*.jpg"))
tw, th = 960, 540
rows = (len(shots) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), "black")
draw = ImageDraw.Draw(sheet)
font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 30)
for i, p in enumerate(shots):
    x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(Image.open(p).resize((tw, th)), (x, y))
    draw.text((x + 10, y + 6), f"{float(p.stem):.2f}s", fill="yellow", font=font)
out = video_dir / "build" / "contact.jpg"
sheet.save(out, quality=88)
print(out)
