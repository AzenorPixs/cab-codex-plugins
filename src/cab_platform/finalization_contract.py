"""Validation pure du contrat ; aucune inférence à partir du texte des critères."""
import re

KINDS={'verification','publication','installation','availability','service_end'}
NATURES={'development','delivery','activation','service'}

class ContractError(ValueError):pass

def require(value,code):
    if not value:raise ContractError(code)

def identifier(value):return isinstance(value,str) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}',value) is not None

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
