"""Parcours public réel sans submit/review/end/close du LLM ; fixture dédiée."""
import asyncio
import json
import os
from pathlib import Path
import tempfile
import time
from cab_platform.client import Client,ClientError
from cab_platform.mcp import atelier_execute
assert os.environ.get('CAB_TEST_FIXTURE')=='1' and Path('/.dockerenv').exists()
c=Client();root=Path(tempfile.mkdtemp(prefix='cab-evidence-'));base=root/'openspec/changes';base.mkdir(parents=True);(root/'source').write_text('source stable\n')
project=c.command('project.register',{'root':str(root)})['project_id']
argv=['/usr/bin/python3.13','-B','-c','print("REAL-EVIDENCE-322")']
policy={'nature':'development','checks':[{'id':'verification','argv':argv,'criteria':['preuve réelle']} ]}
def begin(run,change):
    path=base/change;path.mkdir()
    (path/'proposal.md').write_text('# Qualification du contrat CAB\n');(path/'tasks.md').write_text('- [x] Qualification\n')
    c.command('run.begin',{'project_id':project,'run_id':run,'session_id':'SID-'+run,'change':change,'mode':'direct','paths':['source'],'criteria':['preuve réelle'],'decisions_resolved':True,'finalization':policy})
    return path
def archive(path):
    target=base/('archive/2026-11-13-'+path.name);target.parent.mkdir(exist_ok=True);path.rename(target)
active=begin('EVIDENCE-AUTO-322','auto')
c.command('statistics.begin',{'project_id':project,'run_id':'EVIDENCE-AUTO-322','request_id':'BEGIN','from_coding_start':False})
receipt=asyncio.run(atelier_execute(project,'EVIDENCE-AUTO-322','SID-EVIDENCE-AUTO-322',1,'REAL-EXECUTION',argv,timeout_ms=10000))
assert receipt['state']=='COMPLETED' and receipt['receipt']['exit_code']==0,receipt
before=c.get('run',project_id=project,run_id='EVIDENCE-AUTO-322');archive(active)
deadline=time.monotonic()+60
while time.monotonic()<deadline:
    after=c.get('run',project_id=project,run_id='EVIDENCE-AUTO-322')
    if after['state']=='CLOSED':break
    time.sleep(.5)
assert after['state']=='CLOSED' and after['stage']==11,after
assert after['review']['closure']['kind']=='policy' and 'submission' not in after['review'] and 'decision' not in after['review']
assert after['operations']==before['operations'] and after['session_id']==before['session_id'] and after['generation']==before['generation']
statistics=c.get('metrics',project_id=project,run_id='EVIDENCE-AUTO-322')
assert statistics['bounded']['periods'] and all(p['ended'] for p in statistics['bounded']['periods'])
view=c.get('finalization',project_id=project,run_id='EVIDENCE-AUTO-322');assert view['phase']=='CLOSED' and len(view['evidence'])==1
archive(begin('EVIDENCE-WAIT-322','waiting'))
deadline=time.monotonic()+30
while time.monotonic()<deadline:
    waiting=c.get('run',project_id=project,run_id='EVIDENCE-WAIT-322')
    if waiting['state']=='FINALIZATION_PENDING':break
    time.sleep(.5)
assert waiting['state']=='FINALIZATION_PENDING' and not waiting['operations']
try:c.command('evidence.attest',{'project_id':project,'run_id':'EVIDENCE-WAIT-322','producer_id':'untrusted'})
except ClientError:pass
else:raise AssertionError('untrusted-coder-accepted')
proof={'project_id':project,'version':c.get('health')['version'],'actual_execution_recorded':True,'worker_closed_without_llm_submission_or_review_or_close':True,'period_closed_without_llm_end':True,'operations_and_identities_preserved':True,'missing_proof_waits_explicitly':True,'untrusted_coder_cannot_attest':True,'policy_receipt':view['receipt']}
Path('/tmp/cab-evidence-ui.json').write_text(json.dumps(proof));print(json.dumps(proof))
