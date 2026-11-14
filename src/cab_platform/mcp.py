"""FaçadeMCP, sans règles métier et sans accès aux credentials du service."""
import asyncio
import json
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from .client import Client,ClientError
from . import __version__

server=MCPServer('CAB',version=__version__,instructions='CAB système. Initialiser sur http://127.0.0.1:8790 si nécessaire. Les mandats pilotés sont autonomes ; exceptions et revue finale seulement. Aucun rejeu d’une requête connue.')

def client():return Client()
@server.tool()
def cab_status()->dict:
    """État du service, amorçage et version ; ne lance aucun RUN."""
    return client().get('health')
@server.tool()
def cab_update_status(request_id:str)->dict:
    """Lit le même reçu durable de mise à jour ; aucune nouvelle installation."""
    return client().command('system.update.status',{'request_id':request_id})
@server.tool()
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
@server.tool()
def cab_contract()->dict:
    """Contrat commun avant cadrage et autonomie ; aucune initialisation ni permission implicite."""
    return {'version':__version__,'service':'cab.service','api':'/api/v1/openapi.json','profiles':['direct','piloted'],'pilotage':'choix résolus et mandat initial, autonomie de réalisation/tests/coordination, exceptions et revue finale seulement','exceptions':['outside-change','outside-framing','missing-tool','web-consultation'],'workshop':'piloted: /tmp/cab/<project>/.cab-tests/<change>/<RUN> ; direct: projet/.cab-tests','recovery':'Même request_id, lecture du reçu ; UNKNOWN interdit tout rejeu.'}
@server.tool()
def native_control(project_id:str,run_id:str,session_id:str,generation:int,request_id:str,action:str,text:str='')->dict:
    """Orchestrateur : créer le SID cadré ou transmettre un mandat. Un seul envoi durable, jamais de retry de prompt."""
    return client().command('operation.start',{'project_id':project_id,'run_id':run_id,'session_id':session_id,'generation':generation,'request_id':request_id,'kind':'native','native_action':action,'text':text})
@server.tool()
def project_register(root:str)->dict:
    """Rattache un projet canonique autorisé au compte effectif."""
    return client().command('project.register',{'root':root})
@server.tool()
def run_begin(project_id:str,run_id:str,session_id:str,change:str,mode:str,paths:list[str],criteria:list[str],decisions:list[str],resources:list[str]|None=None,orchestrator_id:str='',coder_id:str='',external_profiles:list[dict]|None=None,runtime_roots:list[str]|None=None,model:dict|None=None,finalization:dict|None=None)->dict:
    """Cadre un RUN. Piloté : autorité orchestrateur requise, choix résolus avant codage."""
    return client().command('run.begin',{'project_id':project_id,'run_id':run_id,'session_id':session_id,'change':change,'mode':mode,'paths':paths,'criteria':criteria,'decisions':decisions,'decisions_resolved':True,'resources':resources or [],'orchestrator_id':orchestrator_id,'coder_id':coder_id,'external_profiles':external_profiles or [],'runtime_roots':runtime_roots or [],'model':model,'finalization':finalization})
@server.tool()
def finalization_status(project_id:str,run_id:str)->dict:
    """Consulte le contrat, les preuves et les attentes ; aucun reçu inventé."""
    return client().get('finalization',project_id=project_id,run_id=run_id)
@server.tool()
def finalization_configure(project_id:str,run_id:str,policy:dict)->dict:
    """Déclare le contrat initial avant toute opération ; ensuite immutable."""
    return client().command('finalization.configure',locals())
@server.tool()
def finalization_revise_check(project_id:str,run_id:str,request_id:str,expected_policy_digest:str,check_id:str,argv:list[str],reason:str)->dict:
    """Codeur : corrige un contrôle récupérable, sans changer critères/reçus ni rejouer ; preuve nouvelle obligatoire."""
    return client().command('finalization.revise_check',locals())
@server.tool()
def native_mcp_reload(request_id:str,version:str='')->dict:
    """Demande une fois le rechargement par l'API native enregistrée ; jamais de rejeu métier."""
    return client().command('native.control.reload',{'request_id':request_id,**({'version':version} if version else {})})
