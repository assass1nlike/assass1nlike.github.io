import argparse

from . import pipeline, schedule
from .common import CANDIDATES, read_json, write_json


def main():
    ap = argparse.ArgumentParser(prog="python -m autogitter")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("discover", help="抓取各 repo 的候选 issue 到 data/candidates.json")
    sub.add_parser("triage", help="让模型从候选里挑出适合修的 issue")
    w = sub.add_parser("work", help="修 issue：复现、修复、审稿，过审的进入 ready")
    w.add_argument("-n", type=int, default=1, help="从筛选结果里按分数取几个")
    w.add_argument("--issue", nargs="*", help="直接指定，如 huggingface/transformers#12345")
    h = sub.add_parser("hunt", help="在 repo 的近期改动里找未报告的 bug，产出 PR 或 issue")
    h.add_argument("repo")
    s = sub.add_parser("submit", help="提交 ready 的任务（受每日上限和间隔约束）")
    s.add_argument("--id", nargs="*", help="只提交这些任务")
    sub.add_parser("followup", help="查看已提交 PR/issue 的新动静")
    sub.add_parser("status", help="列出所有任务")
    sub.add_parser("clean", help="删除已结束任务的 worktree")
    r = sub.add_parser("run", help="提交排队的，然后 discover + triage + work + hunt，新增 n 个过审后再提交")
    r.add_argument("-n", type=int, default=1, help="本轮要新增几个过审")
    sub.add_parser("cron", help="给任务计划程序用：run 一轮再 followup，输出写进 data/logs/")
    sc = sub.add_parser("schedule", help="管理 Windows 定时任务")
    sc.add_argument("action", choices=["install", "uninstall", "status"])
    args = ap.parse_args()

    if args.cmd == "discover":
        pipeline.discover()
    elif args.cmd == "triage":
        pipeline.triage()
    elif args.cmd == "work":
        if args.issue:
            targets = [(s.split("#")[0], int(s.split("#")[1])) for s in args.issue]
        else:
            pool = read_json(CANDIDATES, {})
            picks = sorted((c for c in pool.values() if c["status"] == "picked"), key=lambda c: -c["score"])
            targets = [(c["repo"], c["number"]) for c in picks[:args.n]]
            for c in picks[:args.n]:
                c["status"] = "tasked"
            write_json(CANDIDATES, pool)
        for repo, number in targets:
            tid = pipeline.new_task(repo, number)
            if tid:
                pipeline.work(tid)
    elif args.cmd == "hunt":
        tid = pipeline.new_task(args.repo)
        pipeline.work(tid)
    elif args.cmd == "submit":
        pipeline.submit(args.id)
    elif args.cmd == "followup":
        pipeline.followup()
    elif args.cmd == "status":
        pipeline.status()
    elif args.cmd == "clean":
        pipeline.clean()
    elif args.cmd == "run":
        pipeline.run(args.n)
    elif args.cmd == "cron":
        pipeline.cron()
    elif args.cmd == "schedule":
        getattr(schedule, args.action)()


if __name__ == "__main__":
    main()
