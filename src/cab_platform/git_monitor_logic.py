"""Calcul pur des échéances de la file de surveillance Git."""


def mark_pending(pending, project_id, now):
    first, _ = pending.get(project_id, (now, now))
    pending[project_id] = (first, now)


def next_ready(pending, last_started, settings, now):
    for project_id, (first, last) in pending.items():
        if now - last_started.get(project_id, float('-inf')) < settings['interval_seconds']:
            continue
        if now - last >= settings['quiet_seconds'] or now - first >= settings['maximum_seconds']:
            return project_id
    return None
