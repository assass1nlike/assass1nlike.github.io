"""Build the public technical-article catalog from its Markdown directory."""

import json
import re
from pathlib import Path


def export_tech(site):
    source = site / 'everlasting/invisible/tech'
    documents = []
    for path in sorted(source.rglob('*.md')):
        relative = path.relative_to(source)
        if any(part.startswith('.') or part == '__pycache__' for part in relative.parts):
            continue
        if path.name.upper() in {'AGENTS.MD', 'CLAUDE.MD'} or any(
            parent.is_symlink() for parent in [path, *path.parents] if parent != source.parent
        ):
            continue
        if not path.resolve().is_relative_to(source.resolve()):
            continue
        markdown = path.read_text(encoding='utf-8-sig')
        heading = re.search(r'^#\s+(.+?)\s*#*\s*$', markdown, re.MULTILINE)
        title = heading[1].strip() if heading else ('技术随记' if relative.as_posix() == 'tech.md' else path.stem)
        documents.append({
            'path': path.relative_to(site).as_posix(),
            'title': title,
            'group': relative.parts[0] if len(relative.parts) > 1 else 'notes',
        })
    output = site / 'assets/tech/catalog.js'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text('window.TechCatalog = ' + json.dumps(documents, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    return documents


if __name__ == '__main__':
    documents = export_tech(Path(__file__).resolve().parents[1])
    print(f'Exported {len(documents)} technical articles.')
