import os
import re
import time

import anthropic

from .common import CONFIG

_client = None


def client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"],
                                      timeout=1200)
    return _client


def chat(system, user, max_tokens=32000, retries=3):
    for i in range(retries):
        try:
            with client().messages.stream(
                model=CONFIG["model"],
                system=system,
                messages=[{"role": "user", "content": user}],
                max_tokens=max_tokens,
            ) as s:
                msg = s.get_final_message()
            return "".join(b.text for b in msg.content if b.type == "text").strip()
        except Exception as e:
            if i == retries - 1:
                raise
            print(f"  LLM 调用失败（{e}），重试")
            time.sleep(10 * (i + 1))


def extract_block(text, tag):
    """取出 <tag>...</tag> 之间的内容；没有标签时返回全文。"""
    m = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.S)
    return (m.group(1) if m else text).strip()
