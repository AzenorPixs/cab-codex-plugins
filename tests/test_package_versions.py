"""Refus des payloads incohérents avant tout effet de préparation."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
from cab_platform import update
spec=importlib.util.spec_from_file_location('cab_package_prepare',ROOT/'packaging/prepare.py')
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)

class PackageVersionsTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.version=prepare.validate_versions(ROOT)
        paths=['src/cab_platform/__init__.py','pyproject.toml','frontend/package.json','frontend/package-lock.json','frontend/src/SystemUpdate.tsx']
        for label,folder in [('CAB','cab'),('CCAB','ccab'),('CABU','cabu'),('CICD','cicd'),('CICDF','cicdf')]:paths.extend([f'integrations/codex/{folder}/.codex-plugin/plugin.json',f'integrations/codex/{folder}/skills/{folder}/SKILL.md',f'integrations/commands/{label}.md'])
        for relative in paths:
            target=self.root/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/relative,target)
    def tearDown(self):self.tmp.cleanup()
    def test_current_sources_are_aligned(self):self.assertEqual(prepare.validate_versions(self.root),self.version)
    def test_each_outdated_plugin_is_refused(self):
        for folder in ('cab','ccab','cabu','cicd','cicdf'):
            with self.subTest(folder=folder):
                path=self.root/f'integrations/codex/{folder}/.codex-plugin/plugin.json';original=path.read_text();data=json.loads(original);data['version']='3.1.4';path.write_text(json.dumps(data))
                with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.validate_versions(self.root)
                path.write_text(original)
    def test_each_outdated_command_is_refused(self):
        for label in ('CAB','CCAB','CABU','CICD','CICDF'):
            with self.subTest(command=label):
                path=self.root/f'integrations/commands/{label}.md';original=path.read_text();path.write_text(original.replace(f'version: {self.version}','version: 3.1.4'))
                with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.validate_versions(self.root)
                path.write_text(original)
    def test_frontend_and_python_metadata_must_match(self):
        for relative in ('pyproject.toml','frontend/package.json','frontend/package-lock.json','frontend/src/SystemUpdate.tsx'):
            with self.subTest(path=relative):
                path=self.root/relative;original=path.read_text();path.write_text(original.replace(self.version,'3.1.4') if not relative.endswith('SystemUpdate.tsx') else original.replace('version as buildVersion','version as obsoleteVersion'))
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
        path=self.root/'integrations/codex/cab/.codex-plugin/plugin.json';path.write_text(path.read_text().replace(self.version,'3.1.4'))
        with patch.object(prepare,'ROOT',self.root),patch.object(prepare,'OUT',output),patch.object(prepare,'archive') as archive:
            with self.assertRaisesRegex(RuntimeError,'package-payload-version-invalid'):prepare.main()
            archive.assert_not_called()
        self.assertEqual(marker.read_text(),'preserved');self.assertEqual(list(output.iterdir()),[marker])

class DebianPayloadTests(unittest.TestCase):
    def setUp(self):
        temporary=tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.folder=Path(temporary.name)
        self.tree=self.folder/'tree'
        self.tree.mkdir()
        self.runtime=self.tree/'usr/lib/cab'
        self.version='3.6.1'
        for name in update.PUBLIC_TREES:
            (self.tree/name).mkdir(parents=True)
        self.write('usr/bin/cab','#!/bin/sh\nexit 0\n',mode=0o755)
        self.write('usr/lib/cab/python/cab_platform/__init__.py',f"__version__ = '{self.version}'\n")
        self.write('usr/lib/cab/python/cab_platform/cli.py','# version courante\n')
        self.write('usr/lib/cab/web/index.html','version courante')
        self.write('DEBIAN/control',f'Package: cab\nVersion: {self.version}\nArchitecture: amd64\n'
                   'Maintainer: Test <cab@example.invalid>\nDescription: Paquet de test\n')
        archives={}
        for name in ('python-vendor','electric'):
            content=f'fixture {name}'
            self.write(f'usr/lib/cab/{name}.tar.xz',content)
            archives[name]={'file':name+'.tar.xz','sha256':hashlib.sha256(content.encode()).hexdigest()}
        manifest={'version':self.version,'archives':archives,
                  'payload_sha256':{name:prepare.payload_digest(self.runtime/name) for name in ('python','web')}}
        self.write('usr/lib/cab/runtime-manifest.json',json.dumps(manifest))
        for path in [self.tree,*self.tree.rglob('*')]:
            if path.is_dir():path.chmod(0o755)

    def write(self,relative,content,mode=0o644):
        path=self.tree/relative
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(content)
        path.chmod(mode)

    def build(self):
        path=self.folder/'cab.deb'
        subprocess.run(['/usr/bin/dpkg-deb','--build','--root-owner-group',str(self.tree),str(path)],
                       capture_output=True,check=True)
        return path

    def test_coherent_package_passes_before_publication(self):
        proof=update.preflight_package(self.build(),self.version,require_payload_hashes=True)
        self.assertEqual(proof['embedded_version_verified'],self.version)

    def test_regression_control_version_cannot_hide_old_runtime(self):
        self.write('usr/lib/cab/python/cab_platform/__init__.py',"__version__ = '3.5.0'\n")
        self.write('usr/lib/cab/runtime-manifest.json',json.dumps({'version':'3.5.0'}))
        with self.assertRaisesRegex(update.ClientError,'debian-payload-version-invalid'):
            update.preflight_package(self.build(),self.version,require_payload_hashes=True)

    def test_changed_assets_and_dependency_archives_are_refused(self):
        for name in ('web/index.html','python/cab_platform/cli.py','electric.tar.xz'):
            with self.subTest(payload=name):
                path=self.runtime/name
                original=path.read_text()
                path.write_text('contenu périmé')
                with self.assertRaisesRegex(update.ClientError,'debian-payload-integrity-invalid'):
                    update.preflight_package(self.build(),self.version,require_payload_hashes=True)
                path.write_text(original)


if __name__=='__main__':unittest.main()
