"""SGS behavior on synthetic projects; never touches real reports or services."""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('cab_sgs', ROOT/'plugins/cab-approval-bridge/scripts/cab_sgs.py')
sgs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sgs)


class SGSTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='.sgs-test-',dir=ROOT)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.contract = self.root/'SGS.md'
        self.contract.write_text('Contrat de test\n')
        self.archive = 'openspec/changes/archive/2026-11-05-example'

    def source(self,text,archive=None):
        path = self.root/(archive or self.archive)/sgs.REPORT
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(text)
        return path

    def measure(self,value):
        return sgs.known(str(value),[{'line':1,'note':'preuve synthétique'}])

    def build(self):
        with sgs.locked(self.root):
            return sgs.rebuild(self.root,self.contract,['NONE'],{})

    def test_cli_accepts_group_executable_project_mode(self):
        result = subprocess.run([sys.executable, '-B', str(ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py'),
                                 'VERSION', '--file-mode', '0770'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['engine_format'], 'cab-sgs-1')

    def test_missing_value_is_not_zero(self):
        c = sgs.extract('SCM directe.\n| Mesure | Valeur |\n|---|---|\n| Tokens d’entrée | N/A |\n| Appels web | 0 |\n')
        self.assertEqual(c['metrics']['tokens_input']['state'],'unavailable')
        self.assertEqual(c['metrics']['web']['value'],'0')

    def test_final_tests_do_not_include_subsets_or_intermediate_failures(self):
        c = sgs.extract('## 4. Vérification finale\n| Campagne | Réussis | Échecs |\n|---|---|---|\n| Python ciblé | 3 | 0 |\n| Total | 12 | 0 |\n\nEssai intermédiaire : 5 échecs.\n')
        self.assertEqual(c['metrics']['tests']['value'],'12')
        self.assertEqual(c['metrics']['tests_failure']['value'],'0')
        self.assertEqual(c['metrics']['domain_total']['state'],'unavailable')

    def test_conflicting_final_results_are_local(self):
        c = sgs.extract('Tests finaux : 12 réussis, 0 échec.\nTests finaux : 13 réussis, 0 échec.\nDurée globale : 1 h.\n')
        self.assertEqual(c['metrics']['tests_success']['state'],'contradictory')
        self.assertEqual(c['metrics']['duration']['value'],'3600')

    def test_model_does_not_become_codex_agent_name(self):
        c=sgs.extract('### Agents de codage\n| Modèle de LLM | Niveau de raisonnement |\n|---|---|\n| Codex — identité exacte non exposée | N/A |\n')
        self.assertEqual(c['agents'][0]['model'],'N/A')

    def test_duration_not_a_percentage(self):
        self.assertEqual(sgs.duration('1 h 12 min 3 s'),4323)
        self.assertIsNone(sgs.duration('N/A — bornes incomplètes'))
        self.assertEqual(sgs.duration('00h33min21,578s'),__import__('decimal').Decimal('2001.578'))
        self.assertEqual(sgs.duration('1511,74 s (25,20 min)'),__import__('decimal').Decimal('1511.74'))

    def test_review_requires_current_fingerprint_and_real_line(self):
        c=sgs.blank()
        review={'report_sha256':'a'*64,'metrics':{'tests':self.measure(7)}}
        with self.assertRaises(sgs.SGSError):
            sgs.apply_review(c,review,'b'*64,['preuve'])
        review['metrics']['tests']['evidence'][0]['line']=2
        with self.assertRaises(sgs.SGSError):
            sgs.apply_review(c,review,'a'*64,['preuve'])

    def test_rebuild_creates_complete_pair_and_sources_verify(self):
        self.source('Tests finaux : 7 réussis, 0 échec.\nSCM directe.\n')
        self.build()
        with sgs.locked(self.root):
            result=sgs.verify(self.root,self.contract,sources=True)
        self.assertEqual(result['nca'],1)
        report=(self.root/sgs.REPORT).read_text()
        self.assertIn('NCA — Nombre de changes analysés : 1',report)
        self.assertNotIn('Quota',report)
        self.assertNotIn('example',report)

    def test_explicit_rebuild_never_reads_old_report(self):
        self.source('SCM directe.\n')
        (self.root/sgs.REPORT).write_bytes(b'OLD_DO_NOT_READ')
        original=sgs.read_file
        def checked(path):
            if path == self.root/sgs.REPORT and path.exists() and path.stat().st_size==15:
                self.fail('ancien rapport lu')
            return original(path)
        with patch.object(sgs,'read_file',side_effect=checked):
            self.build()

    def test_failed_rebuild_leaves_report_absent(self):
        self.source('SCM directe.\n')
        (self.root/sgs.REPORT).write_text('ancien')
        with patch.object(sgs,'count_code',side_effect=sgs.SGSError('analyse indisponible')):
            with self.assertRaises(sgs.SGSError):self.build()
        self.assertFalse((self.root/sgs.REPORT).exists())

    def test_rebuild_preserves_existing_publication_mode(self):
        self.source('SCM directe.\n')
        report=self.root/sgs.REPORT;report.write_text('ancien');report.chmod(0o640)
        self.build()
        self.assertEqual(report.stat().st_mode&0o777,0o640)
        self.assertEqual((self.root/sgs.REGISTER).stat().st_mode&0o777,0o600)

    def test_explicit_project_mode_is_applied_to_both_files(self):
        self.source('SCM directe.\n')
        with sgs.locked(self.root):sgs.rebuild(self.root,self.contract,['NONE'],{},file_mode=0o775)
        for name in [sgs.REPORT,sgs.REGISTER]:self.assertEqual((self.root/name).stat().st_mode&0o777,0o775)
        self.assertEqual((self.root/sgs.LOCK).stat().st_mode&0o777,0o600)

    def test_explicit_rebuild_accepts_non_object_old_registry(self):
        self.source('SCM directe.\n')
        for initial in ['[]','null','42']:
            with self.subTest(initial=initial):
                (self.root/sgs.REGISTER).write_text(initial)
                self.build()
                registry=json.loads((self.root/sgs.REGISTER).read_text())
                self.assertEqual(registry['generation'],1)
                self.assertTrue(registry['complete'])

    def test_empty_project_has_zero_archives_not_fake_zero_measures(self):
        self.build()
        registry=json.loads((self.root/sgs.REGISTER).read_text())
        self.assertEqual(registry['aggregate_state']['nca'],0)
        self.assertEqual(registry['aggregate_state']['metrics']['tokens_input']['count'],0)

    def test_delta_absent_creates_no_pair(self):
        with sgs.locked(self.root):
            result=sgs.delta(self.root,self.archive,self.contract,['NONE'],{},None)
        self.assertEqual(result['status'],'absent')
        self.assertFalse((self.root/sgs.REGISTER).exists())

    def test_delta_does_not_read_other_archive_or_double_apply(self):
        target=self.source('Tests finaux : 7 réussis, 0 échec.\n')
        other=self.source('Tests finaux : 3 réussis, 0 échec.\n','openspec/changes/archive/2026-11-05-other')
        self.build()
        target.write_text('Tests finaux : 9 réussis, 0 échec.\n')
        original=sgs.read_file
        def guard(path):
            if path == other:self.fail('autre archive lue')
            return original(path)
        with patch.object(sgs,'read_file',side_effect=guard),sgs.locked(self.root):
            result=sgs.delta(self.root,self.archive,self.contract,['NONE'],{},None)
            self.assertTrue(result['mutated'])
            result=sgs.delta(self.root,self.archive,self.contract,['NONE'],{},None)
            self.assertEqual(result['status'],'unchanged')
        with sgs.locked(self.root):sgs.verify(self.root,self.contract,sources=True)
        registry=json.loads((self.root/sgs.REGISTER).read_text())
        self.assertEqual(registry['aggregate_state']['metrics']['tests']['sum'],'12')
        self.assertEqual(len(registry['changes']),2)

    def test_contract_mismatch_does_not_rebuild_or_modify(self):
        self.source('SCM directe.\n');self.build()
        old=(self.root/sgs.REPORT).read_bytes()
        self.contract.write_text('autre contrat\n')
        with sgs.locked(self.root),self.assertRaises(sgs.SGSError):
            sgs.delta(self.root,self.archive,self.contract,['NONE'],{},None)
        self.assertEqual((self.root/sgs.REPORT).read_bytes(),old)

    def test_delta_new_archive_counted_once(self):
        self.source('SCM directe.\n');self.build()
        relative='openspec/changes/archive/2026-11-05-new'
        self.source('Tests finaux : 1 réussis, 0 échec.\n',relative)
        with sgs.locked(self.root):
            sgs.delta(self.root,relative,self.contract,['NONE'],{},None)
            sgs.verify(self.root,self.contract,sources=True)
        registry=json.loads((self.root/sgs.REGISTER).read_text())
        self.assertEqual(registry['aggregate_state']['nca'],2)

    def test_symlink_and_secret_paths_rejected(self):
        (self.root/sgs.REPORT).symlink_to(self.contract)
        with self.assertRaises(sgs.SGSError):self.build()
        for relative in ['../escape','.opencode/state/a','project.env','secrets.json']:
            with self.assertRaises(sgs.SGSError):sgs.safe_path(self.root,relative)

    def test_lock_is_process_exclusive_and_persistent(self):
        with sgs.locked(self.root),self.assertRaises(sgs.SGSError):
            with sgs.locked(self.root):pass
        self.assertTrue((self.root/sgs.LOCK).is_file())
        with sgs.locked(self.root):pass

    def test_transaction_recovers_between_renames(self):
        self.source('SCM directe.\n')
        replace=sgs.os.replace
        def interrupted(src,dst):
            if Path(dst).name==sgs.REGISTER:raise OSError('coupure synthétique')
            return replace(src,dst)
        with patch.object(sgs.os,'replace',side_effect=interrupted),self.assertRaises(OSError):self.build()
        self.assertTrue((self.root/sgs.JOURNAL).exists())
        with sgs.locked(self.root):
            self.assertTrue(sgs.recover(self.root))
            sgs.verify(self.root,self.contract,sources=True)
        self.assertFalse((self.root/sgs.JOURNAL).exists())

    def test_external_change_during_recovery_is_preserved(self):
        self.source('SCM directe.\n')
        with patch.object(sgs,'recover',side_effect=[False,OSError('coupure')]),self.assertRaises(OSError):self.build()
        (self.root/sgs.REPORT).write_text('modification extérieure')
        with sgs.locked(self.root),self.assertRaises(sgs.SGSError):sgs.recover(self.root)
        self.assertEqual((self.root/sgs.REPORT).read_text(),'modification extérieure')

    def test_missing_candidate_restores_initial_absence(self):
        self.source('SCM directe.\n')
        replace=sgs.os.replace
        def interrupted(src,dst):
            if Path(dst).name==sgs.REGISTER:raise OSError('coupure synthétique')
            return replace(src,dst)
        with patch.object(sgs.os,'replace',side_effect=interrupted),self.assertRaises(OSError):self.build()
        journal=json.loads((self.root/sgs.JOURNAL).read_text())
        (self.root/journal['files'][sgs.REGISTER]['candidate']).unlink()
        with sgs.locked(self.root):self.assertEqual(sgs.recover(self.root),'rolled-back')
        self.assertFalse((self.root/sgs.REPORT).exists())
        self.assertFalse((self.root/sgs.REGISTER).exists())
        self.assertFalse((self.root/sgs.JOURNAL).exists())

    def test_python_docstrings_and_mixed_lines(self):
        code,comments=sgs.python_lines('"""Documentation\nlongue."""\nx = "# pas un commentaire" # commentaire\n')
        self.assertEqual((code,comments),(1,3))

    def test_js_strings_regex_templates_and_comments(self):
        code,comments=sgs.javascript_lines('const x = "//"; // commentaire\nconst r = /[/*]/;\nconst t = `texte ${1 /* deux */}`;\n/* trois\n suite */\n')
        self.assertEqual((code,comments),(3,4))

    def test_unsupported_language_is_unavailable_not_approximate(self):
        (self.root/'src').mkdir();(self.root/'src/a.rs').write_text('fn main() {}\n')
        result=sgs.count_code(self.root,['Produit=src'])
        self.assertIsNone(result['groups']['Global']['code'])

    def test_css_urls_strings_and_comments(self):
        self.assertEqual(sgs.css_lines('/* commentaire */\na { background:url("https://example.test/a"); } /* mixte */\n'),(1,2))

    def test_html_embedded_code_and_comments(self):
        source='<html>\n<!-- commentaire -->\n<script>\n// script\nconst x = "/*";\n</script>\n</html>\n'
        self.assertEqual(sgs.html_lines(source),(5,2))

    def test_missing_script_dependency_cannot_be_hidden_by_version_entrypoint(self):
        import subprocess
        scripts=self.root/'scripts';scripts.mkdir()
        entry=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py'
        (scripts/entry.name).write_bytes(entry.read_bytes())
        before=subprocess.run([__import__('sys').executable,'-B',str(scripts/entry.name),'VERSION'],capture_output=True)
        self.assertNotEqual(before.returncode,0)
        (scripts/'cab_sgs.py').write_bytes((entry.parent/'cab_sgs.py').read_bytes())
        after=subprocess.run([__import__('sys').executable,'-B',str(scripts/entry.name),'VERSION'],capture_output=True)
        self.assertEqual(after.returncode,0,after.stderr)
        self.assertEqual(json.loads(after.stdout)['engine_format'],sgs.FORMAT)

    def test_numeric_exactness_and_duplicate_keys(self):
        with self.assertRaises(sgs.SGSError):sgs.load_json('{"x":1,"x":2}')
        with self.assertRaises(sgs.SGSError):sgs.decimal(True)
        with self.assertRaises(sgs.SGSError):sgs.decimal('NaN')
        c=sgs.blank();c['metrics']['duration']=sgs.known('0.10',[{'line':1}],unit='s')
        result=sgs.empty_aggregate();sgs.accumulate(result,c);sgs.accumulate(result,c,-1)
        self.assertEqual(result,sgs.empty_aggregate())

    def test_shared_proof_is_not_added_twice(self):
        c=sgs.blank();c['proof_ids']=['execution-shared'];c['metrics']['tests']=self.measure(3)
        state=sgs.empty_aggregate();sgs.accumulate(state,c)
        with self.assertRaises(sgs.SGSError):sgs.accumulate(state,c)
        self.assertEqual(state['nca'],1)

    def test_equivalent_rich_pixs_shapes_are_extracted(self):
        text='''### Agents de codage
| Modèle de LLM | Version | Fournisseur | Niveau de raisonnement | TTMT moyen | Tokens/seconde moyens |
|---|---|---|---|---|---|
| qwen3.8-flash | N/A | opencode-go | xhigh | 2.5 s | 80.0 |
## 1. Statistiques générales et décisions
Décisions du contrôleur : 3 décisions distinctes, 2 approved, 1 rejected.
| Mesure tokens native | Somme | Couverture assistant |
|---|---|---|
| input | 100 | 100 % |
| output | 50 | 100 % |
| cache_read | 200 | 100 % |
| total | 350 | 100 % |
| Compactions achevées | 2 | 100 % |
## 2 Messages et outils
Messages : 23 au total, user 7, assistant 13, idle 2, system 1.
| Outil | Total | Completed | Error | En cours |
|---|---|---|---|---|
| read | 3 | 3 | 0 | 0 |
| write | 1 | 0 | 1 | 0 |
| bash | 2 | 2 | 0 | 0 |
| Total | 6 | 5 | 1 | 0 |
## 3 Fichiers
Nombre d'écritures effectivement exécutées : N/A, effets non prouvés.
## 4 Commandes
Codes de sortie : N/A, distincts des erreurs natives.
## 5 Web
Aucun appel à un outil web observé.
## 6 Synthèse
| Durée de la session de codage | Valeur |
|---|---|
| Début | 2026-11-01T01:00:00.125Z |
| Fin — après archivage | 2026-11-01T02:00:00.250Z |
'''
        c=sgs.extract(text);sgs.validate_contribution(c,len(text.splitlines()))
        for key,value in {'messages':'23','tools':'6','tokens_input':'100','tokens_cache_read':'200',
                          'tokens_total':'350','permissions':'3','permissions_rejected':'1',
                          'tools_completed':'5','tools_error':'1','domain_write':'1','domain_other':'3',
                          'duration':'3600.125','web':'0'}.items():
            self.assertEqual(c['metrics'][key]['value'],value,key)
        self.assertEqual(c['breakdowns']['message_roles']['idle']['numerator'],'2')
        self.assertEqual(c['performance'][0]['ttmt'],'2.5')
        self.assertEqual(c['metrics']['commands_success']['state'],'unavailable')
        self.assertEqual(c['metrics']['writes']['state'],'unavailable')
        output=sgs.render(sgs.aggregate({'source':{'contribution':sgs.add_ratios(c)}}),sgs.count_code(self.root,['NONE'])).decode()
        for expected in ['| idle | 2 |','| read | 3 |','| qwen3.8-flash | xhigh | 2,500 | 80,000 |',
                         'Validations OpenSpec','Famille de commandes','Catégorie de tests']:
            self.assertIn(expected,output)
        self.assertNotIn('Lectures de fichiers',output)

    def test_complete_breakdown_uses_shared_population_for_absent_categories(self):
        first=sgs.blank();second=sgs.blank()
        first['breakdowns']['tools']={'read':{'numerator':'5','denominator':'10'},'bash':{'numerator':'5','denominator':'10'}}
        second['breakdowns']['tools']={'write':{'numerator':'10','denominator':'10'}}
        state=sgs.empty_aggregate();sgs.accumulate(state,first);sgs.accumulate(state,second)
        output=sgs.render(state,sgs.count_code(self.root,['NONE'])).decode()
        self.assertIn('| read | 5 | 25,00 % |',output)
        self.assertIn('| write | 10 | 50,00 % |',output)
        sgs.accumulate(state,second,-1)
        self.assertIn('| read | 5 | 50,00 % |',sgs.render(state,sgs.count_code(self.root,['NONE'])).decode())

    def test_change_retains_rich_tables_and_agent_metadata(self):
        directory=self.root/self.archive;directory.mkdir(parents=True)
        c=sgs.blank();c['agents']=[{'role':'coder','agent':'opencode','model':'qwen3.8-flash','reasoning':'xhigh'}]
        payload={'schema_version':1,'session_id':'rich-1','scope':'cumulative','contribution':c,
            'agent_details':[{'role':'coder','model':'qwen3.8-flash','version':'N/A','provider':'opencode-go','reasoning':'xhigh','ttmt':'2.5 s','throughput':'80','service_percent':'N/A'}],
            'tables':{'3':[{'title':'Fichiers par chemin absolu','columns':['Chemin absolu','Appels','Completed natif','Error natif'],
                            'rows':[['/project/src/example.py',3,2,1]]}],
                      '4':[{'title':'Commandes exécutées','columns':['Commande','Exécutions','Exit 0','Exit non nul'],
                            'rows':[['python3 -m unittest',1,1,0]]}]},
            'notes':{'1':['Un appel terminé ne prouve pas une approbation humaine.']}}
        path=self.root/'.STATISTICS.session.json';path.write_text(json.dumps(payload))
        with sgs.locked(self.root):sgs.change_report(self.root,self.archive,path,'archived')
        text=(directory/sgs.REPORT).read_text()
        self.assertIn('| /project/src/example.py | 3 | 2 | 1 |',text)
        self.assertIn('| python3 -m unittest | 1 | 1 | 0 |',text)
        self.assertIn('opencode-go',text)
        self.assertEqual(len(__import__('re').findall(r'^## ',text,__import__('re').M)),6)
        payload['session_id']='rich-2';payload['tables']={};path.write_text(json.dumps(payload))
        with sgs.locked(self.root):sgs.change_report(self.root,self.archive,path,'archived')
        self.assertIn('| /project/src/example.py | 3 | 2 | 1 |',(directory/sgs.REPORT).read_text())

    def test_code_inventory_detects_new_source(self):
        self.source('SCM directe.\n');(self.root/'src').mkdir();(self.root/'src/a.py').write_text('x=1\n')
        with sgs.locked(self.root):sgs.rebuild(self.root,self.contract,['Produit=src'],{})
        (self.root/'src/b.py').write_text('x=2\n')
        with sgs.locked(self.root),self.assertRaises(sgs.SGSError):sgs.verify(self.root,self.contract,sources=True)

    def test_blocked_change_updates_only_current_code_stock(self):
        self.source('Tests finaux : 3 réussis, 0 échec.\n')
        (self.root/'src').mkdir();(self.root/'src/a.py').write_text('x=1\n')
        with sgs.locked(self.root):sgs.rebuild(self.root,self.contract,['Produit=src'],{})
        initial=json.loads((self.root/sgs.REGISTER).read_text())
        (self.root/'openspec/changes/blocked').mkdir(parents=True)
        (self.root/'src/a.py').write_text('x=1\ny=2\n')
        with sgs.locked(self.root):
            result=sgs.delta(self.root,'openspec/changes/blocked',self.contract,[],{},None)
            sgs.verify(self.root,self.contract,sources=True)
        updated=json.loads((self.root/sgs.REGISTER).read_text())
        self.assertEqual(result['status'],'updated-code-only')
        self.assertEqual(updated['changes'],initial['changes'])
        self.assertEqual(updated['aggregate_state'],initial['aggregate_state'])
        self.assertEqual(updated['code_state']['groups']['Global']['code'],2)

    def test_change_blocked_then_archived_preserves_sessions(self):
        relative='openspec/changes/example'
        directory=self.root/relative;directory.mkdir(parents=True)
        (directory/'BLOCKERS.md').write_text('Dépendance synthétique absente\n')
        c=sgs.blank();c['metrics']['tests_success']=self.measure(2);c['metrics']['tests_failure']=self.measure(0)
        evidence=self.root/'.STATISTICS.evidence.json'
        evidence.write_text(json.dumps({'schema_version':1,'session_id':'session-1','scope':'cumulative','contribution':c}))
        with sgs.locked(self.root):
            result=sgs.change_report(self.root,relative,evidence,'blocked')
            repeated=sgs.change_report(self.root,relative,evidence,'blocked')
        self.assertEqual(repeated['status'],'unchanged')
        dest=self.root/self.archive;dest.parent.mkdir(parents=True,exist_ok=True);directory.rename(dest)
        payload=json.loads(evidence.read_text());payload['session_id']='session-2';payload['contribution']['metrics']['tests_success']=self.measure(3)
        evidence.write_text(json.dumps(payload))
        with sgs.locked(self.root):sgs.change_report(self.root,self.archive,evidence,'archived')
        text=(dest/sgs.REPORT).read_text()
        self.assertEqual(len(__import__('re').findall(r'^## ',text,__import__('re').M)),6)
        self.assertIn('session-1',text);self.assertIn('session-2',text)
        self.assertEqual(sgs.extract(text)['metrics']['tests']['value'],'3')

    def test_change_requires_blocker_and_archived_directory(self):
        directory=self.root/'openspec/changes/example';directory.mkdir(parents=True)
        with self.assertRaises(sgs.SGSError):sgs.change_report(self.root,'openspec/changes/example',None,'blocked')
        with self.assertRaises(sgs.SGSError):sgs.change_report(self.root,'openspec/changes/example',None,'archived')

    def native_fixture(self):
        self.source('SCM directe.\n\n'+'\n'.join(f'## {i}. {title}\n' for i,title in enumerate(sgs.CHANGE_TITLES,1)))
        e=sgs.entry(self.root,self.root/self.archive/sgs.REPORT)
        data={'schema_version':1,'project_root':str(self.root),'summary':{'schemaVersion':2,'droppedEvents':0,
            'contexts':[{'runId':'R','contextId':1,'changeId':'example','messages':{'user':2,'assistant':3},
                         'tools':{'read':{'completed':2,'error':0,'running':0,'pending':0}}}]},
            'bindings':[{'archive_path':self.archive,'report_sha256':e['report_sha256'],'runId':'R','contextId':1,
                         'role':'coder','coverage':'complete-production'}]}
        path=self.root/'.STATISTICS.cab-export.json';path.write_text(json.dumps(data))
        return path,data,{self.archive:e}

    def test_native_export_completes_missing_counts_without_adding_twice(self):
        path,data,changes=self.native_fixture()
        changes[self.archive]['contribution']['metrics']['messages']=self.measure(5)
        sgs.import_cab(self.root,changes,path)
        self.assertEqual(changes[self.archive]['contribution']['metrics']['messages']['value'],'5')
        self.assertEqual(changes[self.archive]['contribution']['metrics']['tools']['value'],'2')

    def test_native_partial_coverage_or_other_project_rejected(self):
        path,data,changes=self.native_fixture();data['bindings'][0]['coverage']='partial'
        path.write_text(json.dumps(data))
        with self.assertRaises(sgs.SGSError):sgs.import_cab(self.root,changes,path)
        data['bindings'][0]['coverage']='complete-production';data['project_root']='/other'
        path.write_text(json.dumps(data))
        with self.assertRaises(sgs.SGSError):sgs.import_cab(self.root,changes,path)

    def test_native_context_duplicate_and_conflict(self):
        path,data,changes=self.native_fixture()
        data['bindings'].append(data['bindings'][0]);path.write_text(json.dumps(data))
        with self.assertRaises(sgs.SGSError):sgs.import_cab(self.root,changes,path)
        data['bindings']=data['bindings'][:1];path.write_text(json.dumps(data))
        changes[self.archive]['contribution']['metrics']['messages']=self.measure(6)
        sgs.import_cab(self.root,changes,path)
        self.assertEqual(changes[self.archive]['contribution']['metrics']['messages']['state'],'contradictory')

    def test_native_export_generates_individual_tables_and_retries_idempotently(self):
        export,data,_=self.native_fixture()
        evidence=self.root/'.STATISTICS.session.json'
        evidence.write_text(json.dumps({'schema_version':1,'session_id':'native-1','scope':'cumulative','contribution':sgs.blank()}))
        with sgs.locked(self.root):
            first=sgs.change_report(self.root,self.archive,evidence,'archived',cab_export=export)
            second=sgs.change_report(self.root,self.archive,evidence,'archived',cab_export=export)
        self.assertEqual(first['status'],'updated');self.assertEqual(second['status'],'unchanged')
        text=(self.root/self.archive/sgs.REPORT).read_text()
        self.assertIn('Outils et états techniques natifs',text)
        self.assertIn('| read | 2 | 100,00 % | 2 | 0 | 0 | 0 |',text)
        self.assertEqual(sgs.extract(text)['metrics']['messages']['value'],'5')

    def test_unchanged_change_retries_missing_global_maintenance(self):
        directory=self.root/self.archive;directory.mkdir(parents=True)
        evidence=self.root/'.STATISTICS.session.json'
        evidence.write_text(json.dumps({'schema_version':1,'session_id':'retry-1','scope':'cumulative','contribution':sgs.blank()}))
        sgs.change_report(self.root,self.archive,evidence,'archived')
        with patch.object(sgs,'delta',return_value={'status':'updated'}) as maintenance:
            result=sgs.change_report(self.root,self.archive,evidence,'archived',maintain=True,contract=self.contract)
            maintenance.assert_called_once()
        self.assertEqual(result['global']['status'],'updated')

    def test_cli_absent_global_leaves_no_files(self):
        import subprocess,sys
        cli=ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py'
        before=set(self.root.iterdir())
        result=subprocess.run([sys.executable,'-B',str(cli),'DELTA','--project-root',str(self.root),
                               '--contract',str(self.contract),'--change',self.archive],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'],'absent')
        self.assertEqual(set(self.root.iterdir()),before)


    def test_arbitrary_agents_round_trip_without_cab(self):
        c=sgs.blank()
        c['agents']=[{'role':role,'agent':agent,'model':'custom-model','reasoning':'N/A'}
                     for role,agent in [('coder','aider'),('orchestrator','custom-orchestrator')]]
        c['metrics']['tests']=self.measure(7)
        target=self.root/self.archive
        target.mkdir(parents=True)
        evidence=self.root/'.STATISTICS.session.json'
        evidence.write_text(json.dumps({'schema_version':1,'session_id':'generic-1','scope':'cumulative','contribution':c}))
        with sgs.locked(self.root):
            sgs.change_report(self.root,self.archive,evidence,'archived')
        self.build()
        result=sgs.query(self.root,self.contract,self.archive)
        self.assertEqual(result['data']['agents'],c['agents'])
        self.assertEqual(result['data']['metrics']['tests']['value'],'7')

    def test_agent_identity_rejects_invalid_values(self):
        for agent in ['',123,[], 'x'*161,'line\nbreak','table|cell']:
            c=sgs.blank();c['agents']=[{'role':'coder','agent':agent,'model':'N/A','reasoning':'N/A'}]
            with self.subTest(agent=agent),self.assertRaises(sgs.SGSError):sgs.validate_contribution(c)

    def test_query_cli_absent_creates_nothing(self):
        import subprocess,sys
        before=set(self.root.iterdir())
        r=subprocess.run([sys.executable,'-B',str(ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py'),
            'QUERY','--project-root',str(self.root),'--contract',str(self.contract)],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertEqual(json.loads(r.stdout),{'status':'absent','mutated':False})
        self.assertEqual(set(self.root.iterdir()),before)

    def test_query_snapshot_filters_preserve_files(self):
        self.source('Tests finaux : 12 réussis, 0 échec.\n');self.build()
        before={str(p):p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        global_result=sgs.query(self.root,self.contract,metric='tests')
        self.assertEqual(global_result['data'],{'sum':'12','count':1})
        change_result=sgs.query(self.root,self.contract,self.archive,'tests')
        self.assertEqual(change_result['data']['value'],'12')
        self.assertEqual(global_result['generation'],change_result['generation'])
        self.assertEqual(sgs.query(self.root,self.contract,'openspec/changes/archive/missing')['status'],'not-found')
        self.assertEqual({str(p):p.read_bytes() for p in self.root.rglob('*') if p.is_file()},before)
        with self.assertRaises(sgs.SGSError):sgs.query(self.root,self.contract,metric='unknown')
        with self.assertRaises(sgs.SGSError):sgs.query(self.root,self.contract,'../outside')

    def test_query_refuses_pending_or_divergent_without_recovery(self):
        self.source('Tests finaux : 12 réussis, 0 échec.\n');self.build()
        journal=self.root/sgs.JOURNAL;journal.write_text('pending')
        with patch.object(sgs,'recover',side_effect=AssertionError('QUERY must not recover')):
            with self.assertRaises(sgs.SGSError):sgs.query(self.root,self.contract)
        self.assertEqual(journal.read_text(),'pending');journal.unlink()
        report=self.root/sgs.REPORT;report.write_text('divergent')
        with self.assertRaises(sgs.SGSError):sgs.query(self.root,self.contract)
        self.assertEqual(report.read_text(),'divergent')

    def test_query_refuses_busy_writer(self):
        self.source('Tests finaux : 12 réussis, 0 échec.\n');self.build()
        with sgs.locked(self.root):
            with self.assertRaises(sgs.SGSError):sgs.query(self.root,self.contract)

    def stdin_change(self,archive=None,*extra):
        import subprocess,sys
        target=self.root/(archive or self.archive);target.mkdir(parents=True,exist_ok=True)
        evidence=json.dumps({'schema_version':1,'session_id':'stdin-1','scope':'cumulative','contribution':sgs.blank()})
        r=subprocess.run([sys.executable,'-B',str(ROOT/'plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-sgs.py'),
            'CHANGE','--project-root',str(self.root),'--change',archive or self.archive,
            '--state','archived','--evidence','-',*extra],input=evidence,capture_output=True,text=True)
        return r,target

    def test_stdin_change_ignores_unrecoverable_global_and_creates_no_root_files(self):
        journal=self.root/sgs.JOURNAL;journal.write_text('broken global journal')
        (self.root/self.archive).mkdir(parents=True)
        before=set(self.root.iterdir())
        r,target=self.stdin_change()
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertTrue((target/sgs.REPORT).is_file())
        self.assertEqual(journal.read_text(),'broken global journal')
        self.assertEqual(set(self.root.iterdir()),before)
        self.assertFalse((target/(sgs.REPORT+'.sgs-candidate')).exists())

    def test_maintain_failure_keeps_individual_success_and_global_journal(self):
        journal=self.root/sgs.JOURNAL;journal.write_text('broken')
        r,target=self.stdin_change(None,'--maintain-global','--contract',str(self.contract))
        self.assertEqual(r.returncode,0,r.stderr)
        data=json.loads(r.stdout);self.assertEqual(data['status'],'created')
        self.assertEqual(data['global']['status'],'error')
        self.assertTrue((target/sgs.REPORT).exists());self.assertEqual(journal.read_text(),'broken')

    def test_change_runs_while_global_lock_is_busy(self):
        with sgs.locked(self.root):r,target=self.stdin_change()
        self.assertEqual(r.returncode,0,r.stderr)

    def test_same_report_is_serialized_but_another_change_can_progress(self):
        a=self.root/self.archive;a.mkdir(parents=True)
        with sgs.report_locked(a):
            blocked,_=self.stdin_change()
            independent,_=self.stdin_change('openspec/changes/archive/2026-11-05-other')
        self.assertEqual(blocked.returncode,1)
        self.assertEqual(independent.returncode,0,independent.stderr)
        self.assertFalse((a/sgs.REPORT).exists())

    def test_legacy_structure_is_preserved_byte_for_byte_and_not_duplicated(self):
        target=self.source('# Ancien rapport\n\n## Bilan unique\nTexte historique.\n')
        before=target.read_bytes()
        r,_=self.stdin_change();self.assertEqual(r.returncode,0,r.stderr)
        data=target.read_bytes();self.assertTrue(data.startswith(before))
        self.assertEqual(data.decode().count('\n## '),1)
        self.assertIn('#### 6. Synthèse globale',data.decode())
        retry,_=self.stdin_change();self.assertEqual(retry.returncode,0,retry.stderr)
        self.assertEqual(target.read_bytes(),data)

    def test_explicit_variant_keeps_name_and_is_not_implicitly_created_twice(self):
        target=self.source('# Statistiques historiques\n',self.archive).with_name('STATISTIQUES.md')
        (target.parent/sgs.REPORT).rename(target)
        r,_=self.stdin_change();self.assertEqual(r.returncode,1)
        before=target.read_bytes()
        r,_=self.stdin_change(None,'--report',str(target.relative_to(self.root)),
                             '--maintain-global','--contract',str(self.contract))
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertTrue(target.read_bytes().startswith(before))
        self.assertFalse((target.parent/sgs.REPORT).exists())
        self.assertEqual(json.loads(r.stdout)['global']['status'],'not-admissible')

    def test_report_override_cannot_escape_change(self):
        other=self.source('# Statistiques\n','openspec/changes/archive/2026-11-05-other')
        r,_=self.stdin_change(None,'--report',str(other.relative_to(self.root)))
        self.assertEqual(r.returncode,1)
        self.assertEqual(other.read_text(),'# Statistiques\n')

    def test_failed_report_publication_cleans_only_its_candidate(self):
        target=self.source('# Historique\n')
        evidence=json.dumps({'schema_version':1,'session_id':'cleanup-1','scope':'cumulative','contribution':sgs.blank()}).encode()
        with patch.object(sgs.os,'replace',side_effect=OSError('synthetic publication failure')):
            with self.assertRaises(OSError):sgs.change_report(self.root,self.archive,evidence,'archived')
        self.assertEqual(target.read_text(),'# Historique\n')
        self.assertFalse(target.with_name(target.name+'.sgs-candidate').exists())


if __name__ == '__main__':
    unittest.main()
