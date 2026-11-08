"""通过 gh CLI 访问 GitHub。所有写操作（fork、push、建 PR/issue）只在这里发生。"""
import base64
import json
import os
import re
import time
from datetime import date, timedelta
from functools import cache

from .common import CONFIG, sh

ACCOUNT = CONFIG["account"]


@cache
def _env():
    token = sh("gh", "auth", "token", "--user", ACCOUNT).strip()
    return {**os.environ, "GH_TOKEN": token}


def gh(*args, input=None):
    for i in range(4):
        try:
            return sh("gh", *args, input=input, env=_env())
        except RuntimeError as e:
            if "rate limit" not in str(e) or i == 3:
                raise
            print(f"  GitHub 限流，等 {90 * (i + 1)} 秒")
            time.sleep(90 * (i + 1))


def api(path, **fields):
    args = ["api", "-X", "GET", path]
    for k, v in fields.items():
        args += ["-f", f"{k}={v}"]
    return json.loads(gh(*args))


def graphql(query):
    return json.loads(gh("api", "graphql", "-f", f"query={query}"))["data"]


def token():
    return _env()["GH_TOKEN"]


def push(tree, fork, branch, retries=3):
    """把 worktree 的 HEAD 推到我方 fork。token 通过环境变量里的认证头传，不进命令行和报错信息。"""
    auth = base64.b64encode(f"x-access-token:{token()}".encode()).decode()
    env = {**os.environ, "GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
           "GIT_CONFIG_VALUE_0": f"AUTHORIZATION: basic {auth}", "GIT_TERMINAL_PROMPT": "0"}
    for i in range(retries):
        try:
            sh("git", "-C", str(tree), "-c", "credential.helper=", "push", "--force",
               f"https://github.com/{fork}.git", f"HEAD:refs/heads/{branch}", env=env)
            return
        except RuntimeError as e:
            err = str(e).replace(token(), "***").replace(auth, "***")
            if i == retries - 1:
                raise RuntimeError(err) from None
            print(f"  push 失败，30 秒后重试：{err.splitlines()[-1][:200]}")
            time.sleep(30)


def default_branch(repo):
    return api(f"repos/{repo}")["default_branch"]


def search_issues(repo):
    """近期、无人认领、讨论不长的 open issue。"""
    since = (date.today() - timedelta(days=CONFIG["issue_age_days"])).isoformat()
    q = (f"repo:{repo} is:issue is:open no:assignee created:>={since} "
         f"comments:<={CONFIG['max_issue_comments']}")
    items = api("search/issues", q=q, sort="created", order="desc",
                per_page=min(CONFIG["candidates_per_repo"], 100))["items"]
    return [{
        "repo": repo,
        "number": it["number"],
        "title": it["title"],
        "labels": [l["name"] for l in it["labels"]],
        "comments": it["comments"],
        "reactions": it["reactions"]["total_count"],
        "created_at": it["created_at"],
        "body": (it["body"] or "")[:3000],
    } for it in items if "pull_request" not in it]


def linked_prs(repo, numbers):
    """{issue 号: [引用了它的 open/merged PR]}，一次 GraphQL 查一批。"""
    owner, name = repo.split("/")
    out = {}
    for i in range(0, len(numbers), 25):
        batch = numbers[i:i + 25]
        fields = "\n".join(
            f'i{n}: issue(number: {n}) {{ timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT], first: 50) '
            f'{{ nodes {{ ... on CrossReferencedEvent {{ source {{ ... on PullRequest {{ number state }} }} }} '
            f'... on ConnectedEvent {{ subject {{ ... on PullRequest {{ number state }} }} }} }} }} }}'
            for n in batch)
        data = graphql(f'query {{ repository(owner: "{owner}", name: "{name}") {{ {fields} }} }}')["repository"]
        for n in batch:
            prs = []
            for node in (data.get(f"i{n}") or {}).get("timelineItems", {}).get("nodes", []):
                pr = node.get("source") or node.get("subject") or {}
                if pr.get("number") and pr.get("state") in ("OPEN", "MERGED"):
                    prs.append(pr["number"])
            out[n] = prs
    return out


def referenced_by_open_prs(repo):
    """open PR 标题和正文里以 #N 引用到的 issue 号。timeline 的交叉引用事件会漏，所以另扫正文。"""
    prs = json.loads(gh("pr", "list", "--repo", repo, "--state", "open", "--limit", "1000", "--json", "title,body"))
    text = " ".join(f"{p['title']} {p['body']}" for p in prs)
    return {int(n) for n in re.findall(r"#([0-9]+)(?![0-9])", text)}


def issue_thread(repo, number):
    return json.loads(gh("issue", "view", str(number), "--repo", repo, "--json",
                         "number,title,body,author,state,labels,comments,assignees,url,createdAt"))


def open_prs(repo, limit=1000):
    return json.loads(gh("pr", "list", "--repo", repo, "--state", "open", "--limit", str(limit),
                         "--json", "number,title,author,createdAt,headRefName"))


def my_open_prs(repo):
    return json.loads(gh("pr", "list", "--repo", repo, "--author", ACCOUNT, "--state", "open",
                         "--json", "number,url"))


def fork(repo):
    """返回我方 fork 的 full_name（已存在时 GitHub 直接返回已有的）。"""
    return json.loads(gh("api", "-X", "POST", f"repos/{repo}/forks"))["full_name"]


def create_pr(repo, head, base, title, body):
    return gh("pr", "create", "--repo", repo, "--head", head, "--base", base,
              "--title", title, "--body-file", "-", input=body).strip()


def comment(repo, number, body):
    gh("issue", "comment", str(number), "--repo", repo, "--body-file", "-", input=body)


def create_issue(repo, title, body):
    return gh("issue", "create", "--repo", repo, "--title", title, "--body-file", "-", input=body).strip()


def pr_status(url):
    return json.loads(gh("pr", "view", url, "--json",
                         "state,mergedAt,reviewDecision,comments,reviews,statusCheckRollup"))


def issue_status(url):
    return json.loads(gh("issue", "view", url, "--json", "state,comments"))
