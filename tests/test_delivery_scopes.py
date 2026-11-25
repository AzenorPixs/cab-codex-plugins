"""Contrôles de périmètre et de constructeur sans publier de référence distante."""
from contextlib import ExitStack, nullcontext
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
from django.conf import settings
if not settings.configured:
    settings.configure(SECRET_KEY='fixture', INSTALLED_APPS=['cab_platform.core'],
                       DATABASES={'default': {'ENGINE': 'django.db.backends.dummy'}}, USE_TZ=True)
import django
django.setup()

from cab_platform import delivery_scope, session_delivery
from cab_platform.core.commands import Refused


class DeliveryScopeTests(unittest.TestCase):
    def test_late_connector_refusal_preserves_version_for_same_delivery(self):
        from cab_platform.core import models

        actor = object()
        project = SimpleNamespace(pk='project', root='/fixture', owner_uid=os.getuid())
        run = SimpleNamespace(project=project, project_id=project.pk, run_id='run', session_id='sid',
                              change_record_id='change', coding_session_id='sid', cycle_steps=12,
                              configuration={'cycle_profile': 'publication-12-v1'})
        requirement = {'kind': 'publication', 'producer': 'producer'}
        plan = {'forges': [], 'debian': False, 'docker': False, 'env_sha256': 'config'}
        row = models.GitDelivery(pk=19)
        row.refresh_from_db = lambda: None

        with ExitStack() as stack:
            def mocked(name, **kwargs):
                return stack.enter_context(patch(name, **kwargs))

            managers = {model: stack.enter_context(patch.object(model, 'objects')) for model in (
                models.EvidenceProducer, models.FinalizationPlan, models.GitDelivery, models.GitDeliveryStep,
                models.GitFileReservation, models.GitSessionIndex, models.Operation, models.Project, models.Event)}
            managers[models.GitDelivery].filter.return_value.first.return_value = None
            managers[models.GitDelivery].get_or_create.return_value = row, True
            managers[models.Project].get.return_value = project
            managers[models.FinalizationPlan].filter.return_value.first.return_value = SimpleNamespace(
                policy={'nature': 'delivery', 'requirements': [requirement]})
            managers[models.GitFileReservation].filter.return_value.values_list.return_value = ['code.py']
            managers[models.Operation].filter.return_value.order_by.return_value = [
                SimpleNamespace(receipt={'exit_code': 0}, request={'phase': 'test'})]
            index = SimpleNamespace(pk=2, state='OPEN', index_path='/fixture/index', effects=MagicMock())
            index.effects.filter.return_value.exists.return_value = False
            managers[models.GitSessionIndex].filter.return_value.first.return_value = index
            managers[models.GitSessionIndex].select_for_update.return_value.get.return_value = index
            managers[models.Event].filter.return_value.order_by.return_value.first.return_value = None
            managers[models.EvidenceProducer].filter.return_value.exists.return_value = True
            mocked('django.db.transaction.atomic', side_effect=nullcontext)
            on_commit = mocked('django.db.transaction.on_commit')
            mocked('cab_platform.preexisting_git.git_guard', side_effect=nullcontext)
            mocked('cab_platform.core.commands.run_scope', return_value=run)
            mocked('cab_platform.core.commands.working')
            mocked('cab_platform.core.commands.no_pending', return_value=True)
            mocked('cab_platform.core.commands.revision', return_value='source')
            mocked('cab_platform.connector_process.identity', return_value={'pid': 42})
            mocked('cab_platform.project_metadata.synchronize')
            mocked('cab_platform.package_versions.require_aligned')
            mocked('cab_platform.version_skill.require_acknowledged')
            mocked('cab_platform.stage_protocol.enabled', return_value=True)
            mocked('cab_platform.session_delivery.version_policy',
                   return_value={'current_version': '1.0.0', 'numeric_components': 3})
            mocked('cab_platform.session_delivery.delivery_version_selection',
                   return_value={'previous_version': '1.0.0', 'policy': 3})
            mocked('cab_platform.session_delivery.ensure_delivery_producer', return_value='producer')
            mocked('cab_platform.session_delivery.delivery_preflight', side_effect=lambda *args, **kwargs: plan.copy())
            mocked('cab_platform.session_delivery.preflight_commit', return_value={'index_digest': 'index'})
            mocked('cab_platform.session_delivery._index_digest', return_value='index')
            mocked('cab_platform.session_delivery._publish_delivery')
            mocked('cab_platform.session_delivery._delivery_view', return_value={'state': 'PENDING'})
            write_version = mocked('cab_platform.session_delivery.update_version')
            prepare = mocked('cab_platform.publication_boundary.prepare',
                             return_value={'preparation': {}, 'statistics_job': 'stats', 'publication_ref': 'phase'})
            connector = mocked('cab_platform.core.connectors.lock_worker_binding',
                               side_effect=Refused('session-connector-unbound', 409))

            with self.assertRaisesRegex(Refused, 'session-connector-unbound'):
                session_delivery.start_delivery(actor, run, '1.0.1', 'connector', stage_authorized=True)
            write_version.assert_not_called()
            prepare.assert_not_called()
            managers[models.GitDelivery].get_or_create.assert_not_called()
            on_commit.assert_not_called()

            connector.side_effect = None
            result = session_delivery.start_delivery(actor, run, '1.0.1', 'connector', stage_authorized=True)
            self.assertEqual(result, {'state': 'PENDING'})
            write_version.assert_not_called()
            prepare.assert_called_once_with(run, commit_reports=True)
            managers[models.GitDelivery].get_or_create.assert_called_once()
            steps = managers[models.GitDeliveryStep].bulk_create.call_args.args[0]
            self.assertEqual([(step.key, step.state) for step in steps[:2]],
                             [('version', 'PENDING'), ('version-projection', 'PENDING')])
            on_commit.assert_called_once()

    def test_two_scopes_and_frozen_project_tree(self):
        with TemporaryDirectory() as directory:
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
            (gitdir / 'cab-session-index').mkdir(mode=0o700)
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
            (root / 'STATISTICS.md').write_text('rapport global')
            (root / 'history').mkdir()
            (root / 'history' / 'BLOCKERS.md').write_text('rapport réservé ailleurs')
            git('add','--','history/BLOCKERS.md',alternate=other.index_path)
            project = SimpleNamespace(root=directory, owner_uid=os.getuid(), owner_gid=os.getgid(),
                                      public_metadata={'values':{'GIT_USER_NAME':'CAB','GIT_USER_EMAIL':'cab@example.test'}})
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
                publication = session_delivery.preflight_commit(project, own, '2.0.0', ['own.txt'], include_reports=True)
                with patch('cab_platform.package_versions.require_aligned'):
                    packet=session_delivery.prepare_commit(project,own,'2.0.0',['own.txt'],publication_reports=publication['publication_reports'])
                    self.assertEqual(set(packet['paths']),{'own.txt','STATISTICS.md','history/BLOCKERS.md'})
                    self.assertEqual(git('show',packet['commit']+':history/BLOCKERS.md'),'rapport réservé ailleurs')
                    self.assertEqual(git('show',packet['commit']+':shared.txt'),'initial')
                    (root/'STATISTICS.md').write_text('rapport global modifié')
                    with self.assertRaisesRegex(Refused,'session-delivery-reports-changed'):
                        session_delivery.prepare_commit(project,own,'2.0.0',['own.txt'],publication_reports=publication['publication_reports'])
            self.assertEqual(scoped['paths'], ['own.txt'])
            self.assertEqual(set(complete['paths']), {'own.txt', 'working.txt', 'shared.txt', 'other.txt', 'new.txt',
                                                     'STATISTICS.md','history/BLOCKERS.md'})
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
