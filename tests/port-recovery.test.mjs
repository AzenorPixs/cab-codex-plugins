import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {spawn,execFile} from 'node:child_process';
import {once} from 'node:events';
import {promisify} from 'node:util';
import {createServer,createConnection} from 'node:net';
import {canonicalContinuityDigest as digest} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-continuity.mjs';
import {observePortBoundary,portProbeCommand,parsePortCapture,validatePortReview} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-port-recovery.mjs';
const execute=promisify(execFile);
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'cab-port-recovery-')),workspace=join(root,"project 'literal' $()");
 mkdirSync(join(workspace,'frontend'),{recursive:true});
 const child=spawn(process.execPath,['-e','process.title="opencode";console.log("READY");setInterval(()=>{},1000)'],{cwd:workspace,stdio:['ignore','pipe','ignore']});
 await once(child.stdout,'data');
 t.after(async()=>{if(child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}rmSync(root,{recursive:true,force:true});});
 const listener=createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 const stat=readFileSync('/proc/'+child.pid+'/stat','utf8');const start=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19];
 return {root,workspace,child,input:{workspace,nativePid:child.pid,instanceObservedAt:Date.now(),instanceStartTime:start,instanceEvidenceKind:'controller-native-instance',port,runtimeDirectories:['.'],nonce:'probe-op-a',resourceKey:'port:localhost/'+port}};
}
test('sonde native : absence vérifiée sans lecture de cmdline/environ ni mutation',async t=>{
 const h=await fixture(t),value=await observePortBoundary(h.input);
 assert.equal(value.complete,true,JSON.stringify(value));assert.equal(value.quiescent,true);assert.equal(value.matchingProcessCount,0);
 assert.ok(!JSON.stringify(value).includes('cmdline'));
 const output=await execute('/bin/sh',['-c',portProbeCommand(h.input)],{cwd:h.root});
 const part={type:'tool',tool:'bash',nativeFormat:'opencode-v2',state:{status:'completed',metadata:{exit:0},input:{command:portProbeCommand(h.input),workdir:h.workspace},output:output.stdout}};
 const parsed=parsePortCapture(part,h.input);assert.equal(parsed.nonce,'probe-op-a');assert.equal(parsed.nativePid,h.child.pid);
 assert.throws(()=>parsePortCapture(part,{...h.input,nonce:'other-probe'}),/unverified/);
});
test('sonde refuse de qualifier un listener actif',async t=>{
 const h=await fixture(t),listener=createServer();await new Promise(resolve=>listener.listen(h.input.port,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>listener.close(resolve)));
 const value=await observePortBoundary(h.input);assert.equal(value.complete,true);assert.equal(value.listening,true);assert.equal(value.quiescent,false);
});
test('sonde conserve le refus tant qu’un processus du scope peut agir',async t=>{
 const h=await fixture(t),worker=spawn(process.execPath,['-e','console.log("READY");setInterval(()=>{},1000)'],{cwd:join(h.workspace,'frontend'),stdio:['ignore','pipe','ignore']});
 await once(worker.stdout,'data');t.after(async()=>{const ended=once(worker,'exit');worker.kill();await ended;});
 const value=await observePortBoundary(h.input);assert.equal(value.complete,true,JSON.stringify(value));assert.ok(value.matchingProcessCount>=1);assert.equal(value.quiescent,false);
});
test('sonde : identité native étrangère et répertoire hors scope restent non qualifiés',async t=>{
 const h=await fixture(t);const wrong=await observePortBoundary({...h.input,nativePid:process.pid});assert.equal(wrong.complete,false);assert.equal(wrong.quiescent,false);
 const outside=await observePortBoundary({...h.input,runtimeDirectories:['../outside']});assert.equal(outside.complete,false);assert.match(outside.error,/directory/);
});
for(const field of ['serverKind','ownerId','noDetachedWorkOutsideDirectories','commandSha256'])test('revue de port refuse '+field,()=>{
 const review={ownerId:'owner-a',serverKind:'VITE_LOCAL_DEV_SERVER',commandSha256:'0'.repeat(64),runtimeDirectories:['.'],
  sourceFiles:[{path:'frontend/package.json',sha256:'1'.repeat(64)}],noDetachedWorkOutsideDirectories:true,noProcessIsolationOrCredentialChange:true,evidenceRefs:['audit/server-review']};
 review[field]=field==='noDetachedWorkOutsideDirectories'?false:'divergent';assert.throws(()=>validatePortReview(review,'owner-a'));
});

