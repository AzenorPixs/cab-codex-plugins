"""Formats locaux, texte maître préservé et absence légitime de rapport."""
import tempfile
from pathlib import Path
import unittest
from cab_platform import statistics_documents as d,sgs_engine as e

class DocumentTests(unittest.TestCase):
    def test_generated_document_has_six_sections_and_amends_one_block(self):
        c=e.blank();text,manual=d.render('change','working',c);self.assertEqual(text.count('\n## '),6)
        amended,manual=d.render('change','archived',c,text,d.sha(d.managed(text).encode()));self.assertFalse(manual);self.assertEqual(amended.count(d.BEGIN),1);self.assertEqual(amended.count('\n## '),6);self.assertIn('archived',amended)
    def test_manual_amendment_is_authoritative_and_never_overwritten(self):
        c=e.blank();text,_=d.render('change','working',c);expected=d.sha(d.managed(text).encode());manual=text.replace('N/A','123',1)
        result,override=d.render('change','archived',c,manual,expected);self.assertTrue(override);self.assertEqual(result,manual)
    def test_legacy_content_and_tables_are_preserved(self):
        old='# Historique\n\n| Mesure | Valeur |\n| --- | --- |\n| Tokens d’entrée | 125 |\n'
        text,_=d.render('change','working',e.blank(),old);self.assertTrue(text.startswith(old.rstrip()));parsed=d.parse(old);self.assertEqual(parsed['contribution']['metrics']['tokens_input']['value'],'125');self.assertTrue(parsed['tables'])
    def test_catalogue_does_not_follow_symlinks_or_require_statistics(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);base=root/'openspec/changes';(base/'untouched').mkdir(parents=True);(base/'archive/2026-11-13-completed').mkdir(parents=True);(base/'linked').symlink_to(base/'untouched')
            records=d.catalogue(root);self.assertEqual(len(records),2);self.assertEqual({r['identifier'] for r in records},{'untouched','completed'})
    def test_global_is_exact_concatenation_with_explicit_not_started(self):
        entries=[{'change':'done','path':'archive/done/STATISTICS.md','content':'# Rapport local\nValeur manuelle.\n','status':'ready'},{'change':'untouched','path':'untouched/STATISTICS.md','content':'','status':'not-started'}]
        text=d.global_document('project',entries);self.assertIn(entries[0]['content'],text);self.assertIn('non attendu',text)
    def test_marker_is_content_addressed_and_detects_manual_edit(self):
        original=d.stamped('# Source locale\n','change');mark=d.marker(original,'change');self.assertTrue(mark['valid']);self.assertIn('generated_at',mark);self.assertEqual(original,d.stamped(original,'change'))
        changed=original.replace('Source locale','Source amendée');self.assertFalse(d.marker(changed,'change')['valid'])
        global_text=d.stamped('# Global\n'+original,'project');self.assertIn(original,global_text);self.assertTrue(d.marker(global_text,'project')['valid'])

if __name__=='__main__':unittest.main()
