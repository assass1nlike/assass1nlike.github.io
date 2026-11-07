"""通过 gh CLI 访问 GitHub。所有写操作（fork、push、建 PR/issue）只在这里发生。"""
import json
import os
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


def issue_thread(repo, number):
    return json.loads(gh("issue", "view", str(number), "--repo", repo, "--json",
                         "number,title,body,author,state,labels,comments,assignees,url,createdAt"))


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
