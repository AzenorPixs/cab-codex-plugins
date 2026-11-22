"""Accusé du skill Version et propositions corrélées à un RUN."""

from django.db import transaction

from .change_stage_metrics import number_for
from .core import commands as c
from .core.models import Event
from .core.monitor import task_source
from .versioning import VersionError, candidate, policy_parts


REVISION = '1.0.0'


def _authority(run):
    return run.mandate.get('orchestrator_id') if run.mode == 'piloted' else run.actor_id


def status(run) -> dict:
    required = run.cycle_steps == 12
    acknowledged = required and Event.objects.filter(
        run=run, kind='version-skill-acknowledged', data__revision=REVISION,
        data__actor=_authority(run), data__change=run.change, data__generation=run.generation,
    ).exists()
    return {'skill': 'Version', 'revision': REVISION, 'required': required,
            'acknowledged': acknowledged, 'authority': _authority(run)}


def require_acknowledged(run) -> None:
    gate = status(run)
    c.require(not gate['required'] or gate['acknowledged'], 'version-skill-ack-required', 409)


@transaction.atomic
def acknowledge(actor, data) -> dict:
    run = c.run_scope(actor, data['run_id'], data['project_id'], lock=True, owner=False)
    c.require(run.cycle_steps == 12 and actor.pk == _authority(run),
              'version-skill-reader-required', 403)
    c.require(data.get('confirmed') is True and data.get('revision') == REVISION,
              'version-skill-confirmation-required', 400)
    if status(run)['acknowledged']:
        return status(run)
    from .stage_protocol import enabled,KEY
    c.require(not enabled(run) or run.configuration[KEY].get('current',{}).get('stage')==number_for(run,'version-skill'),
              'stage-versioning-not-started')
    c.working(run)
    c.require(run.change_record_id is not None and (run.stage or 0) >= number_for(run, 'specification'),
              'version-skill-specification-required', 409)
    path, source_state = task_source(run.change_record)
    c.require(path is not None and source_state in ('open', 'archived') and path.is_file(),
              'version-skill-specification-required', 409)
    run.stage = number_for(run, 'version-skill')
    run.phase = 'VERSION_SKILL'
    run.save(update_fields=['stage', 'phase', 'updated'])
    c.event(run, 'version-skill-acknowledged', {
        'change': run.change, 'actor': actor.pk, 'revision': REVISION,
        'generation': run.generation, 'source': str(path.relative_to(run.project.root)),
    })
    return status(run)


@transaction.atomic
def propose(actor, data) -> dict:
    run = c.run_scope(actor, data['run_id'], data['project_id'], lock=True)
    c.require(run.cycle_steps == 12, 'version-skill-cycle-required', 409)
    c.working(run)
    require_acknowledged(run)
    from .session_delivery import version_policy
    policy = version_policy(run)
    position = data['position']
    reason = data['reason']
    c.require(isinstance(reason, str) and 0 < len(reason.strip()) <= 2000,
              'version-choice-reason-required', 400)
    explicit = data.get('explicit_version')
    try:
        if explicit:
            policy_parts(explicit, policy['numeric_components'])
            version = explicit
        else:
            version = candidate(policy['current_version'], policy['numeric_components'], position)
    except VersionError as error:
        raise c.Refused(str(error), 400) from error
    receipt = {'version': version, 'current_version': policy['current_version'],
               'policy': policy['numeric_components'], 'position': None if explicit else position,
               'coder': actor.pk, 'reason': reason.strip(), 'generation': run.generation}
    if not Event.objects.filter(run=run, kind='version-proposed', data=receipt).exists():
        c.event(run, 'version-proposed', receipt)
    return receipt
