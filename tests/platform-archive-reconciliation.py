"""Parcours public réel, exclusivement dans le conteneur de qualification."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import tempfile
from cab_platform.client import Client
from cab_platform.mcp import atelier_execute
assert os.environ.get('CAB_TEST_FIXTURE')=='1','Fixture explicite requise'
client=Client()
with tempfile.TemporaryDirectory(prefix='cab-public-archive-') as folder:
    root=Path(folder);old=root/'openspec/changes/archive-fixture';old.mkdir(parents=True)
    for name in ('proposal.md','tasks.md'):(old/name).write_text('# Fixture\n')
    (root/'source.txt').write_text('Stable\n')
    project=client.command('project.register',{'root':str(root)})['project_id']
    run='ARCHIVE-PUBLIC-'+root.name
    framed=client.command('run.begin',{'project_id':project,'run_id':run,'session_id':'SID-'+root.name,'mode':'direct','change':'archive-fixture','paths':['source.txt','openspec/changes/archive-fixture'],'criteria':['public'],'decisions_resolved':True})
    before=client.get('run',project_id=project,run_id=run)
    frozen=client.command('run.freeze',{'project_id':project,'run_id':run})['frozen_at']
    archive='openspec/changes/archive/2026-11-12-archive-fixture';target=root/archive;target.parent.mkdir();old.rename(target)
    body={'project_id':project,'run_id':run,'archive_path':archive,'expected_framing_digest':before['mandate']['framing_digest']}
    result=subprocess.run(['/usr/bin/cab','call','run.reconcile_archive'],input=json.dumps(body),capture_output=True,text=True,check=True)
    assert json.loads(result.stdout)['state']=='RECONCILED'
    assert client.command('run.reconcile_archive',body)['state']=='ALREADY_RECONCILED'
    current=client.get('run',project_id=project,run_id=run)
    assert current['session_id']==before['session_id'] and current['generation']==before['generation']
    assert current['mandate']['native_frozen_at']==frozen
    result=asyncio.run(atelier_execute(project,run,current['session_id'],current['generation'],'AFTER-ARCHIVE',['/usr/bin/python3.13','-c','print("ARCHIVE-PUBLIC-OK")'],timeout_ms=10000))
    assert result['state']=='COMPLETED' and result['receipt']['exit_code']==0,result
    assert 'ARCHIVE-PUBLIC-OK' in result['receipt']['output']
    print(json.dumps({'public_cli':True,'idempotent':True,'session_and_generation_preserved':True,'native_freeze_preserved':True,'real_sandbox_test_after_archive':True,'receipt_digest':result['receipt_digest']}))
