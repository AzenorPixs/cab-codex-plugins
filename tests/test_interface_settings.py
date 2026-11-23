"""Validation des valeurs et fusion isolée des préférences de présentation."""
import importlib.util
from pathlib import Path
import unittest


MODULE = Path(__file__).resolve().parents[1] / 'src/cab_platform/core/interface_style.py'
SPEC = importlib.util.spec_from_file_location('interface_style', MODULE)
style = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(style)


class InterfaceStyleTests(unittest.TestCase):
    def test_references_for_all_six_groups_are_valid(self):
        self.assertEqual(set(style.FIELDS), {'blocs', 'columns', 'menus', 'tables', 'titles', 'top_bar'})
        for group, fields in style.FIELDS.items():
            with self.subTest(group=group):
                values = {field['key']: field['default'] for field in fields}
                self.assertEqual(len(values), len(fields))
                self.assertEqual(style.patch_group({}, group, values, False), {group: values})

    def test_patch_merges_other_tabs_and_current_values(self):
        before = {'tables': {'head_font': 22, 'row_height': 51}, 'titles': {'admin_gap': 8}}
        after = style.patch_group(before, 'tables', {'head_font': 24}, False)
        self.assertEqual(after, {'tables': {'head_font': 24, 'row_height': 51}, 'titles': {'admin_gap': 8}})
        self.assertEqual(before['tables']['head_font'], 22)

    def test_reset_is_independent_and_idempotent(self):
        before = {'tables': {'head_font': 22}, 'top_bar': {'height': 90}}
        after = style.patch_group(before, 'tables', {}, True)
        self.assertEqual(after, {'top_bar': {'height': 90}})
        self.assertEqual(style.patch_group(after, 'tables', {}, True), after)
        self.assertEqual(style.patch_group(None, 'tables', {}, False), {})

    def test_invalid_values_are_rejected_before_mutation(self):
        cases = (
            ('titles', {'unknown': 12}, False),
            ('tables', {'page_archives': 101}, False),
            ('tables', {'page_archives': 10.0}, False),
            ('tables', {'page_archives': True}, False),
            ('tables', {'header_light': 'url(https://example.org)'}, False),
            ('menus', {'side_hover': '#abc'}, False),
            ('top_bar', {'scroll': 'fixed'}, False),
            ('blocs', {'columns': 3}, True),
        )
        existing = {'columns': {'sidebar_width': 270}}
        for group, values, reset in cases:
            with self.subTest(group=group, values=values), self.assertRaises(ValueError):
                style.patch_group(existing, group, values, reset)
        self.assertEqual(existing, {'columns': {'sidebar_width': 270}})

    def test_profile_patches_do_not_replace_existing_defaults_or_other_profiles(self):
        before = {'font_scale':110,'component_style':{'tables':{'head_font':21}},
                  'profile_styles':{'uhd':{'tables':{'head_font':23}}}}
        updated = style.patch_profile(before,'fullhd','tables',{'head_font':17},False)
        self.assertEqual(updated['profile_styles']['uhd']['tables']['head_font'],23)
        self.assertEqual(updated['profile_styles']['fullhd']['tables']['head_font'],17)
        self.assertEqual(updated['component_style'],before['component_style'])
        self.assertEqual(style.patch_profile(updated,'fullhd','tables',{},True),before)

    def test_resume_responsive_patches_keep_other_resolution_and_field(self):
        before={'responsive':{'fullhd':{'font':91,'layout':95},'uhd':{'font':110,'layout':100}}}
        updated=style.patch_profile(before,'fullhd','resolutions',{'layout':88},False)
        self.assertEqual(updated['responsive']['fullhd'],{'font':91,'layout':88})
        self.assertEqual(updated['responsive']['uhd'],before['responsive']['uhd'])
        self.assertNotIn('fullhd',style.patch_profile(updated,'fullhd','resolutions',{},True)['responsive'])

    def test_general_range_and_partial_responsive_defaults(self):
        with self.assertRaises(ValueError):
            style.patch_profile({},'fullhd','general',{'font_scale':161},False)
        self.assertEqual(style.patch_profile({},'fullhd','resolutions',{'font':120},False)['responsive']['fullhd'],
                         {'font':120,'layout':100})

    def test_every_field_has_reference_for_each_profile(self):
        for group,fields in style.FIELDS.items():
            for field in fields:
                with self.subTest(group=group,key=field['key']):
                    self.assertEqual(tuple(field['references']),style.PROFILES)
                    for reference in field['references'].values():
                        if reference is not None:
                            self.assertTrue(style.valid_value(field,reference))

    def test_profile_defaults_follow_layout_and_compact_table_modes(self):
        def references(group,key):
            return next(field['references'] for field in style.FIELDS[group] if field['key']==key)
        self.assertEqual(list(references('top_bar','inline_padding').values()),[18,18,28,28,28,28])
        self.assertEqual(list(references('columns','sidebar_width').values()),[None,210,260,260,260,260])
        self.assertEqual(list(references('tables','cell_padding').values()),[10,10,14,14,14,14])
        self.assertEqual(list(references('tables','head_font').values()),[20]*6)
        self.assertTrue(all(value is None for value in references('tables','row_height').values()))
