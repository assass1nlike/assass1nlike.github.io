"""把做好的视频排队定时发布到 B 站。

用法（在 autovideo 目录下，conda 环境 autovideo）：
  python publish/publish.py login             # 首次使用：在弹出的 Chrome 里登录 B 站
  python publish/publish.py run --dry-run     # 看看会排进哪些视频、各在哪天发布，不上传
  python publish/publish.py run               # 把新做好的视频排到队尾，并上传发布时间已进入 B 站定时窗口的视频
  python publish/publish.py status            # 对照 B 站后台查看队列

队列在 publish/queue.json，顺序就是发布顺序：每天一条，HOUR 点发布，新视频接在最后一条后面。
不想发的视频把 status 改成 "skipped"。
B 站定时发布只接受 4 小时到 15 天之后的时间，所以排得太远的视频先留在本地，之后再跑 run 时才上传。
"""
import argparse
import hashlib
import json
import re
import subprocess
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode

import requests

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BILIUP = HERE / "bin" / "biliup.exe"
COOKIES = HERE / "cookies.json"
QUEUE = HERE / "queue.json"

HOUR = 8                          # 每天几点发布
MIN_LEAD = timedelta(hours=4.5)   # B 站要求定时至少在 4 小时后
MAX_LEAD = timedelta(days=14.5)   # 最远 15 天
TID = 201                         # 分区：201 知识·科学科普，124 知识·社科·法律·心理；queue.json 里单条可用 "tid" 覆盖
HUMAN_TYPE2 = 1010                # 新版投稿页的大分区“知识”
AI_STATEMENT = "AI生成"            # 创作声明里要选的那一项（目前叫“含AI生成内容”）
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


# ---------- B 站接口 ----------
def session():
    if not COOKIES.exists():
        sys.exit("还没登录：先运行 python publish/publish.py login")
    data = json.loads(COOKIES.read_text(encoding="utf-8"))
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Referer": "https://member.bilibili.com/"})
    for c in data["cookie_info"]["cookies"]:
        s.cookies.set(c["name"], c["value"], domain=".bilibili.com")
    return s


def api(s, url, **params):
    r = s.get(url, params=params, timeout=20).json()
    if r.get("code") != 0:
        sys.exit(f"B 站接口出错 {url}：{r.get('code')} {r.get('message')}")
    return r["data"]


def ai_statement_id(s):
    marks = api(s, "https://member.bilibili.com/x/vupre/web/archive/pre", lang="cn")["neutral_mark"]["mark_list"]
    hit = [m for m in marks if AI_STATEMENT in m["content"]]
    if len(hit) != 1:
        sys.exit("找不到唯一的“AI 生成”创作声明，B 站可能改了选项：" + "；".join(m["content"] for m in marks))
    return hit[0]["id"]


def my_archives(s):
    """创作中心里自己的全部稿件（含审核中、定时未发布），返回 {标题: 信息}。"""
    out, pn = {}, 1
    while True:
        d = api(s, "https://member.bilibili.com/x/web/archives", status="is_pubing,pubed,not_pubed", pn=pn, ps=50)
        for a in d.get("arc_audits") or []:
            arc = a["Archive"]
            out[arc["title"]] = {"bvid": arc["bvid"], "state": arc["state_desc"] or str(arc["state"]),
                                 "dtime": arc.get("dtime") or 0, "ptime": arc.get("ptime") or 0}
        if pn * 50 >= d["page"]["count"]:
            return out
        pn += 1


# ---------- 视频信息 ----------
def read_desc(name):
    """读 videos/<name>/out/desc.md：**标题** / **简介** / **标签** 三段。"""
    text = (ROOT / "videos" / name / "out" / "desc.md").read_text(encoding="utf-8")
    parts = dict(re.findall(r"\*\*(标题|简介|标签)\*\*\s*\n(.*?)(?=\n\*\*(?:标题|简介|标签)\*\*|\Z)", text, re.S))
    title = parts["标题"].strip()
    desc = parts["简介"].strip()
    tags = [t.strip() for t in re.split(r"[，,]", parts["标签"]) if t.strip()]
    problems = []
    if len(title) > 80:
        problems.append(f"标题 {len(title)} 字，超过 80")
    if len(desc) > 2000:
        problems.append(f"简介 {len(desc)} 字，超过 2000")
    if len(tags) > 10 or any(len(t) > 20 for t in tags):
        problems.append("标签最多 10 个、每个不超过 20 字")
    if problems:
        sys.exit(f"{name}：" + "；".join(problems))
    return title, desc, tags


