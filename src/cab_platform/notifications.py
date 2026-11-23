"""Centre administrateur : messages consommés et décisions durables sans exécution."""
import hashlib
import json
import uuid
from django.db import connection,transaction
from django.utils import timezone
from .core.commands import require
from .core.models import Notification,NotificationReceipt,Project


def administrator(actor):
    require(actor.active and actor.role=='admin','administrator-required',403)


def validated(title,body,kind,choices):
    require(isinstance(title,str) and 0<len(title.strip())<=300,'notification-title-invalid',400)
    require(isinstance(body,str) and 0<len(body.strip())<=65536,'notification-body-invalid',400)
    require(kind in ('message','question'),'notification-kind-invalid',400)
    require(isinstance(choices,list) and len(choices)<=20,'notification-choices-invalid',400)
    if kind=='message':require(not choices,'notification-choices-invalid',400)
    else:
        require(2<=len(choices)<=20,'notification-choices-invalid',400)
        ids=[]
        for item in choices:
            require(isinstance(item,dict) and set(item)=={'id','label'},'notification-choices-invalid',400)
            require(isinstance(item['id'],str) and 0<len(item['id'])<=100 and isinstance(item['label'],str) and 0<len(item['label'].strip())<=300,'notification-choices-invalid',400)
            ids.append(item['id'])
        require(len(set(ids))==len(ids),'notification-choices-invalid',400)
    return hashlib.sha256(json.dumps([title,body,kind,choices],ensure_ascii=False,sort_keys=True).encode()).hexdigest()


def identifier(key):
    require(isinstance(key,str) and 0<len(key)<=500,'notification-key-invalid',400)
    return uuid.uuid5(uuid.NAMESPACE_URL,'cab-notification:'+key)


def serialize(row):
    return {'id':str(row.pk),'project_id':row.project_id,'sender':row.sender,'title':row.title,'body':row.body,'kind':row.kind,'choices':row.choices,'read_at':row.read_at.isoformat() if row.read_at else None,'created':row.created.isoformat(),'updated':row.updated.isoformat()}


def receipt_view(receipt):
    return {'id':str(receipt.pk),'state':receipt.state,'choice':receipt.choice or None,'at':receipt.created.isoformat()}


@transaction.atomic
def publish(key,*,title,body,project=None,kind='message',choices=None):
    choices=[] if choices is None else choices
    fingerprint=validated(title,body,kind,choices);pk=identifier(key)
    # Sérialise publication/lecture/réponse du même message sans verrou fichier.
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[int.from_bytes(pk.bytes[:8],'big',signed=True)])
    row=Notification.objects.select_for_update().filter(pk=pk).first()
    # Une purge concurrente peut avoir retiré la ligne et créé son reçu.
    receipt=NotificationReceipt.objects.filter(pk=pk).first()
    if receipt:
        require(kind!='question' or receipt.fingerprint==fingerprint,'notification-question-conflict',409)
        return receipt_view(receipt)
    if row:
        require(row.project_id==(project.pk if project else None) and row.kind==kind,'notification-identity-conflict',409)
        require(kind!='question' or row.fingerprint==fingerprint,'notification-question-conflict',409)
        if row.fingerprint!=fingerprint:
            row.title=title;row.body=body;row.fingerprint=fingerprint;row.save(update_fields=['title','body','fingerprint','updated'])
    else:
        sender=(project.name or (project.public_metadata or {}).get('values',{}).get('PROJECT_NAME') or project.identifier or 'Projet') if project else 'CAB'
        row=Notification.objects.create(id=pk,project=project,sender=sender,title=title,body=body,kind=kind,choices=choices,fingerprint=fingerprint)
    return serialize(row)


