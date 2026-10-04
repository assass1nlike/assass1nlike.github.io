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
            self.assertEqual(len(report['retained']), 2)
            self.assertEqual(report['missing_local'], ['research/deleted.md', 'research/only-backup.md'])
            syncer.sync(repo, backup, report, archive)
            self.assertEqual((backup / 'research/a.md').read_text(), 'private new')
            self.assertTrue((source / 'research/a.md').exists())
            self.assertEqual(syncer.git(repo, 'ls-files', 'everlasting/research/a.md'), b'')
            self.assertFalse((backup / 'public.md').exists())
            self.assertTrue((backup / 'changed.md').exists())
            self.assertTrue((archive / 'removed/public.md').exists())
            self.assertEqual((archive / 'removed-locally/research/deleted.md').read_text(), 'deleted snapshot')
            self.assertEqual(syncer.git(repo, 'ls-files', 'everlasting/research/deleted.md'), b'')
            self.assertEqual((archive / 'replaced/research/a.md').read_text(), 'private old')
            second = syncer.plan(repo, backup, remote)
            self.assertEqual(second['copy'], [])
            self.assertEqual(second['cleanup'], [])
            self.assertEqual(second['untrack'], [])


if __name__ == '__main__':
    unittest.main()