@server.tool()
def native_mcp_reload_status(request_id:str)->dict:
    """Relit le même contrôle natif ; UNKNOWN conserve ses protections."""
    return client().command('native.control.status',locals())
@server.tool()
def run_status(project_id:str,run_id:str)->dict:
    """Lit le mandat, la revue et les reçus ; aucune reprise implicite."""
    return client().get('run',project_id=project_id,run_id=run_id)
@server.tool()
def run_progress(project_id:str,run_id:str,stage:int,phase:str='WORK')->dict:
    """Déclare la position 1–11 ; phase : 0 à 32 caractères A-Z, 0-9, _ ou - ; ne valide aucune étape."""
    try:return client().command('run.progress',locals())
    except ClientError as error:raise ToolError(str(error)) from error
@server.tool()
def run_reevaluate(project_id:str,run_id:str)->dict:
    """Réévalue et clôture seulement sur preuves ; aucun rejeu ni levée de protection."""
    return client().command('run.reevaluate',locals())
@server.tool()
def session_archive(project_id:str,run_id:str,evaluation_digest:str,request_id:str)->dict:
    """Archive une session CLOSED validée, en conservant son RUN et ses preuves."""
    return client().command('session.archive',locals())
@server.tool()
def run_reconcile_archive(project_id:str,run_id:str,archive_path:str,expected_framing_digest:str)->dict:
    """Relocalise le seul change archivé du RUN direct propriétaire, sans rejeu."""
    try:return client().command('run.reconcile_archive',locals())
    except ClientError as error:raise ToolError(str(error)) from error
@server.tool()
def run_inspect_historical(project_id:str,run_id:str,archive_path:str)->dict:
    """Inspecte les preuves locales pour une régularisation historique explicite."""
    return client().command('run.inspect_historical',locals())
@server.tool()
def run_close_historical(project_id:str,run_id:str,archive_path:str,evidence_digest:str,receipt_id:str,authorization:str,reason:str,developer_authorized:bool)->dict:
    """Clôture historique autorisée ; aucun test rejoué ni acceptation reconstruite."""
    return client().command('run.close_historical',locals())
@server.tool()
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
@server.tool()
def native_bind(project_id:str,run_id:str,source_file:str='',codex_home:str='',resume:bool=False)->dict:
    """Rattache le journal du RUN ; source omise : résolution ciblée au SID, aucun contenu exporté."""
    import os
    return client().command('native.bind',{'project_id':project_id,'run_id':run_id,'source_file':source_file,'codex_home':codex_home or os.environ.get('CODEX_HOME',''),'resume':resume})
@server.tool()
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

@server.tool()
async def atelier_execute(project_id:str,run_id:str,session_id:str,generation:int,request_id:str,argv:list[str],timeout_ms:int=120000,resources:list[str]|None=None)->dict:
    """Exécute dans le mandat isolé ; atelier piloté sous/tmp propre au projet. Aucun accord par commande."""
    return await execute('local',project_id,run_id,session_id,generation,request_id,argv,timeout_ms,resources)
@server.tool()
def atelier_status(project_id:str,run_id:str,request_id:str)->dict:
    """Consulte le même reçu, sans rejeu."""
    try:return client().get('operation',project_id=project_id,run_id=run_id,request_id=request_id)
    except ClientError as error:
        return {'state':'NOT_FOUND' if str(error)=='not-found' else 'RECEIPT_UNCONFIRMED','error':str(error),'request_id':request_id,'run_id':run_id,'retry_execution':False}
@server.tool()
def external_describe(project_id:str,run_id:str,profile:dict)->dict:
    """Prépare les références publiques du profil ; les valeurs de connexion restent locales."""
    return client().command('external.describe',{'project_id':project_id,'run_id':run_id,'profile':profile})
@server.tool()
async def external_execute(project_id:str,run_id:str,session_id:str,generation:int,request_id:str,adapter_id:str,argv:list[str],resources:list[str],files:list[dict]|None=None,phase:str='test',timeout_ms:int=120000)->dict:
    """Exécute sur un banc déjà réservé et un profil attaché ; reçu et nettoyage obligatoires."""
    return await execute('external',project_id,run_id,session_id,generation,request_id,argv,timeout_ms,resources,adapter_id,files,phase)