for(const variant of ['listener','process','incomplete','extra-field','nonce','command'])test('capture de port refuse '+variant,()=>{
 const expected={workspace:'/workspace',nativePid:42,port:5173,runtimeDirectories:['.'],nonce:'probe-a',resourceKey:'port:localhost/5173',
  instanceObservedAt:Date.now(),instanceEvidenceKind:'controller-native-instance',instanceStartTime:'123'};
 const value={protocol:'cab-port-boundary-v1',workspace:expected.workspace,nativePid:42,port:5173,runtimeDirectories:['.'],nonce:expected.nonce,
  instanceObservedAt:expected.instanceObservedAt,instanceEvidenceKind:expected.instanceEvidenceKind,nativeStartTime:'123',nativeStartedAtMs:expected.instanceObservedAt-10000,
  nativeStartedAtUpperBound:expected.instanceObservedAt-9000,nativeUid:process.getuid(),observedAt:Date.now(),cgroupDigest:'c'.repeat(64),netnsDigest:'d'.repeat(64),
  complete:true,quiescent:true,listening:false,matchingProcessCount:0,matchingProcesses:[],matchingProcessesDigest:digest([])};
 if(variant==='listener')value.listening=true;if(variant==='process')value.matchingProcessCount=1;
 if(variant==='incomplete')value.complete=false;if(variant==='extra-field')value.unexpected='PRIVATE-DATA';if(variant==='nonce')value.nonce='other';
 value.captureDigest=digest(value);
 const part={type:'tool',tool:'bash',nativeFormat:'opencode-v2',state:{status:'completed',metadata:{exit:0},input:{command:portProbeCommand(expected)},
  output:'CAB_PORT_BOUNDARY_V1:'+Buffer.from(JSON.stringify(value)).toString('base64')}};
 if(variant==='command')part.state.input.command+='; extra-effect';assert.throws(()=>parsePortCapture(part,expected));
});

test('sonde : reboot qualifié recapturé nativement et strictement lié au timeout',async t=>{
 const h=await fixture(t),boot=Number(readFileSync('/proc/stat','utf8').match(/^btime (\d+)$/m)[1])*1000;
 const bootIdSha256=createHash('sha256').update(readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim()).digest('hex');
 const input={...h.input,instanceEvidenceKind:'kernel-reboot-after-call',instanceObservedAt:Date.now(),
   kernelBootMs:boot,bootIdSha256,historicalEndedAt:boot-2000};
 const capture=await observePortBoundary(input);assert.equal(capture.complete,true,JSON.stringify(capture));
 assert.equal(capture.quiescent,true);assert.equal(capture.kernelBootMs,boot);
 const output=await execute('/bin/sh',['-c',portProbeCommand(input)],{cwd:h.root});
 const part={type:'tool',tool:'bash',nativeFormat:'opencode-v2',state:{status:'completed',metadata:{exit:0},input:{command:portProbeCommand(input),workdir:h.workspace},output:output.stdout}};
 assert.equal(parsePortCapture(part,input).bootIdSha256,bootIdSha256);
 for(const wrong of [{kernelBootMs:boot+1000},{bootIdSha256:'0'.repeat(64)},{historicalEndedAt:boot},{instanceObservedAt:boot-1}]){
  const bad=await observePortBoundary({...input,...wrong});assert.equal(bad.complete,false);assert.equal(bad.quiescent,false);
 }
});

