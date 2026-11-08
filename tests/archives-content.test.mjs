import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ArchiveContent,changeReports} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-archives.mjs';
import {erasureScope,projectErasure,erasureFiles} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-change-erasure.mjs';

test('Nettoyage : une déclaration CCAB encore en attente reste conservée',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-ccab-pending-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const pending=join(root,'reporting','project-hash','ccab-pending');mkdirSync(pending,{recursive:true,mode:0o700});
 writeFileSync(join(pending,'incident-fixture.json'),JSON.stringify({change_id:'closed-change'}));
 const business=join(root,'business.json');writeFileSync(business,'{}');
 assert.deepEqual(erasureFiles(root),[business]);
 assert.equal(existsSync(join(pending,'incident-fixture.json')),true);
});

test('Copies CAB consultables, suppression développeur idempotente, pairs et sources conservés',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-archive-fixture-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const workspace=join(root,'project'),directory=join(workspace,'openspec/changes/archive/2026-11-06-fixture');
 mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'STATISTICS.md'),'# Statistiques synthétiques\n');
 const repository=new ArchiveContent(join(root,'private-archives'),workspace),scope={workspace,changeId:'fixture',runIds:['run-fixture']};
 const archive=repository.retain(scope,{reportPaths:changeReports(workspace,'fixture','TERMINÉ'),closed:true,branch:'TERMINÉ'});
 const peerDirectory=join(workspace,'openspec/changes/archive/2026-11-06-peer');mkdirSync(peerDirectory);writeFileSync(join(peerDirectory,'STATISTICS.md'),'# Statistiques synthétiques\n');
 const peer=repository.retain({...scope,changeId:'peer',runIds:['peer-run']},{reportPaths:[join(peerDirectory,'STATISTICS.md')],closed:true,branch:'TERMINÉ'});
 assert.equal(repository.list().length,2);
 assert.equal(repository.content(archive.archiveId,archive.files[0].sha256).content,'# Statistiques synthétiques\n');
 assert.throws(()=>repository.remove(archive.archiveId,archive.fingerprint,['run-fixture']),/run-in-progress/);
 assert.equal(repository.remove(archive.archiveId,archive.fingerprint).state,'DONE');
 assert.equal(repository.remove(archive.archiveId,archive.fingerprint).state,'DONE');
 assert.equal(repository.list()[0].archiveId,peer.archiveId);
 assert.equal(readFileSync(join(directory,'STATISTICS.md'),'utf8'),'# Statistiques synthétiques\n');
});

test('Rapport complété : les deux versions restent lisibles et la reprise est idempotente',t=>{
 const root=mkdtempSync(join(tmpdir(),'cab-archive-revision-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const workspace=join(root,'project'),directory=join(workspace,'openspec/changes/archive/2026-11-06-fixture');
 mkdirSync(directory,{recursive:true});const report=join(directory,'STATISTICS.md');writeFileSync(report,'ancienne version\n');
 const repository=new ArchiveContent(join(root,'private-archives'),workspace),scope={workspace,changeId:'fixture',runIds:['run-fixture']};
 const old=repository.retain(scope,{reportPaths:[report],closed:true,branch:'TERMINÉ'});
 writeFileSync(report,'version complétée\n');
 const updated=repository.retain(scope,{reportPaths:[report],closed:true,branch:'TERMINÉ'});
 assert.notEqual(updated.archiveId,old.archiveId);assert.equal(updated.supersedes,old.archiveId);assert.equal(updated.files.length,1);
 assert.equal(repository.content(old.archiveId,old.files[0].sha256).content,'ancienne version\n');
 assert.equal(repository.content(updated.archiveId,updated.files[0].sha256).content,'version complétée\n');
 assert.equal(repository.retain(scope,{reportPaths:[report],closed:true,branch:'TERMINÉ'}).fingerprint,updated.fingerprint);
 assert.throws(()=>repository.remove(updated.archiveId,old.fingerprint),/content-changed/);
 assert.equal(repository.remove(updated.archiveId,updated.fingerprint).state,'DONE');
 assert.equal(repository.retain(scope,{reportPaths:[report],closed:true,branch:'TERMINÉ'}).retention,'DEVELOPER_DELETED');
 writeFileSync(join(root,'private-archives',old.archiveId,old.files[0].name),'{}');
 assert.throws(()=>repository.retain(scope,{reportPaths:[report],closed:true,branch:'TERMINÉ'}),/archive-content-divergent/);
});

test('Autorité2.4 : RUN clos nettoyable malgré traces anciennes, RUN en cours refusé',()=>{
 const run={runId:'fixture-run',ownerId:'fixture-owner',changeId:'fixture-change',state:'ABANDONED',contextId:1,version:1};
 const peer={runId:'peer-run',ownerId:'peer-owner',changeId:'peer-change',state:'RESERVED',contextId:2,version:2};
 const snapshot={project:'/fixture',sequence:2,runs:[run,peer],history:[],coordination:{sequence:3,
  operations:{old:{runId:run.runId,operationId:'old',state:'EXECUTING',onceAcknowledged:true},peer:{runId:peer.runId,operationId:'peer',state:'EXECUTING'}},
  accesses:{old:{runId:run.runId,state:'UNKNOWN'}},testReservations:{}}};
 const scope=erasureScope(snapshot,run.changeId,run.ownerId,{closedAuthority:true});
 const projected=projectErasure(snapshot,scope);
 assert.equal(projected.coordination.operations.old,undefined);
 assert.deepEqual(projected.coordination.operations.peer,snapshot.coordination.operations.peer);
 assert.equal(Object.hasOwn(snapshot.coordination.operations.old,'nativeResult'),false);
 run.state='RESERVED';assert.throws(()=>erasureScope(snapshot,run.changeId,run.ownerId,{closedAuthority:true}),/not-closed|in-progress/);
});
