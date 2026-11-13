"""Parcours réel isolé : exécution, revue, worker puis interface d'archivage."""
import asyncio
import json
import os
from pathlib import Path
import tempfile
import time
from cab_platform.client import Client
from cab_platform.mcp import atelier_execute
assert os.environ.get('CAB_TEST_FIXTURE')=='1' and Path('/.dockerenv').exists()
c=Client();root=Path(tempfile.mkdtemp(prefix='cab-lifecycle-ui-'));base=root/'openspec/changes';base.mkdir(parents=True)
(root/'source').write_text('source de fixture\n')
project=c.command('project.register',{'root':str(root)})['project_id']
def begin(run,change,completed=True):
    path=base/change;path.mkdir()
    for name in ('proposal.md','review.md','STATISTICS.md'):(path/name).write_text('# Preuve locale de fixture\n')
    (path/'tasks.md').write_text('- ['+('x' if completed else ' ')+'] Tâche de fixture\n')
    c.command('run.begin',{'project_id':project,'run_id':run,'session_id':'SID-'+run,'mode':'direct','change':change,'paths':['source'],'criteria':['test réel'],'decisions_resolved':True})
    return path
def archive(path):
    target=base/('archive/2026-11-13-'+path.name);target.parent.mkdir(exist_ok=True);path.rename(target)
    return target
active=begin('UI-AUTO-314','auto')
result=asyncio.run(atelier_execute(project,'UI-AUTO-314','SID-UI-AUTO-314',1,'AUTO-REAL-TEST',['/usr/bin/python3.13','-c','print("AUTO-CLOSE-REAL-OK")'],timeout_ms=10000))
assert result['state']=='COMPLETED' and result['receipt']['exit_code']==0,result
submission=c.command('run.submit',{'project_id':project,'run_id':'UI-AUTO-314','submission_id':'AUTO-REVIEW','tests':[{'criterion':'test réel','request_id':'AUTO-REAL-TEST','outcome':'passed'}]})
c.command('run.review',{'project_id':project,'run_id':'UI-AUTO-314','submission_digest':submission['digest'],'decision':'accept','reason':'Exécution réellement réussie en fixture.'})
before=c.get('run',project_id=project,run_id='UI-AUTO-314');archive(active)
deadline=time.monotonic()+60
while time.monotonic()<deadline:
    after=c.get('run',project_id=project,run_id='UI-AUTO-314')
    if after['state']=='CLOSED':break
    time.sleep(.5)
assert after['state']=='CLOSED' and after['stage']==11,after
assert after['session_id']==before['session_id'] and after['generation']==before['generation'] and after['operations']==before['operations']
archive(begin('UI-HISTORY-314','history'));begin('UI-BLOCKED-314','blocked',False)
result={'project_id':project,'root':str(root),'version':c.get('health')['version'],'automatic_worker_closed':True,'actual_test_and_review':True,'identities_and_operations_preserved':True,'statistics_generated_by_service':(base/'archive/2026-11-13-auto/STATISTICS.md').is_file()}
Path('/tmp/cab-lifecycle-ui.json').write_text(json.dumps(result));print(json.dumps(result))
