import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('skills', Path(__file__).resolve().parents[1] / 'scripts/skills.py')
skills = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(skills)


class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name) / 'home'
        self.home.mkdir()
        self.root = Path(self.temp.name) / 'repo'
        shutil.copytree(skills.ROOT / 'skills', self.root / 'skills')
        self.output = io.StringIO()
        self.redirect = contextlib.redirect_stdout(self.output)
        self.redirect.__enter__()
        self.addCleanup(self.redirect.__exit__, None, None, None)

    def run_install(self, apply=True):
        return skills.install(self.root, self.home, apply)

    def test_preview_writes_nothing(self):
        manifest = skills.verify(self.root)
        self.assertEqual(len(self.run_install(False)), len(manifest['skills']) * len(manifest['targets']))
        self.assertEqual(list(self.home.iterdir()), [])

    def test_clean_restore_and_repeat(self):
        self.run_install()
        for target in ('.agents/skills', '.claude/skills'):
            for name in (s['name'] for s in skills.verify(self.root)['skills']):
                self.assertEqual((self.home / target / name / 'SKILL.md').read_bytes(),
                                 (self.root / 'skills/vendor' / name / 'SKILL.md').read_bytes())
        self.assertTrue(all(a[0] == 'ok' for a in self.run_install()))
        self.assertFalse((self.home / '.local').exists())

    def test_conflicts_backed_up_and_unselected_preserved(self):
        parent = self.home / '.agents/skills'
        parent.mkdir(parents=True)
        (parent / 'bro').mkdir()
        (parent / 'bro/local.txt').write_text('my edits')
        (parent / 'how').write_text('existing file')
        (parent / 'why').symlink_to('../../missing')
        (parent / 'gh-cli').mkdir()
        (parent / 'gh-cli/SKILL.md').write_text('unselected')
        self.run_install()
        backup = next((self.home / '.local/state/dotfiles/backups').iterdir())
        self.assertEqual((backup / '.agents/skills/bro/local.txt').read_text(), 'my edits')
        self.assertEqual((backup / '.agents/skills/how').read_text(), 'existing file')
        self.assertEqual((backup / '.agents/skills/why').readlink(), Path('../../missing'))
        self.assertEqual((parent / 'gh-cli/SKILL.md').read_text(), 'unselected')
        # Exercise the documented recovery procedure for a directory replacement.
        (parent / 'bro').unlink()
        (backup / '.agents/skills/bro').rename(parent / 'bro')
        self.assertEqual((parent / 'bro/local.txt').read_text(), 'my edits')

    def test_failed_link_restores_original(self):
        parent = self.home / '.agents/skills'
        parent.mkdir(parents=True)
        original = parent / 'blast-radius'
        original.write_text('preserve me')
        with patch.object(Path, 'symlink_to', side_effect=OSError('failed')):
            with self.assertRaises(OSError):
                self.run_install()
        self.assertEqual(original.read_text(), 'preserve me')

    def test_modified_vendor_fails_before_writes(self):
        (self.root / 'skills/vendor/bro/SKILL.md').write_text('modified')
        with self.assertRaisesRegex(ValueError, 'Content differs'):
            self.run_install()
        self.assertEqual(list(self.home.iterdir()), [])

    def test_missing_support_file_fails(self):
        (self.root / 'skills/vendor/writing-for-agents/SKILL-MECHANICS.md').unlink()
        with self.assertRaisesRegex(ValueError, 'inventory differs'):
            self.run_install()
        self.assertEqual(list(self.home.iterdir()), [])

    def test_linked_parent_rejected_before_writes(self):
        outside = Path(self.temp.name) / 'outside'
        outside.mkdir()
        (self.home / '.claude').symlink_to(outside)
        with self.assertRaisesRegex(ValueError, 'real directory'):
            self.run_install()
        self.assertEqual(list(outside.iterdir()), [])
        self.assertFalse((self.home / '.agents').exists())

    def test_linked_backup_parent_rejected(self):
        (self.home / '.local').symlink_to(Path(self.temp.name))
        with self.assertRaisesRegex(ValueError, 'real directory'):
            self.run_install()
        self.assertFalse((self.home / '.agents').exists())

    def test_path_traversal_rejected(self):
        path = self.root / 'skills/manifest.json'
        data = json.loads(path.read_text())
        data['targets'] = ['../escape']
        path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'Unsafe relative path'):
            self.run_install()
        self.assertEqual(list(self.home.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
