"""FaçadeMCP, sans règles métier et sans accès aux credentials du service."""
import asyncio
from contextvars import ContextVar
import json
import inspect
import os
import re
from functools import wraps
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from .client import Client,ClientError
from . import __version__

shared_thread=ContextVar('cab_native_thread',default=None)


class ScopedMCPServer(MCPServer):
    async def call_tool(self,name,arguments,context=None):
        thread=None
        if os.environ.get('CAB_MCP_SHARED_STDIO')=='1':
            ctx=context.request_context if context is not None else None
            meta=ctx.meta if ctx is not None else None
            extra=meta if isinstance(meta,dict) else getattr(meta,'model_extra',None) or {}
            value=extra.get('threadId')
            thread=value if isinstance(value,str) and re.fullmatch(r'[0-9a-fA-F-]{36}',value) else ''
        token=shared_thread.set(thread)
        try:return await super().call_tool(name,arguments,context)
        finally:shared_thread.reset(token)


server=ScopedMCPServer('CAB',version=__version__,instructions='CAB système. Initialiser sur http://127.0.0.1:8790 si nécessaire. Les mandats pilotés sont autonomes ; exceptions et revue finale seulement. Aucun rejeu d’une requête connue.')

def public_tool():
    """Conserver signatures et refus publics, y compris pour les appels async."""
    def decorate(function):
        if inspect.iscoroutinefunction(function):
            @wraps(function)
            async def wrapped(*args,**kwargs):
                try:return await function(*args,**kwargs)
                except ClientError as error:raise ToolError(str(error)) from error
        else:
            @wraps(function)
            def wrapped(*args,**kwargs):
                try:return function(*args,**kwargs)
                except ClientError as error:raise ToolError(str(error)) from error
        return server.tool()(wrapped)
    return decorate

def client():return Client(native_thread=shared_thread.get())
@public_tool()
def cab_status()->dict:
    """État du service, amorçage et version ; ne lance aucun RUN."""
    return client().get('health')
@public_tool()
def cab_update_status(request_id:str)->dict:
    """Lit le même reçu durable de mise à jour ; aucune nouvelle installation."""
    return client().command('system.update.status',{'request_id':request_id})
@public_tool()
async def cab_update(request_id:str,version:str='',timeout_ms:int=1800000)->dict:
    """Demande explicite CABU : CAB met à jour sa source officielle sans sudo client ni LLM intermédiaire. OK porte la version vérifiée."""
    if type(timeout_ms) is not int or not 1000<=timeout_ms<=1800000:raise ValueError('update-wait-invalid')
    c=client()
    try:result=await asyncio.to_thread(c.command,'system.update',{'request_id':request_id,'version':version})
    except ClientError as error:
        return {'request_id':request_id,'state':'ADMISSION_UNCONFIRMED','error':str(error),'next_action':'cab_update_status','retry_execution':False}
    deadline=asyncio.get_running_loop().time()+timeout_ms/1000
    while result['state'] not in ('OK','FAILED','UNKNOWN','RELOAD_REQUIRED') and asyncio.get_running_loop().time()<deadline:
        await asyncio.sleep(1)
        try:result=await asyncio.to_thread(c.command,'system.update.status',{'request_id':request_id})
        except ClientError as error:
            if str(error)!='cab-unavailable':raise
    return result
@public_tool()
def cab_contract()->dict:
    """Contrat commun avant cadrage et autonomie ; aucune initialisation ni permission implicite."""
    return {'version':__version__,'service':'cab.service','api':'/api/v1/openapi.json','profiles':['direct','piloted'],'pilotage':'choix résolus et mandat initial, autonomie de réalisation/tests/coordination, exceptions et revue finale seulement','exceptions':['outside-change','outside-framing','missing-tool','web-consultation'],'workshop':'piloted: /tmp/cab/<project>/.cab-tests/<change>/<RUN> ; direct: projet/.cab-tests','recovery':'Même request_id, lecture du reçu ; UNKNOWN interdit tout rejeu.','finalization':__import__('cab_platform.finalization_contract',fromlist=['describe']).describe()}
