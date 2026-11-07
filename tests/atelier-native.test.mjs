import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {changeTestArea,authorizeAtelierCall} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-autonomy.mjs';
import {nativeToolInputDigest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-opencode-client.mjs';

test('Atelier : seules les données de l’appel natif courant du même RUN autorisent le lancement',()=>{
 const run={runId:'run',sessionId:'ses_one',changeId:'change',directory:'/fixture',version:1,state:'RESERVED'};
 const args={request_id:'request',run_id:'run',session_id:'ses_other',change_id:'change',directory:'/fixture',reservation_version:1,argv:['/usr/bin/true']};
 assert.throws(()=>authorizeAtelierCall(run,{armed:true,sessionId:'ses_one',changeId:'change'},args,[],nativeToolInputDigest),/run-divergent/);
 args.session_id='ses_one';assert.throws(()=>authorizeAtelierCall(run,{armed:true,sessionId:'ses_one',changeId:'change'},args,[],nativeToolInputDigest),/native-call-unobserved/);
});

test('Atelier deux UID réels : copies libres, projet RO, pairs masqués et reçu sans rejeu',
 {skip:!process.env.CAB_TEST_FOREIGN_UID?'CAB_TEST_FOREIGN_UID nécessaire à la qualification réelle':false},t=>{
 const uid=Number(process.env.CAB_TEST_FOREIGN_UID);assert.ok(Number.isSafeInteger(uid)&&uid>0&&uid!==process.getuid());
 const asNative=code=>execFileSync('sudo',['-n','-u','#'+uid,'/usr/bin/python3','-B','-c',code],{encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024});
 const fixture=JSON.parse(asNative(`import os,json,tempfile,pathlib
assert os.getuid()==${uid}
root=pathlib.Path(tempfile.mkdtemp(prefix='cab-atelier-uid-fixture-'));root.chmod(0o755)
project=root/'project';project.mkdir();project.chmod(0o2775)
(project/'source.py').write_text('original\\n');(project/'source.py').chmod(0o775)
(root/'outside.txt').write_text('outside')
(root/'fixture-home').mkdir()
print(json.dumps({'root':str(root),'project':str(project)}))`));
 t.after(()=>asNative(`import shutil;shutil.rmtree(${JSON.stringify(fixture.root)})`));
 const own=changeTestArea(fixture.project,'change','run-own'),peer=changeTestArea(fixture.project,'change','run-peer');
 const nativeCode=`import os,json,pathlib,sys,threading,time
assert os.getuid()==${uid}
sys.path.insert(0,${JSON.stringify(resolve('plugins/cab-approval-bridge/broker'))})
import cgpt_approval_bridge_atelier as a
workspace=${JSON.stringify(fixture.project)};own=${JSON.stringify(own)};peer=${JSON.stringify(peer)}
pathlib.Path(peer,'peer.txt').write_text('peer')
os.link(pathlib.Path(workspace,'source.py'),pathlib.Path(own,'shared-alias.py'))
script=${JSON.stringify("from pathlib import Path\nimport shutil,pwd,os\nassert pwd.getpwuid(os.getuid()).pw_name=='cab'\nassert os.environ['TMPDIR']=='/cab-tmp'\np=Path("+JSON.stringify(fixture.project)+")\na=Path.cwd()\nshutil.copyfile(p/'source.py',a/'copy.py')\n(a/'copy.py').write_text('test-copy')\ntry:\n (p/'source.py').write_text('forbidden')\n raise RuntimeError('project unexpectedly writable')\nexcept OSError: pass\nassert not Path("+JSON.stringify(join(peer,'peer.txt'))+").exists()\nassert not Path("+JSON.stringify(join(fixture.root,'outside.txt'))+").exists()\nprint('ATELIER_BOUNDARIES_OK')")}
args={'request_id':'fixture-attempt','run_id':'run-own','reservation_version':1,'session_id':'ses_fixture','change_id':'change','directory':workspace,'argv':['/usr/bin/python3','-c',script]}
grant={'status':'AUTHORIZED_ATELIER','directory':workspace,'atelier':own,'runtimeRoots':[]}
result=a.execute(args,lambda _:grant,job_home=${JSON.stringify(join(fixture.root,'fixture-home'))})
again=a.execute(args,lambda _:grant,job_home=${JSON.stringify(join(fixture.root,'fixture-home'))})
assert result==again
assert pathlib.Path(workspace,'source.py').read_text()=='original\\n'
assert pathlib.Path(own,'copy.py').read_text()=='test-copy'
assert pathlib.Path(peer,'peer.txt').read_text()=='peer'
assert 'shared-alias.py' in result['masked_shared_links']
drain_args={**args,'request_id':'fixture-active-drain','argv':['/usr/bin/python3','-c','import time;time.sleep(60)']}
drained=[]
worker=threading.Thread(target=lambda:drained.append(a.execute(drain_args,lambda _:grant,job_home=${JSON.stringify(join(fixture.root,'fixture-home'))})))
worker.start()
deadline=time.monotonic()+3
while not a.ACTIVE_PROCESSES and time.monotonic()<deadline:time.sleep(0.01)
assert a.ACTIVE_PROCESSES
stopped=a.stop_scope({'workspace':workspace,'runIds':['run-own']})
worker.join(3)
assert not worker.is_alive() and stopped['stopped']==1 and not a.ACTIVE_PROCESSES
assert len(drained)==1 and drained[0]['status']=='COMPLETED' and drained[0]['exitCode']!=0
print(json.dumps({'status':result['status'],'exit':result.get('exitCode'),'output':result.get('output'),'validationRequired':result['requires_orchestrator_validation']}))`;
 const result=JSON.parse(asNative(nativeCode));
 assert.equal(result.status,'COMPLETED');assert.equal(result.exit,0,result.output);assert.equal(result.validationRequired,true);
 assert.match(result.output,/ATELIER_BOUNDARIES_OK/);
});


test('Atelier DEVOPS : runtime externe, alias et bibliothèque RO, catalogue actualisé sans rejeu',
 {skip:!process.env.CAB_TEST_FOREIGN_UID?'CAB_TEST_FOREIGN_UID nécessaire à la qualification réelle':false},()=>{
 const uid=Number(process.env.CAB_TEST_FOREIGN_UID);
 const code=`import os,sys,json,tempfile,pathlib,shutil,socket
assert os.getuid()==${uid}
sys.path.insert(0,${JSON.stringify(resolve('plugins/cab-approval-bridge/broker'))})
import cgpt_approval_bridge_atelier as a
root=pathlib.Path(tempfile.mkdtemp(prefix='cab-devops-runtime-'))
try:
 p=root/'project';p.mkdir();own=p/'.cab-tests/change/run';own.mkdir(parents=True)
 runtime=root/'toolchain-1';(runtime/'bin').mkdir(parents=True);(runtime/'lib').mkdir()
 (runtime/'lib/library.py').write_text('VALUE=42\\n')
 tool=runtime/'bin/devops-python';tool.write_text('#!/usr/bin/python3\\nimport sys,pathlib\\nsys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"lib"))\\nimport library\\nprint(library.VALUE)\\n');tool.chmod(0o755)
 alias=root/'current';alias.symlink_to(runtime,target_is_directory=True)
 (runtime/'.env').write_text('SHOULD_NOT_BE_VISIBLE')
 sock=socket.socket(socket.AF_UNIX);sock.bind(str(runtime/'control.sock'))
 doc=p/'DEVOPS.md';doc.write_text('# Python\\n  * '+str(alias/'bin/devops-python')+'\\n# Conteneur Docker\\n  * '+str(runtime/'control.sock')+'\\n# Conteneur LXC\\n  * /does/not/exist\\n')
 resources=a.devops_resources(p);assert resources['state']=='observed'
 assert any(x['kind']=='lxc' and x['state']=='cab-access-required' for x in resources['resources'])
 assert any(x.get('path')==str(runtime/'control.sock') and x['state']=='cab-access-required' for x in resources['resources'])
 grant={'status':'AUTHORIZED_ATELIER','directory':str(p),'atelier':str(own),'runtimeRoots':[]}
 script='import subprocess,pathlib\\nprint(subprocess.check_output(["devops-python"],text=True).strip())\\ntry: assert pathlib.Path('+repr(str(runtime/'.env'))+').read_bytes()==b""\\nexcept PermissionError: pass\\ntry: assert not pathlib.Path('+repr(str(runtime/'control.sock'))+').is_socket()\\nexcept PermissionError: pass'
 args={'request_id':'devops-one','run_id':'run','reservation_version':1,'session_id':'ses_fixture','change_id':'change','directory':str(p),'argv':['/usr/bin/python3','-c',script]}
 result=a.execute(args,lambda _:grant,job_home=root/'private');assert result['exitCode']==0,result['output'];assert result['output'].strip()=='42'
 assert result['devops_resources']['sha256']==resources['sha256']
 doc.write_text('# Go\\n  * /missing/runtime\\n');assert a.execute(args,lambda _:grant,job_home=root/'private')==result
 newer=a.devops_resources(p);assert newer['sha256']!=resources['sha256'];assert newer['resources'][0]['state']=='unavailable'
 doc.write_text('# Tool\\n  * /home\\n  * /etc\\n  * '+str(root/'.ssh/id_ed25519')+'\\n');blocked=a.devops_resources(p);assert not blocked['mounts']
 doc.unlink();assert a.devops_resources(p)['state']=='absent'
 doc.symlink_to(runtime/'.env')
 assert a.devops_resources(p)['state']=='unavailable'
 print(json.dumps({'runtime':'42','regenerated':True,'idempotent':True,'protected':True}))
finally:
 sock.close();shutil.rmtree(root)
`;
 const result=JSON.parse(execFileSync('sudo',['-n','-u','#'+uid,'/usr/bin/python3','-B','-c',code],{encoding:'utf8',timeout:20000}));
 assert.equal(result.runtime,'42');assert.equal(result.idempotent,true);assert.equal(result.protected,true);
});
