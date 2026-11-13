"""Validation pure du contrat ; aucune inférence à partir du texte des critères."""
import re
from copy import deepcopy

KINDS={'verification','publication','installation','availability','service_end'}
NATURES={'development','delivery','activation','service'}

class ContractError(ValueError):pass

def require(value,code):
    if not value:raise ContractError(code)

def identifier(value):return isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}',value) is not None

def replace_check_argv(policy: dict,check_id: str,argv: list[str]) -> dict:
    """Le cadrage reste fixe : seule la commande du contrôle est révisable."""
    result=deepcopy(policy)
    check=next((item for item in result.get('checks',[]) if item['id']==check_id),None)
    require(check is not None,'finalization-check-unknown')
    require(check['argv']!=argv,'finalization-check-unchanged')
    check['argv']=argv
    return result

def next_actions(missing: list[str],policy: dict) -> list[dict]:
    """Instructions factuelles ; aucune opération n'est exécutée ni rejouée."""
    actions=[]
    for reason in missing:
        action={'reason':reason,'automatic':False,'replay':False}
        if reason=='finalization-contract-required':
            action.update(command='finalization.configure',requires=['policy couvrant les critères','adoption avant opération/revue/gel'])
        elif reason.startswith('evidence:'):
            rules=sorted(policy.get('checks',[])+policy.get('requirements',[]),key=lambda item:len(item['id']),reverse=True)
            rule=next((item for item in rules if reason.startswith('evidence:'+item['id']+':')),{})
            key=rule.get('id','');detail=reason[len('evidence:'+key+':'):]
            action['rule_id']=key
            if 'argv' in rule:
                action.update(command='operation.start',argv=rule['argv'],requires=['nouveau request_id','preuve de la révision courante'])
                if detail in ('not-passed','source-stale','check-revised','receipt-stale'):
                    action['alternative']={'command':'finalization.revise_check','requires':['expected_policy_digest','nouvel argv justifié','request_id stable']}
            elif rule.get('producer')=='cab-update':action.update(command='system.update.status',request_id=policy.get('update_request_id'),requires=['même reçu CABU ; aucune réinstallation'])
            else:action.update(command='evidence.attest',producer=rule.get('producer'),kind=rule.get('kind'),requires=['attestation du producteur autorisé','preuve de la révision courante'])
        elif reason=='closure-effects-protected':action.update(query='operation',requires=['réconcilier les requêtes non terminales et baux ; aucun rejeu'])
        elif reason=='reserved-review-required':action.update(command='run.review',requires=['décision de l’autorité réservée sur le dossier courant'])
        elif reason in ('change-still-open','archive-missing-or-ambiguous','archive-tasks-incomplete','archive-proposal-missing'):
            action.update(query='finalization',requires=['archive unique réelle et tâches accomplies sur preuves'])
        else:action.update(query='finalization',requires=[reason])
        blockers=[item for item in missing if item in ('closure-effects-protected','maintenance-in-progress','run-suspended','closure-exception-unresolved')]
        if blockers and action.get('command') in ('operation.start','finalization.configure'):
            action['blocked_by']=blockers
        actions.append(action)
    return actions

def validate(policy: dict,criteria: list[str],mode: str) -> dict:
    require(isinstance(policy,dict) and not set(policy)-{'nature','checks','requirements','review_required','update_request_id','target_version'},'finalization-fields-invalid')
    nature=policy.get('nature','development');require(nature in NATURES,'finalization-nature-invalid')
    checks=policy.get('checks',[]);requirements=policy.get('requirements',[])
    require(isinstance(checks,list) and isinstance(requirements,list) and 1<=len(checks)+len(requirements)<=64,'finalization-proof-plan-required')
    seen=set();covered=set();clean_checks=[];clean_requirements=[]
    for kind,items in [('check',checks),('requirement',requirements)]:
        for item in items:
            allowed={'id','criteria','argv','executor','adapter_id'} if kind=='check' else {'id','criteria','kind','producer','artifact_group'}
            require(isinstance(item,dict) and not set(item)-allowed,'finalization-rule-fields-invalid')
            key=item.get('id');require(identifier(key) and key not in seen,'finalization-rule-id-invalid');seen.add(key)
            scope=item.get('criteria');require(isinstance(scope,list) and scope and all(isinstance(c,str) and c in criteria for c in scope),'finalization-criterion-invalid');covered.update(scope)
            if kind=='check':
                argv=item.get('argv');require(isinstance(argv,list) and 1<=len(argv)<=128 and all(isinstance(v,str) and '\0' not in v and len(v)<=200000 for v in argv),'finalization-check-argv-invalid')
                executor=item.get('executor','local');require(executor in ('local','external'),'finalization-executor-invalid')
                require(executor!='external' or identifier(item.get('adapter_id')),'finalization-adapter-required')
                clean_checks.append({**item,'executor':executor})
            else:
                require(item.get('kind') in KINDS and identifier(item.get('producer')),'finalization-producer-required')
                require('artifact_group' not in item or identifier(item['artifact_group']),'finalization-artifact-group-invalid')
                require(item['producer']!='cab-update' or item['kind'] in ('installation','availability'),'finalization-builtin-kind-invalid')
                clean_requirements.append(dict(item))
    require(covered==set(criteria),'finalization-criteria-not-covered')
    review=policy.get('review_required',mode=='piloted');require(type(review) is bool and (mode!='piloted' or review),'finalization-reserved-review-required')
    if any(r['producer']=='cab-update' for r in clean_requirements):
        require(identifier(policy.get('update_request_id')) and isinstance(policy.get('target_version'),str) and re.fullmatch(r'\d+\.\d+\.\d+',policy['target_version']),'finalization-update-binding-required')
    if nature=='service':require(any(r['kind']=='service_end' for r in clean_requirements),'finalization-service-proof-required')
    if nature=='activation':require({'installation','availability'}<={r['kind'] for r in clean_requirements},'finalization-activation-proofs-required')
    if nature=='delivery':require(any(r['kind']=='publication' for r in clean_requirements),'finalization-publication-proof-required')
    return {**policy,'nature':nature,'checks':clean_checks,'requirements':clean_requirements,'review_required':review}