def finished_videos():
    """做好了的视频：成片、封面、简介都在。按成片生成时间排序。"""
    out = []
    for d in (ROOT / "videos").iterdir():
        o = d / "out"
        if (o / f"{d.name}.mp4").exists() and (o / "cover.jpg").exists() and (o / "desc.md").exists():
            out.append(((o / f"{d.name}.mp4").stat().st_mtime, d.name))
    return [n for _, n in sorted(out)]


# ---------- 队列 ----------
def load_queue():
    return json.loads(QUEUE.read_text(encoding="utf-8")) if QUEUE.exists() else {"items": []}


def save_queue(q):
    QUEUE.write_text(json.dumps(q, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def fmt(t):
    return t.strftime("%Y-%m-%d %H:%M")


def plan_slots(q, now):
    """给还没上传的视频排发布时间：接在最后一个已定时间之后，每天一条。"""
    fixed = [datetime.strptime(i["slot"], "%Y-%m-%d %H:%M") for i in q["items"] if i["status"] != "pending" and i.get("slot")]
    nxt = (max(fixed) + timedelta(days=1)) if fixed else (now + timedelta(days=1))
    nxt = nxt.replace(hour=HOUR, minute=0, second=0, microsecond=0)
    while nxt < now + MIN_LEAD:
        nxt += timedelta(days=1)
    for i in q["items"]:
        if i["status"] == "pending":
            i["slot"] = fmt(nxt)
            nxt += timedelta(days=1)


def upload(item, statement_id, dry_run):
    name = item["name"]
    title, desc, tags = read_desc(name)
    out = ROOT / "videos" / name / "out"
    dtime = int(datetime.strptime(item["slot"], "%Y-%m-%d %H:%M").timestamp())
    extra = {"human_type2": HUMAN_TYPE2}
    if statement_id is not None:
        extra["creation_statement"] = {"id": statement_id}
    cmd = [str(BILIUP), "-u", str(COOKIES), "upload", "--submit", "web",
           "--copyright", "1", "--no-reprint", "1", "--tid", str(item.get("tid", TID)),
           "--cover", str(out / "cover.jpg"), "--title", title, "--desc", desc, "--tag", ",".join(tags),
           "--dtime", str(dtime), "--extra-fields", json.dumps(extra, ensure_ascii=False), str(out / f"{name}.mp4")]
    print(f"  上传 {name}：{title}  →  {item['slot']} 发布")
    if dry_run:
        return True
    r = subprocess.run(cmd, cwd=HERE)
    return r.returncode == 0


# ---------- 命令 ----------
TV_KEY, TV_SEC = "4409e2ce8ffd12b8", "59b43e04ad6965f34319062b478f83dd"  # 与 biliup 相同的 TV 端 appkey


def tv_form(**kw):
    form = {"appkey": TV_KEY, "local_id": "0", "ts": str(int(time.time())), **kw}
    query = urlencode(sorted(form.items()))
    return {**form, "sign": hashlib.md5((query + TV_SEC).encode()).hexdigest()}


def cmd_login(_):
    """在 Chrome 里正常登录 B 站网页版，再用网页登录态换取 biliup 需要的凭据（同 biliup 的“网页 Cookie 登录”）。"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(HERE / "browser"), channel="chrome", headless=False, locale="zh-CN",
            viewport={"width": 1100, "height": 800},
            ignore_default_args=["--enable-automation"], args=["--disable-blink-features=AutomationControlled"])
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://passport.bilibili.com/login")
        print("请在弹出的 Chrome 里登录 B 站（短信验证码登录即可），登录成功后会自动继续……")
        deadline = time.time() + 900
        while time.time() < deadline:
            web = {c["name"]: c["value"] for c in ctx.cookies("https://www.bilibili.com")}
            if web.get("SESSDATA") and web.get("bili_jct"):
                break
            page.wait_for_timeout(1000)
        else:
            sys.exit("15 分钟内没有检测到登录，已退出")
        ctx.close()

    s = requests.Session()
    s.headers["User-Agent"] = UA
    code = s.post("https://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code", data=tv_form()).json()
    auth_code = code["data"]["auth_code"]
    r = s.post("https://passport.bilibili.com/x/passport-tv-login/h5/qrcode/confirm",
               data={"auth_code": auth_code, "csrf": web["bili_jct"], "scanning_type": 3},
               headers={"Cookie": f"SESSDATA={web['SESSDATA']}; bili_jct={web['bili_jct']}"}).json()
    if r.get("code") != 0:
        sys.exit(f"用网页登录态换取凭据失败：{r}")
    for _ in range(30):
        r = s.post("https://passport.bilibili.com/x/passport-tv-login/qrcode/poll", data=tv_form(auth_code=auth_code)).json()
        if r["code"] == 0:
            COOKIES.write_text(json.dumps({**r["data"], "platform": "BiliTV"}, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"登录成功，凭据已保存到 {COOKIES}")
            return
        if r["code"] != 86039:
            sys.exit(f"换取凭据失败：{r.get('code')} {r.get('message')}")
        time.sleep(1)
    sys.exit("换取凭据超时")


def cmd_run(args):
    q = load_queue()
    now = datetime.now()
    known = {i["name"] for i in q["items"]}
    new = [n for n in finished_videos() if n not in known]
    for n in new:
        read_desc(n)  # 先检查标题、简介、标签是否合规
        q["items"].append({"name": n, "status": "pending"})
    plan_slots(q, now)
    if new:
        print("新排进队列：" + "、".join(new))

    due = [i for i in q["items"] if i["status"] == "pending"
           and datetime.strptime(i["slot"], "%Y-%m-%d %H:%M") <= now + MAX_LEAD][:args.limit]
    s = statement_id = None
    if due and not args.dry_run:
        s = session()
        statement_id = ai_statement_id(s)
    for k, i in enumerate(due):
        if k and not args.dry_run:
            time.sleep(20)  # 连续投稿太快容易触发 B 站风控
        if not upload(i, statement_id, args.dry_run):
            print(f"  {i['name']} 上传失败，停在这里；修好后重新运行 run")
            break
        if not args.dry_run:
            i["status"] = "scheduled"
            save_queue(q)
    if s and not args.dry_run:
        arcs = my_archives(s)
        for i in q["items"]:
            if i["status"] == "scheduled" and not i.get("bvid"):
                a = arcs.get(read_desc(i["name"])[0])
                if a:
                    i["bvid"] = a["bvid"]
    if not args.dry_run:
        save_queue(q)
    show(q)


def cmd_status(_):
    q = load_queue()
    arcs = my_archives(session())
    show(q, arcs)


def show(q, arcs=None):
    print()
    for i in q["items"]:
        line = f"  {i.get('slot', '-'):16s}  {i['status']:9s}  {i['name']:12s}"
        if arcs is not None:
            a = arcs.get(read_desc(i["name"])[0]) if (ROOT / "videos" / i["name"] / "out" / "desc.md").exists() else None
            line += f"  B 站：{a['state']} {a['bvid']}" if a else "  B 站：没找到"
        print(line)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("login").set_defaults(f=cmd_login)
    r = sub.add_parser("run")
    r.add_argument("--dry-run", action="store_true", help="只显示计划，不上传、不改队列")
    r.add_argument("--limit", type=int, default=None, help="这次最多上传几条")
    r.set_defaults(f=cmd_run)
    sub.add_parser("status").set_defaults(f=cmd_status)
    args = p.parse_args()
    args.f(args)


if __name__ == "__main__":
    main()
