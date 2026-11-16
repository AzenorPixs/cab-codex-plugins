"""Délais de surveillance Git conservés en base."""
from django.db import transaction
from .core.commands import require
from .core.models import Configuration

DEFAULTS = {'quiet_seconds': 7, 'interval_seconds': 30, 'maximum_seconds': 70}


def read():
    row, _ = Configuration.objects.get_or_create(key='git_monitor', defaults={'value': DEFAULTS.copy()})
    return {**DEFAULTS, **row.value} if isinstance(row.value, dict) else DEFAULTS.copy()


def save(values):
    require(isinstance(values, dict) and set(values) == set(DEFAULTS), 'git-monitor-settings-invalid', 400)
    require(all(type(value) is int and 1 <= value <= 86400 for value in values.values()), 'git-monitor-settings-invalid', 400)
    require(values['maximum_seconds'] >= values['quiet_seconds'], 'git-monitor-settings-invalid', 400)
    with transaction.atomic():
        row, _ = Configuration.objects.select_for_update().get_or_create(key='git_monitor', defaults={'value': DEFAULTS.copy()})
        row.value = values
        row.save(update_fields=['value', 'updated'])
    return values
