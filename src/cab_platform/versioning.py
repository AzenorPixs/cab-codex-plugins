"""Règle unique des versions et tags CAB ; aucun préfixe implicite."""
from datetime import datetime
import re

VERSION=re.compile(r'[\w.+-]+\Z')
PREFIX=re.compile(r'^[vV](?=[0-9])')
NUMERIC_VERSION = re.compile(r'(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,6}\Z')
VERSION_TAG = re.compile(r'[vV]?(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,6}\Z')
OBJECT_ID = re.compile(r'(?:[a-f0-9]{40}|[a-f0-9]{64})\Z')
DEFAULT_POLICY = 3
POLICY_LABELS = (
    ('project-version',),
    ('project-version', 'change'),
    ('project-version', 'feature-addition-or-change', 'fix'),
    ('project-version', 'feature-addition', 'feature-change', 'fix'),
    ('major', 'minor', 'feature-addition', 'feature-change', 'fix'),
    ('major', 'minor', 'feature-addition', 'major-feature-change', 'minor-feature-change', 'fix'),
    ('major', 'minor', 'feature-addition', 'major-feature-change', 'minor-feature-change',
     'major-fix', 'minor-fix'),
)


class VersionError(ValueError):
    pass


class VersionTagCollision(VersionError):
    def __init__(self, names):
        super().__init__('version-tag-conversion-collision')
        self.names = tuple(names)


def numeric_parts(value: str) -> tuple[int, ...]:
    if not isinstance(value, str) or len(value) > 64 or not NUMERIC_VERSION.fullmatch(value):
        raise VersionError('numeric-version-invalid')
    return tuple(int(part) for part in value.split('.'))


def parse_policy(value: str) -> int:
    if not isinstance(value, str) or value not in tuple('1234567'):
        raise VersionError('version-policy-invalid')
    return int(value)


def inferred_policy(version: str | None) -> int:
    return DEFAULT_POLICY if version in (None, '') else len(numeric_parts(version))


def version_order_key(version: str) -> tuple[int, tuple[int, ...]]:
    """Compare le format avant les composantes numériques."""
    parts = numeric_parts(version)
    return len(parts), parts


def policy_parts(version: str, policy: int) -> tuple[int, ...]:
    if type(policy) is not int or not 1 <= policy <= len(POLICY_LABELS):
        raise VersionError('version-policy-invalid')
    parts = numeric_parts(version)
    if len(parts) != policy:
        raise VersionError('version-policy-mismatch')
    return parts


def render_parts(parts: tuple[int, ...] | list[int]) -> str:
    value = '.'.join(map(str, parts))
    numeric_parts(value)
    return value


def candidate(version: str, policy: int, position: int) -> str:
    parts = list(policy_parts(version, policy))
    if type(position) is not int or not 1 <= position <= policy:
        raise VersionError('version-position-invalid')
    parts[position - 1] += 1
    if position < policy:
        parts[position] = 0
    return render_parts(parts)


def convert_version(version: str, old_policy: int, new_policy: int, side: str) -> str:
    parts = policy_parts(version, old_policy)
    if type(new_policy) is not int or not 1 <= new_policy <= len(POLICY_LABELS):
        raise VersionError('version-policy-invalid')
    if side not in ('left', 'right'):
        raise VersionError('version-conversion-side-invalid')
    if new_policy > old_policy:
        padding = (0,) * (new_policy - old_policy)
        parts = padding + parts if side == 'left' else parts + padding
    elif new_policy < old_policy:
        parts = parts[-new_policy:] if side == 'left' else parts[:new_policy]
    return render_parts(parts)


def timestamp_tag(value: str) -> bool:
    formats = (
        (r'[0-9]{4}(?:\.[0-9]{2}){4}', '%Y.%m.%d.%H.%M'),
        (r'[0-9]{4}(?:-[0-9]{2}){5}', '%Y-%m-%d-%H-%M-%S'),
    )
    for pattern, date_format in formats:
        if re.fullmatch(pattern, value):
            try:
                datetime.strptime(value, date_format)
            except ValueError:
                return False
            return True
    return False


def local_tag_conversions(tags: dict[str, str], old_policy: int, new_policy: int,
                          side: str) -> tuple[dict[str, str], dict[str, str]]:
    """Calcule les renommages et l'inventaire final à partir des refs locales."""
    if type(old_policy) is not int or not 1 <= old_policy <= len(POLICY_LABELS):
        raise VersionError('version-policy-invalid')
    convert_version('.'.join(['0'] * old_policy), old_policy, new_policy, side)
    moves = {}
    destinations = {}
    for name in sorted(tags):
        prefix = name[0] if PREFIX.match(name) else ''
        value = name[len(prefix):]
        if timestamp_tag(value) or not NUMERIC_VERSION.fullmatch(value):
            continue
        if len(value) > 64 or len(value.split('.')) != old_policy:
            continue
        target = prefix + convert_version(value, old_policy, new_policy, side)
        if target in destinations:
            raise VersionTagCollision((destinations[target], name, target))
        destinations[target] = name
        moves[name] = target
    final_tags = {name: oid for name, oid in tags.items() if name not in moves}
    occupied = sorted(destinations.keys() & final_tags.keys())
    if occupied:
        raise VersionTagCollision((destinations[occupied[0]], occupied[0]))
    final_tags.update({target: tags[source] for source, target in moves.items()})
    for name in final_tags:
        segments = name.split('/')
        for index in range(1, len(segments)):
            prefix = '/'.join(segments[:index])
            if prefix in destinations:
                raise VersionTagCollision((destinations[prefix], prefix, name))
    return moves, final_tags


def local_tag_transaction(before: dict[str, str], after: dict[str, str]) -> bytes:
    """Prépare l'entrée de git update-ref --stdin --no-deref."""
    commands = ['start']
    for name in sorted(before.keys() | after.keys()):
        old, new = before.get(name), after.get(name)
        if old == new:
            continue
        if not VERSION_TAG.fullmatch(name) or any(
                not OBJECT_ID.fullmatch(oid) or set(oid) == {'0'}
                for oid in (old, new) if oid is not None):
            raise VersionError('version-tag-transaction-invalid')
        ref = f'refs/tags/{name}'
        if old is None:
            commands.append(f'create {ref} {new}')
        elif new is None:
            commands.append(f'delete {ref} {old}')
        else:
            commands.append(f'update {ref} {new} {old}')
    if len(commands) == 1:
        return b''
    return ('\n'.join(commands + ['prepare', 'commit']) + '\n').encode('ascii')


def canonical_version(value):
    if not isinstance(value,str) or len(value)>100 or not VERSION.fullmatch(value) or PREFIX.match(value):
        raise VersionError('version-without-prefix-required')
    return value


def historical_version(value):
    if isinstance(value,str) and PREFIX.match(value):value=value[1:]
    return canonical_version(value)


def version_tag(version=None,project_version=None):
    return canonical_version(project_version if version is None or version=='' else version)


def release_metadata(version=None,project_version=None):
    value=version_tag(version,project_version)
    return {'version':value,'tag_name':value,'name':value}


def validate_new_tag(name):
    if isinstance(name,str) and PREFIX.match(name):raise VersionError('version-tag-prefix-forbidden')
    return name
