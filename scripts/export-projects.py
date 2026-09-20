"""Export selected sibling repositories' README files for the static site."""

import json
import re
import subprocess
from pathlib import Path
from urllib.parse import quote


def git_value(folder, *args):
    result = subprocess.run(['git', '-C', str(folder), *args], capture_output=True, text=True, encoding='utf-8')
    return result.stdout.strip() if result.returncode == 0 else ''


def export_projects(site):
    selected = json.loads((site / 'scripts/projects.json').read_text(encoding='utf-8'))
    projects = []
    for name in selected:
        if not re.fullmatch(r'[A-Za-z0-9_-]+', name):
            raise ValueError(f'Expected a sibling directory name: {name}')
        folder = site.parent / name
        readme = folder / 'README.md'
        # Read everything before writing, so a missing project leaves the previous export intact.
        markdown = readme.read_text(encoding='utf-8-sig')
        origin = git_value(folder, 'remote', 'get-url', 'origin')
        match = re.fullmatch(r'(?:https://github\.com/|git@github\.com:)([\w.-]+/[\w.-]+?)(?:\.git)?/?', origin)
        repository = 'https://github.com/' + match[1] if match else ''
        branch = git_value(folder, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD')
        branch = branch.removeprefix('origin/') or 'main'
        projects.append({
            'id': name, 'title': name, 'markdown': markdown, 'repository': repository,
            'linkBase': f'{repository}/blob/{quote(branch, safe="")}/' if repository else '',
            'assetBase': f'https://raw.githubusercontent.com/{match[1]}/{quote(branch, safe="")}/README.md' if match else '',
        })
    output = site / 'assets/projects/index.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'projects': projects}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return projects


if __name__ == '__main__':
    site = Path(__file__).resolve().parents[1]
    projects = export_projects(site)
    print('Exported README files: ' + ', '.join(p['title'] for p in projects))