@public_tool()
def finalization_validate(policy:dict,criteria:list[str],mode:str='direct')->dict:
    """Prévol pur : schéma strict, critères exacts et modes ; aucun RUN ni effet."""
    from .finalization_contract import validate,describe,ContractError
    try:return {'valid':True,'policy':validate(policy,criteria,mode),'contract':describe(),'effects_issued':False}
    except ContractError as error:return {'valid':False,'error':str(error),'contract':describe(),'effects_issued':False}
@public_tool()
def native_control(project_id:str,run_id:str,session_id:str,generation:int,request_id:str,action:str,text:str='')->dict:
    """Orchestrateur : créer le SID cadré ou transmettre un mandat. Un seul envoi durable, jamais de retry de prompt."""
    return client().command('operation.start',{'project_id':project_id,'run_id':run_id,'session_id':session_id,'generation':generation,'request_id':request_id,'kind':'native','native_action':action,'text':text})
@public_tool()
def project_register(root:str)->dict:
    """Rattache un projet canonique autorisé au compte effectif."""
    return client().command('project.register',{'root':root})
@public_tool()
def run_begin(project_id:str,run_id:str,session_id:str,change:str,mode:str,paths:list[str],criteria:list[str],decisions:list[str],resources:list[str]|None=None,orchestrator_id:str='',coder_id:str='',external_profiles:list[dict]|None=None,runtime_roots:list[str]|None=None,model:dict|None=None,finalization:dict|None=None)->dict:
    """Cadre un RUN. Piloté : autorité orchestrateur requise, choix résolus avant codage."""
    return client().command('run.begin',{'project_id':project_id,'run_id':run_id,'session_id':session_id,'change':change,'mode':mode,'paths':paths,'criteria':criteria,'decisions':decisions,'decisions_resolved':True,'resources':resources or [],'orchestrator_id':orchestrator_id,'coder_id':coder_id,'external_profiles':external_profiles or [],'runtime_roots':runtime_roots or [],'model':model,'finalization':finalization})
@public_tool()
def session_delivery_start(version:str)->dict:
    """CICD livre les fichiers préparés dans l’index du change courant."""
    return client().command('session.delivery.start',{'version':version})

@public_tool()
def session_delivery_full_start(version:str)->dict:
    """CICDF livre tous les fichiers admissibles modifiés ou indexés du projet, sur mandat explicite."""
    return client().command('session.delivery.full_start',{'version':version})

@public_tool()
def session_delivery_select_version(project_id:str,run_id:str,version:str)->dict:
    """Déclare la version choisie : orchestrateur en piloté, codeur en direct ; sans question systématique au développeur."""
    return client().command('session.delivery.select_version',{'project_id':project_id,'run_id':run_id,'version':version})

@public_tool()
def session_delivery_status(version:str)->dict:
    """Lit le reçu de cette version sans relancer ses effets."""
    return client().command('session.delivery.status',{'version':version})

@public_tool()
def session_git_context()->dict:
    """Identifie le RUN attaché à cette connexion MCP."""
    return client().command('session.git.context',{})

@public_tool()
def session_git_release(request_id:str)->dict:
    """Libère les fichiers validés et indexés en fin de travail sans livraison ; conserve l'index, aucun commit ni push."""
    return client().command('session.git.release',{'request_id':request_id})

@public_tool()
def session_git_reserve(request_id:str,paths:list[str])->dict:
    """Réserve avant modification les fichiers du RUN lié à cette connexion."""
    return client().command('session.git.reserve',{'request_id':request_id,'paths':paths})

@public_tool()
def session_git_stage(request_id:str,paths:list[str])->dict:
    """Indexe les fichiers réservés d'une étape validée dans l'index de session."""
    return client().command('session.git.stage',{'request_id':request_id,'paths':paths})

@public_tool()
def session_git_status(request_id:str)->dict:
    """Lit le reçu de la même indexation sans la rejouer."""
    return client().command('session.git.status',{'request_id':request_id})

@public_tool()
def session_git_inspect(include_paths:bool=False)->dict:
    """Lit l’état compact Git et les réservations du RUN lié à cette connexion."""
    return client().command('session.git.inspect',{'include_paths':include_paths})

