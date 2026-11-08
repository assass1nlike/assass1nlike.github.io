"""用阿里云百炼（通义万相）生成 AI 画面。提示词在 assets/prompts.json。

用法：
  python pipeline/gen.py <视频目录> img [名字 ...] [--n 3]    生成候选静帧到 build/candidates/<名字>/，不写名字就生成 assets/ 里还没有的全部
  python pipeline/gen.py <视频目录> pick <名字> <序号>        选定一张候选，存为 assets/<名字>.jpg
  python pipeline/gen.py <视频目录> clip <名字 ...>           用选定的静帧生成动态镜头 assets/<名字>.mp4（提示词里要有 clip）
  python pipeline/gen.py <视频目录> sheet [名字 ...]          把候选拼成 build/candidates/sheet.jpg 方便挑选

API key 放在环境变量 DASHSCOPE_API_KEY，或sci-fiction/ 下不进 git 的 dashscope.key 文件里。
提示词里的 {_xxx} 会替换成 prompts.json 里 _xxx 的内容；写了 "ref": [名字] 的条目会把那些已选定的静帧作为参考图传入，
用来保持夸父号、望舒人等在不同镜头里的样子一致。
"""
import base64
import io
import json
import os
import random
import sys
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent   # API key 放在这里，各部片子共用
ROOT = None                                     # 当前视频目录，由命令行第一个参数给出
HOST = "https://dashscope.aliyuncs.com/api/v1"
IMG_MODEL = "wan2.7-image-pro"
VIDEO_MODEL = "wan2.6-i2v-flash"
SIZE = "2560*1072"          # 2.39:1


def key():
    k = os.environ.get("DASHSCOPE_API_KEY")
    f = HERE / "dashscope.key"
    if not k and f.exists():
        k = f.read_text().strip()
    if not k:
        sys.exit("缺少 API key：设置 DASHSCOPE_API_KEY 或写入 dashscope.key")
    return k


def headers(async_=True):
    h = {"Authorization": f"Bearer {key()}", "Content-Type": "application/json"}
    if async_:
        h["X-DashScope-Async"] = "enable"
    return h


def prompts():
    return json.loads((ROOT / "assets" / "prompts.json").read_text(encoding="utf-8"))


def expand(P, s):
    for k, v in P.items():
        if k.startswith("_") and isinstance(v, str):
            s = s.replace("{" + k + "}", v)
    return s


def data_uri(path, max_side=2560):
    im = Image.open(path).convert("RGB")
    im.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def submit(path, body):
    for k in range(8):
        j = requests.post(f"{HOST}/services/aigc/{path}", headers=headers(), json=body, timeout=60).json()
        if "output" in j:
            return j["output"]["task_id"]
        if not j.get("code", "").startswith("Throttling"):
            break
        time.sleep(10 * (k + 1))
    raise RuntimeError(j)


def wait(task_id, every=8):
    while True:
        j = requests.get(f"{HOST}/tasks/{task_id}", headers={"Authorization": f"Bearer {key()}"}, timeout=60).json()
        st = j["output"]["task_status"]
        if st == "SUCCEEDED":
            return j
        if st in ("FAILED", "CANCELED", "UNKNOWN"):
            raise RuntimeError(j)
        time.sleep(every)


def gen_images(names, n):
    P = prompts()
    style = P["_style"]
    todo = names or [k for k, v in P.items() if not k.startswith("_") and not (ROOT / "assets" / f"{k}.jpg").exists()]
    for name in todo:
        e = P[name]
        content = [{"text": f"{expand(P, e['prompt'])}。{style}"}]
        for r in e.get("ref", []):
            ref = ROOT / "assets" / f"{r}.jpg"
            if not ref.exists():
                sys.exit(f"{name} 需要先选定参考图 {r}")
            content.append({"image": data_uri(ref)})
        for attempt in range(3):   # 内容审核偶尔误判，换个种子重试
            body = {"model": IMG_MODEL, "input": {"messages": [{"role": "user", "content": content}]},
                    "parameters": {"size": SIZE, "n": n, "watermark": False, "seed": random.randrange(2 ** 31)}}
            try:
                j = wait(submit("image-generation/generation", body))
                break
            except RuntimeError as err:
                print(f"{name} 失败：{str(err)[:300]}")
        else:
            continue
        out = ROOT / "build" / "candidates" / name
        out.mkdir(parents=True, exist_ok=True)
        start = len(list(out.glob("*.png")))
        urls = [c["image"] for ch in j["output"]["choices"] for c in ch["message"]["content"] if c.get("image")]
        for i, u in enumerate(urls):
            (out / f"{start + i + 1}.png").write_bytes(requests.get(u, timeout=120).content)
        print(f"{name}: {len(urls)} 张 → {out}")


def pick(name, i):
    src = ROOT / "build" / "candidates" / name / f"{i}.png"
    Image.open(src).convert("RGB").save(ROOT / "assets" / f"{name}.jpg", quality=93)
    print(f"{src} → assets/{name}.jpg")


def gen_clips(names):
    P = prompts()
    for name in names:
        e = P[name]
        body = {"model": VIDEO_MODEL,
                "input": {"prompt": f"{e['clip']}。电影镜头，动作缓慢克制，镜头稳定",
                          "img_url": data_uri(ROOT / "assets" / f"{name}.jpg", 1920)},
                "parameters": {"resolution": "720P", "duration": e.get("seconds", 5), "audio": False,
                               "prompt_extend": False, "watermark": False}}
        j = wait(submit("video-generation/video-synthesis", body), 15)
        (ROOT / "assets" / f"{name}.mp4").write_bytes(requests.get(j["output"]["video_url"], timeout=300).content)
        print(f"{name} → assets/{name}.mp4")


def sheet(names):
    names = names or sorted(d.name for d in (ROOT / "build" / "candidates").iterdir() if d.is_dir())
    rows = [(n, sorted((ROOT / "build" / "candidates" / n).glob("*.png"), key=lambda f: int(f.stem))) for n in names]
    cols = max(len(r[1]) for r in rows)
    tw, th = 960, 402
    im = Image.new("RGB", (cols * tw, len(rows) * th), "black")
    dr = ImageDraw.Draw(im)
    ft = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 28)
    for y, (n, fs) in enumerate(rows):
        for x, f in enumerate(fs):
            im.paste(Image.open(f).convert("RGB").resize((tw, th)), (x * tw, y * th))
            dr.text((x * tw + 10, y * th + 6), f"{n} {f.stem}", fill="yellow", font=ft)
    im.save(ROOT / "build" / "candidates" / "sheet.jpg", quality=85)
    print(ROOT / "build" / "candidates" / "sheet.jpg")


if __name__ == "__main__":
    ROOT = Path(sys.argv[1]).resolve()
    a = sys.argv[2:]
    n = 3
    if "--n" in a:
        i = a.index("--n"); n = int(a[i + 1]); del a[i:i + 2]
    cmd, rest = a[0], a[1:]
    if cmd == "img":
        gen_images(rest, n)
    elif cmd == "pick":
        pick(rest[0], int(rest[1]))
    elif cmd == "clip":
        gen_clips(rest)
    elif cmd == "sheet":
        sheet(rest)
