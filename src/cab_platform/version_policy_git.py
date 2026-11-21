"""Adaptation des références Git locales, sous verrou du service appelant."""

import subprocess

from .core.commands import Refused, require
from .git_commit_remove import context
from .project_git import probe
from .versioning import OBJECT_ID, local_tag_transaction


def _git(project, options, env, *args: str, data: bytes | None = None):
    try:
        return subprocess.run(
            ['/usr/bin/git', '-C', project.root, '-c', 'core.fsmonitor=false',
             '-c', 'core.hooksPath=/dev/null', *args],
            input=data, cwd='/', env=env, timeout=30, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, **options,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Refused('version-policy-git-result-uncertain', 409) from error


def _inventory(project, options, env) -> dict[str, str]:
    result = _git(project, options, env, 'for-each-ref',
                  '--format=%(refname:strip=2)%00%(objectname)%00%(symref)', 'refs/tags')
    require(result.returncode == 0 and len(result.stdout) <= 4 * 1024 * 1024,
            'version-policy-git-tags-unavailable', 409)
    tags = {}
    try:
        for line in result.stdout.decode('utf-8').split('\n'):
            if not line:
                continue
            name, object_id, symref = line.split('\0')
            require(bool(name) and not symref and bool(OBJECT_ID.fullmatch(object_id)),
                    'version-policy-git-tag-unsupported', 409)
            tags[name] = object_id
    except ValueError as error:
        raise Refused('version-policy-git-tags-unavailable', 409) from error
    return tags


def snapshot(project) -> dict[str, str] | None:
    """Retourne None uniquement quand le dépôt n’existe pas."""
    status = probe(project)
    require(status is not None, 'version-policy-git-unavailable', 409)
    if status == 0:
        return None
    options, env = context(project)
    return _inventory(project, options, env)


def apply(project, expected: dict[str, str] | None, target: dict[str, str] | None) -> None:
    require((expected is None) == (target is None), 'version-policy-git-plan-invalid', 409)
    if expected is None:
        require(snapshot(project) is None, 'version-policy-git-preview-stale', 409)
        return
    options, env = context(project)
    require(_inventory(project, options, env) == expected, 'version-policy-git-preview-stale', 409)
    transaction = local_tag_transaction(expected, target)
    if not transaction:
        return
    result = _git(project, options, env, 'update-ref', '--no-deref', '--stdin', data=transaction)
    observed = _inventory(project, options, env)
    if result.returncode != 0 and observed == expected:
        raise Refused('version-policy-git-transaction-rejected', 409)
    require(observed == target, 'version-policy-git-result-uncertain', 409)
