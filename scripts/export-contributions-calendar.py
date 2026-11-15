"""Export my GitHub contribution calendar for the 开源社区 page.

The calendar is fetched once here and written as static JSON, so visitors never talk to the
GitHub API (and never need a token) just to see the grid.
"""

import argparse
import json
import subprocess
import re
from datetime import datetime, timezone
from pathlib import Path


QUERY = """
query($from: DateTime!, $to: DateTime!) {
  user(login: "%s") {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date contributionCount contributionLevel }
        }
      }
    }
  }
}
"""

# GitHub reports one of five buckets; the site maps them to its own palette.
LEVELS = {
    'NONE': 0,
    'FIRST_QUARTILE': 1,
    'SECOND_QUARTILE': 2,
    'THIRD_QUARTILE': 3,
    'FOURTH_QUARTILE': 4,
}


def gh(*args):
    result = subprocess.run(['gh', *args], capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or 'gh failed')
    return result.stdout


def fetch(author, start, end):
    query = QUERY % author
    output = gh('api', 'graphql', '-f', f'query={query}',
                '-f', f'from={start.strftime("%Y-%m-%dT%H:%M:%SZ")}',
                '-f', f'to={end.strftime("%Y-%m-%dT%H:%M:%SZ")}')
    payload = json.loads(output)
    if payload.get('errors'):
        raise RuntimeError(payload['errors'][0].get('message', 'GitHub GraphQL error'))
    calendar = payload['data']['user']['contributionsCollection']['contributionCalendar']
    weeks = []
    for week in calendar['weeks']:
        days = [{'date': day['date'],
                 'count': day['contributionCount'],
                 'level': LEVELS.get(day['contributionLevel'], 0)}
                for day in week['contributionDays']]
        if days:
            weeks.append(days)
    return calendar['totalContributions'], weeks


def streaks(days):
    """Longest run of days with at least one contribution, and the current run ending today."""
    best = current = 0
    for day in days:
        current = current + 1 if day['count'] > 0 else 0
        best = max(best, current)
    # The current streak counts back from the most recent day; a zero today breaks it.
    tail = 0
    for day in reversed(days):
        if day['count'] <= 0:
            break
        tail += 1
    return best, tail


def export(site, author, days):
    # GitHub aligns the calendar to Sunday columns, so the window snaps to whole weeks.
    today = datetime.now(timezone.utc).date()
    start = today.fromordinal(today.toordinal() - days + 1)
    end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc)
    total, weeks = fetch(author,
                         datetime(start.year, start.month, start.day, tzinfo=timezone.utc), end)
    flat = [day for week in weeks for day in week]
    best, current = streaks(flat)
    peak = max((day['count'] for day in flat), default=0)
    active = sum(1 for day in flat if day['count'] > 0)
    data = {
        'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'author': author,
        'total': total,
        'activeDays': active,
        'longestStreak': best,
        'currentStreak': current,
        'peakDay': peak,
        'weeks': weeks,
    }
    output = site / 'assets/community/contributions.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--author', default='assass1nlike')
    parser.add_argument('--days', type=int, default=371,
                        help='How many days back to cover; a whole number of weeks keeps the grid even.')
    args = parser.parse_args()
    site = Path(__file__).resolve().parents[1]
    data = export(site, args.author, args.days)
    print(f"Exported {data['total']} contributions over {len(data['weeks'])} weeks "
          f"({data['activeDays']} active days, longest streak {data['longestStreak']}).")