@public_tool()
def finalization_status(project_id:str,run_id:str)->dict:
    """Consulte le contrat, les preuves et les attentes ; aucun reçu inventé."""
    return client().get('finalization',project_id=project_id,run_id=run_id)
@public_tool()
def finalization_configure(project_id:str,run_id:str,policy:dict)->dict:
    """Déclare ou corrige le prévol sans effet/source modifiée ; conserve nature, critères et revue réservée."""
    return client().command('finalization.configure',locals())
@public_tool()
def finalization_revise_check(project_id:str,run_id:str,request_id:str,expected_policy_digest:str,check_id:str,argv:list[str],reason:str)->dict:
    """Codeur : corrige un contrôle récupérable, sans changer critères/reçus ni rejouer ; preuve nouvelle obligatoire."""
    return client().command('finalization.revise_check',locals())
@public_tool()
def native_mcp_reload(request_id:str,version:str='')->dict:
    """Demande une fois le rechargement par l'API native enregistrée ; jamais de rejeu métier."""
    return client().command('native.control.reload',{'request_id':request_id,**({'version':version} if version else {})})
@public_tool()
def native_mcp_reload_status(request_id:str)->dict:
    """Relit le même contrôle natif ; UNKNOWN conserve ses protections."""
    return client().command('native.control.status',locals())
@public_tool()
def run_status(project_id:str,run_id:str)->dict:
    """Lit le mandat, la revue et les reçus ; aucune reprise implicite."""
    return client().get('run',project_id=project_id,run_id=run_id)
@public_tool()
def run_progress(project_id:str,run_id:str,stage:int,phase:str='WORK')->dict:
    """Déclare la position 1–11 ; phase : 0 à 32 caractères A-Z, 0-9, _ ou - ; ne valide aucune étape."""
    try:return client().command('run.progress',locals())
    except ClientError as error:raise ToolError(str(error)) from error
@public_tool()
def run_reevaluate(project_id:str,run_id:str)->dict:
    """Réévalue et clôture seulement sur preuves ; aucun rejeu ni levée de protection."""
    return client().command('run.reevaluate',locals())
@public_tool()
def session_archive(project_id:str,run_id:str,evaluation_digest:str,request_id:str)->dict:
    """Archive une session CLOSED validée, en conservant son RUN et ses preuves."""
    return client().command('session.archive',locals())
@public_tool()
def run_reconcile_archive(project_id:str,run_id:str,archive_path:str,expected_framing_digest:str)->dict:
    """Relocalise le seul change archivé du RUN direct propriétaire, sans rejeu."""
    try:return client().command('run.reconcile_archive',locals())
    except ClientError as error:raise ToolError(str(error)) from error
@public_tool()
def run_inspect_historical(project_id:str,run_id:str,archive_path:str)->dict:
    """Inspecte les preuves locales pour une régularisation historique explicite."""
    return client().command('run.inspect_historical',locals())
@public_tool()
def run_block(project_id:str,run_id:str,receipt_id:str,dependencies:list[str])->dict:
    """Arrêter sur des dépendances non satisfaites et produire BLOCKERS.md sans archiver le change."""
    return client().command('run.close',{**locals(),'branch':'BLOQUÉ'})

@public_tool()
def run_close_historical(project_id:str,run_id:str,archive_path:str,evidence_digest:str,receipt_id:str,authorization:str,reason:str,developer_authorized:bool)->dict:
    """Clôture historique autorisée ; aucun test rejoué ni acceptation reconstruite."""
    return client().command('run.close_historical',locals())
@public_tool()
async def wait_for_handoff(project_id:str,run_id:str,after:int=0,timeout_ms:int=86400000)->dict:
    """Attend mécaniquement exception ou revue finale sans tours LLM de suivi. Lectures seulement ; aucune décision ou exécution implicite."""
    if not 1<=timeout_ms<=86400000:raise ValueError('handoff-timeout-invalid')
    deadline=asyncio.get_running_loop().time()+timeout_ms/1000;c=client()
    while asyncio.get_running_loop().time()<deadline:
        try:
            result=await asyncio.to_thread(c.get,'handoff',project_id=project_id,run_id=run_id,after=after)
            if result['events'] or result['state'] in ('REVIEW_PENDING','CLOSED','BLOCKED'):return result
        except ClientError as error:
            if str(error)!='cab-unavailable':raise
        await asyncio.sleep(1)
    return {'run_id':run_id,'state':'WAIT_TIMEOUT','after':after,'effects_issued':False}