// End-to-end process metadata: a real terminal, common parent, executable and paired TCP connection.
async function interactiveFixture(t,{connected=true,terminal=true,sameExecutable=true}={}){
 const root=mkdtempSync(join(tmpdir(),'cab-port-topology-'));const server=join(root,'server.cjs'),peer=join(root,'peer.cjs');
 writeFileSync(server,'process.title="opencode";const net=require("node:net"),fs=require("node:fs");const server=net.createServer(socket=>socket.once("data",data=>{if(data.toString()==="churn"){let count=0;setInterval(()=>{if(count++<200){const client=net.connect(server.address().port,"127.0.0.1");client.on("error",()=>{});}},1);}}));server.listen(0,"127.0.0.1",function(){fs.writeFileSync("ready.json",JSON.stringify({pid:process.pid,port:this.address().port}));});');
 writeFileSync(peer,connected?'process.title="opencode";require("node:net").connect(+process.argv[2],"127.0.0.1");':'process.title="opencode";setInterval(()=>{},1000);');
 const source=`import os,pty,subprocess,time,json,sys,signal
os.setsid()
master,slave=pty.openpty()
os.dup2(slave,2)
children=[]
def stop(*args):
 for p in children:
  p.terminate()
 for p in children:
  p.wait(timeout=10)
 sys.exit(0)
signal.signal(signal.SIGTERM,stop)
server=subprocess.Popen([sys.argv[1],"server.cjs"],stdin=slave,stdout=slave,stderr=slave)
children.append(server)
while not os.path.exists("ready.json"):time.sleep(.01)
data=json.load(open("ready.json"))
# Native startTime must precede peer: tick precision is part of the proof.
time.sleep(.04)
peer_args=[sys.argv[1],"peer.cjs",str(data["port"])] if sys.argv[3]=="same" else [sys.executable,"-c",'import ctypes,socket,time;ctypes.CDLL(None).prctl(15,b"opencode",0,0,0);s=socket.create_connection(("127.0.0.1",'+str(data["port"])+'));time.sleep(3600)']
peer=subprocess.Popen(peer_args,stdin=slave,stdout=slave,stderr=slave if sys.argv[2]=="tty" else subprocess.DEVNULL)
children.append(peer)
time.sleep(.1)
print(json.dumps(dict(data,peerPid=peer.pid,parentPid=os.getpid())),flush=True)
while True:time.sleep(1)
`;
 const parent=spawn('python3',['-u','-c',source,process.execPath,terminal?'tty':'detached',sameExecutable?'same':'other'],{cwd:root,stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(parent.exitCode===null){const ended=once(parent,'exit');parent.kill();await ended;}rmSync(root,{recursive:true,force:true});});
 const [line]=await once(parent.stdout,'data');const info=JSON.parse(line.toString());
 const stat=readFileSync('/proc/'+info.pid+'/stat','utf8');const start=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/)[19];
 const free=createServer();await new Promise(resolve=>free.listen(0,'127.0.0.1',resolve));const port=free.address().port;await new Promise(resolve=>free.close(resolve));
 return {root,info,input:{workspace:root,nativePid:info.pid,nativeApiPort:info.port,instanceObservedAt:Date.now(),instanceStartTime:start,
  instanceEvidenceKind:'controller-native-instance',port,runtimeDirectories:['.'],nonce:'topology-probe',resourceKey:'port:localhost/'+port}};
}
test('topologie native réelle : ancêtre et pair interactif exclus, capture qualifiée et commande bornée',async t=>{
 const h=await interactiveFixture(t),value=await observePortBoundary(h.input);
 assert.equal(value.complete,true,JSON.stringify(value));assert.equal(value.quiescent,true,JSON.stringify(value));
 assert.ok(value.infrastructure.some(x=>x.pid===h.info.parentPid&&x.reason==='native-ancestor'));
 assert.ok(value.infrastructure.some(x=>x.pid===h.info.peerPid&&x.reason==='native-interactive-peer'));
 const command=portProbeCommand(h.input);assert.ok(command.length<16384,String(command.length));
 const result=await execute('/bin/sh',['-c',command]);
 assert.equal(parsePortCapture({type:'tool',tool:'bash',nativeFormat:'opencode-v2',state:{status:'completed',metadata:{exit:0},input:{command,workdir:h.root},output:result.stdout}},h.input).quiescent,true);
});
for(const variant of ['no-connection','different-terminal','different-executable'])test('pair nommé opencode reste candidat : '+variant,async t=>{
 const h=await interactiveFixture(t,{connected:variant!=='no-connection',terminal:variant!=='different-terminal',sameExecutable:variant!=='different-executable'});
 const value=await observePortBoundary(h.input);assert.equal(value.complete,true,JSON.stringify(value));assert.equal(value.quiescent,false);
 const candidate=value.matchingProcesses.find(x=>x.pid===h.info.peerPid);assert.ok(candidate);assert.equal(candidate.comm,'opencode');
 assert.equal(candidate.ppid,h.info.parentPid);assert.equal(candidate.cwdRelative,'.');
});

test('topologie native : les connexions API tierces volatiles ne changent pas la paire stable attestée',async t=>{
 const h=await interactiveFixture(t),control=createConnection(h.info.port,'127.0.0.1');await once(control,'connect');control.write('churn');
 t.after(()=>control.destroy());await new Promise(resolve=>setTimeout(resolve,30));
 const value=await observePortBoundary(h.input);assert.equal(value.complete,true,JSON.stringify(value));assert.equal(value.quiescent,true,JSON.stringify(value));
 assert.ok(value.infrastructure.some(item=>item.pid===h.info.peerPid&&item.reason==='native-interactive-peer'));
});
