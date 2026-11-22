"""Chronologie concurrente du cycle CAB dans PostgreSQL isolé."""
import os
import unittest
from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

import django
from django.apps import apps
from django.conf import settings

if not apps.ready and os.environ.get('CAB_EFFECTS_FIXTURE') == '1':
    django.setup()


@unittest.skipUnless(os.environ.get('CAB_EFFECTS_FIXTURE') == '1', 'PostgreSQL isolé requis')
class PublicationCycleTests(unittest.TestCase):
    def test_archived_change_freezes_and_renders_without_a_requested_commit(self):
        self.assertTrue(settings.DATABASES['default']['NAME'].startswith('cab_effects_fixture_'))
        from django.db import transaction
        from cab_platform import change_stage_metrics as metrics, phase_statistics, publication_boundary
        from cab_platform.core.monitor import identity
        from cab_platform.core.models import Actor, Change, Project, Run

        with TemporaryDirectory() as directory, transaction.atomic():
            root = Path(directory)
            archive = root / 'openspec/changes/archive/2026-11-22-fixture'
            archive.mkdir(parents=True)
            (archive / 'proposal.md').write_text('# Fixture\n')
            (archive / 'tasks.md').write_text('- [x] Travail terminé\n')
            key = uuid4().hex
            project = Project.objects.create(pk=key, root=directory, owner_uid=os.getuid())
            actor = Actor.objects.create(pk=key, uid=os.getuid(), agent='fixture', token_hash=key)
            actor.projects.add(project)
            change = Change.objects.create(pk=identity([key, 'fixture']), project=project, identifier='fixture')
            run = Run.objects.create(project=project, actor=actor, change_record=change,
                                     run_id=key, session_id=key, change='fixture', mode='direct',
                                     stage=9, cycle_steps=12, mandate={'paths': ['openspec']},
                                     configuration={'cycle_profile': metrics.PROFILE})
            metrics.observe(run)
            boundary = publication_boundary.prepare(run, publication=False)
            self.assertEqual(run.stage, 12)
            with patch('cab_platform.reports_git.commit') as commit:
                phase_statistics.execute(boundary['statistics_job'])
            commit.assert_not_called()
            result = phase_statistics.result_for(run)
            self.assertEqual(result['state'], 'COMPLETED', result)
            self.assertEqual(result['result']['local_commit']['state'], 'NOT_REQUESTED')
            self.assertTrue((archive / 'STATISTICS.md').is_file())
            self.assertTrue((root / 'STATISTICS.md').is_file())
            overview = metrics.summarize(change,run)
            statistics = overview['stages'][9]
            actions = {child['key']:child['iterations'][0] for child in statistics['children']}
            change_action = actions['statistics.calculate-change']
            global_action = actions['statistics.calculate-global']
            self.assertLessEqual(change_action['ended_at'],global_action['started_at'])
            self.assertEqual([change_action['state'],global_action['state']],['COMPLETED','COMPLETED'])
            self.assertEqual(change_action['source'],'cab')
            transaction.set_rollback(True)

    def test_parallel_phases_keep_distinct_iterations_and_elapsed_cycle(self):
        self.assertTrue(settings.DATABASES['default']['NAME'].startswith('cab_effects_fixture_'))
        from django.db import transaction
        from django.utils import timezone
        from cab_platform import change_stage_metrics as metrics, stage_substeps
        from cab_platform.core.models import Actor, Change, Project, Run

        with TemporaryDirectory() as directory, transaction.atomic():
            key = uuid4().hex
            project = Project.objects.create(pk=key, root=directory, owner_uid=os.getuid())
            actor = Actor.objects.create(pk=key, uid=os.getuid(), agent='fixture', token_hash=key)
            change = Change.objects.create(pk=key, project=project, identifier='fixture')
            run = Run.objects.create(project=project, actor=actor, change_record=change,
                                     run_id=key, session_id=key, change='fixture', mode='direct',
                                     cycle_steps=12, configuration={'cycle_profile': metrics.PROFILE})
            now = timezone.now() - timedelta(seconds=30)
            for number in range(1, 10):
                run.stage = number
                run.save(update_fields=['stage'])
                metrics.observe(run, now + timedelta(seconds=number - 1))
            statistics = stage_substeps.phase(run, 'statistics', 'stats', 'RUNNING')
            publish = stage_substeps.phase(run, 'publication', 'publish', 'RUNNING')
            run.stage = 12
            run.save(update_fields=['stage'])
            metrics.observe(run)
            first = stage_substeps.update(run, 'build', 'build-1', 'RUNNING', phase='publication')
            stage_substeps.update(run, 'build', 'build-1', 'FAILED', phase='publication')
            second = stage_substeps.update(run, 'build', 'build-2', 'RUNNING', phase='publication')
            stage_substeps.update(run, 'build', 'build-2', 'COMPLETED', phase='publication')
            self.assertEqual(first.parent_id, publish.pk)
            self.assertEqual(second.iteration_number, 2)
            self.assertIsNone(statistics.ended_at)
            stage_substeps.phase(run, 'statistics', 'stats', 'COMPLETED')
            stage_substeps.phase(run, 'publication', 'publish', 'COMPLETED')
            run.state = 'CLOSED'
            run.save(update_fields=['state'])
            end = now + timedelta(seconds=45)
            metrics.observe(run, end)
            overview = metrics.summarize(change, run)
            self.assertEqual(overview['complete_cycle_duration_seconds'], 45)
            publication = overview['stages'][10]
            self.assertEqual([entry['state'] for entry in publication['children'][0]['iterations']], ['FAILED', 'COMPLETED'])
            self.assertGreater(overview['duration_seconds'], 0)
            transaction.set_rollback(True)
