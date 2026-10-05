import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import publish

REAL_RUN = publish.run

class PublishTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / 'site'
        self.remote = Path(temporary.name) / 'remote.git'
        self.root.mkdir()
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Publication Test')
        self.git('config', 'user.email', 'test@example.invalid')
        subprocess.run(['git', 'init', '--bare', str(self.remote)], check=True, capture_output=True)
        self.git('remote', 'add', 'origin', str(self.remote))
        self.write('scripts/articles.json', json.dumps({'categories': {'learning': {
            'sources': [{'path': 'public'}]}}}))
        self.write('public/old.md', '# Old article')
        self.write('index.html', 'Existing website')
        self.write('.gitignore', 'public/private/\n')
        self.git('add', '.')
        self.git('commit', '-m', 'Initial')

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True,
                              capture_output=True, text=True, encoding='utf-8').stdout

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

    def update(self, root, *args, **kwargs):
        if args[0] == sys.executable:
            self.write('assets/articles/catalog.js', 'updated catalog')
            return None
        return REAL_RUN(root, *args, **kwargs)

    def test_publication_pushes_content_and_deletions_but_leaves_private_and_code_changes(self):
        (self.root / 'public/old.md').unlink()
        for name in ['public/new.md', 'public/images/figure.png', 'public/private/secret.md',
                     'public/tmp/scratch.md', 'public/.draft.md', 'public/AGENTS.md', 'research/draft.md']:
            self.write(name, 'new content')
        self.write('index.html', 'Unrelated pending website edit')
        with patch.object(publish, 'run', side_effect=self.update):
            publish.publish(self.root, only='articles')
        files = set(subprocess.run(['git', '--git-dir', str(self.remote), 'ls-tree', '-r', '--name-only', 'main'],
                                   check=True, capture_output=True, text=True).stdout.splitlines())
        self.assertIn('public/new.md', files)
        self.assertIn('public/images/figure.png', files)
        self.assertIn('assets/articles/catalog.js', files)
        self.assertNotIn('public/old.md', files)
        for excluded in ['public/private/secret.md', 'public/tmp/scratch.md', 'public/.draft.md',
                         'public/AGENTS.md', 'research/draft.md']:
            self.assertNotIn(excluded, files)
        self.assertEqual(self.git('show', 'HEAD:index.html'), 'Existing website')
        self.assertIn('index.html', self.git('diff', '--name-only'))
        first_commit = self.git('rev-parse', 'HEAD')
        with patch.object(publish, 'run', side_effect=self.update):
            publish.publish(self.root, only='articles')
        self.assertEqual(first_commit, self.git('rev-parse', 'HEAD'))

    def test_update_failure_does_not_commit_or_push(self):
        before = self.git('rev-parse', 'HEAD')
        def fail_update(root, *args, **kwargs):
            if args[0] == sys.executable:
                raise subprocess.CalledProcessError(1, args)
            return REAL_RUN(root, *args, **kwargs)
        with patch.object(publish, 'run', side_effect=fail_update):
            with self.assertRaises(subprocess.CalledProcessError):
                publish.publish(self.root)
        self.assertEqual(before, self.git('rev-parse', 'HEAD'))
        self.assertEqual(self.git('ls-remote', 'origin', 'refs/heads/main'), '')
        self.assertEqual(self.git('diff', '--cached', '--name-only'), '')

    def test_existing_staged_change_stops_before_export(self):
        self.write('research/draft.md', 'private')
        self.git('add', 'research/draft.md')
        with patch.object(publish, 'run', wraps=REAL_RUN) as command:
            with self.assertRaisesRegex(RuntimeError, 'staging area'):
                publish.publish(self.root)
        self.assertFalse(any(call.args[1] == sys.executable for call in command.call_args_list))
        self.assertEqual(self.git('diff', '--cached', '--name-only').strip(), 'research/draft.md')

    def test_all_updates_include_deep_publication_query(self):
        calls = []
        def capture(root, *args, **kwargs):
            if args[0] == sys.executable:
                calls.append(args)
            return self.update(root, *args, **kwargs)
        with patch.object(publish, 'run', side_effect=capture):
            publish.publish(self.root, source=Path('custom-papers'))
        self.assertEqual([args[2] for args in calls], [
            'scripts/export-articles.py', 'scripts/export-paper-tree.py', 'scripts/update-paper-publications.py'])
        self.assertIn('--deep', calls[-1])
        self.assertEqual(calls[-1][-1], 'custom-papers')


if __name__ == '__main__':
    unittest.main()
