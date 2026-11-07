"""把发现、筛选、修复、审稿、提交串起来。

候选 issue 在 data/candidates.json，status: new → picked / passed（筛选没选）/ has_pr（已有关联 PR）→ tasked。
任务在 data/tasks/<id>/meta.json，status: working → ready / abandoned / rejected / failed → submitted；
提交前发现已过时（issue 关了、别人提了 PR）为 stale。
"""
import hashlib
import random
import re
import shutil
import time
from datetime import date, datetime

from . import agent, gh
from .common import (CANDIDATES, CONFIG, DATA, ENVS, REPOS, TREES, all_tasks, load_meta, now, prompt,
                     read_json, save_meta, sh, slug, task_dir, write_json)

WORK_SCHEMA = {
    "type": "object",
    "properties": {
        "outcome": {"type": "string", "enum": ["pr", "issue", "abandon"]},
        "title": {"type": "string"},
        "body": {"type": "string", "description": "PR or issue body, Markdown"},
        "commit_message": {"type": "string"},
        "signoff": {"type": "boolean", "description": "repo requires DCO Signed-off-by"},
        "ai_policy": {"type": "string", "description": "what the repo says about AI contributions, or 'none found'"},
        "ai_disclosure_required": {"type": "boolean"},
        "tests": {"type": "string", "description": "test/lint commands you ran and their results"},
        "notes": {"type": "string", "description": "abandon reason, caveats, anything the reviewer should know"},
    },
    "required": ["outcome", "title", "body", "commit_message", "signoff", "ai_policy",
                 "ai_disclosure_required", "tests", "notes"],
}

REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["submit", "revise", "reject"]},
        "score": {"type": "integer", "minimum": 1, "maximum": 10},
        "must_fix": {"type": "array", "items": {"type": "string"}},
        "comments": {"type": "string"},
    },
    "required": ["verdict", "score", "must_fix", "comments"],
}

TRIAGE_SCHEMA = {
    "type": "object",
    "properties": {"picks": {"type": "array", "items": {
        "type": "object",
        "properties": {"number": {"type": "integer"}, "score": {"type": "integer"}, "reason": {"type": "string"}},
        "required": ["number", "score", "reason"],
    }}},
    "required": ["picks"],
}


# ---------- 发现与筛选 ----------

def discover():
    pool = read_json(CANDIDATES, {})
    for repo in CONFIG["pr_repos"]:
        try:
            items = [it for it in gh.search_issues(repo) if f"{repo}#{it['number']}" not in pool]
            linked = gh.linked_prs(repo, [it["number"] for it in items]) if items else {}
        except Exception as e:
            print(f"{repo}：抓取失败（{e}）")
            continue
        for it in items:
            it["status"] = "has_pr" if linked.get(it["number"]) else "new"
            it["found_at"] = now()
            pool[f"{repo}#{it['number']}"] = it
        time.sleep(3)  # search API 有 secondary rate limit
        print(f"{repo}：新增 {len(items)} 个，其中 {sum(1 for it in items if it['status'] == 'new')} 个无关联 PR")
        write_json(CANDIDATES, pool)


def triage():
    pool = read_json(CANDIDATES, {})
    for repo in CONFIG["pr_repos"]:
        fresh = [c for c in pool.values() if c["repo"] == repo and c["status"] == "new"]
        if not fresh:
            continue
        listing = "\n\n".join(
            f"## #{c['number']}: {c['title']}\nlabels: {', '.join(c['labels']) or 'none'} | comments: {c['comments']}"
            f" | reactions: {c['reactions']} | created: {c['created_at'][:10]}\n\n{c['body'][:1500]}"
            for c in fresh)
        print(f"筛选 {repo}（{len(fresh)} 个）")
        try:
            r = agent.run(prompt("triage", repo=repo, issues=listing), DATA, TRIAGE_SCHEMA,
                          DATA / "logs" / f"triage-{slug(repo)}.log", tools="", timeout=900)
        except Exception as e:
            print(f"  失败：{e}")
            continue
        picks = {p["number"]: p for p in r["output"]["picks"]}
        for c in fresh:
            p = picks.get(c["number"])
            c.update(status="picked", score=p["score"], reason=p["reason"]) if p else c.update(status="passed")
        for p in sorted(picks.values(), key=lambda p: -p["score"]):
            print(f"  #{p['number']} ({p['score']}) {p['reason']}")
        write_json(CANDIDATES, pool)


# ---------- 工作区 ----------

def _git(tree, *args, check=True):
    return sh("git", "-C", str(tree), *args, check=check)


