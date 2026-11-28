"""Relances d’inactivité ciblées, avec reçu durable et texte visible."""
from datetime import timedelta
from threading import Lock, Thread
from time import monotonic
from types import SimpleNamespace

from django.db import close_old_connections, transaction
from django.utils import timezone

from .core import commands as c
from .core.models import Actor, Configuration, Event, Run
from .measurement_sources import native_work_time
from .native_api import CodexAPI, NativeFailure

DEFAULTS = {'seconds':300,'second_seconds':1800,'last_seconds':14400}
ACTIVE = ('WORKING', 'REVIEW_PENDING')
PROGRESS = ('run-created','run-progress','run-stage-substep','git-stage-started',
            'operation-terminal','review-requested','review-decided',
            'exception-requested','exception-decided','mandate-archive-reconciled')
_guard = Lock()
_next_sweep = 0.0


def settings():
    stored = Configuration.objects.filter(pk='agent-stage-reminders').values_list('value',flat=True).first() or {}
    return {key:stored.get(key,value) for key,value in DEFAULTS.items()}


def configure(seconds, second_seconds, last_seconds):
    c.require(type(seconds) is int and (seconds == 0 or 30 <= seconds <= 86_400),
              'agent-reminder-delay-invalid',400)
    c.require(type(second_seconds) is int and type(last_seconds) is int
              and max(30,seconds) <= second_seconds <= last_seconds <= 86_400,
              'agent-reminder-escalation-invalid',400)
    value = {'seconds':seconds,'second_seconds':second_seconds,'last_seconds':last_seconds}
    Configuration.objects.update_or_create(pk='agent-stage-reminders',defaults={'value':value})
    return value


def recipient(run):
    exceptions = Event.objects.filter(run=run,kind__in=['exception-requested','exception-decided']).order_by('pk').values_list('kind','data')
    open_requests = set()
    for kind,data in exceptions:
        if kind == 'exception-requested':
            open_requests.add(data.get('id'))
        else:
            open_requests.discard(data.get('id'))
    if run.mode == 'piloted' and (open_requests or run.state == 'REVIEW_PENDING'):
        key = run.mandate.get('orchestrator_id')
        actor = Actor.objects.filter(pk=key,active=True).first() if key else None
        thread = run.configuration.get('reminder_orchestrator_thread')
        action = 'répondre à la demande de décision' if open_requests else 'effectuer la revue'
        return actor, thread, 'orchestrateur', action
    if run.state == 'REVIEW_PENDING' or open_requests:
        return run.actor, run.session_id, 'responsable de la session', 'traiter la décision ou la revue'
    return run.actor, run.session_id, 'codeur', 'indiquer en une phrase l’avancement ou le blocage'


def _dispatch(run, actor, thread, message):
    current = Run.objects.get(pk=run.pk)
    if current.state != run.state or current.stage != run.stage or current.suspension:
        return {'state':'CANCELLED','reason':'reminder-phase-changed'}
    if actor is None or not thread:
        return {'state':'VISIBLE','reason':'reminder-native-recipient-unavailable'}
    native = actor.native
    if actor.agent == 'opencode':
        from .opencode import control, session
        import httpx
        target = SimpleNamespace(actor=actor, session_id=thread, project=run.project)
        try:
            status = session(target).get('status')
            if (status.get('type') if isinstance(status,dict) else status) != 'idle':
                return {'state':'VISIBLE','reason':'reminder-native-idle-unconfirmed'}
        except (c.Refused,httpx.HTTPError,OSError,ValueError):
            return {'state':'VISIBLE','reason':'reminder-native-recipient-unavailable'}
        try:
            control(target,{'native_action':'prompt','text':message})
            return {'state':'SENT'}
        except (c.Refused,httpx.HTTPError,OSError,ValueError):
            return {'state':'UNKNOWN','reason':'reminder-native-result-unconfirmed'}
    if actor.agent not in ('codex','codex-cli') or not native.get('control_socket'):
        return {'state':'VISIBLE','reason':'reminder-native-transport-unavailable'}
    try:
        with CodexAPI(native.get('control_socket'),native.get('control_binary'),actor.uid,native.get('control_process'),timeout=8) as api:
            return {'state':'SENT','turn_id':api.remind_thread(thread,run.project.root,actor.uid,message)}
    except NativeFailure as error:
        state = 'UNKNOWN' if error.state == 'UNKNOWN' else 'VISIBLE'
        return {'state':state,'reason':error.code}
    except (OSError,ValueError):
        return {'state':'UNKNOWN','reason':'reminder-native-result-unconfirmed'}


