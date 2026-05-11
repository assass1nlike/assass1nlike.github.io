#!/usr/bin/env python3
"""
Find poetic difficulty names from ranked + loved beatmaps in a date range.
=========================================================================

Workflow
--------
1. Use osu! API v2 to search ranked + loved beatmapsets, filtered by
   ranked-date range. Walk the cursor-based pagination until the date range
   is covered, then collect (beatmapset_id, difficulty_name, creator, mode).
2. Heuristically classify each difficulty name into:
     - "standard"   -> known difficulty words (Easy/Normal/Hard/Insane/...)
     - "gd"         -> guest difficulties whose tail is a standard word
     - "mania_keys" -> stuff like "[4K] Hard"
     - "trivial"    -> too short / numeric / single-word non-poetic
     - "poetic"     -> what we actually want
3. Score each "poetic" candidate and emit a CSV sorted best-first.

Run
---
    python find_poetic_diffs.py \
        --config config.json \
        --from 2024-01-01 --to 2024-12-31 \
        --modes 0,1,2,3 \
        --out poetic_diffs.csv

Reuses the same config.json from osu_top_downloader.py
(only needs client_id / client_secret fields).
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# --------------------------------------------------------------------------- #
# Difficulty-name classification                                              #
# --------------------------------------------------------------------------- #

# Words that, on their own or with a "+" / "++" suffix, mean "standard difficulty".
# Lowercased for matching.
STANDARD_WORDS = {
    # core ladder
    "easy", "normal", "hard", "insane", "expert", "extra", "extreme",
    "another", "lunatic", "hyper", "beginner", "advanced",
    # common modifiers and tier names
    "light", "heavy", "challenge", "extra+", "extra++",
    "expert+", "expert++", "insane+", "insane++", "hard+", "hard++",
    "normal+", "normal++", "easy+", "easy++", "another+", "another++",
    "lunatic+", "lunatic++", "edge", "ultra", "supreme",
    # mania-flavored
    "shd", "shdx", "fc", "nm", "hd", "in", "mx", "spn", "scs", "sc",
    # ctb
    "salad", "platter", "rain", "overdose", "deluge", "cup",
    # taiko
    "kantan", "futsuu", "muzukashii", "oni", "inner", "ura",
    # generic catchalls
    "tutorial", "practice", "intro", "outro", "finale",
}

# Token shapes we strip / detect.
MANIA_KEY_PREFIX = re.compile(r"^\s*\[?\s*(\d{1,2})\s*[kK]\s*\]?\s*", re.UNICODE)
# Capture potential GD signature: "Name's Hard", "Name - Insane", "Name | Extra"
GD_APOSTROPHE = re.compile(r"^\s*([\w][\w\s.&]{0,40}?)['’]s\s+", re.UNICODE)
GD_DASH       = re.compile(r"^\s*([\w][\w\s.&]{0,40}?)\s+[-–—|]\s+",  re.UNICODE)
# Stuff in parentheses or brackets at the END of the name (e.g. "(NSV)", "[Marathon]")
TAIL_BRACKETED = re.compile(r"\s*[\(\[][^\(\)\[\]]{1,30}[\)\]]\s*$", re.UNICODE)

# Words that bias toward "poetic" without forcing it.
# Kept small on purpose; bigger lists usually overfit.
POETIC_HINT_WORDS = {
    "the", "of", "and", "in", "into", "through", "beyond", "above", "below",
    "before", "after", "till", "until", "within", "without",
    "eternal", "infinite", "forgotten", "silent", "silence", "shadow",
    "echoes", "echo", "whispers", "dream", "dreams", "dreaming",
    "memory", "memories", "void", "abyss", "horizon", "twilight",
    "dawn", "dusk", "crescendo", "epilogue", "prologue", "requiem",
    "elegy", "rhapsody", "symphony", "lullaby", "serenade",
    "primordial", "vesperal", "singularity", "nucleosynthesis",
    "ascension", "descent", "oblivion", "reverie",
}

# Difficulty-name "leaf" words that are standard even if multi-word
# (e.g. "Nervous Breakdown" after stripping GD prefix isn't really poetic —
# it's a niche but recurring difficulty name. Treat conservatively).
# Empty by default; user can add more if they keep seeing the same false positives.
DENYLIST_PHRASES = {
    # "another world", "final boss",  # examples; off by default
}


@dataclass
class Classification:
    raw: str
    cleaned: str             # name after stripping GD prefix, key prefix, tail brackets
    gd_owner: Optional[str]  # Whoever's GD it is, if detected
    category: str            # "standard" | "gd_standard" | "mania_keys" | "trivial" | "poetic"
    score: float             # higher = more poetic-looking
    reasons: list[str] = field(default_factory=list)


def _is_standard_word(token: str) -> bool:
    t = token.strip().lower()
    return t in STANDARD_WORDS


def classify(raw: str) -> Classification:
    """
    Heuristic classifier. Returns a Classification with category + score.
    The score is mostly meaningful for the "poetic" category, where it's used
    for ranking output rows; for other categories it's left at 0.
    """
    name = raw.strip()
    reasons: list[str] = []

    if not name:
        return Classification(raw, "", None, "trivial", 0.0, ["empty"])

    # 1) Strip mania-style "[4K]" / "7K " prefix.
    key_match = MANIA_KEY_PREFIX.match(name)
    after_keys = name[key_match.end():] if key_match else name

    # 2) Detect & strip GD signature.
    gd_owner: Optional[str] = None
    body = after_keys
    m = GD_APOSTROPHE.match(body)
    if m:
        gd_owner = m.group(1).strip()
        body = body[m.end():]
        reasons.append(f"gd_apostrophe:{gd_owner!r}")
    else:
        m = GD_DASH.match(body)
        if m:
            # Be careful: legit poetic names can contain " - ". Only treat it
            # as GD if the part before the dash looks like a name (<=3 words,
            # title-case-ish, no obvious non-name words).
            head = m.group(1).strip()
            head_words = head.split()
            head_is_namelike = (
                1 <= len(head_words) <= 3
                and all(w[:1].isalpha() for w in head_words)
                and not any(w.lower() in POETIC_HINT_WORDS for w in head_words)
            )
            if head_is_namelike:
                gd_owner = head
                body = body[m.end():]
                reasons.append(f"gd_dash:{gd_owner!r}")

    # 3) Strip tail bracket notes like "(NSV)", "[Marathon]".
    body = TAIL_BRACKETED.sub("", body).strip()

    cleaned = body
    if not cleaned:
        # GD prefix ate everything; the original was just "Wispy's"
        return Classification(raw, cleaned, gd_owner, "trivial", 0.0,
                              reasons + ["empty_after_strip"])

    # 4) Mania key tag was the only modifier? Whatever's left is the real name.
    if key_match and gd_owner is None:
        reasons.append(f"mania_keys:{key_match.group(0).strip()!r}")

    lower = cleaned.lower()
    tokens = re.split(r"\s+", cleaned)
    word_tokens = [t for t in tokens if t]

    # 5) Single token: definitely not poetic. Either standard or trivial.
    if len(word_tokens) <= 1:
        if _is_standard_word(cleaned):
            return Classification(
                raw, cleaned, gd_owner,
                "gd_standard" if gd_owner else "standard",
                0.0, reasons + ["single_standard_word"],
            )
        # Single non-standard word like "Insanity" or "Madness".
        # Border case — call it trivial. User can manually salvage if needed.
        return Classification(raw, cleaned, gd_owner, "trivial", 0.0,
                              reasons + ["single_word_nonstandard"])

    # 6) Contains digits or heavy punctuation → almost certainly not poetic.
    #    Allow apostrophes, commas, and a single hyphen in the middle.
    if re.search(r"\d", cleaned):
        return Classification(raw, cleaned, gd_owner, "trivial", 0.0,
                              reasons + ["contains_digit"])
    bad_punct = re.findall(r"[!?@#$%^&*=/\\\[\]{}<>+]", cleaned)
    if bad_punct:
        return Classification(raw, cleaned, gd_owner, "trivial", 0.0,
                              reasons + [f"bad_punct:{''.join(bad_punct)}"])

    # 7) Denylist of known-non-poetic multi-word phrases.
    if lower in DENYLIST_PHRASES:
        return Classification(raw, cleaned, gd_owner, "trivial", 0.0,
                              reasons + ["denylist"])

    # 8) All tokens are standard words ("Light Insane", "Another Extra"...) → standard.
    if all(_is_standard_word(t.rstrip("+")) for t in word_tokens):
        return Classification(
            raw, cleaned, gd_owner,
            "gd_standard" if gd_owner else "standard",
            0.0, reasons + ["all_tokens_standard"],
        )

    # 9) Scoring as poetic candidate.
    score = 0.0

    # length bonus
    score += min(len(word_tokens) - 1, 6) * 1.0     # 2 words: +1, 3: +2, ..., capped
    score += min(len(cleaned), 60) / 30.0           # mild length bonus

    # title case bonus (heuristic: most content words start uppercase)
    content_words = [t for t in word_tokens if len(t) >= 3]
    if content_words:
        titled = sum(1 for t in content_words if t[:1].isupper())
        ratio = titled / len(content_words)
        score += ratio * 2.0
        if ratio >= 0.8:
            reasons.append("title_case")

    # poetic vocabulary hits
    hits = sum(1 for t in word_tokens if t.lower() in POETIC_HINT_WORDS)
    if hits:
        score += hits * 1.5
        reasons.append(f"poetic_words:{hits}")

    # penalize having a standard word inside (e.g. "Hard Times" — leaning toward
    # standard nomenclature even if technically multi-word)
    std_inside = sum(1 for t in word_tokens if _is_standard_word(t.rstrip("+")))
    if std_inside:
        score -= std_inside * 1.0
        reasons.append(f"std_inside:{std_inside}")

    # Min length gate: under 8 chars, almost never poetic ("Big Up" etc.)
    if len(cleaned) < 8:
        return Classification(raw, cleaned, gd_owner, "trivial", score,
                              reasons + ["too_short"])

    # Final call: positive score AND ≥2 content words counts as poetic.
    if score > 1.0 and len(content_words) >= 2:
        return Classification(raw, cleaned, gd_owner, "poetic", score, reasons)
    return Classification(raw, cleaned, gd_owner, "trivial", score,
                          reasons + ["low_score"])


# --------------------------------------------------------------------------- #
# osu! API v2 client (minimal, reused style from earlier scripts)             #
# --------------------------------------------------------------------------- #


def _make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=5, backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    s.headers["User-Agent"] = "osu-poetic-diff-finder/1.0"
    return s


class OAuth:
    URL = "https://osu.ppy.sh/oauth/token"

    def __init__(self, cid: str, secret: str, sess: requests.Session, logger):
        self.cid = cid
        self.secret = secret
        self.sess = sess
        self.logger = logger
        self._tok: Optional[str] = None
        self._exp = 0.0
        self._lock = threading.Lock()

    def token(self) -> str:
        with self._lock:
            if self._tok and time.time() < self._exp - 60:
                return self._tok
            self._refresh()
            return self._tok  # type: ignore

    def _refresh(self) -> None:
        self.logger.info("fetching access token")
        r = self.sess.post(self.URL, data={
            "client_id": self.cid, "client_secret": self.secret,
            "grant_type": "client_credentials", "scope": "public",
        }, timeout=30)
        r.raise_for_status()
        data = r.json()
        self._tok = data["access_token"]
        self._exp = time.time() + int(data.get("expires_in", 86400))


def iter_beatmapsets(sess: requests.Session, oauth: OAuth, *,
                     status: str, mode: int,
                     date_from: str, date_to: str,
                     logger) -> Iterator[dict]:
    """
    Yield beatmapset dicts in the (ranked-date) range [date_from, date_to].

    The osu! API search endpoint supports a 'q' filter with
    `ranked>=YYYY-MM-DD ranked<=YYYY-MM-DD` and a `cursor_string` for paging.
    We sort by ranked_asc so we can stop reliably when cursor returns None
    or when we exhaust the date window.
    """
    cursor: Optional[str] = None
    page = 0
    while True:
        page += 1
        params: dict[str, Any] = {
            "m": mode,
            "s": status,                          # "ranked" or "loved"
            "sort": "ranked_asc",
            "q": f"ranked>={date_from} ranked<={date_to}",
        }
        if cursor:
            params["cursor_string"] = cursor

        try:
            r = sess.get("https://osu.ppy.sh/api/v2/beatmapsets/search",
                         params=params,
                         headers={"Authorization": f"Bearer {oauth.token()}"},
                         timeout=60)
        except requests.RequestException as e:
            logger.warning("page %d request error: %s — retry in 10s", page, e)
            time.sleep(10)
            continue

        if r.status_code == 401:
            oauth._refresh()  # noqa
            continue
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", "30"))
            logger.warning("rate limited, sleeping %ds", wait)
            time.sleep(wait)
            continue
        if r.status_code != 200:
            logger.error("page %d HTTP %d: %s", page, r.status_code, r.text[:200])
            time.sleep(5)
            continue

        data = r.json()
        sets = data.get("beatmapsets", [])
        if not sets:
            return

        for s in sets:
            yield s

        cursor = data.get("cursor_string")
        logger.info("status=%s mode=%d page=%d -> %d sets, cursor=%s",
                    status, mode, page, len(sets), bool(cursor))

        if not cursor:
            return
        time.sleep(0.6)


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #


def setup_logging(log_path: Path) -> logging.Logger:
    logger = logging.getLogger("poetic_diff")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s",
                            datefmt="%Y-%m-%d %H:%M:%S")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    return logger


def main():
    p = argparse.ArgumentParser(
        description="Find poetic difficulty names in ranked/loved beatmaps."
    )
    p.add_argument("--config", default="config.json",
                   help="path to config.json with client_id / client_secret")
    p.add_argument("--from", dest="date_from", required=True,
                   help="ranked-date lower bound, YYYY-MM-DD")
    p.add_argument("--to", dest="date_to", required=True,
                   help="ranked-date upper bound, YYYY-MM-DD")
    p.add_argument("--statuses", default="ranked,loved",
                   help="comma-separated, any of: ranked,loved (default both)")
    p.add_argument("--modes", default="0,1,2,3",
                   help="comma-separated game modes 0..3 (default all)")
    p.add_argument("--out", default="poetic_diffs.csv",
                   help="output CSV path")
    p.add_argument("--out-all", default=None,
                   help="optional: also write a CSV of EVERY classified diff "
                        "(for inspection / tuning heuristics)")
    p.add_argument("--cache", default="diffs_cache.json",
                   help="cache of raw API results so reruns don't re-query")
    p.add_argument("--min-score", type=float, default=2.0,
                   help="poetic-score threshold for the main output (default 2.0)")
    p.add_argument("--no-fetch", action="store_true",
                   help="skip API fetching; only re-classify from cache")
    args = p.parse_args()

    cfg_path = Path(args.config).expanduser().resolve()
    if not cfg_path.exists():
        print(f"config not found: {cfg_path}", file=sys.stderr)
        sys.exit(1)
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    out_path  = Path(args.out).expanduser().resolve()
    cache_path = Path(args.cache).expanduser().resolve()
    log_path  = out_path.with_suffix(".log")
    logger = setup_logging(log_path)

    statuses = [s.strip() for s in args.statuses.split(",") if s.strip()]
    modes    = [int(m) for m in args.modes.split(",") if m.strip()]
    logger.info("range=[%s, %s] statuses=%s modes=%s",
                args.date_from, args.date_to, statuses, modes)

    # ---- 1. Gather raw diff records (cache to disk so we don't re-query). ----
    records: list[dict] = []

    if cache_path.exists() and not args.no_fetch:
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached = json.load(f)
            if (cached.get("date_from") == args.date_from
                    and cached.get("date_to") == args.date_to
                    and set(cached.get("statuses", [])) == set(statuses)
                    and set(cached.get("modes", [])) == set(modes)):
                records = cached["records"]
                logger.info("loaded %d records from cache %s", len(records), cache_path)
            else:
                logger.info("cache parameters differ; re-fetching")
        except Exception as e:
            logger.warning("could not load cache: %s", e)

    if not records and args.no_fetch:
        logger.error("--no-fetch was set but no usable cache exists")
        sys.exit(2)

    if not records:
        sess = _make_session()
        oauth = OAuth(cfg["client_id"], cfg["client_secret"], sess, logger)

        seen_set_ids = set()
        for status in statuses:
            for mode in modes:
                logger.info("=== fetching status=%s mode=%d ===", status, mode)
                for bs in iter_beatmapsets(sess, oauth,
                                           status=status, mode=mode,
                                           date_from=args.date_from,
                                           date_to=args.date_to,
                                           logger=logger):
                    # The search endpoint returns the same beatmapset once per
                    # matching mode; dedup so we don't double-process.
                    sid = bs.get("id")
                    if sid in seen_set_ids:
                        continue
                    seen_set_ids.add(sid)

                    creator = bs.get("creator", "")
                    title   = bs.get("title", "")
                    artist  = bs.get("artist", "")
                    ranked  = bs.get("ranked_date") or ""
                    for diff in bs.get("beatmaps", []):
                        records.append({
                            "set_id":   sid,
                            "diff_id":  diff.get("id"),
                            "version":  diff.get("version", ""),
                            "mode":     diff.get("mode"),
                            "mode_int": diff.get("mode_int"),
                            "stars":    diff.get("difficulty_rating"),
                            "creator":  creator,
                            "artist":   artist,
                            "title":    title,
                            "status":   bs.get("status"),
                            "ranked_date": ranked,
                        })

        # Save cache
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump({
                "date_from": args.date_from,
                "date_to":   args.date_to,
                "statuses":  statuses,
                "modes":     modes,
                "records":   records,
            }, f, ensure_ascii=False, indent=2)
        logger.info("cached %d records to %s", len(records), cache_path)

    # ---- 2. Classify ----
    classified: list[tuple[Classification, dict]] = []
    cat_counts: dict[str, int] = {}
    for rec in records:
        c = classify(rec["version"])
        classified.append((c, rec))
        cat_counts[c.category] = cat_counts.get(c.category, 0) + 1

    logger.info("classification summary: %s", cat_counts)

    # ---- 3. Emit "poetic" CSV ----
    poetic = [(c, r) for c, r in classified if c.category == "poetic"
              and c.score >= args.min_score]
    poetic.sort(key=lambda x: x[0].score, reverse=True)
    logger.info("writing %d poetic candidates to %s", len(poetic), out_path)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow([
            "score", "version", "cleaned", "gd_owner",
            "mode", "stars", "artist", "title", "creator",
            "set_id", "diff_id", "ranked_date", "url",
        ])
        for c, r in poetic:
            url = f"https://osu.ppy.sh/beatmapsets/{r['set_id']}#osu/{r['diff_id']}"
            w.writerow([
                f"{c.score:.2f}", r["version"], c.cleaned, c.gd_owner or "",
                r.get("mode") or r.get("mode_int") or "",
                r.get("stars") or "",
                r["artist"], r["title"], r["creator"],
                r["set_id"], r["diff_id"], r["ranked_date"], url,
            ])

    if args.out_all:
        all_path = Path(args.out_all).expanduser().resolve()
        logger.info("writing full classification audit to %s", all_path)
        with open(all_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["category", "score", "version", "cleaned", "gd_owner",
                        "reasons", "set_id", "diff_id"])
            for c, r in classified:
                w.writerow([
                    c.category, f"{c.score:.2f}", r["version"], c.cleaned,
                    c.gd_owner or "", " | ".join(c.reasons),
                    r["set_id"], r["diff_id"],
                ])

    logger.info("done.")


if __name__ == "__main__":
    main()