def prepare_tree(repo, tid, branch):
    """base clone（blob 按需拉取）+ 每个任务一个 worktree，从最新 upstream 默认分支切出。"""
    base_branch = gh.default_branch(repo)
    base = REPOS / slug(repo)
    if not base.exists():
        REPOS.mkdir(parents=True, exist_ok=True)
        sh("git", "-c", "core.longpaths=true", "clone", "--filter=blob:none", "--no-checkout",
           f"https://github.com/{repo}.git", str(base))
        _git(base, "config", "core.longpaths", "true")
    _git(base, "fetch", "origin", base_branch)
    tree = TREES / tid
    if tree.exists():
        _git(base, "worktree", "remove", "--force", str(tree), check=False)
        shutil.rmtree(tree, ignore_errors=True)
    _git(base, "worktree", "prune")
    _git(base, "worktree", "add", "-B", branch, str(tree), f"origin/{base_branch}")
    return tree, base_branch


def issue_md(repo, number):
    t = gh.issue_thread(repo, number)
    parts = [f"## #{t['number']}: {t['title']}",
             f"{t['url']} | state: {t['state']} | opened by @{t['author']['login']} on {t['createdAt'][:10]}"
             f" | labels: {', '.join(l['name'] for l in t['labels']) or 'none'}"
             f" | assignees: {', '.join(a['login'] for a in t['assignees']) or 'none'}",
             t["body"] or "(empty)"]
    for c in t["comments"]:
        parts.append(f"### Comment by @{c['author']['login']} ({c.get('authorAssociation', '')}) on {c['createdAt'][:10]}\n\n{c['body']}")
    return "\n\n".join(parts)


def _ctx(meta):
    """填 prompt 用的路径和公共段落。"""
    tid = meta["id"]
    return dict(repo=meta["repo"], tree=TREES / tid, branch=meta["branch"], base=meta["base"],
                scratch=task_dir(tid) / "scratch", venv=ENVS / slug(meta["repo"]))


def _env_text(ctx):
    return prompt("env", **ctx)


def _diff(tree, base):
    _git(tree, "add", "-A", "--intent-to-add")
    return _git(tree, "diff", f"origin/{base}")


# ---------- 修复与审稿 ----------

def new_task(repo, number=None):
    allowed = CONFIG["pr_repos"] + ([] if number else CONFIG["issue_repos"])
    if repo not in allowed:
        print(f"{repo} 不在白名单（{'pr_repos' if number else 'pr_repos / issue_repos'}）里，跳过")
        return None
    if number:
        tid, branch = f"{slug(repo)}__{number}", f"fix-issue-{number}"
    else:
        tid = f"{slug(repo)}__h{datetime.now():%y%m%d%H%M}"
        branch = f"ag-{tid.rsplit('__', 1)[1]}"
    if load_meta(tid).get("status") not in (None, "failed"):
        print(f"{tid} 已存在（{load_meta(tid)['status']}），跳过")
        return None
    meta = {"id": tid, "repo": repo, "number": number, "kind": "issue" if number else "hunt",
            "branch": branch, "status": "working", "created_at": now(), "cost": 0}
    save_meta(tid, meta)
    return tid


