import json
import os
import subprocess
import sys
import tomllib
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "autogitter" / "prompts"
DATA = ROOT / "data"
TASKS = DATA / "tasks"
CANDIDATES = DATA / "candidates.json"
SCHEDULE = DATA / "schedule.json"  # 下次最早可提交的时间

CONFIG = tomllib.loads((ROOT / "config.toml").read_text(encoding="utf-8"))

if CONFIG.get("proxy"):
    for k in ("HTTPS_PROXY", "HTTP_PROXY", "https_proxy", "http_proxy"):
        os.environ[k] = CONFIG["proxy"]

WS = Path(CONFIG["workspace"])
REPOS = WS / "repos"  # 每个 repo 一份 base clone
TREES = WS / "w"      # 每个任务一个 worktree
ENVS = WS / "envs"    # 每个 repo 一个 venv

# .env 只给 headless Claude Code 用（ANTHROPIC_BASE_URL、ANTHROPIC_API_KEY 等），不写进本进程环境
DOTENV = {}
if (ROOT / ".env").exists():
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            DOTENV[k.strip()] = v.strip()

# Windows 控制台默认 GBK，打印 issue 标题里的字符会报错
if sys.stdout:  # pythonw 下没有 stdout
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def read_json(path, default=None):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write_json(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def now():
    return datetime.now().astimezone().isoformat(timespec="seconds")


# 任务计划程序用 pythonw 启动，没有控制台；子进程不加这个标志会各自弹出一个黑窗口
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def sh(*args, cwd=None, input=None, check=True, env=None):
    """跑命令，返回 stdout。"""
    p = subprocess.run(args, cwd=cwd, input=input, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=env, creationflags=NO_WINDOW)
    if check and p.returncode != 0:
        raise RuntimeError(f"{' '.join(map(str, args))} 失败：\n{p.stderr.strip() or p.stdout.strip()}")
    return p.stdout


def prompt(name, **kw):
    text = (PROMPTS / f"{name}.md").read_text(encoding="utf-8")
    for k, v in kw.items():
        text = text.replace("{{" + k + "}}", str(v))
    return text


# 任务：一个 issue（或一次 hunt）对应 data/tasks/<id>/，meta.json 记录状态
# status: working → ready（过审待提交）/ abandoned / rejected / failed → submitted

def task_dir(tid):
    return TASKS / tid


def load_meta(tid):
    return read_json(task_dir(tid) / "meta.json", {})


def save_meta(tid, meta):
    meta["updated_at"] = now()
    write_json(task_dir(tid) / "meta.json", meta)


def all_tasks():
    return [load_meta(d.name) for d in sorted(TASKS.glob("*")) if (d / "meta.json").exists()]


def slug(repo):
    return repo.replace("/", "__")


def pid_alive(pid):
    """Windows 上判断进程是否还在（os.kill(pid, 0) 在 Windows 上会直接杀掉进程，不能用）。"""
    import ctypes
    k32 = ctypes.windll.kernel32
    h = k32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return False
    code = ctypes.c_ulong()
    k32.GetExitCodeProcess(h, ctypes.byref(code))
    k32.CloseHandle(h)
    return code.value == 259  # STILL_ACTIVE
