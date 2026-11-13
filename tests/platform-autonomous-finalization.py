"""Un parcours API réel sur fixture dédiée ; aucun travail de production rejoué."""
import asyncio
import json
import os
from pathlib import Path
import tempfile
import time
from cab_platform.client import Client
from cab_platform.mcp import atelier_execute

assert os.environ.get('CAB_TEST_FIXTURE')=='1' and Path('/.dockerenv').exists()
c=Client();root=Path(tempfile.mkdtemp(prefix='cab-autonomous-'));(root/'source').write_text('source stable\n')
change='recover-check';path=root/'openspec/changes'/change;path.mkdir(parents=True)
(path/'proposal.md').write_text('# Qualification de la reprise autonome\n');(path/'tasks.md').write_text('- [x] Contrôle récupéré et preuves conservées\n')
p=c.command('project.register',{'root':str(root)})['project_id'];rid='AUTONOMOUS-325';sid='SID-'+root.name
bad=['/usr/bin/python3.13','-B','-c','raise SystemExit(1)'];good=['/usr/bin/python3.13','-B','-c','print("REAL-AUTONOMOUS-325")']
policy={'checks':[{'id':'check','argv':bad,'criteria':['reprise autonome']}],'review_required':False}
c.command('run.begin',{'project_id':p,'run_id':rid,'session_id':sid,'change':change,'mode':'direct','paths':['source'],'criteria':['reprise autonome'],'decisions_resolved':True,'finalization':policy})
failed=asyncio.run(atelier_execute(p,rid,sid,1,'FAILED-CHECK',bad,timeout_ms=10000))
assert failed['state']=='COMPLETED' and failed['receipt']['exit_code']==1,failed
status=c.get('finalization',project_id=p,run_id=rid)
action=next(row for row in status['next_actions'] if row.get('rule_id')=='check')
assert action['alternative']['command']=='finalization.revise_check' and not action['automatic']
request={'project_id':p,'run_id':rid,'request_id':'REPAIR-CHECK','expected_policy_digest':status['policy_digest'],'check_id':'check','argv':good,'reason':'Le contrôle de fixture attendait volontairement un résultat erroné.'}
revised=c.command('finalization.revise_check',request)
assert revised==c.command('finalization.revise_check',request) and revised['check_revision']==2
waiting=c.get('finalization',project_id=p,run_id=rid)
assert 'evidence:check:check-revised' in waiting['missing'] and c.get('run',project_id=p,run_id=rid)['state']!='CLOSED'
passed=asyncio.run(atelier_execute(p,rid,sid,1,'CORRECTED-CHECK',good,timeout_ms=10000))
assert passed['state']=='COMPLETED' and passed['receipt']['exit_code']==0,passed
assert c.get('run',project_id=p,run_id=rid)['state']!='CLOSED'
archive=path.parent/'archive'/('2026-11-13-'+change);archive.parent.mkdir();path.rename(archive)
deadline=time.monotonic()+45
while time.monotonic()<deadline:
    run=c.get('run',project_id=p,run_id=rid)
    if run['state']=='CLOSED':break
    time.sleep(.3)
assert run['state']=='CLOSED' and run['stage']==11 and run['session_id']==sid and run['generation']==1,run
assert run['review']['closure']['kind']=='policy' and 'submission' not in run['review']
assert len(run['operations'])==2
original=c.get('operation',project_id=p,run_id=rid,request_id='FAILED-CHECK')
assert original['receipt']==failed['receipt'] and original['receipt_digest']==failed['receipt_digest']
final=c.get('finalization',project_id=p,run_id=rid)
assert final['next_actions']==[] and final['missing']==[]
proof={'version':c.get('health')['version'],'real_failed_operation':failed,'repair':revised,'real_corrected_operation':passed,'normal_closure':run['review']['closure'],'old_receipt_preserved':True,'identity_preserved':True,'operations_count':2,'no_llm_final_submit_or_close':True,'new_proof_required':True,'replay_performed':False}
Path('/tmp/cab-autonomous-finalization.json').write_text(json.dumps(proof));print(json.dumps(proof))