@server.tool()
def external_status(project_id:str,run_id:str,request_id:str)->dict:
    """Lit le reçu durable ; UNKNOWN conserve la protection."""
    try:return client().get('operation',project_id=project_id,run_id=run_id,request_id=request_id)
    except ClientError as error:
        return {'state':'NOT_FOUND' if str(error)=='not-found' else 'RECEIPT_UNCONFIRMED','error':str(error),'request_id':request_id,'run_id':run_id,'retry_execution':False}
@server.tool()
def bank_reserve(project_id:str,run_id:str,resource:str)->dict:
    """Réserve une ressource déjà cadrée ; ne crée pas d’autorisation métier."""
    return client().command('bank.reserve',{'project_id':project_id,'run_id':run_id,'resource':resource})
@server.tool()
def external_release(project_id:str,run_id:str,lease_id:int,cleanup_request_id:str,verification_request_id:str)->dict:
    """Restitue un banc après nettoyage et vérification corrélés, sans effet incertain."""
    return client().command('bank.release',locals())
@server.tool()
def external_attach(project_id:str,run_id:str,profile:dict)->dict:
    """Attache une seule fois un profil approuvé ; réservé à l’autorité initiale."""
    return client().command('external.attach',locals())
@server.tool()
def session_coordinate(project_id:str,run_id:str,action:str,args:dict)->dict:
    """Abonnements, avis, boîte et acquittements par le codeur, sans relais courant du parent."""
    return client().command('coordinate',locals())
@server.tool()
def autonomy_exception(project_id:str,run_id:str,request_id:str,category:str,summary:str)->dict:
    """Soumet seulement hors change, hors cadrage, outil absent ou consultation web."""
    return client().command('exception.request',locals())
@server.tool()
def autonomy_submit(project_id:str,run_id:str,submission_id:str,summary:str,tests:list[dict],limits:list[str]|None=None)->dict:
    """Soumet code et preuves finales ; tous les critères doivent être couverts."""
    limits=limits or []
    return client().command('run.submit',locals())
@server.tool()
def autonomy_review(project_id:str,run_id:str,submission_digest:str,decision:str,reason:str)->dict:
    """Revue finale par l’autorité du RUN ; aucun accord intermédiaire."""
    return client().command('run.review',locals())
@server.tool()
def incident_report(project_id:str,incident_id:str,category:str,summary:str,evidence:list[dict])->dict:
    """Déclare un incident avec références etSHA256, sans secret ni prompt."""
    return client().command('incident.report',locals())
@server.tool()
def statistics(project_id:str,run_id:str,after:int=0)->dict:
    """Mesures bornées du RUN ; totaux historiques de session exclus, manques explicites."""
    return client().get('metrics',project_id=project_id,run_id=run_id,after=after)
@server.tool()
def statistics_begin(project_id:str,run_id:str,request_id:str,from_coding_start:bool=False)->dict:
    """Ouvre la mesure du change et ferme le contexte précédent du même SID, en autonomie."""
    return client().command('statistics.begin',locals())
@server.tool()
def statistics_end(project_id:str,run_id:str,request_id:str)->dict:
    """Ferme la période du seul RUN ; même request_id, même reçu sans rejeu."""
    return client().command('statistics.end',locals())
@server.tool()
def statistics_change(project_id:str,change:str,after:int=0)->dict:
    """Projection du STATISTICS.md local, seul maître, avec historique et champs structurés."""
    return client().command('statistics.change',locals())
@server.tool()
def statistics_sync(project_id:str,request_id:str,change:str='',full:bool=False)->dict:
    """Demande la synchronisation CAB ; génération automatique, aucune rédaction statistique LLM."""
    return client().command('statistics.sync',locals())
@server.tool()
def statistics_project(project_id:str)->dict:
    """État du catalogue, du global dérivé et des jobs PostgreSQL du projet."""
    return client().command('statistics.project',locals())

def run():server.run(transport='stdio')
