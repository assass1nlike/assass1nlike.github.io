"""把 build/stills 里的截图（可按前缀过滤）拼成一张联系表 build/contact.jpg。
用法：python tools/contact.py [前缀] [列数]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

pre = sys.argv[1] if len(sys.argv) > 1 else ""
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 3
files = sorted(p for p in Path("build/stills").glob(f"{pre}*.jpg"))
w, h = 640, 360
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(Image.open(f).resize((w, h)), (x, y))
    d.text((x + 6, y + 4), f.stem, fill=(255, 255, 0))
sheet.save("build/contact.jpg", quality=90)
print(len(files), "stills")
