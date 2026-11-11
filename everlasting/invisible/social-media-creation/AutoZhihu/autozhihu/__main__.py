import argparse
import time

from . import browser, pipeline
from .common import CONFIG, DATA, log_to


def main():
    ap = argparse.ArgumentParser(prog="python -m autozhihu")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("login", help="打开浏览器登录知乎（只需一次）")
    sub.add_parser("discover", help="抓取候选问题到 data/candidates.json")
    w = sub.add_parser("write", help="选题并写回答，存到 data/answers/<问题id>/")
    w.add_argument("-n", type=int, default=CONFIG["per_run"], help="写几篇")
    w.add_argument("--qid", nargs="*", help="指定问题 id，跳过选题")
    p = sub.add_parser("publish", help="发布已写好未发布的回答")
    p.add_argument("--qid", nargs="*", help="只发布这些问题")
    p.add_argument("--dry-run", action="store_true", help="走完流程但不点发布，只截图")
    r = sub.add_parser("run", help="discover + write + publish 一条龙")
    r.add_argument("-n", type=int, default=CONFIG["per_run"])
    d = sub.add_parser("daily", help="每日任务：写够篇数，在时间窗口内随机时刻发布")
    d.add_argument("-n", type=int, default=CONFIG["daily_count"])
    d.add_argument("--window", nargs=2, metavar=("HH:MM", "HH:MM"), default=CONFIG["publish_window"])
    d.add_argument("--dry-run", action="store_true", help="到点只预演不发布")
    sub.add_parser("pause", help="暂停每日任务（包括正在运行的）")
    sub.add_parser("resume", help="恢复每日任务")
    args = ap.parse_args()

    if args.cmd == "login":
        browser.login()
    elif args.cmd == "discover":
        pipeline.discover()
    elif args.cmd == "write":
        pipeline.write(args.n, args.qid)
    elif args.cmd == "publish":
        pipeline.publish(args.qid, args.dry_run)
    elif args.cmd == "daily":
        log_to(DATA / "logs" / f"{time.strftime('%Y-%m-%d')}.log")
        pipeline.daily(args.n, args.window, args.dry_run)
    elif args.cmd == "pause":
        pipeline.pause()
    elif args.cmd == "resume":
        pipeline.resume()
    elif args.cmd == "run":
        pipeline.run(args.n)


if __name__ == "__main__":
    main()
