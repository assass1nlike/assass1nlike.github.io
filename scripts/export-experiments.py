"""Export the experiment retrospectives for the experiments page.

The source lives under everlasting/research/, which is git-ignored, so the Markdown and the
figures it references are copied into assets/experiments/ where the site can serve them.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path


DOCS = ('experiments.md', 'gain.md')
IMAGE = re.compile(r'<img\s+([^>]*?)/?>', re.I)
SRC_ATTR = re.compile(r'src\s*=\s*["\']([^"\']+)["\']', re.I)


def first_heading(markdown):
    match = re.search(r'^#\s+(.+)$', markdown, re.M)
    return match.group(1).strip() if match else ''


def first_paragraph(markdown):
    """First prose paragraph after the H1, skipping headings, code and images."""
    body = re.sub(r'^#\s+.+$', '', markdown, count=1, flags=re.M)
    for block in re.split(r'\n\s*\n', body):
        text = block.strip()
        if not text or text.startswith(('```', '<', '|', '>', '-', '*', '!')):
            continue
        text = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text)
        text = re.sub(r'[`*_~]', '', text).replace('\n', ' ')
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) > 40:
            return text
    return ''


def github_url(project, config):
    explicit = config.get('github')
    if explicit:
        return explicit
    result = subprocess.run(['git', '-C', str(project), 'remote', 'get-url', 'origin'],
                            capture_output=True, text=True, encoding='utf-8')
    url = result.stdout.strip() if result.returncode == 0 else ''
    if not url:
        return ''
    url = re.sub(r'^git@github\.com:', 'https://github.com/', url)
    return re.sub(r'\.git$', '', url)


def copy_images(markdown, project, folder, slug):
    """Copy referenced figures next to the exported Markdown and turn the tags into Markdown images."""

    def repl(match):
        src = SRC_ATTR.search(match.group(0))
        if not src:
            return match.group(0)
        relative = src.group(1)
        source = (project / relative).resolve()
        if not source.is_file() or not source.is_relative_to(project.resolve()):
            return match.group(0)
        target = folder / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        return f'![]({relative.replace(" ", "%20")})'

    return IMAGE.sub(repl, markdown)


def export(site, source, output):
    config = json.loads((site / 'scripts/experiments.json').read_text(encoding='utf-8-sig'))
    overrides = config.get('projects', {})
    skip = {name.casefold() for name in config.get('skip', [])}
    projects = []
    for project in sorted(source.iterdir(), key=lambda path: path.name.casefold()):
        if not project.is_dir() or project.name.startswith('.') or project.name.casefold() in skip:
            continue
        docs = [project / name for name in DOCS if (project / name).is_file()]
        if not docs:
            continue
        slug = project.name
        settings = overrides.get(slug, {})
        folder = output / slug
        if folder.exists():
            shutil.rmtree(folder)
        folder.mkdir(parents=True)
        entries = []
        for path in docs:
            text = path.read_text(encoding='utf-8-sig')
            text = copy_images(text, project, folder, slug)
            (folder / path.name).write_text(text, encoding='utf-8', newline='\n')
            entries.append({'id': path.stem, 'title': first_heading(text) or path.stem,
                            'file': f'{slug}/{path.name}'})
        lead = next((path for path in docs if path.name == 'experiments.md'), docs[0])
        projects.append({
            'id': slug,
            'title': settings.get('title') or slug,
            'summary': settings.get('summary') or first_paragraph(lead.read_text(encoding='utf-8-sig')),
            'github': github_url(project, settings),
            'huggingface': settings.get('huggingface', ''),
            'docs': entries,
        })
    output.mkdir(parents=True, exist_ok=True)
    keep = {project['id'] for project in projects}
    for stale in output.iterdir():
        if stale.is_dir() and stale.name not in keep:
            shutil.rmtree(stale)
    (output / 'index.json').write_text(
        json.dumps({'projects': projects}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return projects


if __name__ == '__main__':
    site = Path(__file__).resolve().parents[1]
    source = site / 'everlasting/research/others/empirical'
    projects = export(site, source, site / 'assets/experiments')
    print(f'Exported {len(projects)} experiments: ' + ', '.join(project['id'] for project in projects))
