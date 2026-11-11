import json
import os
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ANSWERS = DATA / "answers"
CANDIDATES = DATA / "candidates.json"
PROFILE = ROOT / "browser"

CONFIG = tomllib.loads((ROOT / "config.toml").read_text(encoding="utf-8"))

for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def read_json(path, default=None):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write_json(path, obj):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def answer_dir(qid):
    return ANSWERS / str(qid)


def load_meta(qid):
    return read_json(answer_dir(qid) / "meta.json", {})


def save_meta(qid, meta):
    write_json(answer_dir(qid) / "meta.json", meta)


class _Tee:
    def __init__(self, *streams):
        self.streams = [s for s in streams if s is not None]

    def write(self, s):
        for st in self.streams:
            st.write(s)
            st.flush()

    def flush(self):
        for st in self.streams:
            st.flush()


def log_to(path):
    """把 stdout/stderr 同时写入日志文件。pythonw 下没有控制台，只写文件。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    f = open(path, "a", encoding="utf-8")
    sys.stdout = _Tee(sys.stdout, f)
    sys.stderr = _Tee(sys.stderr, f)