@transaction.atomic
def read(actor,pk):
    administrator(actor)
    pk=uuid.UUID(str(pk))
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[int.from_bytes(pk.bytes[:8],'big',signed=True)])
    row=Notification.objects.select_for_update().filter(pk=pk).first()
    if row is None:
        receipt=NotificationReceipt.objects.filter(pk=pk).first()
        require(receipt is not None,'notification-not-found',404)
        return receipt_view(receipt)
    if row.kind=='question':
        if row.read_at is None:row.read_at=timezone.now();row.save(update_fields=['read_at','updated'])
        return serialize(row)
    receipt=NotificationReceipt.objects.create(id=row.pk,state='READ',fingerprint=row.fingerprint,actor=actor)
    row.delete()
    return receipt_view(receipt)


@transaction.atomic
def clear_messages(actor):
    administrator(actor)
    messages = list(Notification.objects.select_for_update().filter(kind='message')
                    .order_by('pk').values_list('pk', 'fingerprint'))
    NotificationReceipt.objects.bulk_create([
        NotificationReceipt(id=pk, state='CLEARED', fingerprint=fingerprint, actor=actor)
        for pk, fingerprint in messages
    ])
    ids = [pk for pk, _ in messages]
    Notification.objects.filter(pk__in=ids).delete()
    return {'cleared_ids': [str(pk) for pk in ids]}


@transaction.atomic
def answer(actor,pk,choice):
    administrator(actor)
    # Même verrou que la publication ; le reçu survit à la purge de la question.
    pk=uuid.UUID(str(pk))
    with connection.cursor() as cursor:cursor.execute('SELECT pg_advisory_xact_lock(%s)',[int.from_bytes(pk.bytes[:8],'big',signed=True)])
    receipt=NotificationReceipt.objects.filter(pk=pk).first()
    if receipt:
        require(receipt.state=='ANSWERED' and receipt.choice==choice,'notification-answer-conflict',409)
        return receipt_view(receipt)
    row=Notification.objects.select_for_update().get(pk=pk)
    require(row.kind=='question' and isinstance(choice,str) and choice in {item['id'] for item in row.choices},'notification-answer-invalid',400)
    receipt=NotificationReceipt.objects.create(id=row.pk,state='ANSWERED',fingerprint=row.fingerprint,actor=actor,choice=choice)
    row.delete()
    return receipt_view(receipt)


def create(actor,data):
    administrator(actor)
    require(set(data)<={'request_id','project_id','title','body','kind','choices'} and {'request_id','title','body'}<=set(data),'notification-fields-invalid',400)
    project=Project.objects.get(pk=data['project_id']) if data.get('project_id') else None
    return publish('api:'+str(actor.pk)+':'+data['request_id'],project=project,title=data['title'],body=data['body'],kind=data.get('kind','message'),choices=data.get('choices'))


def delivery_notification(delivery,view):
    if view['state'] not in ('COMPLETED','FAILED','PARTIAL','UNKNOWN'):
        return None
    states={'PENDING':'En attente','RUNNING':'En cours','COMPLETED':'Terminé','SKIPPED':'Différé','FAILED':'Échec','UNKNOWN':'Résultat indéterminé','PARTIAL':'Partiel'}
    def label(key):
        if key.startswith('forge:'):return 'Envoi '+key.split(':',1)[1]
        if key.startswith('verify:'):return 'Vérification '+key.split(':',1)[1]
        if key.startswith('release:'):return 'Release '+key.split(':',1)[1]
        return {'version':'Version du projet','version-projection':'Version en base','commit':'Commit et tag locaux','build:debian':'Construction Debian','build:docker':'Construction Docker','retire':'Finalisation Git'}.get(key,key)
    lines=[states.get(view['state'],view['state'])]
    for step in view['steps']:
        line=label(step['key'])+' : '+states.get(step['state'],step['state'])
        if step['receipt'].get('reason')=='developer-deferred':line+=' (report demandé)'
        error=step['receipt'].get('error')
        if isinstance(error,str):line+=' · '+error
        lines.append(line)
    return publish('delivery:'+str(delivery.pk)+':'+view['state'],project=delivery.project,title='Livraison '+delivery.version,body='\n'.join(lines))
