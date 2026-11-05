"""把发现、选题、写作、发布串起来。问题状态记在 data/candidates.json 的 status 字段：
new → picked → written → published，出错为 failed，不合要求为 skipped。"""
import random
import time

from . import writer, zhihu
from .browser import open_browser
from .common import ANSWERS, CANDIDATES, CONFIG, answer_dir, load_meta, read_json, save_meta, write_json
from .render import to_html


def _set_status(qid, status):
    pool = read_json(CANDIDATES, {})
    if qid in pool:
        pool[qid]["status"] = status
        write_json(CANDIDATES, pool)


def discover():
    with open_browser() as ctx:
        zhihu.discover(ctx, CONFIG["sources"])


def write(n, qids=None):
    """选出 n 个问题并写好回答；指定 qids 时跳过选题。返回写好的问题 id。"""
    pool = read_json(CANDIDATES, {})
    if not qids:
        fresh = [q for q in pool.values() if q["status"] == "new"
                 and (q.get("followers") is None or q["followers"] >= CONFIG["min_followers"])]
        fresh.sort(key=lambda q: q["found_at"], reverse=True)
        print(f"从 {len(fresh[:120])} 个候选中选题")
        qids = writer.select(fresh[:120], n * 2)
        print("选中：", *[pool[i]["title"] for i in qids], sep="\n  ")

    done = []
    with open_browser() as ctx:
        for qid in qids:
            if len(done) >= n:
                break
            if load_meta(qid).get("status") in ("written", "published"):
                continue
            q = zhihu.fetch_question(ctx, qid)
            q.pop("raw_question")
            if (q.get("followers") or 0) < CONFIG["min_followers"]:
                print(f"跳过（关注 {q.get('followers')}）：{q['title']}")
                _set_status(qid, "skipped")
                continue
            print(f"写作：{q['title']}")
            try:
                writer.write(q)
                _set_status(qid, "written")
                done.append(qid)
            except Exception as e:
                print(f"  失败：{e}")
                _set_status(qid, "failed")
    return done


def written():
    return [d.name for d in sorted(ANSWERS.glob("*")) if load_meta(d.name).get("status") == "written"]


def publish(qids=None, dry_run=False):
    qids = qids or written()
    with open_browser() as ctx:
        for i, qid in enumerate(qids):
            meta = load_meta(qid)
            md = (answer_dir(qid) / "final.md").read_text(encoding="utf-8")
            print(f"{'预演' if dry_run else '发布'}：{meta['title']}")
            shot = answer_dir(qid) / ("dryrun.png" if dry_run else "published.png")
            try:
                url = zhihu.publish(ctx, qid, to_html(md), CONFIG["declare_ai"], dry_run, shot)
            except Exception as e:
                print(f"  失败：{e}")
                meta["error"] = str(e)
                save_meta(qid, meta)
                continue
            if dry_run:
                print(f"  截图：{shot}")
                continue
            print(f"  {url}")
            meta.update(status="published", answer_url=url, published_at=time.strftime("%Y-%m-%d %H:%M"))
            meta.pop("error", None)
            save_meta(qid, meta)
            _set_status(qid, "published")
            if i < len(qids) - 1:
                wait = random.randint(*CONFIG["publish_interval"])
                print(f"  等待 {wait // 60} 分钟后发布下一篇")
                time.sleep(wait)


def run(n):
    discover()
    publish(write(n))
