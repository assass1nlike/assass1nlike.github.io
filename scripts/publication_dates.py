"""Stable website publication dates, using Shanghai calendar dates."""

import re
import subprocess
from datetime import date, datetime, timedelta, timezone


SHANGHAI = timezone(timedelta(hours=8))


def today():
    return datetime.now(SHANGHAI).date().isoformat()


def validate_date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError(f'Publication date must be YYYY-MM-DD: {value!r}')
    return date.fromisoformat(value).isoformat()


def git_text(site, *args):
    result = subprocess.run(['git', '-C', str(site), *args], capture_output=True, encoding='utf-8')
    return result.stdout.strip() if result.returncode == 0 else ''


def first_file_date(site, path):
    history = git_text(site, 'log', '--follow', '--format=%cI', '--', path).splitlines()
    return datetime.fromisoformat(history[-1]).astimezone(SHANGHAI).date().isoformat() if history else ''


def publication_date(*candidates):
    return validate_date(next((value for value in candidates if value), today()))
