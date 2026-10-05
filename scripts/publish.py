"""Update public content, commit its files, and push main to origin."""

import argparse
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
SKIP_NAMES = {'tmp', '__pycache__', 'node_modules'}
SKIP_FILES = {'AGENTS.MD', 'CLAUDE.MD', 'README.MD'}


def run(root, *args, capture=False, input=None):
    return subprocess.run(args, cwd=root, check=True, text=True, encoding='utf-8',
                          stdout=subprocess.PIPE if capture else None, input=input).stdout


def publication_paths(root, only):
    scopes = []
    if only in ('all', 'articles'):
        config = json.loads((root / 'scripts/articles.json').read_text(encoding='utf-8-sig'))
        scopes += [s['path'] for c in config['categories'].values() for s in c['sources']]
        scopes += ['scripts/articles.json', 'assets/articles/catalog.js']
    if only in ('all', 'papers'):
        scopes += ['assets/papers', 'scripts/paper-links.json', 'scripts/paper-identities.json',
                   'scripts/paper-publications.json', 'scripts/paper-publications-cache.json',
                   'scripts/paper-publications-report.json']
    for scope in scopes:
        if not (root / scope).resolve().is_relative_to(root.resolve()):
            raise ValueError(f'Publication path is outside the repository: {scope}')
    listed = run(root, 'git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z',
                 '--', *[':(literal)' + s for s in scopes], capture=True)
    paths = []
    for name in sorted(set(listed.split('\0')) - {''}):
        path = root / name
        parts = Path(name).parts
        if (any(p.startswith('.') or p in SKIP_NAMES for p in parts)
                or path.name.upper() in SKIP_FILES
                or any(p.is_symlink() or getattr(p, 'is_junction', lambda: False)()
                       for p in [path, *path.parents] if p != root and p.is_relative_to(root))):
            continue
        paths.append(name)
    if not paths:
        return []
    ignored = subprocess.run(['git', 'check-ignore', '--no-index', '-z', '--stdin'],
                             cwd=root, input='\0'.join(paths) + '\0',
                             capture_output=True, text=True, encoding='utf-8')
    if ignored.returncode not in (0, 1):
        raise RuntimeError(ignored.stderr.strip())
    return sorted(set(paths) - set(ignored.stdout.split('\0')))


def publish(root=ROOT, *, only='all', source=Path(r'D:\papers'), message='Update published content'):
    if run(root, 'git', 'branch', '--show-current', capture=True).strip() != 'main':
        raise RuntimeError('Run publication from the main branch.')
    if run(root, 'git', 'diff', '--cached', '--name-only', capture=True).strip():
        raise RuntimeError('The staging area already contains changes. Commit or unstage them before publishing.')
    if only in ('all', 'articles'):
        run(root, sys.executable, '-B', 'scripts/export-articles.py')
    if only in ('all', 'papers'):
        run(root, sys.executable, '-B', 'scripts/export-paper-tree.py', '--source', str(source))
        run(root, sys.executable, '-B', 'scripts/update-paper-publications.py', '--deep', '--source', str(source))
    paths = publication_paths(root, only)
    if paths:
        run(root, 'git', '--literal-pathspecs', 'add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul',
            input='\0'.join(paths) + '\0')
    if run(root, 'git', 'diff', '--cached', '--name-only', capture=True).strip():
        run(root, 'git', 'commit', '-m', message)
    else:
        print('No new content changes; pushing any existing local commits.', flush=True)
    run(root, 'git', 'push', 'origin', 'main')
    print('Published to origin/main.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', choices=['articles', 'papers'], default='all')
    parser.add_argument('--source', type=Path, default=Path(r'D:\papers'))
    parser.add_argument('-m', '--message', default='Update published content')
    args = parser.parse_args()
    try:
        publish(only=args.only, source=args.source, message=args.message)
    except (subprocess.CalledProcessError, RuntimeError, ValueError, OSError) as error:
        parser.exit(1, f'Publication stopped: {error}\n')
