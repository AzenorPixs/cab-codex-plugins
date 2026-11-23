"""À exécuter dans un conteneur Debian dédié, avec des données synthétiques."""
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import sys
import time
import httpx

assert Path('/.dockerenv').exists(),'dedicated-container-required'
assert not os.environ.get('CAB_POSTGRES_ADMIN_DSN'),'production-bootstrap-path-required'
BASE='http://127.0.0.1:8790/api/v1/'
proof={}
def ready(client,state='READY',timeout=40):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        try:
            result=client.get(BASE+'health').json()
            if result['state']==state:return result
        except httpx.HTTPError:pass
        time.sleep(.2)
    raise AssertionError('service-state-timeout: '+state)


def qualify_electric_upgrade(package):
    if os.environ.get('CAB_ELECTRIC_UPGRADE_FIXTURE') != '1':
        raise AssertionError('electric-upgrade-fixture-required')
    cfg = json.loads(Path('/etc/cab/cab.json').read_text())
    assert cfg['initialized'] and cfg['database'] == 'cab' and cfg['database_port'] == 5433
    slot = 'electric_slot_default'

    def sql(statement):
        return subprocess.check_output(
            ['/usr/sbin/runuser', '-u', 'postgres', '--', '/usr/bin/psql',
             '-X', '-v', 'ON_ERROR_STOP=1', '-p', '5433', '-d', 'cab', '-Atqc', statement],
            text=True,
        ).strip()

    assert int(sql('SHOW server_version_num')) // 10000 == 17
    assert sql('SHOW lc_messages').startswith('fr_FR')
    slot_query = f"FROM pg_replication_slots WHERE slot_name = '{slot}'"
    assert sql(f"SELECT active AND NOT temporary AND plugin = 'pgoutput' {slot_query}") == 't'
    previous = subprocess.check_output(
        ['/usr/bin/dpkg-query', '-W', '-f=${Version}', 'cab'], text=True,
    )
    version = subprocess.check_output(
        ['/usr/bin/dpkg-deb', '-f', package, 'Version'], text=True,
    ).strip()
    subprocess.run(['/usr/bin/dpkg', '--compare-versions', version, 'gt', previous], check=True)
    sql("""
        CREATE TABLE electric_restart_fixture (id integer PRIMARY KEY, value text NOT NULL);
        ALTER TABLE electric_restart_fixture REPLICA IDENTITY FULL;
        GRANT SELECT ON electric_restart_fixture TO cab_electric;
        ALTER PUBLICATION electric_publication_default ADD TABLE electric_restart_fixture;
        INSERT INTO electric_restart_fixture VALUES (1, 'before-restart');
    """)

    with httpx.Client(timeout=15) as web:
        def shape(offset, handle=None):
            params = {'table': 'electric_restart_fixture', 'offset': offset, 'secret': cfg['electric_secret']}
            if handle is not None:
                params['handle'] = handle
            return web.get(f"http://127.0.0.1:{cfg.get('electric_port', 8791)}/v1/shape", params=params)

        def verify_package():
            health = ready(web)
            assert health['version'] == version and health['electric']
            assert subprocess.check_output(
                ['/usr/bin/dpkg-query', '-W', '-f=${Status}|${Version}', 'cab'], text=True,
            ) == f'install ok installed|{version}'
            receipt = json.loads(Path('/var/lib/cab/maintenance-receipt.json').read_text())
            assert receipt['state'] == 'COMPLETED' and receipt['verified_version'] == version
            assert sql(f'SELECT active AND NOT temporary {slot_query}') == 't'
            assert sql('SHOW lc_messages').startswith('fr_FR')

        before = shape('-1')
        assert before.status_code == 200
        assert any(row.get('value', {}).get('value') == 'before-restart' for row in before.json())
        handle = before.headers['electric-handle']
        offset = before.headers['electric-offset']
        assert offset != '-1'

        sql('ALTER ROLE cab_electric IN DATABASE cab RESET lc_messages')
        subprocess.run(['/usr/bin/dpkg', '--unpack', package], check=True)
        assert sql(f'SELECT NOT active {slot_query}') == 't'
        flush = sql(f'SELECT confirmed_flush_lsn {slot_query}')
        assert flush
        sql("UPDATE electric_restart_fixture SET value = 'while-stopped' WHERE id = 1")
        subprocess.run(['/usr/bin/dpkg', '--configure', 'cab'], check=True)
        verify_package()
        assert sql(f"SELECT confirmed_flush_lsn >= '{flush}'::pg_lsn {slot_query}") == 't'
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            resumed = shape(offset, handle)
            assert resumed.status_code in (200, 204)
            if resumed.status_code == 200:
                assert resumed.headers['electric-handle'] == handle
                if any(row.get('value', {}).get('value') == 'while-stopped' for row in resumed.json()):
                    break
                offset = resumed.headers.get('electric-offset', offset)
            time.sleep(.2)
        else:
            raise AssertionError('electric-wal-change-not-received-after-upgrade')

        subprocess.run(['/usr/bin/dpkg', '--unpack', package], check=True)
        assert sql(f'SELECT NOT active {slot_query}') == 't'
        # Le retrait est intentionnel et limité au slot de ce conteneur de recette.
        sql(f"SELECT pg_drop_replication_slot('{slot}')")
        assert sql(f'SELECT active {slot_query}') == ''
        sql("UPDATE electric_restart_fixture SET value = 'before-resnapshot' WHERE id = 1")
        subprocess.run(['/usr/bin/dpkg', '--configure', 'cab'], check=True)
        verify_package()
        assert shape(offset, handle).status_code == 409
        rebuilt = shape('-1')
        assert rebuilt.status_code == 200 and rebuilt.headers['electric-handle'] != handle
        assert any(row.get('value', {}).get('value') == 'before-resnapshot' for row in rebuilt.json())
    print(json.dumps({'electric_slot_resumed': True, 'electric_shape_rebuilt': True, 'dpkg_version': version}))


