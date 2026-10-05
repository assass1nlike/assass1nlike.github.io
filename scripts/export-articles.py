"""Build all three public article lists; never stage, commit, or push files."""

import json
import os
import re
import subprocess
from pathlib import Path

from publication_dates import first_file_date, publication_date


SKIP_NAMES = {'tmp', '__pycache__', 'node_modules'}
SKIP_FILES = {'AGENTS.MD', 'CLAUDE.MD', 'README.MD'}


def is_link(path):
    return path.is_symlink() or getattr(path, 'is_junction', lambda: False)()


def markdown_files(source, site):
    # Do not follow links, including a link anywhere in the configured root.
    if not source.is_relative_to(site) or any(
        is_link(part) for part in [source, *source.parents] if part.is_relative_to(site)
    ):
        raise ValueError(f'Publication source must be a real path inside the repository: {source}')
    if source.is_file():
        return [source]
    if not source.is_dir():
        raise FileNotFoundError(f'Publication directory is missing: {source}')
    files = []
    for folder, dirs, names in os.walk(source):
        dirs[:] = [name for name in dirs if not name.startswith('.')
                   and name not in SKIP_NAMES and not is_link(Path(folder) / name)]
        files.extend(Path(folder) / name for name in names
                     if not name.startswith('.') and name.upper() not in SKIP_FILES
                     and Path(name).suffix.lower() == '.md' and not is_link(Path(folder) / name))
    return sorted(files, key=lambda path: path.relative_to(source).as_posix())


def first_heading(markdown):
    """Find the first ATX H1 outside YAML front matter and fenced code."""
    lines = markdown.splitlines()
    if lines and lines[0].strip() == '---':
        end = next((i for i in range(1, len(lines)) if lines[i].strip() in {'---', '...'}), None)
        if end is not None:
            lines = lines[end + 1:]
    fence = None
    for line in lines:
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', line)
        if fence:
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence) and not marker[2].strip():
                fence = None
            continue
        if marker:
            fence = marker[1]
            continue
        heading = re.match(r'^ {0,3}#\s+(.+?)\s*$', line)
        if heading:
            return re.sub(r'\s+#+\s*$', '', heading[1]).strip()
    return None


def ignored_paths(site, paths):
    if not (site / '.git').exists() or not paths:
        return set()
    result = subprocess.run(
        ['git', '-C', str(site), 'check-ignore', '--no-index', '-z', '--stdin'],
        input='\0'.join(paths) + '\0', capture_output=True, encoding='utf-8',
    )
    if result.returncode not in (0, 1):
        raise RuntimeError(result.stderr.strip())
    return set(result.stdout.split('\0'))


def export_articles(site):
    site = site.resolve()
    config = json.loads((site / 'scripts/articles.json').read_text(encoding='utf-8-sig'))
    output = site / 'assets/articles/catalog.js'
    previous = {}
    if output.exists():
        content = output.read_text(encoding='utf-8').removeprefix('window.ArticleCatalog = ').removesuffix(';\n')
        previous = {doc['path']: doc for doc in json.loads(content)}
    candidates = []
    for category, settings in config['categories'].items():
        for source_settings in settings['sources']:
            source = site / source_settings['path']
            paths = markdown_files(source, site)
            candidates.extend((category, source_settings, source, path) for path in paths)
    ignored = ignored_paths(site, [path.relative_to(site).as_posix() for *_, path in candidates])
    documents = []
    seen = set()
    public_ids = set()
    for category, settings, source, path in candidates:
        relative = path.relative_to(site).as_posix()
        if relative in ignored:
            continue
        if relative in seen:
            raise ValueError(f'Article registered more than once: {relative}')
        seen.add(relative)
        title = first_heading(path.read_text(encoding='utf-8-sig')) or path.stem
        doc = dict(path=relative, title=title, category=category, aliases=[], hidePath=True)
        if settings.get('publicIds'):
            doc['publicId'] = path.relative_to(source).with_suffix('').as_posix()
        if settings.get('collection'):
            doc['collection'] = settings['collection']
        doc.update(config.get('overrides', {}).get(relative, {}))
        saved_date = previous.get(relative, {}).get('publishedAt')
        doc['publishedAt'] = publication_date(
            doc.get('publishedAt'), saved_date,
            first_file_date(site, relative) if not doc.get('publishedAt') and not saved_date else '',
        )
        if doc.get('publicId'):
            public_id = doc['publicId'].casefold()
            if public_id in public_ids:
                raise ValueError(f'Duplicate public article ID: {doc["publicId"]}')
            public_ids.add(public_id)
        documents.append(doc)

    ordered = []
    for category in config['categories']:
        ordered.extend(sorted(
            (doc for doc in documents if doc['category'] == category),
            key=lambda doc: doc['publishedAt'], reverse=True,
        ))

    output.parent.mkdir(parents=True, exist_ok=True)
    content = 'window.ArticleCatalog = ' + json.dumps(ordered, ensure_ascii=False, indent=2) + ';\n'
    output.write_text(content, encoding='utf-8', newline='\n')
    return ordered


if __name__ == '__main__':
    articles = export_articles(Path(__file__).resolve().parents[1])
    for category, label in [('invisible', 'Learning'), ('minors', 'Blog'), ('tech', 'Other')]:
        print(f'{label}: {sum(doc["category"] == category for doc in articles)} articles')
    print('Updated assets/articles/catalog.js (local only; nothing committed or pushed).')
