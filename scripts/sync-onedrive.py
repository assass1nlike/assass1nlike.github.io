"""Split everlasting between Git and OneDrive using everlasting/.gitignore."""

import argparse
import hashlib
import json
import os
import shutil
import stat
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path


def git(repo, *args, data=None):
    result = subprocess.run(['git', '-C', str(repo), *args], input=data, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', errors='replace').strip())
    return result.stdout


def files(root):
    found = {}
    for folder, directories, names in os.walk(root):
        for name in directories + names:
            path = Path(folder) / name
            if path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction()):
                raise ValueError(f'Linked paths are not supported: {path}')
        for name in names:
            path = Path(folder) / name
            found[path.relative_to(root).as_posix()] = path
    return found


def ignored(patterns, names):
    # Let Git interpret negation, directory rules and wildcards, using only this list.
    invalid = [line for line in patterns.splitlines() if line.startswith(('./', '!./'))]
    if invalid:
        raise ValueError('Remove ./ from .gitignore patterns; paths are relative to everlasting/: ' + ', '.join(invalid))
    with tempfile.TemporaryDirectory(prefix='everlasting-ignore-') as folder:
        root = Path(folder)
        git(root, 'init', '--quiet')
        (root / '.gitignore').write_text(patterns, encoding='utf-8')
        result = subprocess.run(
            ['git', '-C', folder, '-c', f'core.excludesFile={os.devnull}',
             'check-ignore', '--no-index', '-z', '--stdin'],
            input=b''.join(name.encode('utf-8') + b'\0' for name in names), capture_output=True)
        if result.returncode not in (0, 1):
            raise RuntimeError(result.stderr.decode('utf-8', errors='replace'))
        return set(result.stdout.decode('utf-8').rstrip('\0').split('\0')) - {''}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def same_remote(path, blob):
    local = path.read_bytes()
    if local == blob:
        return True
    # Git commonly stores Windows text with LF; no other content differences qualify.
    try:
        return local.decode('utf-8').replace('\r\n', '\n') == blob.decode('utf-8').replace('\r\n', '\n')
    except UnicodeDecodeError:
        return False


def plan(repo, destination, remote):
    source = repo / 'everlasting'
    patterns = (source / '.gitignore').read_text(encoding='utf-8-sig')
    local = files(source)
    backup = files(destination) if destination.exists() else {}
    tracked = git(repo, 'ls-files', '-z', '--', 'everlasting/').decode('utf-8').rstrip('\0').split('\0')
    tracked = {name.removeprefix('everlasting/') for name in tracked if name}
    selected = ignored(patterns, set(local) | set(backup) | tracked)
    if '.gitignore' in selected:
        raise ValueError('Keep the routing list public: add !/.gitignore to the list.')
    copies = [name for name in sorted(selected & local.keys())
              if name not in backup or digest(local[name]) != digest(backup[name])]
    cleanup, retained = [], []
    for name in sorted(backup.keys() - selected):
        try:
            blob = git(repo, 'show', f'{remote}:everlasting/{name}')
        except RuntimeError:
            retained.append({'path': name, 'reason': 'absent from remote'})
            continue
        if same_remote(backup[name], blob):
            cleanup.append(name)
        else:
            retained.append({'path': name, 'reason': 'different from remote'})
    missing = sorted((selected & (backup.keys() | tracked)) - local.keys())
    return {'remote_commit': remote, 'copy': copies, 'untrack': sorted(selected & tracked),
            'archive_index': sorted((selected & tracked) - local.keys()),
            'cleanup': cleanup, 'retained': retained, 'missing_local': missing,
            'selected': sorted(selected & local.keys())}


def sync(repo, destination, report, archive):
    source = repo / 'everlasting'
    destination.mkdir(parents=True, exist_ok=True)
    for name in report['copy']:
        original, target = source / name, destination / name
        if target.exists():
            saved = archive / 'replaced' / name
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
        target.parent.mkdir(parents=True, exist_ok=True)
        handle, temporary = tempfile.mkstemp(prefix='.sync-', dir=target.parent)
        os.close(handle)
        try:
            shutil.copy2(original, temporary)
            if digest(original) != digest(Path(temporary)):
                raise RuntimeError(f'Copy verification failed: {name}')
            os.replace(temporary, target)
        finally:
            Path(temporary).unlink(missing_ok=True)
    # Verify every selected local file before changing Git's index.
    for name in report['selected']:
        if digest(source / name) != digest(destination / name):
            raise RuntimeError(f'Backup verification failed: {name}')
    for name in report.get('archive_index', []):
        blob = git(repo, 'show', f':everlasting/{name}')
        saved = archive / 'removed-locally' / name
        saved.parent.mkdir(parents=True, exist_ok=True)
        saved.write_bytes(blob)
        if saved.read_bytes() != blob:
            raise RuntimeError(f'Git snapshot verification failed: {name}')
    if report['untrack']:
        git(repo, 'rm', '--cached', '--ignore-unmatch', '--',
            *['everlasting/' + name for name in report['untrack']])
    for name in report['cleanup']:
        target = destination / name
        blob = git(repo, 'show', f"{report['remote_commit']}:everlasting/{name}")
        if not same_remote(target, blob):
            raise RuntimeError(f'Backup changed during sync: {name}')
        saved = archive / 'removed' / name
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(target), str(saved))
    # Remove only empty directories inside the validated backup root.
    for folder, _, _ in os.walk(destination, topdown=False):
        path = Path(folder)
        if path != destination and not any(path.iterdir()):
            try:
                path.rmdir()
            except PermissionError:
                # OneDrive commonly marks synced directories read-only on Windows.
                if os.name == 'nt':
                    path.chmod(stat.S_IWRITE)
                try:
                    path.rmdir()
                except OSError:
                    report.setdefault('retained_empty_directories', []).append(str(path))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', type=Path, default=Path(r'C:\Users\15951\OneDrive\everlasting'))
    parser.add_argument('--apply', action='store_true', help='Copy, verify, untrack and clean; otherwise preview only.')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    destination = args.destination.resolve()
    source = (repo / 'everlasting').resolve()
    if destination == source or destination.is_relative_to(repo) or repo.is_relative_to(destination):
        raise ValueError('Backup must be outside the repository, in its own everlasting directory.')
    if destination.name != 'everlasting':
        raise ValueError('The backup directory must be named everlasting.')
    # Validate before network access or any mutation.
    ignored((source / '.gitignore').read_text(encoding='utf-8-sig'), ['.gitignore'])
    helpers = ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential'] if shutil.which('gh') else []
    git(repo, *helpers, 'fetch', 'origin')
    remote = git(repo, 'rev-parse', 'origin/main').decode().strip()
    report = plan(repo, destination, remote)
    archive = destination.parent / '.everlasting-sync-history' / datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.apply:
        archive.mkdir(parents=True, exist_ok=True)
        report['completed'] = False
        try:
            (archive / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            sync(repo, destination, report, archive)
            report['completed'] = True
        finally:
            (archive / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'Backup verified locally. Recovery history: {archive}')
        print('Git removals are staged, not committed or pushed. OneDrive uploads are handled by its desktop client.')


if __name__ == '__main__':
    main()
