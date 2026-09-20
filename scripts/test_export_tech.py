import importlib.util
import tempfile
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location('export_tech', Path(__file__).with_name('export-tech.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class TechCatalogTests(unittest.TestCase):
    def test_directory_scope_titles_and_grouping(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder)
            files = {
                'everlasting/invisible/tech/std/nested/a note.md': '# 技术标题\n\n正文',
                'everlasting/invisible/tech/tech.md': '随记',
                'everlasting/invisible/tech/std/AGENTS.md': 'instructions',
                'everlasting/invisible/tech/.drafts/hidden.md': '# 隐藏',
                'everlasting/invisible/tech/std/tool.py': 'print(1)',
                'everlasting/research/private.md': '# Research',
            }
            for name, content in files.items():
                path = site / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding='utf-8')
            docs = exporter.export_tech(site)
            self.assertEqual(len(docs), 2)
            self.assertEqual(docs[0]['title'], '技术标题')
            self.assertEqual(docs[0]['group'], 'std')
            self.assertEqual(docs[1]['title'], '技术随记')
            self.assertEqual(docs[1]['group'], 'notes')

    def test_reexport_removes_deleted_entries(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder)
            path = site / 'everlasting/invisible/tech/std/old.md'
            path.parent.mkdir(parents=True)
            path.write_text('# Old', encoding='utf-8')
            exporter.export_tech(site)
            path.unlink()
            replacement = path.with_name('new.md')
            replacement.write_text('# New', encoding='utf-8')
            docs = exporter.export_tech(site)
            self.assertEqual([doc['title'] for doc in docs], ['New'])
            self.assertNotIn('old.md', (site / 'assets/tech/catalog.js').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
