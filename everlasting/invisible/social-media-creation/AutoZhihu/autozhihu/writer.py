"""选题 + 写作流水线：计划 → 初稿 → 审稿 → 修订。每一步的产物都存在 data/answers/<qid>/ 里。"""
import json
from pathlib import Path

from .common import CONFIG, answer_dir, load_meta, save_meta
from .llm import chat, extract_block

PROMPTS = Path(__file__).parent / "prompts"
STYLE = (PROMPTS / "style.md").read_text(encoding="utf-8")


def _prompt(name, **kw):
    text = (PROMPTS / f"{name}.md").read_text(encoding="utf-8")
    for k, v in kw.items():
        text = text.replace("{" + k + "}", str(v))
    return text


def select(candidates, n):
    """让模型从候选里挑 n 个最值得回答的问题，返回 id 列表。"""
    brief = [{k: c.get(k) for k in ("id", "title", "source", "followers", "answers", "visits", "excerpt") if c.get(k)}
             for c in candidates]
    out = chat("你是一个经验丰富的知乎答主，擅长判断哪些问题值得花时间写高质量回答。",
               _prompt("select", n=n, candidates=json.dumps(brief, ensure_ascii=False, indent=1)))
    ids = [s.strip() for s in extract_block(out, "pick").split(",") if s.strip()]
    valid = {str(c["id"]) for c in candidates}
    return [i for i in ids if i in valid][:n]


def build_context(q, max_answers=5, max_chars=3000):
    parts = [f"# 问题\n\n{q['title']}"]
    if q.get("detail"):
        parts.append(f"## 问题描述\n\n{q['detail']}")
    stats = "，".join(f"{k} {q[key]}" for k, key in (("关注", "followers"), ("浏览", "visits"), ("回答", "answers"))
                     if q.get(key) is not None)
    if stats:
        parts.append(f"（{stats}）")
    if q.get("top_answers"):
        parts.append("# 已有的高赞回答")
        for i, a in enumerate(q["top_answers"][:max_answers], 1):
            text = a["text"] if len(a["text"]) <= max_chars else a["text"][:max_chars] + "……（后略）"
            parts.append(f"## 回答 {i}（{a.get('votes', 0)} 赞）\n\n{text}")
    else:
        parts.append("（目前没有已有回答）")
    return "\n\n".join(parts)


def write(q):
    """对一个已抓取详情的问题跑完整写作流程，返回最终回答 Markdown。"""
    d = answer_dir(q["id"])
    d.mkdir(parents=True, exist_ok=True)
    ctx = build_context(q)
    (d / "context.md").write_text(ctx, encoding="utf-8")

    print("  计划")
    plan = extract_block(chat(STYLE, _prompt("plan", context=ctx)), "plan")
    (d / "plan.md").write_text(plan, encoding="utf-8")

    print("  初稿")
    draft = extract_block(chat(STYLE, _prompt("draft", context=ctx, plan=plan)), "answer")
    (d / "draft.md").write_text(draft, encoding="utf-8")

    print("  审稿")
    review = extract_block(chat(STYLE, _prompt("review", context=ctx, draft=draft)), "review")
    (d / "review.md").write_text(review, encoding="utf-8")

    print("  修订")
    final = extract_block(chat(STYLE, _prompt("revise", context=ctx, draft=draft, review=review)),
                          "answer")
    (d / "final.md").write_text(final, encoding="utf-8")

    meta = load_meta(q["id"])
    meta.update(id=q["id"], title=q["title"], url=f"https://www.zhihu.com/question/{q['id']}",
                status="written", model=CONFIG["model"])
    save_meta(q["id"], meta)
    return final
