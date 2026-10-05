import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from publication_dates import first_file_date


class PublicationDateTests(unittest.TestCase):
    def test_git_history_tracks_renames_in_shanghai_time(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)

            def git(*args, timestamp=None):
                env = os.environ.copy()
                if timestamp:
                    env.update(GIT_AUTHOR_DATE=timestamp, GIT_COMMITTER_DATE=timestamp)
                subprocess.run(['git', '-C', str(root), '-c', 'user.name=Test', '-c',
                                'user.email=test@example.com', *args], env=env, check=True, capture_output=True)

            git('init', '-q')
            (root / 'old.md').write_text('# Note', encoding='utf-8')
            git('add', '.')
            git('commit', '-qm', 'First publication', timestamp='2024-01-01T20:00:00+00:00')
            git('mv', 'old.md', 'new.md')
            git('add', '.')
            git('commit', '-qm', 'Rename article', timestamp='2024-02-01T12:00:00+08:00')
            self.assertEqual(first_file_date(root, 'new.md'), '2024-01-02')
            self.assertEqual(first_file_date(root, 'missing.md'), '')
