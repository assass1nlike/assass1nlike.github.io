"""把若干图片拼成网格：python tools/sheet.py 输出.jpg 列数 图1 图2 ..."""
import sys
from PIL import Image, ImageDraw

out, cols, paths = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(p).convert("RGB") for p in paths]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), "black")
dr = ImageDraw.Draw(sheet)
for k, im in enumerate(ims):
    x, y = k % cols * w, k // cols * h
    sheet.paste(im, (x, y))
    dr.text((x + 6, y + 4), str(k), fill=(255, 40, 40))
sheet.save(out, quality=88)
print("sheet", out, sheet.size)