def _activity(run, actor, thread, role):
    last = (Event.objects.filter(run=run,kind__in=PROGRESS).order_by('-pk')
            .values_list('created',flat=True).first() or run.created)
    native = (native_work_time(run,actor=actor,thread=thread) if actor and thread else None) if role == 'orchestrateur' else native_work_time(run)
    if native and native[-1]:
        reminders = set(Event.objects.filter(run=run,kind='stage-reminder',created__gte=last)
                        .exclude(data__turn_id__isnull=True).values_list('data__turn_id',flat=True))
        for at,turn,reply in native[-1]:
            if reply or turn not in reminders:
                last = max(last,at)
    return last


def due_reminder(last, attempts, now, delays):
    """Une relance au plus par échéance, sans reprise d’un envoi indéterminé."""
    if not delays['seconds']:
        return None
    attempts = [attempt for attempt in attempts if attempt.created >= last and attempt.data.get('state')!='CANCELLED']
    if len(attempts) >= 5 or any(a.data.get('state') in ('INTENT','UNKNOWN') for a in attempts):
        return None
    tier = min(max(len(attempts) - 2, 0), 2)
    seconds = (delays['seconds'],delays['second_seconds'],delays['last_seconds'])[tier]
    previous = attempts[0].created if attempts else last
    return len(attempts) + 1 if now - previous >= timedelta(seconds=seconds) else None


def sweep(now=None):
    from .stage_telemetry import dispatch
    dispatch(now or timezone.now())
    delays = settings()
    seconds = delays['seconds']
    if not seconds:
        return
    now = now or timezone.now()
    deadline = now - timedelta(seconds=seconds)
    rows = Run.objects.filter(state__in=ACTIVE,suspension='',created__lte=deadline).select_related('actor','project')
    for run in rows.order_by('pk').iterator():
        actor, thread, role, action = recipient(run)
        last = _activity(run,actor,thread,role)
        if last > deadline or not run.stage:
            continue
        from .change_stage_metrics import keys_for,stage_names
        if keys_for(run)[run.stage-1] in ('publication','statistics','closure'):
            continue
        label = stage_names(run)[run.stage-1]
        from .core.models import Maintenance,Operation
        if Operation.objects.filter(run=run,state__in=('INTENT','WAITING','RUNNING')).exists():
            continue
        with transaction.atomic():
            current = Run.objects.select_for_update(of=('self',)).get(pk=run.pk)
            if current.state != run.state or current.stage != run.stage or current.suspension or Maintenance.objects.filter(state__in=('PREPARED','INSTALLING')).exists():
                continue
            attempts = list(Event.objects.filter(run=current,kind='stage-reminder',created__gte=last,data__role=role).order_by('-pk')[:5])
            number = due_reminder(last,attempts,now,delays)
            if number is None:
                continue
            heading = 'Dernier rappel CAB' if number == 5 else 'Rappel CAB'
            message = (f'{heading} — {current.run_id}, étape {label}. '
                       f'Dernière activité observée il y a {int((now-last).total_seconds())} s. '
                       f'Action attendue ({role}) : {action}.')
            attempt = Event.objects.create(project_id=current.project_id,run=current,kind='stage-reminder',
                data={'message':message,'role':role,'stage':current.stage,'number':number,'state':'INTENT'})
            Run.objects.filter(pk=current.pk).update(updated=timezone.now())
        receipt = _dispatch(run,actor,thread,message)
        attempt.data = {**attempt.data, **receipt}
        attempt.save(update_fields=['data'])
        Run.objects.filter(pk=run.pk).update(updated=timezone.now())


def launch():
    global _next_sweep
    if monotonic() < _next_sweep:
        return
    if not _guard.acquire(blocking=False):
        return
    _next_sweep = monotonic() + 10

    def worker():
        try:
            try:sweep()
            except Exception as error:
                import logging
                logging.getLogger(__name__).warning('Rappels CAB momentanément indisponibles',extra={'code':type(error).__name__})
        finally:
            close_old_connections()
            _guard.release()

    Thread(target=worker,name='cab-stage-reminders',daemon=True).start()
