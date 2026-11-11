"""把发现、选题、写作、发布串起来。问题状态记在 data/candidates.json 的 status 字段：
new → picked → written → published，出错为 failed，不合要求为 skipped。"""
import random
import time

from . import writer, zhihu
from .browser import logged_in, open_browser
from .common import ANSWERS, CANDIDATES, CONFIG, DATA, answer_dir, load_meta, read_json, save_meta, write_json
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


def _publish_one(ctx, qid, dry_run=False):
    """发布一篇，返回是否成功。连续失败 3 次的回答标为 failed，不再重试。"""
    meta = load_meta(qid)
    md = (answer_dir(qid) / "final.md").read_text(encoding="utf-8")
    print(f"{'预演' if dry_run else '发布'}：{meta['title']}")
    shot = answer_dir(qid) / ("dryrun.png" if dry_run else "published.png")
    try:
        url = zhihu.publish(ctx, qid, to_html(md), CONFIG["declare_ai"], dry_run, shot)
    except Exception as e:
        print(f"  失败：{e}")
        meta["error"] = str(e)
        meta["publish_failures"] = meta.get("publish_failures", 0) + 1
        if meta["publish_failures"] >= 3:
            meta["status"] = "failed"
            _set_status(qid, "failed")
        save_meta(qid, meta)
        return False
    if dry_run:
        print(f"  截图：{shot}")
        return True
    print(f"  {url}")
    meta.update(status="published", answer_url=url, published_at=time.strftime("%Y-%m-%d %H:%M"))
    meta.pop("error", None)
    save_meta(qid, meta)
    _set_status(qid, "published")
    return True


def publish(qids=None, dry_run=False):
    qids = qids or written()
    with open_browser() as ctx:
        for i, qid in enumerate(qids):
            if _publish_one(ctx, qid, dry_run) and not dry_run and i < len(qids) - 1:
                wait = random.randint(*CONFIG["publish_interval"])
                print(f"  等待 {wait // 60} 分钟后发布下一篇")
                time.sleep(wait)


def slots(n, start, end, gap):
    """在 [start, end] 内随机取 n 个时刻（时间戳），两两间隔至少 gap 秒；放不下时少取。

    先在扣掉 n-1 段间隔后的区间里均匀采样再依次加回间隔，得到的就是满足间隔约束的均匀分布。"""
    n = min(n, int((end - start) // gap) + 1)
    if n <= 0:
        return []
    free = end - start - (n - 1) * gap
    xs = sorted(random.uniform(0, free) for _ in range(n))
    return [start + x + i * gap for i, x in enumerate(xs)]


def _keep_awake():
    """阻止 Windows 在本进程运行期间自动睡眠，进程退出后自动恢复。"""
    try:
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001)
    except Exception:
        pass


def _log(msg):
    print(f"[{time.strftime('%H:%M')}] {msg}")


PAUSE = DATA / "paused"


def pause():
    PAUSE.parent.mkdir(parents=True, exist_ok=True)
    PAUSE.write_text(time.strftime("%Y-%m-%d %H:%M"), encoding="utf-8")
    print("已暂停：正在运行的每日任务会在一分钟内、下一篇发布之前退出，之后的任务启动后也会直接退出")


def resume():
    if PAUSE.exists():
        PAUSE.unlink()
        print("已恢复：下次每日任务启动（每天定时或登录 Windows 时）会接着发当天剩下的篇数")
    else:
        print("当前没有暂停")


def _sleep_until(t):
    """分段睡眠并对照墙上时钟，电脑睡眠唤醒后也能按时醒来。被暂停时提前返回 False。"""
    while time.time() < t:
        if PAUSE.exists():
            return False
        time.sleep(min(60, t - time.time()))
    return not PAUSE.exists()


def daily(n, window, dry_run=False):
    """每日任务：凑够 n 篇待发回答（优先用积压的已写未发），在时间窗口内的随机时刻逐篇发布。

    当天进度存在 data/today.json，中途关机后重新运行会接着发剩下的篇数，间隔仍从上一篇算起。"""
    if PAUSE.exists():
        _log(f"任务已暂停（{PAUSE.read_text(encoding='utf-8')} 起），运行 python -m autozhihu resume 恢复")
        return
    _keep_awake()
    today = time.strftime("%Y-%m-%d")
    start, end = (time.mktime(time.strptime(f"{today} {w}", "%Y-%m-%d %H:%M")) for w in window)
    gap = CONFIG["min_gap_minutes"] * 60
    state_path = DATA / ("today-dryrun.json" if dry_run else "today.json")
    state = read_json(state_path, {})
    resumed = state.get("date") == today
    if not resumed:
        state = {"date": today, "target": n, "published": [], "last_attempt": 0}
    left = state["target"] - len(state["published"])
    if resumed:
        _log(f"恢复今天的任务：已发 {len(state['published'])} 篇，还剩 {left} 篇")
    else:
        _log(f"每日任务开始：目标 {n} 篇，窗口 {window[0]}-{window[1]}")
    if left <= 0:
        _log("今天的篇数已经发完")
        return
    if time.time() >= end:
        _log("今天的发布窗口已过，回答留到明天发布")
        return

    with open_browser() as ctx:
        if not logged_in(ctx):
            _log("知乎登录已失效，请运行 python -m autozhihu login 后重试")
            return
        if not resumed:
            zhihu.discover(ctx, CONFIG["sources"])
    write_json(state_path, state)

    qids = [q for q in written() if q not in state["published"]][:left]
    if len(qids) < left:
        qids += write(left - len(qids))

    # 每发一篇都对剩下的重新排时刻。满足间隔约束的均匀分布在给定第一个时刻后，
    # 其余时刻的条件分布恰好就是从“第一个时刻 + 间隔”开始的同一种分布，所以逐篇重排不改变分布。
    while qids:
        earliest = max(start, time.time(), state["last_attempt"] + gap)
        plan = slots(len(qids), earliest, end, gap)
        if not plan:
            _log(f"今天的窗口排不下剩下的 {len(qids)} 篇，留到明天发布")
            break
        _log("接下来的发布时刻：" + "、".join(time.strftime("%H:%M", time.localtime(t)) for t in plan))
        if not _sleep_until(plan[0]):
            _log("任务已暂停，退出；恢复后接着发剩下的篇数")
            return
        if time.time() - plan[0] > 300:
            _log("错过了预定时刻（电脑可能睡眠过），重新排")
            continue
        qid = qids.pop(0)
        with open_browser() as ctx:
            ok = _publish_one(ctx, qid, dry_run)
        state["last_attempt"] = time.time()
        if ok:
            state["published"].append(qid)
        write_json(state_path, state)
    _log("每日任务结束")


def run(n):
    discover()
    publish(write(n))
