"""Contrat de lecture publique : fixtures locales, jamais le project.env réel."""
import os
from pathlib import Path
import tempfile
import unittest
from cab_platform.project_metadata import read_metadata

class MetadataReaderTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.file=self.root/'project.env'
    def tearDown(self):self.tmp.cleanup()
    def read(self,text):
        self.file.write_text(text,encoding='utf-8');return read_metadata(self.root)
    def test_literal_values_comments_types_and_forges(self):
        result=self.read('PROJECT_NAME="Projet démonstration"\nPROJECT_VERSION=1.2.3\nPROJECT_TYPE="Python, TypeScript, React" # commentaire\nREMOTE_FORGEJO_BASE_URL=https://forge.example/team\nREMOTE_GITHUB_OWNER=team\nREMOTE_GITLAB_SSL_VERIFY=1\n')
        self.assertEqual(result['state'],'ready');self.assertEqual(len(result['values']),6)
        self.assertEqual(result['values']['PROJECT_TYPE'],'Python, TypeScript, React')
    def test_secrets_unknown_and_authenticated_urls_are_not_retained(self):
        result=self.read('PROJECT_NAME=Public\nREMOTE_GITHUB_TOKEN=synthetic-secret\nPG_PASSWORD=synthetic-secret\nREMOTE_GITHUB_BASE_URL=https://user:synthetic-secret@example.org\nREMOTE_GITLAB_BASE_URL=https://example.org?token=synthetic-secret\nREMOTE_FORGEJO_BASE_URL=https://example.org#synthetic-secret\n')
        self.assertEqual(result,{'state':'partial','values':{'PROJECT_NAME':'Public'}})
        self.assertNotIn('synthetic-secret',str(result))
    def test_duplicates_and_export_cannot_reintroduce_a_value(self):
        result=self.read('PROJECT_NAME=First\nPROJECT_NAME=Second\nPROJECT_NAME=Third\nexport PROJECT_VERSION=4\nPROJECT_TYPE=Python\n')
        self.assertEqual(result,{'state':'partial','values':{'PROJECT_TYPE':'Python'}})
    def test_shell_is_never_executed(self):
        marker=self.root/'effect'
        result=self.read(f'PROJECT_NAME=$(touch {marker})\nPROJECT_VERSION=`touch {marker}`\nPROJECT_TYPE="${{PRIVATE}}"\n')
        self.assertFalse(marker.exists());self.assertEqual(result['values'],{})
    def test_empty_and_removed_values(self):
        self.assertEqual(self.read('PROJECT_NAME=\nPROJECT_VERSION=""\n')['values'],{})
        self.file.unlink();self.assertEqual(read_metadata(self.root),{'state':'missing','values':{}})
    def test_symlink_hardlink_fifo_and_large_file_are_refused(self):
        target=self.root/'other';target.write_text('PROJECT_NAME=Private\n')
        self.file.symlink_to(target);self.assertEqual(read_metadata(self.root)['values'],{});self.file.unlink()
        os.link(target,self.file);self.assertEqual(read_metadata(self.root)['state'],'unsafe');self.file.unlink()
        os.mkfifo(self.file);self.assertEqual(read_metadata(self.root)['state'],'unsafe');self.file.unlink()
        self.file.write_bytes(b'X'*(1024*1024+1));self.assertEqual(read_metadata(self.root)['state'],'unsafe')
    def test_utf8_and_active_syntax_are_refused(self):
        self.file.write_bytes(b'PROJECT_NAME=\xff');self.assertEqual(read_metadata(self.root)['state'],'unavailable')
        result=self.read('PROJECT_NAME=Demo; touch /tmp/no-effect\nPROJECT_VERSION=1\\2\n')
        self.assertEqual(result['values'],{})
    def test_oversized_assignment_is_bounded_and_not_retained(self):
        self.assertEqual(self.read('PROJECT_NAME='+(' ' * 10000)+'Value\n'),{'state':'partial','values':{}})

if __name__=='__main__':unittest.main()
