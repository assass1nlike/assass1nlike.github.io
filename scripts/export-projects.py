"""Export my repositories' README files from GitHub for the 开源社区 page."""

import argparse
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import quote


OWNER = 'assass1nlike'


def git_value(folder, *args):
    result = subprocess.run(['git', '-C', str(folder), *args], capture_output=True, text=True, encoding='utf-8')
    return result.stdout.strip() if result.returncode == 0 else ''


def gh_api(path, *extra):
    result = subprocess.run(['gh', 'api', path, *extra], capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f'gh api {path} failed')
    return result.stdout


def github_project(name):
    """Read the README and metadata from GitHub, so the page follows the repository, not a stale clone."""
    metadata = json.loads(gh_api(f'repos/{OWNER}/{name}',
                                 '--jq', '{description: .description, stars: .stargazerCount, '
                                         'branch: .defaultBranchRef.name, url: .html_url}'))
    branch = quote(metadata['branch'] or 'main', safe='')
    markdown = gh_api(f'repos/{OWNER}/{name}/readme', '-H', 'Accept: application/vnd.github.raw')
    return {
        'markdown': markdown,
        'description': metadata['description'] or '',
        'stars': metadata['stars'] or 0,
        'repository': f'https://github.com/{OWNER}/{name}',
        'linkBase': f'https://github.com/{OWNER}/{name}/blob/{branch}/',
        'assetBase': f'https://raw.githubusercontent.com/{OWNER}/{name}/{branch}/README.md',
    }


def local_project(folder, name):
    """Fallback for a clone that is not on GitHub yet, or when the API is unreachable."""
    markdown = (folder / 'README.md').read_text(encoding='utf-8-sig')
    origin = git_value(folder, 'remote', 'get-url', 'origin')
    match = re.fullmatch(r'(?:https://github\.com/|git@github\.com:)([\w.-]+/[\w.-]+?)(?:\.git)?/?', origin)
    repository = 'https://github.com/' + match[1] if match else ''
    branch = git_value(folder, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').removeprefix('origin/') or 'main'
    return {
        'markdown': markdown,
        'description': '',
        'stars': 0,
        'repository': repository,
        'linkBase': f'{repository}/blob/{quote(branch, safe="")}/' if repository else '',
        'assetBase': f'https://raw.githubusercontent.com/{match[1]}/{quote(branch, safe="")}/README.md' if match else '',
    }


def export_projects(site, offline=False):
    selected = json.loads((site / 'scripts/projects.json').read_text(encoding='utf-8'))
    projects = []
    for name in selected:
        if not re.fullmatch(r'[A-Za-z0-9_-]+', name):
            raise ValueError(f'Expected a repository name: {name}')
        project = None
        if not offline:
            try:
                project = github_project(name)
            except (RuntimeError, ValueError, KeyError, json.JSONDecodeError):
                project = None
        if project is None:
            folder = site.parent / name
            # Read everything before writing, so a missing project leaves the previous export intact.
            project = local_project(folder, name)
        projects.append({'id': name, 'title': name, **project})
    output = site / 'assets/projects/index.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'projects': projects}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return projects


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true', help='Read the local sibling clones instead of GitHub.')
    args = parser.parse_args()
    site = Path(__file__).resolve().parents[1]
    projects = export_projects(site, offline=args.offline)
    print('Exported README files: ' + ', '.join(p['title'] for p in projects))
