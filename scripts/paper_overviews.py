"""Export the per-folder overview notes (index.md) that narrate each part of the paper tree."""

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote, unquote

SKIP = {'tmp', '__pycache__', 'node_modules'}
HIDDEN_ROOTS = {'.meta', '_archive', 'inbox'}
PAPER_SUFFIX = re.compile(r'\.(pdf|md)$', re.I)


def paper_key(category, name):
    path = (category + '/' + name if category else name)
    return PAPER_SUFFIX.sub('', path).replace('\\', '/').casefold()


def rewrite_links(text, category, index):
    """Point relative links at the paper reader or the overview page; leave external links alone."""

    def repl(match):
        label, href = match.group(1), match.group(2).strip()
        if re.match(r'^[a-z][a-z0-9+.-]*:|^/|^#', href, re.I):
            return match.group(0)
        target = unquote(href.partition('#')[0])
        path = (category + '/' + target if category else target).replace('\\', '/')
        parts = []
        for part in path.split('/'):
            if part == '..':
                if parts:
                    parts.pop()
            elif part and part != '.':
                parts.append(part)
        path = '/'.join(parts)
        if path.endswith('/index.md'):
            path = path[:-len('/index.md')]
        elif path == 'index.md':
            path = ''
        suffix = PAPER_SUFFIX.search(path)
        base = path[:suffix.start()] if suffix else path
        if suffix and base.casefold() in index['papers']:
            return f'[{label}](/category.html?cat=papers&paper={quote(index["papers"][base.casefold()])})'
        # An empty overview key is the library root; never fall back to it for an unmatched link.
        overview = path.strip('/')
        if overview.casefold() in index['overviews']:
            url = '/category.html?cat=papers&overview=' + quote(overview)
            return f'[{label}]({url})'
        return match.group(0)

    return re.sub(r'\[([^\]]*)\]\(([^)]+)\)', repl, text)


def export_overviews(source, output, catalog):
    source = source.resolve()
    files = []
    for path in sorted(source.rglob('index.md')):
        parts = path.relative_to(source).parts
        if any(part.startswith('.') or part.casefold() in SKIP for part in parts):
            continue
        if parts[0] in HIDDEN_ROOTS or parts[0].startswith('.'):
            continue
        files.append((path, '/'.join(parts[:-1])))
    index = {'papers': {}, 'overviews': set()}
    for path, category in files:
        index['overviews'].add(category)
    for paper in catalog['papers']:
        index['papers'][paper_key(paper['category'], paper['title'])] = paper['id']
    index['overviews'] = {key.casefold() for key in index['overviews']}

    # One small manifest plus one file per page, so the tree loads without the full text.
    folder = output / 'overviews'
    folder.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for path, category in files:
        text = path.read_text(encoding='utf-8-sig')
        heading = re.search(r'^#\s+(.+)$', text, re.M)
        name = hashlib.sha256(('overview:' + category).encode('utf-8')).hexdigest()[:20]
        page = {'category': category,
                'title': heading.group(1).strip() if heading else (category or '全部论文'),
                'markdown': rewrite_links(text, category, index)}
        (folder / (name + '.json')).write_text(json.dumps(page, ensure_ascii=False), encoding='utf-8')
        manifest[category.casefold()] = {'category': category, 'title': page['title'], 'file': name}
    keep = {entry['file'] + '.json' for entry in manifest.values()}
    for stale in folder.glob('*.json'):
        if stale.name not in keep and re.fullmatch(r'[a-f0-9]{20}\.json', stale.name):
            stale.unlink()
    (output / 'overviews.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return manifest
