#!/usr/bin/env python3
"""Verify and link the personal Mac skill selection. Preview unless --apply."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]


def relative(value):
    path = Path(value)
    if path.is_absolute() or not path.parts or any(p in ('.', '..') for p in path.parts):
        raise ValueError(f'Unsafe relative path: {value}')
    return path


def verify(root):
    manifest = json.loads((root / 'skills/manifest.json').read_text())
    if manifest['version'] != 1 or manifest['profile'] != 'personal-macos':
        raise ValueError('Unsupported manifest version or profile')
    names = set()
    for skill in manifest['skills']:
        name = skill['name']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name) or name in names:
            raise ValueError(f'Invalid or duplicate skill: {name}')
        names.add(name)
        if not re.fullmatch(r'[a-f0-9]{40}', skill['commit']):
            raise ValueError(f'Missing commit pin: {name}')
        license_path = root / relative(skill['license_file'])
        if not skill['license'] or not license_path.is_file():
            raise ValueError(f'Missing license: {name}')
        source = root / 'skills/vendor' / name
        expected = skill['files']
        actual = {str(p.relative_to(source)) for p in source.rglob('*') if p.is_file()}
        if actual != set(expected) or 'SKILL.md' not in expected:
            raise ValueError(f'File inventory differs: {name}')
        for path in source.rglob('*'):
            if path.is_symlink():
                raise ValueError(f'Unexpected vendored symlink: {path}')
        for filename, digest in expected.items():
            data = (source / relative(filename)).read_bytes()
            if hashlib.sha256(data).hexdigest() != digest:
                raise ValueError(f'Content differs: {name}/{filename}')
    if not manifest['targets'] or len(set(manifest['targets'])) != len(manifest['targets']):
        raise ValueError('Missing or duplicate targets')
    for target in manifest['targets']:
        relative(target)
    return manifest


def safe_parents(path, home):
    """Do not redirect writes through a linked agent or backup directory."""
    path.relative_to(home)
    for parent in path.parents:
        if parent == home:
            break
        if parent.is_symlink() or (parent.exists() and not parent.is_dir()):
            raise ValueError(f'Parent must be a real directory: {parent}')


def plan(root, home, manifest):
    actions = []
    for target in manifest['targets']:
        for skill in manifest['skills']:
            source = root / 'skills/vendor' / skill['name']
            dest = home / relative(target) / skill['name']
            safe_parents(dest, home)
            same = dest.is_symlink() and dest.resolve() == source.resolve()
            status = 'ok' if same else 'replace' if os.path.lexists(dest) else 'create'
            actions.append((status, source, dest))
    return actions


def install(root, home, apply=False):
    manifest = verify(root)
    actions = plan(root, home, manifest)
    backup_root = home / '.local/state/dotfiles/backups' / uuid.uuid4().hex
    # Validate every destination and backup path before the first write.
    for _, _, dest in actions:
        safe_parents(backup_root / dest.relative_to(home), home)
    for status, source, dest in actions:
        print(f'{status:7} {dest} -> {source}')
        if not apply or status == 'ok':
            continue
        backup = None
        dest.parent.mkdir(parents=True, exist_ok=True)
        if status == 'replace':
            backup = backup_root / dest.relative_to(home)
            backup.parent.mkdir(parents=True, exist_ok=True)
            dest.rename(backup)
            print(f'backup  {backup}')
        try:
            dest.symlink_to(source, target_is_directory=True)
        except OSError:
            if backup is not None:
                backup.rename(dest)
            raise
    return actions


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['check', 'install'])
    parser.add_argument('--apply', action='store_true', help='Write links and back up conflicts')
    parser.add_argument('--home', type=Path, default=Path.home(), help='Alternate home for restore testing')
    args = parser.parse_args()
    try:
        if args.command == 'check':
            if args.apply:
                parser.error('--apply is only valid with install')
            manifest = verify(ROOT)
            print(f"Verified {len(manifest['skills'])} pinned skills and licenses.")
        else:
            if sys.platform != 'darwin':
                raise ValueError('This installer is scoped to macOS')
            if not args.home.is_dir():
                raise ValueError('--home must be an existing directory')
            install(ROOT, args.home.resolve(), args.apply)
            if not args.apply:
                print('Preview only. Add --apply to write these changes.')
    except (OSError, ValueError, KeyError) as error:
        print(f'error: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
