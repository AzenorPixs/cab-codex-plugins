"""Délais de surveillance Git conservés en base."""
from django.db import transaction
from .core.commands import require
from .core.models import Configuration

DEFAULTS = {'quiet_seconds': 7, 'interval_seconds': 30, 'maximum_seconds': 70, 'forge_auto_interval_minutes': 60}


def read():
    row, _ = Configuration.objects.get_or_create(key='git_monitor', defaults={'value': DEFAULTS.copy()})
    if isinstance(row.value, dict) and 'forge_auto_interval_minutes' not in row.value:
        with transaction.atomic():
            row = Configuration.objects.select_for_update().get(key='git_monitor')
            if isinstance(row.value, dict) and 'forge_auto_interval_minutes' not in row.value:
                row.value = {**DEFAULTS, **row.value}
                row.save(update_fields=['value', 'updated'])
    return {**DEFAULTS, **row.value} if isinstance(row.value, dict) else DEFAULTS.copy()


def save(values):
    require(isinstance(values, dict) and set(values) == set(DEFAULTS), 'git-monitor-settings-invalid', 400)
    require(all(type(values[key]) is int and 1 <= values[key] <= 86400 for key in ('quiet_seconds', 'interval_seconds', 'maximum_seconds')), 'git-monitor-settings-invalid', 400)
    require(type(values['forge_auto_interval_minutes']) is int and 1 <= values['forge_auto_interval_minutes'] <= 1440, 'git-monitor-settings-invalid', 400)
    require(values['maximum_seconds'] >= values['quiet_seconds'], 'git-monitor-settings-invalid', 400)
    with transaction.atomic():
        row, _ = Configuration.objects.select_for_update().get_or_create(key='git_monitor', defaults={'value': DEFAULTS.copy()})
        row.value = values
        row.save(update_fields=['value', 'updated'])
    return values
