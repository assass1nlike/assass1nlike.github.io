"""通过 Mixamo 网页接口批量下载动作（FBX，无蒙皮，60 fps，不做关键帧精简，保留位移）到 vendor/mixamo/。

python tools/mixamo_fetch.py <access_token> [关键词 ...]
token 来自登录 mixamo.com 后浏览器控制台的 localStorage.access_token，只在本次运行中使用，不落盘。
"""
import json
import os
import re
import sys
import time

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "vendor", "mixamo")
API = "https://www.mixamo.com/api/v1"
PROXY = {"https": "http://127.0.0.1:7890", "http": "http://127.0.0.1:7890"}
# 名称或描述里至少要含其中一个词（搜索是模糊匹配，会混进扔东西、开飞机之类的动作）
RELEVANT = re.compile(r"flip|parkour|vault|wall|roll|cartwheel|break ?danc|spin|jump|run|sprint|kick|freeze|flair|"
                      r"slide|climb|land|dive|twist|somersault|acrobat|hurdle|leap|hang|swing|capoeira|macaco|"
                      r"esquiva|aerial|windmill|headspin|handstand|tumbl|butterfly|tornado|stylish|free ?run", re.I)
EXCLUDE = re.compile(r"pilot|throw|zombie|hit|death|dying|injur|drunk|swim|car |driv|sword|rifle|pistol|gun|"
                     r"punch|box|stab|reaction|fall(ing)? (flat|down)|slip", re.I)
KEYWORDS = ["flip", "backflip", "parkour", "vault", "wall", "roll", "cartwheel", "breakdance", "spin", "jump",
            "running", "sprint", "kick", "freeze", "flair", "slide", "climb", "landing", "dive", "twist",
            "acrobat", "capoeira", "hang", "leap", "aerial", "handstand", "windmill", "headspin"]


def session(token):
    s = requests.Session()
    s.proxies.update(PROXY)
    s.headers.update({"Authorization": f"Bearer {token}", "X-Api-Key": "mixamo2",
                      "Accept": "application/json", "Content-Type": "application/json"})
    return s


def search(s, q):
    out, page = [], 1
    while True:
        r = s.get(f"{API}/products", params=dict(page=page, limit=96, order="", type="Motion", query=q), timeout=60)
        r.raise_for_status()
        j = r.json()
        out += j["results"]
        if page >= j["pagination"]["num_pages"]:
            return out
        page += 1


def export(s, cid, aid, name):
    d = s.get(f"{API}/products/{aid}", params=dict(similar=0, character_id=cid), timeout=60).json()
    g = d["details"]["gms_hash"]
    g = dict(g, params=",".join(str(v) for _, v in g["params"]), inplace=False)
    body = dict(character_id=cid, gms_hash=[g], product_name=name, type="Motion",
                preferences=dict(format="fbx7_2019", skin="false", fps="60", reducekf="0"))
    s.post(f"{API}/animations/export", data=json.dumps(body), timeout=60).raise_for_status()
    for _ in range(120):
        m = s.get(f"{API}/characters/{cid}/monitor", timeout=60).json()
        if m.get("status") == "completed":
            return m["job_result"]
        if m.get("status") == "failed":
            raise RuntimeError(m)
        time.sleep(1.5)
    raise TimeoutError(name)


def main():
    token = sys.argv[1]
    kws = sys.argv[2:] or KEYWORDS
    s = session(token)
    cid = s.get(f"{API}/characters/primary", timeout=60).json()["primary_character_id"]
    os.makedirs(OUT, exist_ok=True)
    seen, index = set(), {}
    idx_path = os.path.join(OUT, "index.json")
    if os.path.exists(idx_path):
        index = json.load(open(idx_path, encoding="utf-8"))
    for q in kws:
        for p in search(s, q):
            text = p["name"] + " " + p.get("description", "")
            if p["id"] in seen or not RELEVANT.search(text) or EXCLUDE.search(text):
                continue
            seen.add(p["id"])
            fn = re.sub(r"[^\w\-]+", "_", p["name"]).strip("_") + "_" + p["id"][:6] + ".fbx"
            path = os.path.join(OUT, fn)
            index[fn] = dict(name=p["name"], description=p.get("description", ""), query=q, id=p["id"])
            if os.path.exists(path):
                continue
            try:
                url = export(s, cid, p["id"], p["name"])
                open(path, "wb").write(requests.get(url, proxies=PROXY, timeout=120).content)
                print("ok", fn, "|", p.get("description", ""))
            except Exception as e:  # 个别动作导出失败不影响其他
                print("fail", p["name"], e)
            json.dump(index, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("total", len(index))


if __name__ == "__main__":
    main()
