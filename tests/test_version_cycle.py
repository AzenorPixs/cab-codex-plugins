"""Contrat de calcul et de conversion des politiques CAB."""

import unittest

from cab_platform.project_metadata import initialize_version_policy
from cab_platform.versioning import (
    VersionError,
    candidate,
    convert_version,
    inferred_policy,
    local_tag_conversions,
    local_tag_transaction,
    parse_policy,
    version_order_key,
)


class VersionPolicyTests(unittest.TestCase):
    def test_existing_env_is_preserved_and_initialized_once(self):
        raw = b'PROJECT_NAME=Example\nPROJECT_VERSION="v0.3.8.0" # release\n'
        expected = raw + b'PROJECT_VERSION_POLICY=4\n'
        self.assertEqual(initialize_version_policy(raw), expected)
        self.assertEqual(initialize_version_policy(expected), expected)
        self.assertEqual(initialize_version_policy(b'PROJECT_VERSION=\n'),
                         b'PROJECT_VERSION=\nPROJECT_VERSION_POLICY=3\n')
        for invalid in (b'PROJECT_VERSION=bad\n', b'PROJECT_VERSION_POLICY=\n',
                        b'PROJECT_VERSION=1.2.3\nPROJECT_VERSION_POLICY=4\n'):
            with self.subTest(invalid=invalid), self.assertRaises(VersionError):
                initialize_version_policy(invalid)

    def test_initialization_and_last_increment_for_every_policy(self):
        self.assertEqual(inferred_policy(None), 3)
        for policy in range(1, 8):
            with self.subTest(policy=policy):
                original = '.'.join(['9'] * policy)
                self.assertEqual(inferred_policy(original), policy)
                self.assertEqual(candidate(original, policy, policy),
                                 '.'.join(['9'] * (policy - 1) + ['10']))

    def test_increment_only_resets_the_immediate_right_component(self):
        self.assertEqual(candidate('2.9.4.7', 4, 2), '2.10.0.7')
        self.assertEqual(candidate('2.9.4.7', 4, 1), '3.0.4.7')

    def test_add_and_remove_components_from_both_sides(self):
        self.assertEqual(convert_version('2.4.7', 3, 5, 'left'), '0.0.2.4.7')
        self.assertEqual(convert_version('2.4.7', 3, 5, 'right'), '2.4.7.0.0')
        self.assertEqual(convert_version('2.4.7.9', 4, 3, 'left'), '4.7.9')
        self.assertEqual(convert_version('2.4.7.9', 4, 3, 'right'), '2.4.7')

    def test_more_components_always_sort_after_fewer_components(self):
        self.assertGreater(version_order_key('0.3.8.0'), version_order_key('4.0.0'))
        self.assertGreater(version_order_key('0.0.0.0.0'), version_order_key('99.99.99.99'))
        self.assertGreater(version_order_key('3.10.0'), version_order_key('3.9.99'))
        for higher in range(2, 8):
            for lower in range(1, higher):
                with self.subTest(higher=higher, lower=lower):
                    self.assertGreater(version_order_key('.'.join(['0'] * higher)),
                                       version_order_key('.'.join(['99'] * lower)))

    def test_local_conversion_keeps_exact_objects_and_unrelated_tags(self):
        tags = {'3.8.0': 'annotated-tag-object', 'v4.0.0': 'commit-object',
                'other/release': 'other-object'}
        moves, final_tags = local_tag_conversions(tags, 3, 4, 'left')
        self.assertEqual(moves, {'3.8.0': '0.3.8.0', 'v4.0.0': 'v0.4.0.0'})
        self.assertEqual(final_tags, {'0.3.8.0': 'annotated-tag-object',
                                     'v0.4.0.0': 'commit-object',
                                     'other/release': 'other-object'})
        self.assertEqual(local_tag_conversions({'2026.11.21.11.55': 'timestamp'},
                                               5, 6, 'right'),
                         ({}, {'2026.11.21.11.55': 'timestamp'}))

    def test_local_conversion_rejects_exact_and_namespace_collisions(self):
        cases = (
            ({'1.2.3': 'a', '1.2.4': 'b'}, 3, 2),
            ({'1.2.3': 'a', '1.2.3.0': 'a'}, 3, 4),
            ({'1.2.3': 'a', '1.2.3.0/manual': 'b'}, 3, 4),
        )
        for tags, old, new in cases:
            with self.subTest(tags=tags), self.assertRaisesRegex(VersionError, 'collision'):
                local_tag_conversions(tags, old, new, 'right')

    def test_git_transaction_uses_exact_old_and_new_objects(self):
        oid = 'c' * 40
        names = {'3.8.0': oid, 'manual/draft': 'same-as-before'}
        _, target = local_tag_conversions(names, 3, 4, 'left')
        self.assertEqual(local_tag_transaction(names, target).decode('ascii').splitlines(), [
            'start', f'create refs/tags/0.3.8.0 {oid}',
            f'delete refs/tags/3.8.0 {oid}', 'prepare', 'commit',
        ])
        self.assertEqual(local_tag_transaction(names, names), b'')
        with self.assertRaises(VersionError):
            local_tag_transaction({}, {'../invalid': oid})

    def test_invalid_values_are_rejected(self):
        for value in ('0', '8', '03', ' 3', '3.0'):
            with self.subTest(value=value), self.assertRaises(VersionError):
                parse_policy(value)
        with self.assertRaises(VersionError):
            candidate('1.2', 3, 1)
        with self.assertRaises(VersionError):
            candidate('1.2', 2, True)
        with self.assertRaises(VersionError):
            inferred_policy('1.2-beta')
        with self.assertRaises(VersionError):
            convert_version('1.2', 2, 3, 'middle')