def work(tid):
    meta = load_meta(tid)
    d = task_dir(tid)
    (d / "scratch").mkdir(parents=True, exist_ok=True)
    print(f"任务 {tid}")
    try:
        tree, meta["base"] = prepare_tree(meta["repo"], tid, meta["branch"])
        save_meta(tid, meta)
        ctx = _ctx(meta)
        if meta["kind"] == "issue":
            issue = issue_md(meta["repo"], meta["number"])
            (d / "issue.md").write_text(issue, encoding="utf-8")
            text = prompt("fix", env=_env_text(ctx), issue=issue, style=prompt("style"), **ctx)
        else:
            issue = "(No existing issue: the contributor found this bug while reading recent changes.)"
            if meta["repo"] in CONFIG["issue_repos"]:
                deliverable = ("a high-quality bug report issue. This repo doesn't accept pull requests from outside "
                               "contributors, so don't change the worktree, even if the fix is easy; describe the fix in the issue")
                outcomes = '`issue` or `abandon` (never `pr` for this repo)'
            else:
                deliverable = ("either a pull request with the fix (preferred, if the fix is clear and small) "
                               "or a high-quality bug report issue")
                outcomes = "`pr`, `issue` or `abandon`"
            text = prompt("hunt", env=_env_text(ctx), style=prompt("style"), deliverable=deliverable,
                          outcomes=outcomes, **ctx)
        add = [d, ENVS]
        r = agent.run(text, tree, WORK_SCHEMA, d / "work.log", add_dirs=add, timeout=CONFIG["work_timeout"])
        meta["session_id"] = r["session_id"]
        meta["cost"] += r["cost"]
        result = r["output"]

        for rnd in range(CONFIG["max_revisions"] + 1):
            write_json(d / f"result-{rnd}.json", result)
            if result["outcome"] == "abandon":
                meta.update(status="abandoned", reason=result["notes"])
                break
            if result["outcome"] == "pr" and meta["repo"] in CONFIG["issue_repos"]:
                meta.update(status="failed", reason="只收 issue 的 repo 产出了 pr")
                break
            if result["outcome"] == "pr" and not _diff(tree, meta["base"]).strip():
                meta.update(status="failed", reason="outcome 是 pr 但 worktree 没有改动")
                break
            rev = review(meta, result, issue)
            write_json(d / f"review-{rnd}.json", rev)
            print(f"  审稿 {rnd}：{rev['verdict']} {rev['score']}/10")
            meta["score"] = rev["score"]
            if rev["verdict"] == "submit" and rev["score"] >= CONFIG["min_review_score"]:
                meta.update(status="ready", outcome=result["outcome"], result=result)
                if result["outcome"] == "pr":
                    _commit(meta, result)
                break
            if rev["verdict"] == "reject" or rnd == CONFIG["max_revisions"]:
                meta.update(status="rejected", reason=rev["comments"][:1000])
                break
            r = agent.run(prompt("revise", verdict=rev["verdict"], score=rev["score"],
                                 must_fix="\n".join(f"- {m}" for m in rev["must_fix"]) or "(none)",
                                 comments=rev["comments"]),
                          tree, WORK_SCHEMA, d / "work.log", add_dirs=add, resume=meta["session_id"],
                          timeout=CONFIG["work_timeout"])
            meta["session_id"] = r["session_id"]
            meta["cost"] += r["cost"]
            result = r["output"]
    except Exception as e:
        print(f"  失败：{e}")
        meta.update(status="failed", reason=str(e)[:1000])
    save_meta(tid, meta)
    print(f"  → {meta['status']}" + (f"：{meta.get('reason', '')[:200]}" if meta["status"] != "ready" else ""))
    return meta["status"]


def review(meta, result, issue):
    """独立的 reviewer 会话。它不该改文件；万一改了，按审前的 patch 还原。"""
    d = task_dir(meta["id"])
    ctx = _ctx(meta)
    tree = ctx["tree"]
    before = _diff(tree, meta["base"])
    (d / "change.patch").write_text(before, encoding="utf-8")
    claims = (f"Kind: {'pull request' if result['outcome'] == 'pr' else 'bug report issue'}\n\n"
              f"Title: {result['title']}\n\nBody:\n\n{result['body']}\n\n"
              f"Tests the contributor reports running:\n{result['tests']}\n\n"
              f"Contributor's notes:\n{result['notes']}\n\n"
              f"Contributor's reading of the repo's AI-contribution policy: {result['ai_policy']}")
    text = prompt("review", kind="pull request" if result["outcome"] == "pr" else "bug report issue",
                  claims=claims, issue=f"# The issue it addresses\n\n{issue}", style=prompt("style"),
                  base_ref=f"origin/{meta['base']}", **ctx)
    r = agent.run(text, tree, REVIEW_SCHEMA, d / "review.log", add_dirs=[d, ENVS], read_only=True,
                  timeout=CONFIG["review_timeout"])
    meta["cost"] += r["cost"]
    if hashlib.sha1(_diff(tree, meta["base"]).encode()).digest() != hashlib.sha1(before.encode()).digest():
        print("  reviewer 改动了 worktree，已还原")
        _git(tree, "reset", "--hard", f"origin/{meta['base']}")
        _git(tree, "clean", "-fd")
        if before.strip():
            sh("git", "-C", str(tree), "apply", "--whitespace=nowarn", "-", input=before)
    return r["output"]


def _commit(meta, result):
    tree = TREES / meta["id"]
    if meta["kind"] == "hunt":  # hunt 的分支名在知道要修什么之后再起
        words = re.sub(r"[^a-z0-9]+", "-", result["title"].lower()).strip("-")
        meta["branch"] = "fix-" + "-".join(words.split("-")[:6])
        _git(tree, "branch", "-m", meta["branch"])
    _git(tree, "add", "-A")
    _git(tree, "commit", *(["-s"] if result["signoff"] else []), "-m", result["commit_message"])


# ---------- 提交 ----------

def _submitted_today():
    return sum(1 for t in all_tasks() if t["status"] == "submitted" and t["submitted_at"][:10] == date.today().isoformat())


def _still_open(meta):
    """issue 还开着、没人认领、没有新的关联 PR。"""
    if meta["kind"] != "issue":
        return True
    t = gh.issue_thread(meta["repo"], meta["number"])
    return t["state"] == "OPEN" and not t["assignees"] and not gh.linked_prs(meta["repo"], [meta["number"]])[meta["number"]]


