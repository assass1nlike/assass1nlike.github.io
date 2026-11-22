"""Build the public article lists and copy the listed articles out of the private content folder.

`everlasting/` is a separate private repository that the site repository ignores. Articles keep
their `everlasting/...` paths as their identity (links, view counts and annotations use them), but
the site serves copies from `assets/articles/`, together with the images they reference. This
script never stages, commits, or pushes files.
"""

import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote

from publication_dates import first_file_date, publication_date


SKIP_NAMES = {'tmp', '__pycache__', 'node_modules'}
SKIP_FILES = {'AGENTS.MD', 'CLAUDE.MD', 'README.MD'}
CONTENT = 'everlasting'
PUBLISHED = 'assets/articles'
CATALOG = 'catalog.js'
IMAGE_REF = re.compile(
    r'!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img\b[^>]*?\bsrc\s*=\s*["\']([^"\']+)["\']', re.I)


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


def ignored_paths(content, paths):
    """Paths the content repository ignores, given relative to the site root."""
    if not (content / '.git').exists() or not paths:
        return set()
    local = {Path(path).relative_to(CONTENT).as_posix(): path for path in paths}
    result = subprocess.run(
        ['git', '-C', str(content), 'check-ignore', '--no-index', '-z', '--stdin'],
        input='\0'.join(local) + '\0', capture_output=True, encoding='utf-8',
    )
    if result.returncode not in (0, 1):
        raise RuntimeError(result.stderr.strip())
    return {local[path] for path in result.stdout.split('\0') if path}


def published_path(site, relative):
    """`everlasting/invisible/x.md` is served from `assets/articles/invisible/x.md`."""
    return site / PUBLISHED / Path(relative).relative_to(CONTENT)


def referenced_images(markdown, path, content):
    """Local files an article shows as images, kept only if they sit inside the content folder."""
    found = set()
    for match in IMAGE_REF.finditer(markdown):
        ref = (match.group(1) or match.group(2)).strip()
        if not ref or ref.startswith(('/', '#', 'data:', 'blob:')) or re.match(r'^[a-z][a-z0-9+.-]*:', ref, re.I):
            continue
        target = (path.parent / unquote(ref.split('#')[0].split('?')[0])).resolve()
        if target.is_file() and not is_link(target) and target.is_relative_to(content.resolve()):
            found.add(target)
    return found


def publish_copies(site, content, documents):
    """Mirror the listed articles and their images into assets/articles, dropping stale copies."""
    root = site / PUBLISHED
    wanted = {}
    for doc in documents:
        source = site / doc['path']
        wanted[published_path(site, doc['path'])] = source
        for image in referenced_images(source.read_text(encoding='utf-8-sig'), source, content):
            wanted[root / image.relative_to(content.resolve())] = image
    if root.exists():
        for folder, dirs, names in os.walk(root, topdown=False):
            for name in names:
                path = Path(folder) / name
                if path not in wanted and path != root / CATALOG:
                    path.unlink()
            if Path(folder) != root and not any(Path(folder).iterdir()):
                Path(folder).rmdir()
    for target, source in wanted.items():
        if target.exists() and target.read_bytes() == source.read_bytes():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)


def export_articles(site):
    site = site.resolve()
    content = site / CONTENT
    config = json.loads((site / 'scripts/articles.json').read_text(encoding='utf-8-sig'))
    output = site / PUBLISHED / CATALOG
    previous = {}
    if output.exists():
        text = output.read_text(encoding='utf-8').removeprefix('window.ArticleCatalog = ').removesuffix(';\n')
        previous = {doc['path']: doc for doc in json.loads(text)}
    candidates = []
    for category, settings in config['categories'].items():
        for source_settings in settings['sources']:
            source = site / source_settings['path']
            if not source.resolve().is_relative_to(content.resolve()):
                raise ValueError(f'Publication sources must live in {CONTENT}/: {source_settings["path"]}')
            paths = markdown_files(source, site)
            if 'files' in source_settings:
                # Only the listed files in this folder are public; anything else there stays private.
                listed = set(source_settings['files'])
                paths = [path for path in paths if path.relative_to(source).as_posix() in listed]
                missing = listed - {path.relative_to(source).as_posix() for path in paths}
                if missing:
                    raise FileNotFoundError(f'Listed articles are missing from {source_settings["path"]}: {sorted(missing)}')
            candidates.extend((category, source_settings, source, path) for path in paths)
    ignored = ignored_paths(content, [path.relative_to(site).as_posix() for *_, path in candidates])
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
            first_file_date(content, Path(relative).relative_to(CONTENT).as_posix())
            if not doc.get('publishedAt') and not saved_date else '',
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

    publish_copies(site, content, ordered)
    output.parent.mkdir(parents=True, exist_ok=True)
    text = 'window.ArticleCatalog = ' + json.dumps(ordered, ensure_ascii=False, indent=2) + ';\n'
    output.write_text(text, encoding='utf-8', newline='\n')
    return ordered


if __name__ == '__main__':
    articles = export_articles(Path(__file__).resolve().parents[1])
    for category, label in [('invisible', 'Learning notes'), ('minors', 'Beyond AI/ML/CS'), ('tech', 'Tech notes'), ('experience', 'Experience')]:
        print(f'{label}: {sum(doc["category"] == category for doc in articles)} articles')
    print(f'Updated {PUBLISHED}/ (local only; nothing committed or pushed).')
