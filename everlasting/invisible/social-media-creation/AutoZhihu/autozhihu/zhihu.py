"""知乎页面操作：发现候选问题、抓取问题详情。"""
import html
import json
import re
import time

from .common import CANDIDATES, read_json, write_json

SOURCE_PAGES = {
    "invited": "https://www.zhihu.com/creator/featured-question/invited",
    "recommend": "https://www.zhihu.com/creator/featured-question/recommend",
}


def html_to_text(s):
    s = re.sub(r'<img[^>]*?eeimg="1"[^>]*?alt="([^"]*)"[^>]*>|<img[^>]*?alt="([^"]*)"[^>]*?eeimg="1"[^>]*>',
               lambda m: f"${m.group(1) or m.group(2)}$", s or "")
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"</(p|h\d|li|blockquote|pre|figure)>", "\n\n", s)
    s = re.sub(r"<li[^>]*>", "- ", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def _initial_data(page):
    raw = page.locator("script#js-initialData").first.text_content(timeout=15000)
    return json.loads(raw)["initialState"]


def _harvest(obj, out, source):
    """在任意 JSON 里找 question 对象。"""
    if isinstance(obj, dict):
        if obj.get("type") == "question" and obj.get("id") and obj.get("title"):
            qid = str(obj["id"])
            item = out.setdefault(qid, {"id": qid, "title": obj["title"], "source": source})
            for key, names in (("followers", ("follower_count", "followerCount")),
                               ("answers", ("answer_count", "answerCount")),
                               ("visits", ("visit_count", "visitCount")),
                               ("excerpt", ("excerpt", "detail"))):
                for n in names:
                    if obj.get(n) not in (None, "") and not item.get(key):
                        item[key] = html_to_text(obj[n])[:200] if key == "excerpt" else obj[n]
        for v in obj.values():
            _harvest(v, out, source)
    elif isinstance(obj, list):
        for v in obj:
            _harvest(v, out, source)


def _sniff_page(ctx, url, source, out, scrolls=4):
    page = ctx.new_page()
    def on_response(r):
        if "/api/" in r.url and "json" in (r.headers.get("content-type") or ""):
            try:
                _harvest(r.json(), out, source)
            except Exception:
                pass
    page.on("response", on_response)
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_timeout(4000)
    try:
        _harvest(_initial_data(page), out, source)
    except Exception:
        pass
    for _ in range(scrolls):
        page.mouse.wheel(0, 3000)
        page.wait_for_timeout(2000)
    page.close()


def discover(ctx, sources):
    found = {}
    for s in sources:
        n0 = len(found)
        if s == "hot":
            r = ctx.request.get("https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50&desktop=true")
            _harvest(r.json(), found, "hot")
        else:
            _sniff_page(ctx, SOURCE_PAGES[s], s, found)
        print(f"  {s}: {len(found) - n0} 个问题")

    # 合并进已有候选池，保留每个问题的状态
    pool = read_json(CANDIDATES, {})
    now = time.strftime("%Y-%m-%d %H:%M")
    for qid, q in found.items():
        q["found_at"] = pool.get(qid, {}).get("found_at", now)
        q["status"] = pool.get(qid, {}).get("status", "new")
        pool[qid] = q
    write_json(CANDIDATES, pool)
    return found


def fetch_question(ctx, qid, max_answers=5):
    page = ctx.new_page()
    page.goto(f"https://www.zhihu.com/question/{qid}", wait_until="domcontentloaded")
    st = _initial_data(page)
    page.close()
    ent = st["entities"]
    qd = ent["questions"][str(qid)]
    answers = sorted(ent.get("answers", {}).values(), key=lambda a: a.get("voteupCount", 0), reverse=True)
    return {
        "id": str(qid),
        "title": qd["title"],
        "detail": html_to_text(qd.get("detail", "")),
        "followers": qd.get("followerCount"),
        "visits": qd.get("visitCount"),
        "answers": qd.get("answerCount"),
        "top_answers": [{"votes": a.get("voteupCount", 0), "text": html_to_text(a.get("content", ""))}
                        for a in answers[:max_answers] if a.get("content")],
        "raw_question": qd,
    }


def publish(ctx, qid, html, declare_ai=True, dry_run=False, shot=None):
    """在问题下发布回答。成功返回回答链接；dry_run 时停在点“发布回答”之前。"""
    page = ctx.new_page()
    page.goto(f"https://www.zhihu.com/question/{qid}", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    # 顶栏会挡住按钮，用 JS 点击
    page.locator("button.WriteAnswerButton").first.evaluate("e => e.click()")
    ed = page.locator(".public-DraftEditor-content")
    ed.wait_for(timeout=15000)
    ed.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    ed.evaluate("""(el, html) => {
        const dt = new DataTransfer();
        dt.setData('text/html', html);
        dt.setData('text/plain', html.replace(/<[^>]+>/g, ''));
        el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
    }""", html)
    page.wait_for_timeout(4000)
    expected = len(html_to_text(html))
    got = len(ed.inner_text())
    if got < expected * 0.6:
        raise RuntimeError(f"粘贴后编辑器内容过短（{got}/{expected} 字），放弃发布")

    if declare_ai:
        page.get_by_text("发布设置", exact=True).first.click()
        page.wait_for_timeout(1000)
        page.locator(".Select-button, button").filter(has_text=re.compile("^(无声明|虚构创作|包含 AI 辅助创作)")).first.click()
        page.wait_for_timeout(1000)
        page.locator(".Select-option").filter(has_text="包含 AI 辅助创作").first.click()
        page.wait_for_timeout(1000)
        if page.get_by_text("包含 AI 辅助创作").count() == 0:
            raise RuntimeError("没能勾选 AI 辅助创作声明，放弃发布")

    if dry_run:
        if shot:
            page.screenshot(path=str(shot), full_page=True)
        page.close()
        return None

    page.locator("button").filter(has_text=re.compile("^发布回答$")).first.click()
    try:
        page.wait_for_url(re.compile(r"/answer/\d+"), timeout=30000)
    except Exception:
        pass
    page.wait_for_timeout(3000)
    if shot:
        page.screenshot(path=str(shot))
    url = page.url
    page.close()
    if "/answer/" not in url:
        raise RuntimeError(f"点了发布但没有跳转到回答页（当前 {url}），请人工检查")
    return url.split("?")[0]
