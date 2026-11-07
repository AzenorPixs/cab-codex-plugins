import test from 'node:test';
import assert from 'node:assert/strict';
import {hasNativeAsk,nativeAskState,nativeMcpPreflight} from '../plugins/cab-approval-bridge/scripts/cgpt-approval-bridge-permission-policy.mjs';
const rule=(permission,action,pattern='*')=>({permission,pattern,action});
const session=(...permission)=>({permission});
test('prévol MCP : règle cgpt autorisée puis surcharge de session ASK détectée',()=>{
 const allowed=nativeMcpPreflight(session(rule('*','ask'),rule('cgpt*','allow')));
 assert.ok(allowed.every(x=>x.action==='allow'&&x.universal));
 const shadowed=nativeMcpPreflight(session(rule('*','ask'),rule('cgpt*','allow'),rule('cgpt-validation_request_validation','ask')));
 assert.equal(shadowed[0].action,'allow');assert.equal(shadowed[1].action,'ask');
 assert.equal(nativeMcpPreflight(session())[0].action,null);
});
test('politique partagée : dernier match, ressources spécifiques et deny/allow restent bloquants',()=>{
 for(const action of ['deny','allow'])assert.equal(hasNativeAsk(session(rule('shell',action)),'shell'),false);
 assert.equal(hasNativeAsk(session(rule('shell','ask')),'shell'),true);
 assert.equal(hasNativeAsk(session(rule('*','ask'),rule('shell','deny')),'shell'),false);
 assert.equal(hasNativeAsk(session(rule('shell','ask'),rule('*','deny')),'shell'),false);
 assert.equal(hasNativeAsk(session(rule('shell','deny','restricted'),rule('*','ask')),'shell'),true);
 assert.equal(hasNativeAsk(session(rule('shell','ask','restricted')),'shell'),false);
 const value=session(rule('shell','ask'),rule('edit','deny'));assert.equal(hasNativeAsk(value,'edit'),false);assert.equal(hasNativeAsk(value,'shell'),true);
 assert.deepEqual(nativeAskState(value,'edit'),{valid:true,action:'deny',universal:true,ruleIndex:1});
});
test('politique partagée : grammaire glob, alias historique et structure stricte inchangés',()=>{
 assert.equal(hasNativeAsk(session(rule('sh?ll','ask')),'shell'),true);
 for(const name of ['s.ell','sh[ell]','s(hell)','shell+'])assert.equal(hasNativeAsk(session(rule(name,'ask')),'shell'),false);
 assert.equal(hasNativeAsk(session(rule('bash','ask')),'shell'),false);
 assert.equal(hasNativeAsk(session(rule('shell','deny'),rule('bash','ask')),'bash'),false);
 assert.equal(hasNativeAsk(session(rule('shell','deny')),'bash',['ask','deny']),true);
 for(const value of [{},{permission:null},session(null),session(rule('','ask')),session({...rule('shell','ask'),pattern:1}),session(rule('shell','always'))])assert.equal(hasNativeAsk(value,'shell'),false);
 assert.equal(hasNativeAsk(session(),'shell'),false);
});
