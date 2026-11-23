"""Retrait de commits de l'historique courant sans modifier les fichiers."""
import subprocess
from django.db import connection
from .core.commands import Refused, require
from .core.models import Project
from .git_commit_remove import OID, context, inspect, run
from .project_git import _refresh_status


def remove_selected(project_id, expected_head, selected):
    require(isinstance(expected_head, str) and OID.fullmatch(expected_head) and isinstance(selected, list) and 0 < len(selected) <= 1000 and all(isinstance(item, str) and OID.fullmatch(item) for item in selected) and len(set(selected)) == len(selected) and expected_head not in selected, 'git-history-remove-invalid', 400)
    project = Project.objects.get(pk=project_id)
    options, env = context(project)
    selected = set(selected)
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s, %s)', [7348501, 7348502])
    moved = False
    try:
        before = inspect(project)
        require(before['head'] == expected_head, 'git-commit-remove-changed', 409)
        result = run(project, options, env, 'rev-list', '--reverse', '--topo-order', '--parents', expected_head)
        require(result.returncode == 0 and len(result.stdout) <= 16777216, 'git-history-remove-unavailable', 409)
        records = [line.decode('ascii', 'strict').split() for line in result.stdout.splitlines()]
        require(all(row and all(OID.fullmatch(value) for value in row) for row in records), 'git-history-remove-unavailable', 409)
        require(selected.issubset({row[0] for row in records}), 'git-commit-remove-changed', 409)
        replacements = {}
        for row in records:
            oid, parents = row[0], row[1:]
            require(all(parent in replacements for parent in parents), 'git-history-remove-unavailable', 409)
            new_parents = list(dict.fromkeys(parent for old in parents for parent in replacements[old]))
            if oid in selected:
                replacements[oid] = new_parents
                continue
            if new_parents == parents:
                replacements[oid] = [oid]
                continue
            original = run(project, options, env, 'cat-file', 'commit', oid)
            require(original.returncode == 0 and len(original.stdout) <= 4194304 and b'\n\n' in original.stdout, 'git-history-remove-unavailable', 409)
            header, message = original.stdout.split(b'\n\n', 1)
            lines = header.split(b'\n')
            require(not any(line.startswith((b'gpgsig ', b'gpgsig-sha256 ', b'mergetag ')) for line in lines), 'git-history-remove-signed', 409)
            require(lines and lines[0].startswith(b'tree '), 'git-history-remove-unavailable', 409)
            body = b'\n'.join([lines[0], *[b'parent ' + parent.encode('ascii') for parent in new_parents], *[line for line in lines[1:] if not line.startswith(b'parent ')]]) + b'\n\n' + message
            try:
                made = subprocess.run(['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false', 'hash-object', '-t', 'commit', '-w', '--stdin'], input=body, cwd='/', env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30, **options)
            except (OSError, subprocess.TimeoutExpired):
                raise Refused('git-history-remove-unavailable', 409) from None
            new_oid = made.stdout.decode('ascii', 'strict').strip()
            require(made.returncode == 0 and OID.fullmatch(new_oid), 'git-history-remove-unavailable', 409)
            replacements[oid] = [new_oid]
        require(len(replacements[expected_head]) == 1, 'git-history-remove-unavailable', 409)
        latest = inspect(project)
        require(latest['head'] == expected_head and latest['branch'] == before['branch'], 'git-commit-remove-changed', 409)
        changed = run(project, options, env, 'update-ref', '-m', 'CAB: retrait de commits', 'refs/heads/' + before['branch'], replacements[expected_head][0], expected_head)
        require(changed.returncode == 0, 'git-commit-remove-changed', 409)
        moved = True
        try:
            _refresh_status(project_id)
        except Exception:
            raise Refused('git-commit-remove-partial', 409) from None
        return {'removed': len(selected)}
    except (UnicodeError, Refused) as error:
        if moved:
            raise Refused('git-commit-remove-partial', 409) from None
        if isinstance(error, Refused):
            raise
        raise Refused('git-history-remove-unavailable', 409) from None
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s, %s)', [7348501, 7348502])
