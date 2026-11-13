import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('projects_exporter', Path(__file__).with_name('export-projects.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

BODY = '# one\n\n来自 GitHub 的正文'


class ProjectExportTests(unittest.TestCase):
    def test_readme_comes_from_github(self):
        with tempfile.TemporaryDirectory() as temp:
            site = Path(temp) / 'www'
            (site / 'scripts').mkdir(parents=True)
            (site / 'scripts/projects.json').write_text('["one", "two"]', encoding='utf-8')

            def api(path, *extra):
                name = path.split('/')[2]
                if path.endswith('/readme'):
                    return BODY.replace('# one', '# ' + name)
                return json.dumps({'description': 'desc of ' + name, 'stars': 7, 'branch': 'main',
                                   'url': 'https://github.com/assass1nlike/' + name})

            with patch.object(exporter, 'gh_api', side_effect=api):
                projects = exporter.export_projects(site)
            self.assertEqual([p['id'] for p in projects], ['one', 'two'])
            self.assertEqual(projects[0]['markdown'], BODY)
            self.assertEqual(projects[0]['repository'], 'https://github.com/assass1nlike/one')
            self.assertEqual(projects[0]['linkBase'], 'https://github.com/assass1nlike/one/blob/main/')
            self.assertEqual(projects[0]['stars'], 7)
            output = site / 'assets/projects/index.json'
            self.assertNotIn(str(temp), output.read_text(encoding='utf-8'))

    def test_falls_back_to_local_clone(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = Path(temp)
            site = parent / 'www'
            (site / 'scripts').mkdir(parents=True)
            (site / 'scripts/projects.json').write_text('["one"]', encoding='utf-8')
            (parent / 'one').mkdir()
            (parent / 'one' / 'README.md').write_text('# 本地\n\n正文', encoding='utf-8')

            def git(folder, *args):
                return 'git@github.com:example/one.git' if args[0] == 'remote' else 'origin/main'

            with patch.object(exporter, 'gh_api', side_effect=RuntimeError('offline')), \
                 patch.object(exporter, 'git_value', side_effect=git):
                projects = exporter.export_projects(site)
            self.assertEqual(projects[0]['markdown'], '# 本地\n\n正文')
            self.assertEqual(projects[0]['repository'], 'https://github.com/example/one')

    def test_only_plain_repository_names(self):
        with tempfile.TemporaryDirectory() as temp:
            site = Path(temp)
            (site / 'scripts').mkdir()
            (site / 'scripts' / 'projects.json').write_text(json.dumps(['../elsewhere']))
            with self.assertRaises(ValueError):
                exporter.export_projects(site, offline=True)


if __name__ == '__main__':
    unittest.main()
