"""Règle unique des versions et tags CAB ; aucun préfixe implicite."""
import re

VERSION=re.compile(r'[\w.+-]+\Z')
PREFIX=re.compile(r'^[vV](?=[0-9])')


class VersionError(ValueError):
    pass


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
