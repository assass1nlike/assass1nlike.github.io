"""Export my pull requests and issues in other people's repositories for the 开源社区 page."""

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def gh(*args):
    result = subprocess.run(['gh', *args], capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or 'gh failed')
    return result.stdout


def search(kind, author):
    fields = 'number,title,url,state,createdAt,repository'
    data = json.loads(gh('search', kind, '--author', author, '--limit', '100', '--json', fields))
    entries = []
    for item in data:
        repository = item['repository']['nameWithOwner']
        entries.append({
            'kind': 'pr' if kind == 'prs' else 'issue',
            'repository': repository,
            'number': item['number'],
            'title': ' '.join(item['title'].split()),
            'url': item['url'],
            'state': item['state'],
            'createdAt': item['createdAt'][:10],
        })
    return entries


def stars(repository, cache):
    if repository in cache:
        return cache[repository]
    try:
        count = int(gh('api', f'repos/{repository}', '--jq', '.stargazers_count').strip())
    except (RuntimeError, ValueError):
        count = 0
    cache[repository] = count
    return count


def export(site, author, own_repositories):
    output = site / 'assets/community/index.json'
    previous = {}
    if output.exists():
        previous = {item['name']: item['stars'] for item in
                    json.loads(output.read_text(encoding='utf-8')).get('repositories', [])
                    if 'name' in item and 'stars' in item}
    entries = search('prs', author) + search('issues', author)
    # Own repositories belong in 开源仓库, not in the contributions list.
    entries = [entry for entry in entries
               if entry['repository'].casefold() not in own_repositories
               and entry['repository'].split('/')[-1].casefold() not in own_repositories]
    grouped = {}
    for entry in entries:
        grouped.setdefault(entry['repository'], []).append(entry)
    repositories = []
    for name, items in grouped.items():
        items.sort(key=lambda item: item['createdAt'], reverse=True)
        repositories.append({'name': name, 'stars': stars(name, previous), 'entries': items})
    # Popular projects first; quiet repositories tie-break by how recently I worked in them.
    repositories.sort(key=lambda repo: (repo['stars'], repo['entries'][0]['createdAt']), reverse=True)
    data = {
        'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'author': author,
        'repositories': repositories,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--author', default='assass1nlike')
    parser.add_argument('--own', default='AnotherMe,best-osu-cheater,MarkdownBridge,Cybergym-Code,assassinlike.github.io',
                        help='Comma-separated repository names to leave out of the contributions list.')
    args = parser.parse_args()
    site = Path(__file__).resolve().parents[1]
    own = {name.strip().casefold() for name in args.own.split(',') if name.strip()}
    data = export(site, args.author, own)
    total = sum(len(repo['entries']) for repo in data['repositories'])
    print(f"Exported {total} pull requests and issues in {len(data['repositories'])} repositories.")
