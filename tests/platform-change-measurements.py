"""Parcours public complet sur paquet de fixture ; aucune session de production."""
import json
import os
from pathlib import Path
import tempfile
import time
from datetime import datetime,timezone
from cab_platform.client import Client,ClientError

assert os.environ.get('CAB_TEST_FIXTURE')=='1'
client=Client()
for attempt in range(100):
    try:
        if client.get('health')['state']=='READY':break
    except ClientError:pass
    time.sleep(.1)
else:raise RuntimeError('fixture-not-ready')
root=Path(tempfile.mkdtemp(prefix='cab-measurements-api-'));(root/'source').write_text('fixture')
project=client.command('project.register',{'root':str(root)});project_id=project['project_id']
sid='FIXTURE-BOUNDED-SID';source=root/'native.jsonl'
source.write_text(json.dumps({'type':'session_meta','payload':{'id':sid,'cwd':str(root)}})+'\n')
def append(total):
    with source.open('a') as stream:stream.write(json.dumps({'timestamp':datetime.now(timezone.utc).isoformat(),'type':'event_msg','payload':{'type':'token_count','info':{'total_token_usage':{'input_tokens':total,'total_tokens':total}}}})+'\n')
append(100)
for run,change in [('PUBLIC-A','change-a'),('PUBLIC-B','change-b')]:
    client.command('run.begin',{'project_id':project_id,'run_id':run,'session_id':sid,'change':change,'mode':'direct','paths':['source'],'criteria':['fixture'],'decisions_resolved':True,'resources':[]})
    client.command('native.bind',{'project_id':project_id,'run_id':run,'source_file':str(source)})
start={'project_id':project_id,'run_id':'PUBLIC-A','request_id':'START-A','from_coding_start':True}
first=client.command('statistics.begin',start);append(130)
client.command('statistics.begin',{'project_id':project_id,'run_id':'PUBLIC-B','request_id':'START-B','from_coding_start':True});append(180)
client.command('statistics.end',{'project_id':project_id,'run_id':'PUBLIC-B','request_id':'END-B'})
assert first==client.command('statistics.begin',start)
a=client.command('statistics.change',{'project_id':project_id,'change':'change-a'});b=client.command('statistics.change',{'project_id':project_id,'change':'change-b'})
assert a['metrics']['tokens_total']['value']=='30' and b['metrics']['tokens_total']['value']=='50'
assert a['change_coverage_complete'] and b['change_coverage_complete']
assert a['sgs_evidence']['contribution']['metrics']['tokens_total']['value']=='30'
assert client.get('metrics',project_id=project_id,run_id='PUBLIC-A')['scope']=='change-periods-only'
assert a['periods'][0]['ended']==b['periods'][0]['started']
print(json.dumps({'version':client.get('health')['version'],'real_public_protocol':True,'first_change_delta':30,'second_change_delta':50,'shared_sid_exclusive_boundary':True,'repeated_receipt_unchanged':True,'sgs_contribution_verified':True,'session_totals_excluded':True}))
