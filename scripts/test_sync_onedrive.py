import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location('sync_onedrive', Path(__file__).with_name('sync-onedrive.py'))
syncer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(syncer)


class SplitBackupTests(unittest.TestCase):
    def test_git_patterns(self):
        names = ['research/a.md', 'public.md', 'private.txt', 'keep.txt', '.gitignore']
        self.assertEqual(syncer.ignored('/research/\n*.txt\n!keep.txt\n', names),
                         {'research/a.md', 'private.txt'})
        with self.assertRaises(ValueError):
            syncer.ignored('./research/\n', names)

    def test_copy_untrack_remote_proof_and_recovery(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            repo, backup, archive = root / 'repo', root / 'everlasting', root / 'archive'
            repo.mkdir()
            syncer.git(repo, 'init', '--quiet')
            syncer.git(repo, 'config', 'user.name', 'Test')
            syncer.git(repo, 'config', 'user.email', 'test@example.invalid')
            syncer.git(repo, 'config', 'core.autocrlf', 'false')
            source = repo / 'everlasting'
            (source / 'research').mkdir(parents=True)
            (source / 'research/a.md').write_text('private old', encoding='utf-8')
            (source / 'research/deleted.md').write_text('deleted snapshot', encoding='utf-8')
            (source / 'public.md').write_bytes(b'public\n')
            (source / 'changed.md').write_text('remote version', encoding='utf-8')
            syncer.git(repo, 'add', '.')
            syncer.git(repo, 'commit', '-qm', 'initial')
            remote = syncer.git(repo, 'rev-parse', 'HEAD').decode().strip()
            (source / '.gitignore').write_text('/research/\n', encoding='utf-8')
            (source / 'research/deleted.md').unlink()
            (source / 'research/a.md').write_text('private new', encoding='utf-8')
            (backup / 'research').mkdir(parents=True)
            (backup / 'research/a.md').write_text('private old', encoding='utf-8')
            (backup / 'research/only-backup.md').write_text('keep', encoding='utf-8')
            (backup / 'public.md').write_bytes(b'public\r\n')
            (backup / 'changed.md').write_text('unique backup version', encoding='utf-8')
            (backup / 'only-backup.md').write_text('keep', encoding='utf-8')
            report = syncer.plan(repo, backup, remote)
            self.assertEqual(report['copy'], ['research/a.md'])
            self.assertEqual(report['cleanup'], ['public.md'])
            self.assertEqual(len(report['retained']), 1)
            self.assertEqual(report['deleted'], ['only-backup.md', 'research/only-backup.md'])
            self.assertEqual(report['missing_local'], ['research/deleted.md', 'research/only-backup.md'])
            syncer.sync(repo, backup, report, archive)
            self.assertEqual((backup / 'research/a.md').read_text(), 'private new')
            self.assertTrue((source / 'research/a.md').exists())
            self.assertEqual(syncer.git(repo, 'ls-files', 'everlasting/research/a.md'), b'')
            self.assertFalse((backup / 'public.md').exists())
            self.assertTrue((backup / 'changed.md').exists())
            self.assertFalse((backup / 'research/only-backup.md').exists())
            self.assertFalse((backup / 'only-backup.md').exists())
            self.assertEqual((archive / 'deleted/research/only-backup.md').read_text(), 'keep')
            self.assertEqual((archive / 'deleted/only-backup.md').read_text(), 'keep')
            self.assertTrue((archive / 'removed/public.md').exists())
            self.assertEqual((archive / 'removed-locally/research/deleted.md').read_text(), 'deleted snapshot')
            self.assertEqual(syncer.git(repo, 'ls-files', 'everlasting/research/deleted.md'), b'')
            self.assertEqual((archive / 'replaced/research/a.md').read_text(), 'private old')
            second = syncer.plan(repo, backup, remote)
            self.assertEqual(second['copy'], [])
            self.assertEqual(second['cleanup'], [])
            self.assertEqual(second['untrack'], [])
            self.assertEqual(second['deleted'], [])
            self.assertEqual(second['missing_local'], [])

    def test_recreated_local_file_is_not_removed_from_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            repo, backup, archive = root / 'repo', root / 'backup', root / 'archive'
            source = repo / 'everlasting/research'
            source.mkdir(parents=True)
            (backup / 'research').mkdir(parents=True)
            (backup / 'research/restored.md').write_text('old backup', encoding='utf-8')
            (source / 'restored.md').write_text('recreated', encoding='utf-8')
            report = {'copy': [], 'selected': [], 'archive_index': [], 'untrack': [],
                      'cleanup': [], 'deleted': ['research/restored.md']}
            with self.assertRaisesRegex(RuntimeError, 'reappeared'):
                syncer.sync(repo, backup, report, archive)
            self.assertEqual((backup / 'research/restored.md').read_text(), 'old backup')


if __name__ == '__main__':
    unittest.main()
