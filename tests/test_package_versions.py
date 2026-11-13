"""Refus des payloads incohérents avant tout effet de préparation."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cab_package_prepare',ROOT/'packaging/prepare.py')
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)

class PackageVersionsTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        paths=['src/cab_platform/__init__.py','pyproject.toml','frontend/package.json','frontend/package-lock.json','frontend/src/main.tsx']
        for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu')]:paths.extend([f'integrations/codex/{folder}/.codex-plugin/plugin.json',f'integrations/codex/{folder}/skills/{folder}/SKILL.md',f'integrations/commands/{label}.md'])
        for relative in paths:
            target=self.root/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/relative,target)
    def tearDown(self):self.tmp.cleanup()
    def test_current_sources_are_aligned(self):self.assertEqual(prepare.validate_versions(self.root),'3.2.1')
    def test_each_outdated_plugin_is_refused(self):
        for folder in ('cab','ccab','cabu'):
            with self.subTest(folder=folder):
                path=self.root/f'integrations/codex/{folder}/.codex-plugin/plugin.json';original=path.read_text();data=json.loads(original);data['version']='3.1.4';path.write_text(json.dumps(data))
                with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.validate_versions(self.root)
                path.write_text(original)
    def test_each_outdated_command_is_refused(self):
        for label in ('CAB','CCAB','CABU'):
            with self.subTest(command=label):
                path=self.root/f'integrations/commands/{label}.md';original=path.read_text();path.write_text(original.replace('version: 3.2.1','version: 3.1.4'))
                with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.validate_versions(self.root)
                path.write_text(original)
    def test_frontend_and_python_metadata_must_match(self):
        for relative in ('pyproject.toml','frontend/package.json','frontend/package-lock.json','frontend/src/main.tsx'):
            with self.subTest(path=relative):
                path=self.root/relative;original=path.read_text();path.write_text(original.replace('3.2.1','3.1.4'))
                with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.validate_versions(self.root)
                path.write_text(original)
    def test_missing_required_skill_is_refused(self):
        (self.root/'integrations/codex/cab/skills/cab/SKILL.md').unlink()
        with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.validate_versions(self.root)
    def test_invalid_source_version_is_refused_without_execution(self):
        marker=self.root/'executed';(self.root/'src/cab_platform/__init__.py').write_text(f'__version__="invalid"\nopen({str(marker)!r},"w").close()\n')
        with self.assertRaisesRegex(RuntimeError,'package-source-version-invalid'):prepare.validate_versions(self.root)
        self.assertFalse(marker.exists())
    def test_preflight_failure_preserves_previous_payload_before_archive(self):
        output=self.root/'output/package';output.mkdir(parents=True);marker=output/'previous';marker.write_text('preserved')
        path=self.root/'integrations/codex/cab/.codex-plugin/plugin.json';path.write_text(path.read_text().replace('3.2.1','3.1.4'))
        with patch.object(prepare,'ROOT',self.root),patch.object(prepare,'OUT',output),patch.object(prepare,'archive') as archive:
            with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.main()
            archive.assert_not_called()
        self.assertEqual(marker.read_text(),'preserved');self.assertEqual(list(output.iterdir()),[marker])

if __name__=='__main__':unittest.main()
