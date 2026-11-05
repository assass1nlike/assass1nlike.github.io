import json
import os
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
