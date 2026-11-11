"""模型调用。接口格式由 config.toml 的 api 决定：anthropic（/v1/messages）或 openai（/v1/chat/completions）。"""
import os
import re
import time

from .common import CONFIG

_client = None


def client():
    global _client
    if _client is None:
        url, key = os.environ["LLM_BASE_URL"], os.environ["LLM_API_KEY"]
        if CONFIG["api"] == "anthropic":
            import anthropic
            _client = anthropic.Anthropic(base_url=url, api_key=key, timeout=1200)
        else:
            import openai
            _client = openai.OpenAI(base_url=url, api_key=key, timeout=1200)
    return _client


def _anthropic(system, user, max_tokens):
    with client().messages.stream(model=CONFIG["model"], system=system, max_tokens=max_tokens,
                                  messages=[{"role": "user", "content": user}]) as s:
        msg = s.get_final_message()
    return "".join(b.text for b in msg.content if b.type == "text")


def _openai(system, user, max_tokens):
    import openai
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    limit = {"max_tokens": max_tokens}
    for _ in range(3):
        try:
            r = client().chat.completions.create(model=CONFIG["model"], messages=messages, **limit)
            return r.choices[0].message.content or ""
        except openai.BadRequestError as e:
            # 新一代推理模型只认 max_completion_tokens；部分转发代理不接受 system 消息
            if "max_completion_tokens" in str(e) and "max_tokens" in limit:
                limit = {"max_completion_tokens": max_tokens}
            elif "system" in str(e) and messages[0]["role"] == "system":
                messages = [{"role": "user", "content": f"{system}\n\n---\n\n{user}"}]
            else:
                raise
    raise RuntimeError("OpenAI 格式接口调用失败")


def chat(system, user, max_tokens=32000, retries=3):
    call = _anthropic if CONFIG["api"] == "anthropic" else _openai
    for i in range(retries):
        try:
            return call(system, user, max_tokens).strip()
        except Exception as e:
            if i == retries - 1:
                raise
            print(f"  LLM 调用失败（{e}），重试")
            time.sleep(10 * (i + 1))


def extract_block(text, tag):
    """取出 <tag>...</tag> 之间的内容；没有标签时返回全文。"""
    m = re.search(rf"<{tag}>(.*?)</{tag}>", text, re.S)
    return (m.group(1) if m else text).strip()