if len(sys.argv) == 3 and sys.argv[1] == '--electric-upgrade':
    qualify_electric_upgrade(sys.argv[2])
    sys.exit(0)
if len(sys.argv) != 1:
    raise SystemExit('usage: platform-package-qualification.py [--electric-upgrade /chemin/cab.deb]')


with httpx.Client(timeout=120) as web:
    h=ready(web,'UNINITIALIZED')
    clusters=subprocess.check_output(['/usr/bin/pg_lsclusters','--no-header'],text=True)
    assert not any(line.split()[1]=='cab' for line in clusters.splitlines())
    proof['no_cab_database_before_web']=True
    token=subprocess.check_output(['/usr/bin/cab','bootstrap-token'],text=True).strip()
    response=web.post(BASE+'bootstrap',json={'username':'fixture-admin','password':'synthetic-fixture-password'},headers={'X-CAB-Bootstrap':token,'X-CSRFToken':h['csrf_token']})
    assert response.status_code==200,response.text
    h=ready(web);proof['real_local_postgresql_web_bootstrap']=True;proof['electric_ready']=h['electric']
    r=web.post(BASE+'login',json={'username':'fixture-admin','password':'synthetic-fixture-password'},headers={'X-CSRFToken':h['csrf_token']});assert r.status_code==200
    h=web.get(BASE+'health').json();csrf={'X-CSRFToken':h['csrf_token']}
    schema=web.get(BASE+'openapi.json').json();assert schema['openapi'].startswith('3.1');assert schema['components']['securitySchemes'];proof['openapi_31_authentication']=True
    r=web.post(BASE+'command',json={'name':'run.begin','data':{}},headers=csrf);assert r.status_code==400,r.text
    subprocess.run(['/usr/bin/cab','enroll','--user','root','--agent','codex'],check=True,stdout=subprocess.DEVNULL)
    root=Path('/tmp/cab-fixture-project');root.mkdir(exist_ok=True);(root/'source.txt').write_text('fixture\n')
    stderr=Path('/var/log/cab-mcp-fixture.log').open('w')
    process=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=stderr,text=True,bufsize=1)
    sequence=0
    def rpc(method,params=None,notification=False):
        global sequence
        sequence+=1;packet={'jsonrpc':'2.0','method':method,'params':params or {}}
        if not notification:packet['id']=sequence
        process.stdin.write(json.dumps(packet)+'\n');process.stdin.flush()
        if notification:return
        deadline=time.monotonic()+150
        while time.monotonic()<deadline:
            if process.poll() is not None:raise AssertionError('mcp-exited')
            if not select.select([process.stdout],[],[],.2)[0]:continue
            row=json.loads(process.stdout.readline())
            if row.get('id')==packet['id']:
                assert 'error' not in row,row
                return row['result']
        raise AssertionError('mcp-response-timeout')
    def call(name,arguments):
        result=rpc('tools/call',{'name':name,'arguments':arguments});assert not result.get('isError'),result
        return result.get('structuredContent') or json.loads(result['content'][0]['text'])
    try:
        rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'cab-package-fixture','version':'1'}});rpc('notifications/initialized',notification=True)
        tools=rpc('tools/list')['tools'];assert any(t['name']=='atelier_execute' for t in tools)
        project=call('project_register',{'root':str(root)})['project_id']
        call('run_begin',{'project_id':project,'run_id':'DIRECT-REAL','session_id':'SID-DIRECT-REAL','change':'fixture-direct','mode':'direct','paths':['source.txt'],'criteria':['minimal'],'decisions':[]})
        direct={'project_id':project,'run_id':'DIRECT-REAL','session_id':'SID-DIRECT-REAL','generation':1,'request_id':'DIRECT-TEST','argv':['/usr/bin/python3.13','-c','print("CAB-DIRECT-OK")']}
        result=call('atelier_execute',direct);assert result['state']=='COMPLETED' and result['receipt']['exit_code']==0,result
        assert call('atelier_execute',direct)['receipt_digest']==result['receipt_digest']
        proof['mcp_real_direct_execution_and_no_replay']=True
        pilot={'project_id':project,'run_id':'PILOT-REAL','session_id':'SID-PILOT-REAL','change':'fixture-pilot','mode':'piloted','paths':['source.txt'],'criteria':['minimal'],'decisions_resolved':True,'orchestrator_id':'web-admin-1','coder_id':'codex-0-coder'}
        r=web.post(BASE+'command',json={'name':'run.begin','data':pilot},headers=csrf);assert r.status_code==200,r.text
        result=call('atelier_execute',{**direct,'run_id':'PILOT-REAL','session_id':'SID-PILOT-REAL','request_id':'PILOT-TEST','argv':['/usr/bin/python3.13','-c','print("CAB-PILOT-OK")']})
        assert result['state']=='COMPLETED' and result['receipt']['exit_code']==0,result
        workshop=Path('/tmp/cab')/project/'.cab-tests/fixture-pilot/PILOT-REAL';assert workshop.is_dir();assert not (root/'.cab-tests/fixture-pilot').exists()
        proof['piloted_workshop_tmp_per_project']=True
        call('session_coordinate',{'project_id':project,'run_id':'DIRECT-REAL','action':'subscribe','args':{'dependency_id':'DEP-one','subject':'fixture-pilot','criterion':'minimal'}})
        call('session_coordinate',{'project_id':project,'run_id':'PILOT-REAL','action':'publish','args':{'notice_id':'NOTICE-one','subject':'fixture-pilot','stage':'tested','proof':'source.txt','sha256':hashlib.sha256((root/'source.txt').read_bytes()).hexdigest()}})
        inbox=call('session_coordinate',{'project_id':project,'run_id':'DIRECT-REAL','action':'inbox','args':{}});assert inbox['items'][0]['notice_id']=='NOTICE-one'
        ack=call('session_coordinate',{'project_id':project,'run_id':'DIRECT-REAL','action':'ack','args':{'dependency_id':'DEP-one','notice_id':'NOTICE-one'}});assert ack['acknowledged'] and not ack['dependency_verified']
        proof['autonomous_direct_piloted_coordination']=True
        submitted=call('autonomy_submit',{'project_id':project,'run_id':'PILOT-REAL','submission_id':'FINAL-one','summary':'Qualification minimale réelle','tests':[{'request_id':'PILOT-TEST','criterion':'minimal','outcome':'passed'}]})
        r=web.post(BASE+'command',json={'name':'run.review','data':{'project_id':project,'run_id':'PILOT-REAL','submission_digest':submitted['digest'],'decision':'accept'}},headers=csrf);assert r.status_code==200,r.text
        proof['final_review_on_test_receipts']=True
    finally:
        process.terminate();process.wait(timeout=15);stderr.close()
    old=Path('/run/cab-fixture-service.pid').read_text().strip()
    config=Path('/etc/cab/cab.json');before=json.loads(config.read_text());before['logging']={'level':'DEBUG'};config.write_text(json.dumps(before));config.chmod(0o600)
    subprocess.run(['systemctl','reload','cab.service'],check=True);assert Path('/run/cab-fixture-service.pid').read_text().strip()==old
    proof['reload_without_restart']=True
    subprocess.run(['/usr/bin/cab','maintenance','prepare','--transaction','fixture-qualified-upgrade'],check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['systemctl','stop','cab.service'],check=True)
    subprocess.run(['systemctl','start','cab.service'],check=True)
    subprocess.run(['/usr/bin/cab','maintenance','verify','--transaction','fixture-qualified-upgrade'],check=True,stdout=subprocess.DEVNULL)
    saved=json.loads(subprocess.check_output(['/usr/bin/cab','call','run.suspend'],input=json.dumps({'project_id':project,'run_id':'DIRECT-REAL','action':'PAUSE'}).encode()))
    assert saved['suspension']=='PAUSE'
    proof['maintenance_same_run_after_restart']=True
    proof['systemd_fixture']='hooks simulés dans conteneur ; unité réelle qualifiée séparément sur hôte'
Path('/var/log/cab-package-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps(proof))
