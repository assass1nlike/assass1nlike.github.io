"""Export a local paper taxonomy and notes for the static site (PDFs stay local)."""

import argparse
import hashlib
import json
import re
from pathlib import Path

import fitz


ARXIV_ID = r'(?:\d{4}\.\d{4,5}|[a-z][a-z.-]+/\d{7})(?:v\d+)?'


def arxiv_from_pdf(path):
    """Use the paper's first-page arXiv stamp, never links in its references."""
    try:
        with fitz.open(path) as pdf:
            if not len(pdf):
                return ''
            page = pdf[0].get_text()
            ids = set(re.findall(r'^\s*arXiv\s*:\s*(' + ARXIV_ID + r')\b', page, re.I | re.M))
            if len(ids) == 1:
                return 'https://arxiv.org/abs/' + re.sub(r'v\d+$', '', ids.pop())
    except (RuntimeError, ValueError):
        pass
    return ''


def split_note(text):
    """Use the last thematic break outside front matter and code as the summary."""
    lines = text.replace('\r\n', '\n').splitlines(keepends=True)
    breaks = []
    fence = None
    frontmatter = bool(lines and lines[0].strip() == '---')
    for i, line in enumerate(lines):
        stripped = line.strip()
        if frontmatter:
            if i and stripped in ('---', '...'):
                frontmatter = False
            continue
        match = re.match(r'^(`{3,}|~{3,})', stripped)
        if match:
            marker = match.group(1)
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None and re.fullmatch(r'-{3,}', stripped):
            breaks.append(i)
    for i in reversed(breaks):
        detail = ''.join(lines[:i]).strip()
        summary = ''.join(lines[i + 1:]).strip()
        if detail and summary:
            return detail, summary
    return text.strip(), ''


def excerpt(text):
    # Cards use a short lead; the reader retains the complete original Markdown.
    for block in re.split(r'\n\s*\n', text):
        if not block.strip() or block.lstrip().startswith(('#', '[TOC]', '$$', '\\[')):
            continue
        plain = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', block)
        plain = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', plain)
        plain = re.sub(r'[`*_]', '', plain)
        plain = re.sub(r'\s+', ' ', plain).strip()
        if plain:
            return plain[:180] + ('…' if len(plain) > 180 else '')
    return ''


def export_tree(source, output):
    source = source.resolve(strict=True)
    if not source.is_dir():
        raise ValueError('Paper source must be a directory')
    output.mkdir(parents=True, exist_ok=True)
    notes_dir = output / 'notes'
    notes_dir.mkdir(exist_ok=True)
    previous_ids = set()
    manifest = output / 'index.json'
    if manifest.exists():
        previous = json.loads(manifest.read_text(encoding='utf-8'))
        previous_ids = {p['id'] for p in previous.get('papers', []) if p.get('hasNote')}
    papers = []
    overrides_file = Path(__file__).with_name('paper-links.json')
    overrides = json.loads(overrides_file.read_text(encoding='utf-8')) if overrides_file.exists() else {}

    def walk(folder):
        rel = folder.relative_to(source).as_posix()
        node = {'id': '' if rel == '.' else rel, 'name': folder.name,
                'children': [], 'papers': [], 'count': 0, 'annotated': 0}
        pairs = {}
        for item in sorted(folder.iterdir(), key=lambda p: p.name.casefold()):
            if item.is_symlink() or item.name.startswith('.'):
                continue
            if item.is_dir():
                if item.name.casefold() not in ('tmp', '__pycache__'):
                    node['children'].append(walk(item))
            elif item.suffix.lower() in ('.md', '.pdf') and item.name.casefold() not in ('agents.md', 'claude.md'):
                pairs.setdefault(item.stem.casefold(), {})[item.suffix.lower()] = item
        for pair in pairs.values():
            file = pair.get('.pdf') or pair['.md']
            path = file.relative_to(source).with_suffix('').as_posix()
            paper_id = hashlib.sha256(path.encode('utf-8')).hexdigest()[:20]
            text = pair['.md'].read_text(encoding='utf-8-sig') if '.md' in pair else ''
            detail, summary = split_note(text)
            arxiv_url = overrides.get(path, '') or (arxiv_from_pdf(pair['.pdf']) if '.pdf' in pair else '')
            if arxiv_url and not re.fullmatch(r'https://arxiv\.org/abs/' + ARXIV_ID, arxiv_url):
                raise ValueError(f'Invalid arXiv URL for {path}')
            paper = {'id': paper_id, 'title': file.stem, 'category': node['id'],
                     'hasPdf': '.pdf' in pair, 'hasNote': bool(text.strip()),
                     'hasSummary': bool(summary), 'excerpt': excerpt(summary or detail),
                     'arxivUrl': arxiv_url}
            if paper['hasNote']:
                note_file = notes_dir / (paper_id + '.json')
                note_file.write_text(json.dumps({'detail': detail, 'summary': summary}, ensure_ascii=False), encoding='utf-8')
            papers.append(paper)
            node['papers'].append(paper_id)
        node['count'] = len(node['papers']) + sum(child['count'] for child in node['children'])
        node['annotated'] = sum(p['hasNote'] for p in papers if p['category'] == node['id']) + sum(child['annotated'] for child in node['children'])
        return node

    tree = walk(source)
    tree['name'] = '全部论文'
    catalog = {'version': 1, 'tree': tree, 'papers': papers}
    (output / 'index.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Only remove previously generated notes that are no longer in the catalog.
    current_ids = {p['id'] for p in papers if p['hasNote']}
    for stale_id in previous_ids - current_ids:
        if re.fullmatch(r'[a-f0-9]{20}', stale_id):
            (notes_dir / (stale_id + '.json')).unlink(missing_ok=True)
    return catalog


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path(r'D:\papers'))
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'assets' / 'papers'
    catalog = export_tree(args.source, target)
    print(f"Exported {catalog['tree']['count']} papers, {catalog['tree']['annotated']} notes to {target}")
