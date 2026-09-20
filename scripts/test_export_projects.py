import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('projects_exporter', Path(__file__).with_name('export-projects.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ProjectExportTests(unittest.TestCase):
    def test_portable_selection_original_readme_and_remote(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            site = parent / 'website-any-name'
            (site / 'scripts').mkdir(parents=True)
            (site / 'scripts/projects.json').write_text('["one", "two"]', encoding='utf-8')
            for name in ('one', 'two', 'private'):
                (parent / name).mkdir()
                (parent / name / 'README.md').write_text('# ' + name + '\n\n中文内容', encoding='utf-8')
            def git(folder, *args):
                return f'git@github.com:example/{folder.name}.git' if args[0] == 'remote' else 'origin/main'
            with patch.object(exporter, 'git_value', side_effect=git):
                projects = exporter.export_projects(site)
            self.assertEqual([p['id'] for p in projects], ['one', 'two'])
            self.assertEqual(projects[0]['markdown'], '# one\n\n中文内容')
            self.assertEqual(projects[0]['repository'], 'https://github.com/example/one')
            self.assertEqual(projects[0]['linkBase'], 'https://github.com/example/one/blob/main/')
            output = site / 'assets/projects/index.json'
            self.assertNotIn(str(parent), output.read_text(encoding='utf-8'))
            old = output.read_bytes()
            (parent / 'two/README.md').unlink()
            with patch.object(exporter, 'git_value', side_effect=git), self.assertRaises(FileNotFoundError):
                exporter.export_projects(site)
            self.assertEqual(output.read_bytes(), old)

    def test_only_direct_siblings(self):
        with tempfile.TemporaryDirectory() as temp:
            site = Path(temp)
            (site / 'scripts').mkdir()
            (site / 'scripts/projects.json').write_text(json.dumps(['../elsewhere']))
            with self.assertRaises(ValueError):
                exporter.export_projects(site)


if __name__ == '__main__':
    unittest.main()