@public_tool()
def native_bind(project_id:str,run_id:str,source_file:str='',codex_home:str='',resume:bool=False)->dict:
    """Rattache le journal du RUN ; source omise : résolution ciblée au SID, aucun contenu exporté."""
    import os
    return client().command('native.bind',{'project_id':project_id,'run_id':run_id,'source_file':source_file,'codex_home':codex_home or os.environ.get('CODEX_HOME',''),'resume':resume})
@public_tool()
def native_locate(project_id:str,session_id:str,codex_home:str='')->dict:
    """Prévol en lecture seule du seul SID Codex demandé ; ne crée aucun RUN."""
    import os
    return client().command('native.locate',{'project_id':project_id,'session_id':session_id,'codex_home':codex_home or os.environ.get('CODEX_HOME','')})

async def execute(kind,project_id,run_id,session_id,generation,request_id,argv,timeout_ms,resources,adapter_id='',files=None,phase='test'):
    c=client();data={'project_id':project_id,'run_id':run_id,'session_id':session_id,'generation':generation,'request_id':request_id,'kind':kind,'argv':argv,'timeout_ms':timeout_ms,'resources':resources or [],'phase':phase}
    if kind=='external':data.update(adapter_id=adapter_id,files=files or [])
    try:result=await asyncio.to_thread(c.command,'operation.start',data)
    except ClientError as error:
        return {'state':'ADMISSION_UNCONFIRMED','error':str(error),'request_id':request_id,'run_id':run_id,'retry_execution':False,'next_action':'read-same-receipt'}
    # Attente mécanique du même reçu, jamais de nouvelle exécution.
    deadline=asyncio.get_running_loop().time()+timeout_ms/1000+60
    while result['state'] in ('WAITING','INTENT','RUNNING') and asyncio.get_running_loop().time()<deadline:
        await asyncio.sleep(0.2)
        try:result=await asyncio.to_thread(c.get,'operation',project_id=project_id,run_id=run_id,request_id=request_id)
        except ClientError as error:
            if str(error)!='cab-unavailable':return {'state':'RECEIPT_UNCONFIRMED','error':str(error),'request_id':request_id,'run_id':run_id,'retry_execution':False}
    return result

@public_tool()
async def atelier_execute(project_id:str,run_id:str,session_id:str,generation:int,request_id:str,argv:list[str],timeout_ms:int=120000,resources:list[str]|None=None)->dict:
    """Exécute dans le mandat isolé ; atelier piloté sous/tmp propre au projet. Aucun accord par commande."""
    return await execute('local',project_id,run_id,session_id,generation,request_id,argv,timeout_ms,resources)
@public_tool()
def atelier_status(project_id:str,run_id:str,request_id:str)->dict:
    """Consulte le même reçu, sans rejeu."""
    try:return client().get('operation',project_id=project_id,run_id=run_id,request_id=request_id)
    except ClientError as error:
        return {'state':'NOT_FOUND' if str(error)=='not-found' else 'RECEIPT_UNCONFIRMED','error':str(error),'request_id':request_id,'run_id':run_id,'retry_execution':False}
@public_tool()
def external_describe(project_id:str,run_id:str,profile:dict)->dict:
    """Prépare les références publiques du profil ; les valeurs de connexion restent locales."""
    return client().command('external.describe',{'project_id':project_id,'run_id':run_id,'profile':profile})
@public_tool()
async def external_execute(project_id:str,run_id:str,session_id:str,generation:int,request_id:str,adapter_id:str,argv:list[str],resources:list[str],files:list[dict]|None=None,phase:str='test',timeout_ms:int=120000)->dict:
    """Exécute sur un banc déjà réservé et un profil attaché ; reçu et nettoyage obligatoires."""
    return await execute('external',project_id,run_id,session_id,generation,request_id,argv,timeout_ms,resources,adapter_id,files,phase)
