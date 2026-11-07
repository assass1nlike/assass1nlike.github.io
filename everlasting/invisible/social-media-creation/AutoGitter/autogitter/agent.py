"""调用 headless Claude Code（claude -p）。完整事件流写进日志，最终的结构化输出按 JSON schema 校验后返回。"""
import json
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

from .common import CONFIG, DOTENV

CLAUDE = shutil.which("claude")

# agent 不许碰 GitHub 的写接口：禁用 gh 和 git push，另外在环境里让它拿不到凭据（见 _env）
# Windows 上 agent 也会用 PowerShell 工具，两边都要禁
DENY = [f"{shell}({cmd}:*)" for shell in ("Bash", "PowerShell")
        for cmd in ("gh", "git push", "git commit", "git remote", "git config")] + ["WebSearch"]


def _env():
    env = {k: v for k, v in os.environ.items()
           if not k.startswith(("CLAUDE", "ANTHROPIC", "GH_", "GITHUB_"))}
    env.update(DOTENV)
    env["GH_TOKEN"] = "disabled"
    # 清空 git 的 credential helper，push 时拿不到 Windows 凭据管理器里的 token
    env.update(GIT_CONFIG_COUNT="1", GIT_CONFIG_KEY_0="credential.helper", GIT_CONFIG_VALUE_0="",
               GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
    # uv 装在 autogitter 环境里，agent 用它建 venv
    env["PATH"] = str(Path(sys.executable).parent / "Scripts") + os.pathsep + env.get("PATH", "")
    return env


def _show(event):
    """把事件流里的工具调用简短地打出来，方便盯进度。"""
    if event.get("type") != "assistant":
        return
    for b in event["message"].get("content", []):
        if b.get("type") == "tool_use":
            inp = b.get("input", {})
            arg = inp.get("command") or inp.get("file_path") or inp.get("pattern") or inp.get("description") or ""
            print(f"    · {b['name']}: {str(arg).splitlines()[0][:110] if arg else ''}", flush=True)


def run(text, cwd, schema, log, *, add_dirs=(), read_only=False, tools=None, resume=None, timeout=3600):
    """返回 {"output": 结构化结果, "session_id", "cost"}。失败抛异常。"""
    cmd = [CLAUDE, "-p", "--safe-mode", "--output-format", "stream-json", "--verbose",
           "--model", CONFIG["model"], "--effort", CONFIG["effort"],
           "--permission-mode", "bypassPermissions",
           "--json-schema", json.dumps(schema),
           "--disallowedTools", *DENY, *(["Edit", "Write", "NotebookEdit"] if read_only else [])]
    if tools is not None:
        cmd += ["--tools", tools]
    for d in add_dirs:
        cmd += ["--add-dir", str(d)]
    if resume:
        cmd += ["--resume", resume]

    log = Path(log)
    log.parent.mkdir(parents=True, exist_ok=True)
    result = None
    with open(log, "a", encoding="utf-8") as f:
        p = subprocess.Popen(cmd, cwd=cwd, env=_env(), stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        p.stdin.write(text)
        p.stdin.close()
        timer = threading.Timer(timeout, lambda: subprocess.run(
            ["taskkill", "/T", "/F", "/PID", str(p.pid)], capture_output=True))
        timer.start()
        try:
            for line in p.stdout:
                f.write(line)
                f.flush()
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                _show(event)
                if event.get("type") == "result":
                    result = event
            p.wait()
        finally:
            timer.cancel()

    if result is None:
        raise RuntimeError(f"claude 没有返回结果（超时或崩溃），见 {log}")
    if result.get("is_error") or result.get("structured_output") is None:
        raise RuntimeError(f"claude 出错：{str(result.get('result'))[:500]}（见 {log}）")
    return {"output": result["structured_output"], "session_id": result["session_id"],
            "cost": result.get("total_cost_usd", 0)}
