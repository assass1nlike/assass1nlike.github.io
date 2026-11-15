"""Build one searchable index across notes, papers and experiments.

The index ships as a few hundred kilobytes of titles and excerpts; full text stays in the
documents themselves and is only fetched when a reader opens one.
"""

import json
import re
from pathlib import Path


INLINE = re.compile(r'(`[^`]*`|\*\*[^*]*\*\*|\[([^\]]*)\]\([^)]*\)|^#+\s+|^\s*[-*+]\s+|^\s*>\s*|<[^>]+>|[|_~])', re.M)


def plain(text, limit=0):
    """Strip Markdown syntax and keep the readable opening of a passage."""
    text = text.replace('\r\n', '\n')
    text = re.sub(r'\n```[\s\S]*?```', ' ', text)
    text = INLINE.sub(lambda match: match.group(2) or ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:limit] if limit else text


def first_prose(markdown, limit=160):
    """First paragraph that carries information, skipping titles, labels and their trailing colon."""
    for block in re.split(r'\n\s*\n', markdown):
        title = plain(block)
        if not title or len(title) < 30 or block.lstrip().startswith(('```', '<', '|', '-', '*', '!')):
            continue
        return title[:limit]
    return ''


def load(label_path):
    text = label_path.read_text(encoding='utf-8')
    return json.loads(text[text.index('=') + 1:].rstrip().rstrip(';'))


def export(site, output):
    entries = []
    catalog = load(site / 'assets/articles/catalog.js')
    for doc in catalog:
        path = site / doc['path']
        if not path.is_file():
            continue
        markdown = path.read_text(encoding='utf-8-sig')
        entries.append({'kind': doc['category'], 'title': doc['title'],
                        'href': '/viewer.html?doc=' + (doc.get('publicId') or doc['path']),
                        'text': first_prose(markdown)})

    projects = json.loads((site / 'assets/experiments/index.json').read_text(encoding='utf-8'))['projects']
    for project in projects:
        entries.append({'kind': 'experiments', 'title': project['title'],
                        'href': '/viewer.html?experiment=' + project['id'],
                        'text': project['summary']})
        folder = site / 'assets/experiments'
        for doc in project['docs']:
            path = folder / doc['file']
            if path.is_file():
                entries.append({'kind': 'experiments', 'title': project['title'] + ' · ' + doc['title'],
                                'href': '/viewer.html?experiment=%s&doc=%s' % (project['id'], doc['id']),
                                'text': first_prose(path.read_text(encoding='utf-8-sig'))})

    papers = json.loads((site / 'assets/papers/index.json').read_text(encoding='utf-8'))
    for paper in papers['papers']:
        entries.append({'kind': 'papers', 'title': paper['title'],
                        'href': '/category.html?cat=papers&paper=' + paper['id'],
                        'text': paper['category'].replace('/', ' / ') + (' · ' + paper.get('excerpt', '') if paper.get('excerpt') else '')})

    entries = [entry for entry in entries if entry['title']]
    payload = 'window.SiteSearchIndex = ' + json.dumps({'entries': entries}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    (output).write_text(payload, encoding='utf-8', newline='\n')
    counts = {}
    for entry in entries:
        counts[entry['kind']] = counts.get(entry['kind'], 0) + 1
    print(f'Wrote {len(entries)} search entries: ' + ', '.join(f'{kind} {count}' for kind, count in sorted(counts.items())))


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    export(root, root / 'assets/search-index.js')