@public_tool()
def external_status(project_id:str,run_id:str,request_id:str)->dict:
    """Lit le reçu durable ; UNKNOWN conserve la protection."""
    try:return client().get('operation',project_id=project_id,run_id=run_id,request_id=request_id)
    except ClientError as error:
        return {'state':'NOT_FOUND' if str(error)=='not-found' else 'RECEIPT_UNCONFIRMED','error':str(error),'request_id':request_id,'run_id':run_id,'retry_execution':False}
@public_tool()
def bank_reserve(project_id:str,run_id:str,resource:str)->dict:
    """Réserve une ressource déjà cadrée ; ne crée pas d’autorisation métier."""
    return client().command('bank.reserve',{'project_id':project_id,'run_id':run_id,'resource':resource})
@public_tool()
def external_release(project_id:str,run_id:str,lease_id:int,cleanup_request_id:str,verification_request_id:str)->dict:
    """Restitue un banc après nettoyage et vérification corrélés, sans effet incertain."""
    return client().command('bank.release',locals())
@public_tool()
def external_attach(project_id:str,run_id:str,profile:dict)->dict:
    """Attache une seule fois un profil approuvé ; réservé à l’autorité initiale."""
    return client().command('external.attach',locals())
@public_tool()
def session_coordinate(project_id:str,run_id:str,action:str,args:dict)->dict:
    """Abonnements, avis, boîte et acquittements par le codeur, sans relais courant du parent."""
    return client().command('coordinate',locals())
@public_tool()
def autonomy_exception(project_id:str,run_id:str,request_id:str,category:str,summary:str)->dict:
    """Soumet seulement hors change, hors cadrage, outil absent ou consultation web."""
    return client().command('exception.request',locals())
@public_tool()
def autonomy_submit(project_id:str,run_id:str,submission_id:str,summary:str,tests:list[dict],limits:list[str]|None=None)->dict:
    """Soumet code et preuves finales ; tous les critères doivent être couverts."""
    limits=limits or []
    return client().command('run.submit',locals())
@public_tool()
def autonomy_review(project_id:str,run_id:str,submission_digest:str,decision:str,reason:str)->dict:
    """Revue finale par l’autorité du RUN ; aucun accord intermédiaire."""
    return client().command('run.review',locals())
@public_tool()
def incident_report(project_id:str,incident_id:str,category:str,summary:str,evidence:list[dict])->dict:
    """Déclare un incident avec références etSHA256, sans secret ni prompt."""
    return client().command('incident.report',locals())
@public_tool()
def statistics(project_id:str,run_id:str,after:int=0)->dict:
    """Mesures bornées du RUN ; totaux historiques de session exclus, manques explicites."""
    return client().get('metrics',project_id=project_id,run_id=run_id,after=after)
@public_tool()
def statistics_begin(project_id:str,run_id:str,request_id:str,from_coding_start:bool=False)->dict:
    """Ouvre la mesure du change et ferme le contexte précédent du même SID, en autonomie."""
    return client().command('statistics.begin',locals())
@public_tool()
def statistics_end(project_id:str,run_id:str,request_id:str)->dict:
    """Ferme la période du seul RUN ; même request_id, même reçu sans rejeu."""
    return client().command('statistics.end',locals())
@public_tool()
def statistics_change(project_id:str,change:str,after:int=0)->dict:
    """Projection du STATISTICS.md local, seul maître, avec historique et champs structurés."""
    return client().command('statistics.change',locals())
@public_tool()
def statistics_sync(project_id:str,request_id:str,change:str='',full:bool=False)->dict:
    """Demande la synchronisation CAB ; génération automatique, aucune rédaction statistique LLM."""
    return client().command('statistics.sync',locals())
@public_tool()
def statistics_project(project_id:str)->dict:
    """État du catalogue, du global dérivé et des jobs PostgreSQL du projet."""
    return client().command('statistics.project',locals())

def run():server.run(transport='stdio')
