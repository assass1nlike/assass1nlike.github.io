import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location('export_articles', Path(__file__).with_name('export-articles.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ArticleCatalogTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.site = Path(folder.name)
        self.write('scripts/articles.json', Path(__file__).with_name('articles.json').read_text(encoding='utf-8'))
        for directory in ['notes', 'minors/published', 'annual', 'tech']:
            (self.site / 'everlasting/invisible' / directory).mkdir(parents=True)
        self.write('everlasting/invisible/preliminaries.md', '# opinions')

    def write(self, name, content):
        path = self.site / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')
        return path

    def export(self):
        return exporter.export_articles(self.site)

    def test_public_scope_all_categories_and_drafts(self):
        files = {
            'everlasting/invisible/notes/math/note.md': '# Learning title',
            'everlasting/invisible/minors/published/post/determined.md': '# Blog title',
            'everlasting/invisible/annual/2025.md': '# Internal section',
            'everlasting/invisible/tech/std/tool.md': '# Tool title',
            'everlasting/invisible/minors/cybergym/determined.md': '# Unfinished',
            'everlasting/invisible/minors/4dim-bench/determined.md': '# Private draft',
            'everlasting/research/private.md': '# Private research',
            'everlasting/invisible/notes/.drafts/hidden.md': '# Hidden',
            'everlasting/invisible/tech/tmp/scratch.md': '# Scratch',
            'everlasting/invisible/minors/published/AGENTS.md': '# Instructions',
            'everlasting/invisible/notes/README.md': '# Directory help',
            'everlasting/invisible/notes/figure.png': 'image',
        }
        for path, text in files.items():
            self.write(path, text)
        docs = self.export()
        self.assertEqual(len(docs), 5)
        self.assertEqual({doc['category'] for doc in docs}, {'invisible', 'minors', 'tech'})
        learning = next(doc for doc in docs if doc['title'] == 'Learning title')
        self.assertEqual(learning['publicId'], 'math/note')
        annual = next(doc for doc in docs if doc.get('collection') == 'annual')
        self.assertEqual(annual['title'], '2025 年终总结')
        self.assertEqual(json.loads((self.site / 'assets/articles/catalog.js').read_text(encoding='utf-8')
                                   .removeprefix('window.ArticleCatalog = ').removesuffix(';\n')), docs)

    def test_heading_skips_yaml_code_and_supports_fallback(self):
        markdown = '---\n# YAML comment\ntitle: Meta\n---\n```md\n# Code\n```\n~~~\n# Also code\n~~~\n## Subheading\n# Real title ##\n'
        self.assertEqual(exporter.first_heading(markdown), 'Real title')
        self.assertEqual(exporter.first_heading('# C#'), 'C#')
        self.write('everlasting/invisible/notes/no-heading.md', 'Plain text')
        self.assertEqual(self.export()[0]['title'], 'no-heading')

    def test_existing_order_new_articles_and_pinned_last(self):
        for name in ['closeness-generalization', 'newton-residual-gradient', 'a-new-note']:
            self.write(f'everlasting/invisible/notes/{name}.md', f'# {name}')
        for year in [2023, 2024, 2025, 2026]:
            self.write(f'everlasting/invisible/annual/{year}.md', f'# {year} 年终总结')
        docs = self.export()
        self.assertEqual([doc['publicId'] for doc in docs if doc['category'] == 'invisible'],
                         ['a-new-note', 'newton-residual-gradient', 'closeness-generalization', 'preliminaries'])
        self.assertEqual([doc['title'] for doc in docs if doc['category'] == 'minors'],
                         [f'{year} 年终总结' for year in [2026, 2025, 2024, 2023]])
        self.assertTrue(next(doc for doc in docs if doc.get('publicId') == 'preliminaries')['outlinePreview'])

    def test_rename_edit_delete_and_repeat_export(self):
        old = self.write('everlasting/invisible/minors/published/old.md', '# Old')
        self.export()
        old.rename(old.with_name('renamed.md'))
        renamed = self.write('everlasting/invisible/minors/published/renamed.md', '# New title')
        docs = self.export()
        self.assertEqual([doc['title'] for doc in docs if doc['category'] == 'minors'], ['New title'])
        output = self.site / 'assets/articles/catalog.js'
        before = output.read_bytes()
        self.export()
        self.assertEqual(output.read_bytes(), before)
        renamed.unlink()
        self.assertFalse(any(doc['category'] == 'minors' for doc in self.export()))
        self.assertNotIn('old.md', output.read_text(encoding='utf-8'))

    def test_gitignored_notes_never_enter_catalog_even_if_tracked(self):
        subprocess.run(['git', 'init', '-q', str(self.site)], check=True, capture_output=True)
        path = 'everlasting/invisible/notes/private.md'
        self.write(path, '# Private')
        subprocess.run(['git', '-C', str(self.site), 'add', path], check=True, capture_output=True)
        self.write('.gitignore', '/everlasting/invisible/notes/private.md\n')
        self.assertFalse(any(doc['path'] == path for doc in self.export()))

    def test_failure_keeps_previous_catalog(self):
        self.export()
        output = self.site / 'assets/articles/catalog.js'
        before = output.read_bytes()
        (self.site / 'everlasting/invisible/notes').rmdir()
        with self.assertRaises(FileNotFoundError):
            self.export()
        self.assertEqual(output.read_bytes(), before)

    def test_symlink_cannot_publish_outside_files(self):
        private = self.write('everlasting/research/private.md', '# Private')
        link = self.site / 'everlasting/invisible/notes/link.md'
        try:
            link.symlink_to(private)
        except OSError:
            self.skipTest('Symlink creation is unavailable for this Windows account')
        self.assertFalse(any(doc['path'].endswith('link.md') for doc in self.export()))


if __name__ == '__main__':
    unittest.main()
