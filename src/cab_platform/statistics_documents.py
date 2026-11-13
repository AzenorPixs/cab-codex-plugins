"""Sources locales seules maîtres ; fonctions pures de lecture et de rendu CAB."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
from datetime import date,datetime,timezone
from . import sgs_engine as engine

BEGIN='<!-- CAB_STATISTICS_CURRENT_V1 -->'
END='<!-- CAB_STATISTICS_CURRENT_END -->'
MAX_REPORT=8*1024*1024
SYNC_MARKER=re.compile(r'(?m)^<!-- CAB_STATISTICS_DOCUMENT_V1 (\{[^\n]*\}) -->\n?\Z')

def sha(data):return hashlib.sha256(data).hexdigest()

def marker(text,scope):
    match=SYNC_MARKER.search(text)
    if not match:return None
    try:data=json.loads(match[1])
    except ValueError:return None
    if not isinstance(data,dict) or data.get('scope')!=scope:return None
    body=text[:match.start()]
    return {**data,'valid':data.get('content_sha256')==sha(body.encode())}

def stamped(text,scope):
    match=SYNC_MARKER.search(text);old=marker(text,scope)
    if old:
        body=text[:match.start()]
        if old['valid']:return text
    else:body=text
    if not body.endswith('\n'):body+='\n'
    digest=sha(body.encode());data={'scope':scope,'revision':digest,'generated_at':datetime.now(timezone.utc).isoformat(),'content_sha256':digest}
    return body+'<!-- CAB_STATISTICS_DOCUMENT_V1 '+json.dumps(data,sort_keys=True)+' -->\n'

def read_source(root: Path,path: Path,limit: int=MAX_REPORT):
    if not path.is_relative_to(root) or path.resolve()!=path:raise ValueError('statistics-source-path-unsafe')
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    with os.fdopen(fd,'rb') as stream:
        before=os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_nlink!=1 or before.st_size>limit:raise ValueError('statistics-source-unsafe')
        raw=stream.read(limit+1);after=os.fstat(stream.fileno())
    current=path.lstat()
    if (before.st_ino,before.st_size,before.st_mtime_ns)!=(after.st_ino,after.st_size,after.st_mtime_ns) or (current.st_dev,current.st_ino,current.st_mtime_ns)!=(after.st_dev,after.st_ino,after.st_mtime_ns):raise ValueError('statistics-source-changed')
    raw.decode('utf-8')
    return raw,before

def catalogue(root: Path):
    parent=root/'openspec/changes';result=[]
    if not parent.exists():return []
    if parent.resolve()!=parent:raise ValueError('statistics-catalogue-unsafe')
    for archived,base in [(False,parent),(True,parent/'archive')]:
        if not base.exists():continue
        if base.resolve()!=base:raise ValueError('statistics-catalogue-unsafe')
        for path in sorted(base.iterdir()):
            if path.name.startswith('.') or path.name=='archive' or path.is_symlink() or not path.is_dir():continue
            if len(result)>=5000:raise ValueError('statistics-change-limit')
            slug=path.name
            if archived:
                match=re.fullmatch(r'(\d{4}-\d{2}-\d{2})-(.+)',slug)
                if not match:continue
                try:date.fromisoformat(match[1])
                except ValueError:continue
                slug=match[2]
            if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}',slug):continue
            directory_info=path.stat();manifest={'_directory':{'device':directory_info.st_dev,'inode':directory_info.st_ino}}
            names={p.name for p in path.glob('*.md') if p.name!='STATISTICS.md'}|{'.openspec.yaml'}
            for name in sorted(names):
                p=path/name
                if p.exists():
                    raw,info=read_source(root,p,2*1024*1024);manifest[name]={'sha256':sha(raw),'mtime':info.st_mtime_ns}
            specs=path/'specs'
            if specs.exists() and specs.resolve()==specs:
                for p in sorted(specs.glob('*/spec.md')):
                    raw,info=read_source(root,p,2*1024*1024);manifest[str(p.relative_to(path))]={'sha256':sha(raw),'mtime':info.st_mtime_ns}
            result.append({'identifier':slug,'path':str(path.relative_to(root)),'archived':archived,'manifest':manifest})
    return result

def managed(text):
    if text.count(BEGIN)!=1 or text.count(END)!=1:return None
    start=text.index(BEGIN);end=text.index(END)+len(END)
    if end<start:raise ValueError('statistics-managed-block-invalid')
    return text[start:end]

def parse(text):
    current=managed(text);source=current or text
    variants={}
    try:
        contribution=engine.extract(source);engine.validate_contribution(contribution)
        if not current and engine.MARKER.search(source):
            visible=engine.extract(engine.MARKER.sub('',source));variants={'embedded':contribution,'visible':visible}
            contribution=json.loads(json.dumps(contribution))
            for key,metric in visible['metrics'].items():
                old=contribution['metrics'][key]
                if metric['state']=='known' and old['state']=='known' and metric['value']!=old['value']:
                    contribution['metrics'][key]={'state':'contradictory','value':None,'reason':'Valeur visible et registre embarqué divergent dans le fichier local.','evidence':metric['evidence']+old['evidence']}
                elif metric['state']=='known' and old['state']=='unavailable':contribution['metrics'][key]=metric
        error=None
    except (engine.SGSError,ValueError,KeyError,TypeError) as exc:
        contribution=engine.blank();error=type(exc).__name__
    tables=[{'line':line,'section':section,'columns':header,'cells':cells} for line,section,header,cells in engine.rows(text.splitlines())]
    if current:
        by_label={engine.norm(meta[0]):key for key,meta in engine.METRICS.items()}
        for line,section,header,cells in engine.rows(current.splitlines()):
            key=by_label.get(engine.norm(cells[0])) if cells else None
            if key and len(cells)>=3 and engine.norm(cells[1]) in ('n/a','inconnu','indisponible'):
                contribution['metrics'][key]={'state':'unavailable','value':None,'reason':cells[2],'evidence':[]}
    return {'format':'cab-local-statistics-1','contribution':contribution,'variants':variants,'tables':tables,'headings':re.findall(r'^#{1,6} .+',text,re.M),'managed':current is not None,'marker':marker(text,'change'),'parse_error':error}

def render(change: str,state: str,contribution: dict,previous: str='',expected_block: str='',observations=None):
    old=managed(previous)
    if not old and (BEGIN in previous or END in previous):return previous,True
    if old and expected_block and sha(old.encode())!=expected_block:return previous,True
    if old and not expected_block:return previous,True
    # Le texte antérieur reste historique et intact ; seule la zone CAB est amendée.
    historical=previous.replace(old,'') if old else previous
    level='###' if re.search(r'^## ',historical,re.M) else '##'
    title=['Statistiques générales et décisions','Messages et outils','Fichiers et tâches','Commandes et validations','Accès web','Synthèse et couverture']
    groups=[{1,4,7},{6},{8},{9,11},{10},{12}]
    chunks=[BEGIN+'\n',f'Change : `{change}` · état local : `{state}`. Les valeurs absentes restent N/A.\n']
    for index,name in enumerate(title):
        chunks.append(f'{level} {index+1}. {name}\n')
        rows=[]
        for key,meta in engine.METRICS.items():
            if meta[1] not in groups[index]:continue
            metric=contribution['metrics'][key]
            rows.append([meta[0],metric['value'] if metric['state']=='known' else 'N/A',(' ; '.join(e.get('note','preuve native') for e in metric['evidence']) if metric['state']=='known' else metric['reason'] or 'Non observé')])
        chunks.append('\n'.join(engine.table(['Mesure','Valeur','Preuve ou limite'],rows))+'\n')
        if index==0:
            chunks.append('\n'.join(engine.table(['Rôle','Agent','Modèle','Raisonnement'],[[a['role'],a['agent'] or 'N/A',a['model'],a['reasoning']] for a in contribution['agents']]))+'\n')
            chunks.append('Provenance : '+', '.join(contribution['proof_ids'])+'\n')
    chunks.append(END)
    if observations:chunks.insert(-1,'\nMesures partielles en cours — aucune valeur ci-dessous ne vaut total complet.\n\n'+'\n'.join(engine.table(['RUN','SID','Compteur','Incrément observé','Couverture'],observations))+'\n')
    block='\n'.join(chunks)
    if old:return previous.replace(old,block),False
    prefix=previous.rstrip()+'\n\n' if previous else f'# Statistiques du change — {change}\n\n'
    return prefix+block+'\n',False

def global_document(project: str,entries: list):
    chunks=[f'# Statistiques du projet — {project}\n\nConcaténation des sources locales des changes, sans somme de compteurs partagés.\n']
    for item in entries:
        chunks.append(f"\n## Change `{item['change']}` — {item['path']}\n\n")
        chunks.append(item['content'] if item['status']=='ready' else 'Change ouvert sans session de codage enregistrée ; STATISTICS.md non attendu.\n' if item['status']=='not-started' else f"STATISTICS.md {item['status']} ; aucune donnée inventée.\n")
    text='\n'.join(chunks)
    if len(text.encode())>64*1024*1024:raise ValueError('statistics-global-limit')
    return text