def submit(tids=None):
    ready = [t for t in all_tasks() if t["status"] == "ready" and (not tids or t["id"] in tids)]
    ready.sort(key=lambda t: -t.get("score", 0))
    first = True
    for meta in ready:
        if _submitted_today() >= CONFIG["max_submissions_per_day"]:
            print(f"今天已提交 {CONFIG['max_submissions_per_day']} 个，达到上限")
            return
        repo, result = meta["repo"], meta["result"]
        if not _still_open(meta):
            meta.update(status="stale", reason="issue 已关闭、被认领或已有关联 PR")
            save_meta(meta["id"], meta)
            print(f"{meta['id']}：已过时，跳过")
            continue
        if meta["outcome"] == "pr" and len(gh.my_open_prs(repo)) >= CONFIG["max_open_prs_per_repo"]:
            print(f"{meta['id']}：{repo} 上我方 open PR 已达上限，留到以后")
            continue
        if not first:
            wait = random.randint(*CONFIG["submit_interval"])
            print(f"等待 {wait // 60} 分钟再提交下一个")
            time.sleep(wait)
        first = False

        body = result["body"].rstrip()
        if CONFIG["disclose_ai"] or result["ai_disclosure_required"]:
            body += "\n\n" + CONFIG["disclosure"].strip()
        try:
            if meta["outcome"] == "pr":
                claim = CONFIG["self_assign"].get(repo)
                if claim and meta["kind"] == "issue":
                    gh.comment(repo, meta["number"], claim)
                    time.sleep(20)
                fork = gh.fork(repo)
                time.sleep(5)
                _git(TREES / meta["id"], "push", "--force",
                     f"https://x-access-token:{gh.token()}@github.com/{fork}.git", f"HEAD:refs/heads/{meta['branch']}")
                url = gh.create_pr(repo, f"{gh.ACCOUNT}:{meta['branch']}", meta["base"], result["title"], body)
            else:
                url = gh.create_issue(repo, result["title"], body)
        except Exception as e:
            print(f"{meta['id']}：提交失败（{e}）")
            meta["submit_error"] = str(e)[:1000]
            save_meta(meta["id"], meta)
            continue
        meta.update(status="submitted", url=url, submitted_at=now())
        save_meta(meta["id"], meta)
        print(f"{meta['id']}：已提交 {url}")


# ---------- 跟进与查看 ----------

def followup():
    """看已提交的 PR/issue 有没有新动静（维护者评论、review、合并、关闭）。"""
    for meta in all_tasks():
        if meta["status"] != "submitted":
            continue
        s = gh.pr_status(meta["url"]) if meta["outcome"] == "pr" else gh.issue_status(meta["url"])
        talk = [c for c in s.get("comments", []) + s.get("reviews", []) if c["author"]["login"] != gh.ACCOUNT]
        seen = meta.get("seen_comments", 0)
        line = f"{meta['url']}  {s['state']}"
        if s.get("reviewDecision"):
            line += f" / {s['reviewDecision']}"
        if len(talk) > seen:
            line += f"  新评论 {len(talk) - seen} 条"
        print(line)
        for c in talk[seen:]:
            print(f"    @{c['author']['login']}: {(c.get('body') or c.get('state', '')).strip()[:300]}")
        meta.update(seen_comments=len(talk), last_state=s["state"], checked_at=now())
        save_meta(meta["id"], meta)


def status():
    for t in all_tasks():
        extra = t.get("url") or (t.get("reason") or "")[:100].replace("\n", " ")
        print(f"{t['id']:<48} {t['status']:<10} {str(t.get('score', '-')):>2}  ${t.get('cost', 0):.2f}  {extra}")


def clean():
    """删掉已结束任务（非 ready/submitted）的 worktree，任务记录保留。"""
    for t in all_tasks():
        tree = TREES / t["id"]
        if tree.exists() and t["status"] in ("abandoned", "rejected", "failed", "stale"):
            _git(REPOS / slug(t["repo"]), "worktree", "remove", "--force", str(tree), check=False)
            shutil.rmtree(tree, ignore_errors=True)
            print(f"已删除 {tree}")


def run(n):
    """发现 → 筛选 → 依次修复，直到有 n 个过审 → 提交。"""
    discover()
    triage()
    pool = read_json(CANDIDATES, {})
    picks = sorted((c for c in pool.values() if c["status"] == "picked"), key=lambda c: -c["score"])
    ready = 0
    for c in picks:
        if ready >= n:
            break
        tid = new_task(c["repo"], c["number"])
        c["status"] = "tasked"
        write_json(CANDIDATES, pool)
        if tid and work(tid) == "ready":
            ready += 1
    submit()
