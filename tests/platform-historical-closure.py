"""CLI/API et PostgreSQL réels ; conteneur de qualification seulement."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from cab_platform.client import Client
assert os.environ.get('CAB_TEST_FIXTURE')=='1' and Path('/.dockerenv').exists()
c=Client()
with tempfile.TemporaryDirectory(prefix='cab-historical-') as folder:
    root=Path(folder);active=root/'openspec/changes/history';active.mkdir(parents=True)
    (root/'source').write_text('source conservée\n')
    for name in ('proposal.md','review.md','STATISTICS.md'):(active/name).write_text('# Preuve historique\n')
    (active/'tasks.md').write_text('- [x] Travail historique terminé\n')
    project=c.command('project.register',{'root':str(root)})['project_id']
    run='HISTORY-'+root.name
    c.command('run.begin',{'project_id':project,'run_id':run,'session_id':'SID-'+root.name,'mode':'direct','change':'history','paths':['source','openspec/changes/history'],'criteria':['archive historique'],'decisions_resolved':True})
    c.command('run.freeze',{'project_id':project,'run_id':run})
    before=c.get('run',project_id=project,run_id=run)
    archive='openspec/changes/archive/2026-11-12-history';target=root/archive;target.parent.mkdir();active.rename(target)
    data={'project_id':project,'run_id':run,'archive_path':archive}
    preview=c.command('run.inspect_historical',data)
    body={**data,'evidence_digest':preview['evidence_digest'],'receipt_id':'CLOSE-HISTORY','authorization':'Validation développeur explicite dans le mandat de qualification isolée.','reason':'Régulariser le RUN historique archivé sans réexécution.','developer_authorized':True}
    result=subprocess.run(['/usr/bin/cab','call','run.close_historical'],input=json.dumps(body),text=True,capture_output=True,check=True)
    receipt=json.loads(result.stdout)
    assert c.command('run.close_historical',body)==receipt
    after=c.get('run',project_id=project,run_id=run)
    assert after['state']=='CLOSED' and after['stage']==11
    for key in ('session_id','generation','mandate','operations'):assert before[key]==after[key],key
    assert after['review']['closure']['kind']=='historical' and not after['review']['closure']['normal_acceptance']
    assert not after['operations']
    print(json.dumps({'public_cli_api':True,'closed':True,'stable_receipt':True,'identities_and_mandate_preserved':True,'no_execution_or_test_receipt_created':True,'historical_acceptance_distinct':True}))
