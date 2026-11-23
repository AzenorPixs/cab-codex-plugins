"""Contrôles de périmètre et de constructeur sans publier de référence distante."""
import hashlib
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cab_platform.settings')
import django
django.setup()

from cab_platform import delivery_scope, session_delivery
from cab_platform.core.commands import Refused


class DeliveryScopeTests(unittest.TestCase):
    def test_two_scopes_and_frozen_project_tree(self):
        with TemporaryDirectory(dir=ROOT / '.cab-tests' / 'DCAB') as directory:
            root = Path(directory)
            env = {**os.environ, 'GIT_OPTIONAL_LOCKS':'0', 'GIT_AUTHOR_NAME': 'CAB', 'GIT_AUTHOR_EMAIL': 'cab@example.test',
                   'GIT_COMMITTER_NAME': 'CAB', 'GIT_COMMITTER_EMAIL': 'cab@example.test'}
            def git(*args, alternate=None):
                selected = {**env, 'GIT_INDEX_FILE': str(alternate)} if alternate else env
                return subprocess.check_output(['/usr/bin/git', '-C', directory, *args], env=selected,
                                               stderr=subprocess.DEVNULL).decode().strip()
            git('init')
            for path in ('own.txt', 'working.txt', 'shared.txt', 'other.txt'):
                (root / path).write_text('initial')
            git('add', '--', 'own.txt', 'working.txt', 'shared.txt', 'other.txt')
            git('commit', '-m', 'initial')
            head = git('rev-parse', 'HEAD')
            gitdir = root / '.git'
            (gitdir / 'cab-session-index').mkdir()
            def index(key, filename):
                token = hashlib.sha256((key + ':native').encode()).hexdigest()
                path = gitdir / 'cab-session-index' / (token + '.index')
                git('read-tree', head, alternate=path)
                (root / filename).write_text(key)
                git('add', '--', filename, alternate=path)
                return SimpleNamespace(change_id=key, session_id='native', index_path=str(path),
                                       base_head=head, state='OPEN', origin={})
            own = index('own-change', 'own.txt')
            other = index('other-change', 'other.txt')
            (root / 'other.txt').write_text('initial')
            (root / 'working.txt').write_text('travail')
            (root / 'shared.txt').write_text('index-commun')
            git('add', '--', 'shared.txt')
            (root / '.env').write_text('valeur exclue')
            (root / 'new.txt').write_text('nouveau')
            project = SimpleNamespace(root=directory, owner_uid=os.getuid(), owner_gid=os.getgid())
            changes = MagicMock()
            changes.filter.return_value.order_by.return_value = [own, other]
            effects = MagicMock()
            effects.filter.return_value.exclude.return_value.exists.return_value = False
            before = [(Path(index.index_path).read_bytes()) for index in (own, other)]
            with patch('cab_platform.git_commit_remove.context', return_value=({}, env)), \
                    patch('cab_platform.session_git.context', return_value=({}, env)), \
                    patch('cab_platform.session_git.probe', return_value=1), \
                    patch.object(delivery_scope.GitSessionIndex, 'objects', changes), \
                    patch.object(delivery_scope.GitSessionEffect, 'objects', effects):
                scoped = session_delivery.preflight_commit(project, own, '2.0.0', ['own.txt'])
                complete = session_delivery.preflight_commit(project, own, '2.0.0', ['own.txt'], complete=True)
            self.assertEqual(scoped['paths'], ['own.txt'])
            self.assertEqual(set(complete['paths']), {'own.txt', 'working.txt', 'shared.txt', 'other.txt', 'new.txt'})
            tree = complete['full']['tree']
            self.assertEqual(git('show', tree + ':other.txt'), 'other-change')
            (root / 'working.txt').write_text('modification après capture')
            self.assertEqual(git('show', tree + ':working.txt'), 'travail')
            self.assertEqual(git('rev-parse', 'HEAD'), head)
            self.assertEqual(before, [Path(index.index_path).read_bytes() for index in (own, other)])

    def test_native_builder_with_receipt_and_projection(self):
        project = SimpleNamespace(root='/fixture')
        values = {'PROJECT_DEBIAN_PACKAGE': 'Yes', 'PROJECT_VERSION': '2.0.0'}
        records = []
        def build(_project, _config, announce):
            announce({'child': {'pid': 10}})
            return 0
        with patch('cab_platform.project_metadata.read_metadata', return_value={'state':'ready','values':values}), \
                patch.dict('cab_platform.project_artifacts.BUILDERS', {'debian':build}), \
                patch('cab_platform.project_artifacts.refresh') as refresh:
            receipt = session_delivery.execute_native_build(project,'debian','2.0.0',records.append)
            self.assertEqual(receipt['builder'], 'cab')
            self.assertEqual(receipt['exit_code'], 0)
            self.assertEqual(records[0]['child']['pid'], 10)
            refresh.assert_called_once_with(project,'debian')
            with self.assertRaisesRegex(Refused,'session-delivery-build-config-changed'):
                session_delivery.execute_native_build(project,'debian','2.0.1',records.append)


if __name__ == '__main__':
    unittest.main(verbosity=2)
