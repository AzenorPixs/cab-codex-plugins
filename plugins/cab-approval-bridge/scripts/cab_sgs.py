"""Local SGS engine. No network, provider credentials, services or dependencies."""
from __future__ import annotations

import argparse
import ast
from collections import Counter
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation, getcontext
import fcntl
import hashlib
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import tokenize
import unicodedata
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

VERSION = "2.4.15"
FORMAT = "cab-sgs-1"
# Bounded inputs below make this precision sufficient for all exact additive states.
getcontext().prec = 100
REPORT = "STATISTICS.md"
REGISTER = "STATISTICS_CONTRIBUTIONS.json"
JOURNAL = ".STATISTICS.transaction.json"
LOCK = ".STATISTICS.lock"
MARKER = re.compile(r"<!-- CAB_SGS_SESSIONS_V1\n(.*?)\n-->", re.S)
MAX_BYTES = 64 * 1024 * 1024
EXCLUDED = {".git", ".opencode", ".codex", ".cache", "__pycache__", "node_modules",
            ".venv", "venv", "env", "logs", "tmp", "build", "dist", ".idea", ".vscode",
            ".pytest_cache", ".ruff_cache", ".mypy_cache", ".npm", "tests", "test", "reports", "output"}
SENSITIVE = re.compile(r"(?:\.env(?:\.|$)|\.(?:pem|key|crt|cer|der|p12|pfx)$|^(?:credentials|secrets)\.(?:json|yaml)$|^id_(?:rsa|ed25519)$)")
# key: (label, section, unit); all quantities are exact decimal strings internally.
METRICS = {
    "duration": ("Durée globale", 1, "s"), "net_duration": ("Durée hors pauses et attentes", 1, "s"),
    "tokens_input": ("Tokens d’entrée", 4, "tokens"), "tokens_output": ("Tokens de sortie", 4, "tokens"),
    "tokens_reasoning": ("Tokens de raisonnement", 4, "tokens"), "tokens_cache_read": ("Tokens de cache lus", 4, "tokens"),
    "tokens_cache_write": ("Tokens de cache écrits", 4, "tokens"), "tokens_total": ("Total natif des tokens", 4, "tokens"),
    "compactions": ("Compactions achevées", 4, "count"),
    "messages": ("Messages des codeurs", 6, "count"), "messages_user": ("Messages utilisateur", 6, "count"),
    "messages_assistant": ("Messages assistant", 6, "count"), "tools": ("Appels d’outils des codeurs", 6, "count"),
    "tools_completed": ("Appels terminés", 6, "count"), "tools_error": ("Erreurs techniques", 6, "count"),
    "tools_running": ("Appels en cours", 6, "count"),
    "permissions": ("Demandes d’autorisation distinctes", 7, "count"),
    "permissions_approved": ("Demandes approuvées", 7, "count"),
    "permissions_rejected": ("Demandes refusées", 7, "count"),
    "permissions_expired": ("Demandes expirées", 7, "count"),
    "permissions_cancelled": ("Demandes annulées", 7, "count"),
    "writes": ("Écritures effectivement exécutées", 8, "count"), "files_touched": ("Fichiers distincts touchés par change", 8, "count"),
    "commands": ("Commandes exécutées", 9, "count"), "commands_success": ("Commandes réussies", 9, "count"),
    "commands_failure": ("Commandes en échec", 9, "count"),
    "web": ("Appels aux outils web", 10, "count"), "web_success": ("Appels web réussis", 10, "count"),
    "web_search": ("Recherches web", 10, "count"), "web_open": ("Consultations web", 10, "count"),
    "tests": ("Tests exécutés dans le bilan final", 11, "count"),
    "tests_success": ("Tests finaux réussis", 11, "count"), "tests_failure": ("Tests finaux échoués", 11, "count"),
    "syntax_files": ("Fichiers ayant passé un contrôle syntaxique", 11, "count"),
    "openspec_standard_success": ("Validations OpenSpec standard réussies", 11, "count"),
    "openspec_standard_failure": ("Validations OpenSpec standard échouées", 11, "count"),
    "openspec_strict_success": ("Validations OpenSpec strictes réussies", 11, "count"),
    "openspec_strict_failure": ("Validations OpenSpec strictes échouées", 11, "count"),
    "tasks": ("Tâches OpenSpec prouvées et terminées", 11, "count"),
    "domain_write": ("Écritures de fichiers", 12, "count"),
    "domain_command": ("Commandes", 12, "count"), "domain_web": ("Web", 12, "count"),
    "domain_other": ("Autres outils", 12, "count"), "domain_total": ("Total", 12, "count"),
}
HEADINGS = {1: "Périmètre et durée", 2: "Agents intervenants et LLM", 3: "Performances des LLM de codage OpenCode",
            4: "Consommation de tokens, coûts et compactions des codeurs", 6: "Messages et outils des codeurs",
            7: "Autorisations des opérations des codeurs", 8: "Fichiers et volume du code actuel",
            9: "Commandes des codeurs", 10: "Accès web des codeurs", 11: "Validation et livraison des codeurs",
            12: "Synthèse transversale des codeurs"}


class SGSError(ValueError):
    """Expected, actionable local error."""


def norm(value):
    return " ".join(unicodedata.normalize("NFKD", value.replace('’', "'")).encode("ascii", "ignore").decode().lower()
                    .replace("`", "").replace("*", "").split())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def dumps(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode()


def load_json(data):
    def unique(items):
        result = {}
        for key, value in items:
            if key in result:
                raise SGSError("Clé JSON dupliquée")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=unique,
                      parse_constant=lambda _: (_ for _ in ()).throw(SGSError("Nombre JSON non fini")))


def decimal(value):
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise SGSError("Nombre exact attendu (entier ou chaîne décimale)")
    try:
        number = Decimal(str(value))
    except InvalidOperation as exc:
        raise SGSError("Nombre invalide") from exc
    if not number.is_finite() or number < 0:
        raise SGSError("Nombre négatif ou non fini")
    if len(number.as_tuple().digits) > 40 or abs(number.as_tuple().exponent) > 40:
        raise SGSError('Précision ou ordre de grandeur hors contrat')
    return number


def numeric(text):
    text = text.replace("\u202f", " ").replace("\xa0", " ").strip().replace("**", "")
    match = re.fullmatch(r"(\d[\d ]*(?:[.,]\d+)?)", text)
    return decimal(match[1].replace(" ", "").replace(",", ".")) if match else None


def number_string(value):
    rendered = format(Decimal(value), 'f')
    return rendered.rstrip('0').rstrip('.') if '.' in rendered else rendered


def display(value, places=3):
    if value is None:
        return "N/A"
    value = Decimal(str(value))
    if value == value.to_integral() and places == 0:
        return str(int(value))
    while value and abs(value) < Decimal(10) ** -places and places < 18:
        places += 1
    return f"{value:.{places}f}".replace(".", ",")


def safe_path(root, relative, *, exclusions=False):
    rel = Path(relative)
    if rel.is_absolute() or not rel.parts or any(p in {"..", "."} for p in rel.parts):
        raise SGSError("Chemin relatif simple requis")
    target = root
    for component in rel.parts:
        if SENSITIVE.search(component) or component in {'.git','.opencode','.venv','node_modules','secrets'}:
            raise SGSError('Source privée ou sensible refusée')
        if exclusions and (component in EXCLUDED or SENSITIVE.search(component)):
            raise SGSError("Source exclue : " + str(relative))
        target = target / component
        if target.is_symlink():
            raise SGSError("Lien symbolique refusé : " + str(relative))
    if root not in target.resolve().parents:
        raise SGSError("Chemin hors projet")
    return target


def read_file(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > MAX_BYTES:
        raise SGSError("Fichier non ordinaire, partagé ou trop volumineux : " + str(path))
    fd = os.open(path,os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd,'rb') as stream:
        actual=os.fstat(stream.fileno())
        if (actual.st_dev,actual.st_ino)!=(info.st_dev,info.st_ino) or actual.st_size>MAX_BYTES:
            raise SGSError('Fichier remplacé pendant la lecture')
        result=stream.read(MAX_BYTES+1)
        if len(result)>MAX_BYTES:raise SGSError('Fichier devenu trop volumineux')
        return result


def fingerprint(path):
    return sha(read_file(path)) if path.exists() else None


@contextmanager
def locked(root):
    path = safe_path(root, LOCK)
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise SGSError("Verrou non ordinaire")
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise SGSError("Verrou SGS occupé ; aucune mutation effectuée") from exc
        yield
    finally:
        os.close(fd)


def durable_write(path, data, mode=0o600):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fchmod(stream.fileno(),mode)
            os.fsync(stream.fileno())
    except BaseException:
        if path.exists():
            path.unlink()
        raise


def sync_directory(root):
    fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def unavailable(reason="Mesure absente ou périmètre exhaustif non identifiable"):
    return {"state": "unavailable", "value": None, "reason": reason, "evidence": []}


def known(value, evidence, unit="count"):
    number = decimal(value)
    if unit in {"count","tokens"} and number != number.to_integral():
        raise SGSError("Un comptage doit être entier")
    return {"state": "known", "value": number_string(number), "reason": None, "evidence": evidence}


def blank():
    return {"metrics": {key: unavailable() for key in METRICS}, "agents": [], "performance": [],
            "costs": {}, "breakdowns": {}, "web_calls": [], "bounds": {"start": None, "end": None},
            "sessions": [], "proof_ids": []}


def duration(text):
    if re.search(r"n/a|inconnu|non mesure|non expose", norm(text)):
        return None
    cleaned=norm(text)
    pattern=r'(\d[\d ]*(?:[.,]\d+)?)\s*(jours?|j(?![a-z])|heures?|h(?![a-z])|minutes?|min(?![a-z])|secondes?|s(?![a-z]))'
    terms=list(re.finditer(pattern,cleaned))
    if terms:
        selected=[terms[0]]
        for term in terms[1:]:
            gap=cleaned[selected[-1].end():term.start()]
            if not re.fullmatch(r'[\s,]*(?:et\s*)?',gap):break
            selected.append(term)
        return sum((Decimal(t[1].replace(' ','').replace(',','.')) * (86400 if t[2].startswith('j') else
                    3600 if t[2].startswith('h') else 60 if t[2].startswith('m') else 1)
                    for t in selected),Decimal(0))
    return None


def timestamp(text):
    cleaned = text.replace('`','').replace('**','')
    iso = re.search(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:\d{2})?',cleaned)
    french = re.search(r'\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}',cleaned)
    if iso:
        result = datetime.fromisoformat(iso[0].replace('Z','+00:00').replace(',','.'))
    elif french:
        result = datetime.strptime(french[0],'%d/%m/%Y %H:%M:%S')
    else:
        return None
    if result.tzinfo is None:
        zone = 'UTC' if 'UTC' in cleaned else 'Europe/Paris' if 'Europe/Paris' in cleaned else None
        if not zone: return None
        result = result.replace(tzinfo=ZoneInfo(zone))
    delta=result.astimezone(timezone.utc)-datetime(1970,1,1,tzinfo=timezone.utc)
    return number_string(Decimal(delta.days*86400+delta.seconds)+Decimal(delta.microseconds)/1000000)


def leading_number(text):
    if re.match(r'\s*(?:N/A|inconnu|non mesur)',text,re.I):return None
    match=re.match(r'\s*(\d[\d \u00a0\u202f]*(?:[.,]\d+)?)',text.replace('**',''))
    return numeric(match[1]) if match else None


def enrich_tables(text,result,offer):
    """Adapters for rich native reports (tables are separated by their semantics)."""
    source_rows=list(rows(text.splitlines()))
    groups=[]
    for item in source_rows:
        if not groups or item[0]!=groups[-1][-1][0]+1:groups.append([])
        groups[-1].append(item)
    for group in groups:
        n,section,header,cells=group[0]
        first=header[0]
        if re.search('orchestrat|sonde de performance|mesure du quota|quota codex',section):continue
        # Native token fields retain their native composition; no inferred total.
        token_group='token' in first or re.search(r'telemetrie.*production|mesure de production',first) or sum(norm(row[3][0]) in {'input','output','cache_read','cache_write','reasoning'} for row in group)>=2
        if token_group and any(h in {'valeur','somme','total','nombre'} for h in header[1:]):
            aliases={'input':'tokens_input','entree':'tokens_input','output':'tokens_output','sortie':'tokens_output',
                'reasoning':'tokens_reasoning','raisonnement':'tokens_reasoning','cache read':'tokens_cache_read',
                'cache_read':'tokens_cache_read','cache lu':'tokens_cache_read','cache write':'tokens_cache_write',
                'cache_write':'tokens_cache_write','cache ecrit':'tokens_cache_write','cache lecture':'tokens_cache_read',
                'cache ecriture':'tokens_cache_write','entree hors cache':'tokens_input','total natif':'tokens_total',
                'raisonnement exposes':'tokens_reasoning','raisonnement expose':'tokens_reasoning',
                'total':'tokens_total'}
            for line,_,_,values in group:
                label=norm(values[0]).replace('_',' ').replace('.',' ')
                label=re.sub(r'^tokens?\s+','',label)
                label=re.sub(r'\s*\(champ natif\)|\s+separes$','',label)
                key=aliases.get(label);value=leading_number(values[1])
                coverage=next((leading_number(values[i]) for i,h in enumerate(header) if 'couverture' in h and i<len(values)),None)
                if key and value is not None and (coverage is None or coverage==100):
                    if key=='tokens_reasoning' and value==0 and re.search(r'(?:champ reasoning|compteur de raisonnement|tokens de raisonnement)[^.;]{0,100}(?:ne mesure|non mesure)',norm(text)):
                        continue
                    offer(key,value,line,'Compteur natif ; composition et couverture conservées')
        if re.search(r'role.*message|role des messages',first):
            data={}
            for line,_,_,values in group:
                count=leading_number(values[1])
                if count is not None:data[norm(values[0])]=(count,line)
            total=data.pop('total',None)
            if total and sum(x[0] for x in data.values())==total[0]:
                offer('messages',*total)
                result['breakdowns']['message_roles']={('utilisateur' if role=='user' else role):
                    {'numerator':str(value),'denominator':str(total[0])} for role,(value,_) in data.items()}
                for role,key in [('user','messages_user'),('utilisateur','messages_user'),('assistant','messages_assistant')]:
                    if role in data:offer(key,*data[role])
        native_tools=first in {'outil','nom de loutil'} or (re.search(r'^##?\s*2\b',section) and first in {'categorie','famille'} and 'total' in header)
        if native_tools and 'total' in header:
            idx=header.index('total');data={};totals=[];state_values={'tools_completed':[],'tools_error':[],'tools_running':[]}
            for line,_,_,values in group:
                value=leading_number(values[idx]) if idx<len(values) else None
                if value is None:continue
                label=values[0].strip('` ')
                if norm(label)=='total':totals.append((value,line));continue
                if '/' in label or ' ' in label:continue
                data[label]=(value,line)
                for i,h in enumerate(header):
                    if i>=len(values) or '%' in h or 'taux' in h:continue
                    key='tools_completed' if re.fullmatch(r'completed|termine natif|termines|completed natif',h) else 'tools_error' if re.fullmatch(r'error|erreur native|erreur technique|erreur|erreurs',h) else 'tools_running' if h in {'en cours','running','non termines'} else None
                    if key and leading_number(values[i]) is not None:state_values[key].append(leading_number(values[i]))
            if not totals:
                declared=re.search(r'appels d.outils\s*:\s*(\d+)\s+au total',norm(text))
                if declared:totals=[(Decimal(declared[1]),n)]
            if len(totals)==1 and data and sum(x[0] for x in data.values())==totals[0][0]:
                total,line=totals[0];offer('tools',total,line,'Table exhaustive par outil natif')
                result['breakdowns']['tools']={name:{'numerator':str(v),'denominator':str(total)} for name,(v,_) in data.items()}
                for key,vals in state_values.items():
                    if len(vals)==len(data):offer(key,sum(vals),line,'États techniques natifs, sans succès métier déduit')
                domains=Counter()
                for name,(value,_) in data.items():
                    domain='domain_write' if name in {'edit','write','apply_patch','default.write'} else 'domain_command' if name in {'bash','exec_command','shell_command'} else 'domain_web' if name in {'webfetch','websearch','web.run'} else 'domain_other'
                    domains[domain]+=value
                for key in ['domain_write','domain_command','domain_web','domain_other']:offer(key,domains[key],line,'Répartition disjointe des appels natifs')
                offer('domain_total',total,line)
        if re.search(r'decision cab.*distinct|statut.*autorisation|demande.*autorisation',first):
            labels={'approved':'permissions_approved','approuvees':'permissions_approved','rejected':'permissions_rejected',
                'refusees':'permissions_rejected','expired':'permissions_expired','expirees':'permissions_expired',
                'cancelled':'permissions_cancelled','annulees':'permissions_cancelled','total':'permissions'}
            for line,_,_,values in group:
                key=labels.get(norm(values[0]));value=leading_number(values[1])
                if key and value is not None:offer(key,value,line,'Demandes distinctes, pas appels ni effets')
        if re.match(r'##\s*4\b',section) and first in {'famille','famille de commandes','categorie'}:
            idx=next((i for i,h in enumerate(header) if h in {'total','nombre'} or h.startswith('effectif')),None)
            if idx is not None:
                data={};total=None
                for line,_,_,values in group:
                    value=leading_number(values[idx])
                    if value is None:continue
                    if norm(values[0])=='total':total=(value,line)
                    else:data[values[0]]=(value,line)
                if total and sum(x[0] for x in data.values())==total[0]:
                    offer('commands',*total)
                    families=Counter()
                    for name,(value,_) in data.items():
                        label=norm(name)
                        family='OpenSpec' if 'openspec' in label else 'Prévol' if 'prevol' in label or 'true inoffensif' in label else 'PostgreSQL' if re.search('postgres|psql',label) else 'Tests d’intégration' if 'integration' in label else 'Tests unitaires' if 'unitaire' in label else 'Tests' if re.search('test|unittest',label) else 'Compilation et syntaxe' if re.search('compil|syntaxe|py_compile|--check',label) else 'Autres'
                        families[family]+=value
                    result['breakdowns']['command_families']={name:{'numerator':str(v),'denominator':str(total[0])} for name,v in families.items()}
        # Explicit scalar rows seen in native summaries.
        aliases={'messages':'messages','appels outils':'tools',"appels d'outils":'tools','appels doutils':'tools',
                 'appels web':'web','ecritures executees':'writes','compactions des codeurs':'compactions',
                 'compactages natifs reussis':'compactions','compactions achevees':'compactions'}
        for line,_,_,values in group:
            key=aliases.get(norm(values[0]))
            if key:offer(key,leading_number(values[1]),line)
            if re.match(r'compactions?|compactages?',norm(values[0])) and re.search(r'acheve|reussi|effectue|realise|termine|observe',norm(values[0])) and not re.search(r'non disponible|non exhaustif|non collecte|n/a',norm(' '.join(values))):
                offer('compactions',leading_number(values[1]),line)
            currencies={x for x in re.findall(r'\b([A-Z]{3})\b',' '.join(values)) if x in {'USD','EUR','GBP','CHF','CAD','JPY','AUD'}}
            if 'cout' in norm(values[0]) and len(currencies)==1:
                currency=next(iter(currencies))
                value=leading_number(values[1])
                if value is not None:
                    candidate=known(str(value),[{'line':line,'note':'Coût natif avec devise explicite'}],unit='currency')
                    prior=result['costs'].get(currency)
                    result['costs'][currency]=candidate if prior is None or prior['value']==candidate['value'] else unavailable('Coûts contradictoires de même devise')
    for n,raw in enumerate(text.splitlines(),1):
        line=norm(raw)
        if raw.startswith('|'):continue
        message=re.search(r'messages(?: natifs)?\s*:\s*(\d+)\s+(?:au total|:)|messages natifs\s+(\d+)\s*:',line)
        if message:
            total=Decimal(next(x for x in message.groups() if x is not None))
            roles={}
            for role,value in re.findall(r'\b(user|assistant|idle|system|synthetic|compaction)\s+(\d+)\b',line):roles[role]=Decimal(value)
            if roles and sum(roles.values())==total:
                offer('messages',total,n)
                result['breakdowns']['message_roles']={('utilisateur' if role=='user' else role):{'numerator':str(value),'denominator':str(total)} for role,value in roles.items()}
                for role,key in [('user','messages_user'),('assistant','messages_assistant')]:
                    if role in roles:offer(key,roles[role],n)
        tools=re.search(r'appels d.outils\s*:\s*(\d+)\s+au total|outils api\s+(\d+)\s*:',line)
        if tools:
            total=Decimal(next(x for x in tools.groups() if x is not None));offer('tools',total,n)
            segment=line.split('operationnel')[0]
            for key,pattern in [('tools_completed',r'completed|termines'),('tools_error',r'error|erreurs?'),('tools_running',r'en cours')]:
                m=re.search(r'(\d+)\s*(?:'+pattern+r')\b|(?:'+pattern+r')\s+(\d+)\b',segment)
                if m:offer(key,Decimal(next(v for v in m.groups() if v is not None)),n,'Résultat technique natif explicite')
        decisions=re.search(r'(\d+)\s+decisions distinctes',line)
        if decisions:
            offer('permissions',Decimal(decisions[1]),n)
            for label,key in [('approved','permissions_approved'),('rejected','permissions_rejected'),('expired','permissions_expired'),('cancelled','permissions_cancelled')]:
                m=re.search(r'(\d+)\s+'+label+r'\b',line)
                if m:offer(key,Decimal(m[1]),n)


def rows(lines):
    header, section = [], ""
    for n, raw in enumerate(lines, 1):
        if raw.startswith('#'):
            section = norm(raw)
        if not raw.startswith('|'):
            header = []
            continue
        cells = [c.strip().replace('**', '') for c in re.split(r'(?<!\\)\|', raw.strip().strip('|'))]
        if cells and all(re.fullmatch(r"[: -]+", cell) for cell in cells):
            continue
        if not header:
            header = [norm(c) for c in cells]
        else:
            yield n, section, header, cells


def extract(text):
    """Extract only explicit quantities; unresolved candidates remain contradictions."""
    lines = text.splitlines()
    matches = list(MARKER.finditer(text))
    if len(matches) > 1:
        raise SGSError("Plusieurs registres de sessions embarqués")
    if matches:
        ledger = load_json(matches[0][1])
        return ledger_contribution(ledger)
    result = blank()
    candidates = {key: [] for key in METRICS}
    spec_executions = {}
    final_components = []
    explicit_tests_total = False
    suite_rows = []
    narrative_suite_rows = []
    previous_row = -2
    table_id = 0

    def offer(key, value, line, note="extraction explicite"):
        if value is not None:
            value=decimal(str(value))
            if METRICS[key][2] in {'count','tokens'} and value!=value.to_integral():return
            candidates[key].append(known(str(value), [{"line": line, "note": note}], METRICS[key][2]))

    direct = bool(re.search(r"\bscm\b.{0,30}direct|session.{0,20}direct|codex.{0,25}codeur|aucun (?:agent )?orchestrateur", norm(text)))
    for n, section, header, cells in rows(lines):
        if n != previous_row+1:
            table_id += 1
        previous_row = n
        label = norm(cells[0])
        value = cells[1] if len(cells) > 1 else ""
        combined = norm(' '.join(cells[1:]))
        if not re.search('n/a|non capture|non disponible|analyse.*incluse|chat observe',norm(value+' '+cells[0])):
            if re.fullmatch(r'debut(?: reel scm| de la session| du change)?',label):
                result['bounds']['start'] = timestamp(value)
            elif re.match(r'fin.*apres.*archiv',label):
                result['bounds']['end'] = timestamp(value)
        # Only source-labelled durations, not tools, tests, model service or reading time.
        if re.match(r"duree (?:globale|calendaire|de la session de codage)", label):
            offer("net_duration" if re.search("hors pauses|hors attentes|sans pauses", label) else "duration", duration(value), n)
        if re.match(r"taches (?:openspec (?:prouvees|terminees)|du change prouvees)", label):
            match = re.match(r"\s*(\d+)\b", value)
            offer("tasks", Decimal(match[1]) if match else None, n)
        aliases = {norm(meta[0]): key for key, meta in METRICS.items() if key not in {"duration", "net_duration", "tasks"}}
        if label in aliases and not re.search(r"orchestrat|sonde|benchmark|intermediaire", section) and (
                not aliases[label].startswith('domain_') or 'domaine' in header):
            offer(aliases[label], numeric(value), n)
        if re.match(r"syntaxe (?:explicite|des fichiers)|fichiers (?:valides|verifies) syntax", label):
            match = re.match(r"\s*(\d+)\b", value)
            offer("syntax_files", Decimal(match[1]) if match else None, n)
        # Totals in final verification tables are used, never component rows plus total.
        test_header = bool(header and re.search(r'validation|verification.*final|campagne|suite|type de test',header[0])) and not re.search('partage',header[0])
        if re.match(r"(?:total(?: distinct| unique| execute| observe| complet| final| des tests| unique final)?|campagne finale (?:unique|disjointe))$", label):
            if test_header and any(re.search(r"reuss|succes|passes", h) for h in header) and not re.search('intermediaire', section):
                for i, h in enumerate(header):
                    if i < len(cells):
                        if re.search('reuss|succes|passes', h):
                            offer('tests_success', numeric(cells[i]), n)
                            explicit_tests_total = True
                        elif re.search('echec', h):
                            offer('tests_failure', numeric(cells[i]), n)
        if test_header and not re.search('intermediaire|partage',section+' '+header[0]):
            success = next((numeric(cells[i]) for i,h in enumerate(header) if i < len(cells) and re.search('reuss|succes',h)),None)
            failure = next((numeric(cells[i]) for i,h in enumerate(header) if i < len(cells) and re.search('echec|echoue',h)),None)
            if label.startswith('total') and success is not None:
                offer('tests_success',success,n);offer('tests_failure',failure,n)
                explicit_tests_total = True
            elif re.search(r'node|python|opencode|javascript|unittest',label) and not re.search('syntax|cible|sous.ensemble|openspec',label):
                if success is not None and failure is not None:
                    suite_rows.append((table_id,success,failure,n))
        if re.match(r'(?:tests? )?(?:node(?:\.js)?|python)(?:\b|\s)',label) and not re.search(r'cible|restauration/|registre et|syntaxe',label):
            complete = ('node' in label and bool(re.search('complet|global|sequentiel|reference|unitaires',label))) or bool(re.fullmatch(r'(?:tests? )?(?:node(?:\.js)?|python)(?: (?:global|de reference|devops unittest))?',label))
            match = re.search(r'(\d+)\s+reussis',combined)
            fraction = re.fullmatch(r'(\d+)\s*/\s*(\d+)',norm(value))
            failures = re.search(r'(\d+)\s*(?:echec|echoue)',combined)
            if complete and match:
                failure = Decimal(failures[1]) if failures else Decimal(0) if re.search('aucun echec|zero echec',combined) else None
                if failure is not None:
                    narrative_suite_rows.append((table_id,Decimal(match[1]),failure,n))
            elif complete and fraction and fraction[1]==fraction[2]:
                narrative_suite_rows.append((table_id,Decimal(fraction[1]),Decimal(0),n))
        if re.match(r'tests finaux|total unique|total execute|total distinct',label):
            match = re.match(r"\s*(\d+)\s*(?:reussis|passes|test)", norm(value))
            if match:
                offer('tests_success', Decimal(match[1]), n)
                fail = re.search(r"\b(\d+)\s*echec", norm(value))
                offer('tests_failure', Decimal(fail[1]) if fail else None, n)
            fraction = re.match(r'\s*(\d+)\s*/\s*(\d+)',norm(value))
            if fraction and fraction[1] == fraction[2] and not re.search(r'cible|partage',label):
                offer('tests_success',Decimal(fraction[1]),n);offer('tests_failure',Decimal(0),n)
            execution = re.search(r'(\d+)\s*(?:executes et reussis|reussis)',norm(value))
            if execution:
                offer('tests_success',Decimal(execution[1]),n)
                if re.search(r'aucun echec|0\s*echec',norm(value)):
                    offer('tests_failure',Decimal(0),n)
        # Clearly final, disjoint language suites can form a final total if no total exists.
        if re.match(r'tests (?:node|python) de la suite finale$',label):
            m = re.fullmatch(r'(\d+)\s+reussis',norm(value))
            if m: final_components.append((Decimal(m[1]),n))
        if label == 'editions directes de fichiers dans le perimetre':
            offer('writes',numeric(value),n)
        if label == 'commandes du registre executees et reussies':
            offer('commands_success',numeric(value),n)
        if label == 'commandes avec sortie non nulle':
            offer('commands_failure',numeric(value),n)
        if re.match(r'openspec (?:strict|standard) (?:avant|apres) archivage',label):
            phase = 'after' if 'apres' in label else 'before'
            match = re.search(r'(\d+)\s*/\s*(\d+)',value)
            successful = bool(re.search(r'code\s*0|reussi|valide|\bok\b',norm(value))) or bool(match and match[1]==match[2])
            if successful:
                spec_executions[('strict' if 'strict' in label else 'standard',phase)] = ('success',n)
        # Agents are read only from their own tables, with roles attested by headings.
        if 'modele de llm' in header:
            role = 'coder' if re.search(r'agent.*codage|agent.*codeur', section) else 'orchestrator' if 'orchestrat' in section else None
            if role and not re.search(r'aucun|non applicable', label):
                model = cells[header.index('modele de llm')]
                if re.search(r'scm direct|session.*direct',norm(model)):
                    role = 'coder'
                agent = 'opencode' if 'opencode' in norm(' '.join(cells)) else 'codex' if 'codex' in norm(model) else None
                if role=='coder' and agent is None and re.search(r'historique natif opencode|sessions? opencode|agent.*codage opencode',norm(text)):
                    agent='opencode'
                if role == 'orchestrator' and re.search(r'meme instance|pas de pilotage|aucun|non distinct',norm(model)):
                    continue
                model_id = re.search(r'\b(?:gpt-[\w.:-]+|glm-[\w.:-]+|qwen[\w.:-]+|claude[\w.:-]+|gemini[\w.:-]+|muse-[\w.:-]+|deepseek[\w.:-]+)\b',norm(model))
                if model_id:
                    model = model_id[0].rstrip('.:-')
                else:
                    model = 'N/A'
                reasoning = cells[header.index('niveau de raisonnement')] if 'niveau de raisonnement' in header else 'N/A'
                if norm(reasoning) not in {'low','medium','high','xhigh','max','ultra'}:
                    reasoning = 'N/A'
                item = {'role': role, 'agent': agent, 'model': model, 'reasoning': reasoning}
                if item not in result['agents']:
                    result['agents'].append(item)
                if role=='coder' and agent=='opencode':
                    ttmt=next((leading_number(cells[i]) for i,h in enumerate(header) if 'ttmt moyen' in h and i<len(cells)),None)
                    throughput=next((leading_number(cells[i]) for i,h in enumerate(header) if 'tokens/seconde moyens' in h and i<len(cells)),None)
                    perf={'model':model,'reasoning':reasoning,'ttmt':str(ttmt) if ttmt is not None else None,'throughput':str(throughput) if throughput is not None else None}
                    if (ttmt is not None or throughput is not None) and perf not in result['performance']:
                        result['performance'].append(perf)
    for n, raw in enumerate(lines, 1):
        line = norm(raw)
        identity = re.match(r'-?\s*agent\s*:\s*codex,?\s*modele\s+(gpt-[\w.:-]+)',line)
        if identity:
            result['agents']=[a for a in result['agents'] if not (a['role']=='coder' and a['model']=='N/A')]
            item={'role':'coder','agent':'codex','model':identity[1],'reasoning':'N/A'}
            if item not in result['agents']:result['agents'].append(item)
        if not raw.startswith('|') and re.search(r'duree (?:calendaire|globale)', line):
            if not re.search(r'hors pauses|hors attentes|non mesur|n/a', line):
                offer('duration', duration(line), n)
        if re.search(r'aucune recherche ou consultation web|aucune visite web externe|aucune url externe visitee',line):
            offer('web',Decimal(0),n)
        if re.search(r'aucun appel.{0,25}outil web|aucun outil de navigation web observe|aucun outil de recherche ou de navigation web',line):
            offer('web',Decimal(0),n)
        # Explicit final narrative, including compact French counts such as 1032réussis.
        if re.search(r'tests finaux|tests uniques finaux|bilan final.{0,30}tests', line):
            match = re.search(r'(\d+)\s*(?:tests(?: uniques)?(?: finaux)?\s+)?reussis', line)
            if match:
                offer('tests_success', Decimal(match[1]), n)
                failed = re.search(r'(\d+)\s*echec', line)
                offer('tests_failure', Decimal(failed[1]) if failed else None, n)
            passed = re.search(r'(\d+)\s*tests finaux passent',line)
            if passed:
                offer('tests_success',Decimal(passed[1]),n);offer('tests_failure',Decimal(0),n)
        if re.search(r'aucun (?:appel|acces|outil) web|aucune (?:recherche|consultation) web', line) and not re.search('preuve|dedui|exhaustif.*absent', line):
            offer('web', Decimal(0), n)
    # Paragraph-level final totals support wrapped narratives without selecting a maximum.
    line_number = 1
    for paragraph in text.split('\n\n'):
        line = norm(paragraph)
        marker = re.search(r'total interlangages\s*:|total distinct\s*:',line) or re.search(r'campagne finale\s*:|qualification(?: finale)?\s*:',line)
        if marker and not paragraph.lstrip().startswith('|'):
            tail = line[marker.end():]
            matched = re.search(r'(\d+)\s*(?:tests(?: uniques)?(?: finaux)?\s*)?(?:reussis|reussites|succes)',tail)
            failed = re.search(r'(\d+)\s*(?:echecs?|echoues?)',tail)
            zero = bool(re.search(r'zero echec|aucun echec',tail))
            if matched:
                offer('tests_success',Decimal(matched[1]),line_number,'Bilan final narratif')
                offer('tests_failure',Decimal(failed[1]) if failed else Decimal(0) if zero else None,line_number,'Bilan final narratif')
        if re.search(r'\b\d+\s*tests uniques reussis',line) and re.search(r'aucun echec final|zero echec final|0\s*echec final',line):
            match = re.search(r'(\d+)\s*tests uniques reussis',line)
            offer('tests_success',Decimal(match[1]),line_number);offer('tests_failure',Decimal(0),line_number)
        line_number += paragraph.count('\n')+2
    if not explicit_tests_total and final_components:
        offer('tests_success',sum((v for v,_ in final_components),Decimal(0)),final_components[0][1])
        offer('tests_failure',Decimal(0),final_components[0][1],'Toutes les suites finales documentées réussies')
    if not explicit_tests_total and suite_rows:
        # Each final table is a candidate campaign; differing campaigns require review.
        for group in sorted({row[0] for row in suite_rows}):
            members=[row for row in suite_rows if row[0]==group]
            offer('tests_success',sum((row[1] for row in members),Decimal(0)),members[0][3],'Suites finales disjointes Node/Python/OpenCode')
            offer('tests_failure',sum((row[2] for row in members),Decimal(0)),members[0][3],'Échecs des suites finales disjointes')
    if not explicit_tests_total and not suite_rows and narrative_suite_rows:
        for group in sorted({row[0] for row in narrative_suite_rows}):
            members=[row for row in narrative_suite_rows if row[0]==group]
            # A single language is not evidence that the whole change has no other tests.
            if len(members) >= 2:
                offer('tests_success',sum((row[1] for row in members),Decimal(0)),members[0][3],'Suites finales Node et Python documentées')
                offer('tests_failure',sum((row[2] for row in members),Decimal(0)),members[0][3],'Échecs documentés des suites finales')
    for kind in ['strict','standard']:
        for status in ['success','failure']:
            proofs = [n for (k,_),(s,n) in spec_executions.items() if k==kind and s==status]
            if proofs: offer('openspec_'+kind+'_'+status,Decimal(len(proofs)),proofs[0],'Exécutions avant/après archivage, pas éléments validés')
    if direct and not any(a['role'] == 'coder' for a in result['agents']):
        result['agents'].append({'role': 'coder', 'agent': 'codex' if 'codex' in norm(text) else None,
                                 'model': 'N/A', 'reasoning': 'N/A'})
    if direct and not any(a['role']=='coder' and a['agent']=='opencode' for a in result['agents']):
        for a in result['agents']:
            if a['agent']=='codex' and a['role']=='orchestrator':
                a['role']='coder'
        result['agents'] = [json.loads(a) for a in sorted({json.dumps(a,sort_keys=True) for a in result['agents']})]
    enrich_tables(text,result,offer)
    for key, values in candidates.items():
        distinct = {v['value'] for v in values}
        if len(distinct) == 1:
            result['metrics'][key] = {**values[0], 'evidence': [e for v in values for e in v['evidence']]}
        elif len(distinct) > 1:
            result['metrics'][key] = {'state': 'contradictory', 'value': None,
                'reason': 'Plusieurs bilans ou périmètres à réconcilier',
                'evidence': [dict(e, candidate=v['value']) for v in values for e in v['evidence']]}
    if all(result['bounds'].values()):
        elapsed = Decimal(result['bounds']['end'])-Decimal(result['bounds']['start'])
        if elapsed >= 0 and result['metrics']['duration']['state']=='unavailable':
            result['metrics']['duration'] = known(str(elapsed),[{'line':1,'note':'Bornes complètes et fuseaux explicites du rapport'}],unit='s')
    if result['metrics']['commands_success']['state']==result['metrics']['commands_failure']['state']=='known':
        a,b=(result['metrics'][k] for k in ['commands_success','commands_failure'])
        result['metrics']['commands'] = known(str(decimal(a['value'])+decimal(b['value'])),a['evidence']+b['evidence'])
    derive(result)
    return result


def derive(contribution):
    metrics = contribution['metrics']
    a, b = metrics['tests_success'], metrics['tests_failure']
    if a['state'] == b['state'] == 'known' and metrics['tests']['state'] == 'unavailable':
        metrics['tests'] = known(str(decimal(a['value']) + decimal(b['value'])),
                                 a['evidence'] + b['evidence'])
    if all(v is not None for v in contribution['bounds'].values()):
        elapsed=decimal(contribution['bounds']['end'])-decimal(contribution['bounds']['start'])
        if elapsed>=0 and metrics['duration']['state'] in {'known','unavailable'}:
            metrics['duration']=known(str(elapsed),[{'line':1,'note':'Différence exacte des bornes globales compatibles'}],unit='s')
    if metrics['web']['state']=='known' and decimal(metrics['web']['value'])==0:
        for key in ['web_success','web_search','web_open']:
            if metrics[key]['state']=='unavailable':metrics[key]=known('0',metrics['web']['evidence'])
    return contribution


def validate_contribution(c, line_count=None):
    if not isinstance(c,dict) or set(c) != set(blank()) or not isinstance(c['metrics'],dict) or set(c['metrics']) != set(METRICS):
        raise SGSError('Structure de contribution incompatible')
    if any(not isinstance(c[k],dict) for k in ['bounds','costs','breakdowns']) or any(not isinstance(c[k],list) for k in ['agents','performance','web_calls','sessions','proof_ids']):
        raise SGSError('Types de contribution invalides')
    for key, measure in c['metrics'].items():
        if not isinstance(measure,dict) or set(measure) != {'state','value','reason','evidence'} or measure['state'] not in {'known','unavailable','contradictory'}:
            raise SGSError('État de mesure invalide : ' + key)
        if measure['state'] == 'known':
            known(measure['value'], measure['evidence'], METRICS[key][2])
            if not measure['evidence']:
                raise SGSError('Preuve absente : ' + key)
        elif measure['value'] is not None or not measure['reason']:
            raise SGSError('Indisponibilité sans motif')
        if not isinstance(measure['evidence'], list):
            raise SGSError('Preuves invalides')
        for e in measure['evidence']:
            if not isinstance(e, dict) or not isinstance(e.get('line'), int) or e['line'] < 1 or (line_count and e['line'] > line_count):
                raise SGSError('Ligne de preuve invalide')
    for a in c['agents']:
        if not isinstance(a,dict) or set(a) != {'role','agent','model','reasoning'} or a['role'] not in {'coder','orchestrator'}:
            raise SGSError('Agent invalide')
        if a['agent'] is not None and (not isinstance(a['agent'],str) or not a['agent'].strip() or len(a['agent'])>160 or any(ord(c)<32 or c=='|' for c in a['agent'])):
            raise SGSError('Identité agent invalide')
        if any(not isinstance(a[k], str) or len(a[k]) > 160 or '\n' in a[k] or '|' in a[k] for k in ['model','reasoning']):
            raise SGSError('Libellé agent invalide')
    if not isinstance(c['breakdowns'],dict) or set(c['breakdowns']) - {'tools','message_roles','command_families','test_categories','openspec_results','ratios'}:
        raise SGSError('Ventilation inconnue')
    for kind,items in c['breakdowns'].items():
        for name,pair in items.items():
            if not isinstance(name,str) or len(name)>200 or '\n' in name or set(pair)!={'numerator','denominator'}:
                raise SGSError('Ventilation invalide')
            if decimal(pair['numerator']) > decimal(pair['denominator']):
                raise SGSError('Ventilation hors population')
    for item in c['performance']:
        if set(item)!={'model','reasoning','ttmt','throughput'} or not any(a['role']=='coder' and a['agent']=='opencode' and a['model']==item['model'] and a['reasoning']==item['reasoning'] for a in c['agents']):
            raise SGSError('Performance sans codeur OpenCode attesté')
        for field in ['ttmt','throughput']:
            if item[field] is not None: decimal(item[field])
    if len({(x['model'],x['reasoning']) for x in c['performance']}) != len(c['performance']):
        raise SGSError('Moyenne par couple et par change dupliquée')
    for currency,measure in c['costs'].items():
        if not re.fullmatch('[A-Z]{3}',currency) or measure['state'] not in {'known','unavailable','contradictory'}:
            raise SGSError('Coût sans devise ou état valide')
        if measure['state']=='known':
            decimal(measure['value'])
            if not measure['evidence']: raise SGSError('Coût sans preuve')
    for call in c['web_calls']:
        if set(call)!={'type','tool','target','result'} or any(not isinstance(v,str) or len(v)>2000 or '\n' in v for v in call.values()):
            raise SGSError('Appel web invalide')
        if re.search(r'://[^/]*@|[?&](?:token|key|password|secret)=',call['target'],re.I):
            raise SGSError('Cible web contenant une authentification')
    for name in ['sessions','proof_ids']:
        if not isinstance(c[name],list) or any(not isinstance(x,str) or len(x)>1000 or '\n' in x for x in c[name]):
            raise SGSError('Identifiants de provenance invalides')
        if len(c[name])!=len(set(c[name])): raise SGSError('Provenance dupliquée')
    for group, specs in [('bounds', {'start','end'})]:
        if set(c[group]) != specs:
            raise SGSError('Bornes invalides')
        for value in c[group].values():
            if value is not None:
                decimal(value)
    for success, failure, total in [('tests_success','tests_failure','tests'), ('commands_success','commands_failure','commands')]:
        vals = [c['metrics'][k] for k in [success, failure, total]]
        if all(v['state'] == 'known' for v in vals) and decimal(vals[0]['value']) + decimal(vals[1]['value']) != decimal(vals[2]['value']):
            raise SGSError('Total incompatible : ' + total)
    return c


def apply_review(c, review, source_hash, lines):
    if review.get('report_sha256') != source_hash:
        raise SGSError('Revue périmée : empreinte du rapport différente')
    if set(review) - {'report_sha256','metrics','agents','bounds','costs','breakdowns','performance','web_calls','sessions','proof_ids'}:
        raise SGSError('Champ de revue inconnu')
    for key, measure in review.get('metrics', {}).items():
        if key not in METRICS:
            raise SGSError('Mesure de revue inconnue')
        c['metrics'][key] = measure
    for key in set(c) - {'metrics'}:
        if key in review:
            c[key] = review[key]
    # Derived quantities must be recomputed after replacement of their operands.
    if {'tests_success','tests_failure'} & set(review.get('metrics', {})) and 'tests' not in review.get('metrics', {}):
        c['metrics']['tests'] = unavailable()
    return validate_contribution(derive(c), len(lines))


def inventory(root):
    base = safe_path(root, 'openspec/changes/archive')
    if not base.exists():
        return []
    result = []
    for directory in sorted(base.iterdir()):
        if directory.is_symlink():
            raise SGSError('Archive symbolique refusée')
        if directory.is_dir():
            path = safe_path(root, str(directory.relative_to(root) / REPORT))
            if path.exists():
                result.append(path)
    return result


def entry(root, path, reviews=None):
    data = read_file(path)
    text = data.decode('utf-8')
    contribution = extract(text)
    key = str(path.parent.relative_to(root))
    review = (reviews or {}).get(key)
    if review:
        contribution = apply_review(contribution, review, sha(data), text.splitlines())
    validate_contribution(contribution, None if MARKER.search(text) else len(text.splitlines()))
    return {'report_path': str(path.relative_to(root)), 'report_sha256': sha(data),
            'contribution': contribution, 'review': review}


def empty_aggregate():
    return {'nca': 0, 'metrics': {key: {'sum': '0', 'count': 0} for key in METRICS},
            'agents': {}, 'bounds': {'start': {}, 'end': {}}, 'performance': {},
            'costs': {}, 'breakdowns': {}, 'populations': {}, 'web_calls': {}, 'proofs': {}}


def count_member(index, key, amount):
    index[key] = index.get(key, 0) + amount
    if index[key] < 0:
        raise SGSError('Compteur négatif')
    if index[key] == 0:
        del index[key]


def accumulate(state, c, sign=1):
    if sign==1 and any(state['proofs'].get(proof,0) for proof in c['proof_ids']):
        raise SGSError('Preuve partagée entre changes : attribution des mesures à réconcilier')
    state['nca'] += sign
    for key, measure in c['metrics'].items():
        if measure['state'] == 'known':
            bucket = state['metrics'][key]
            bucket['sum'] = number_string(Decimal(bucket['sum']) + sign * decimal(measure['value']))
            bucket['count'] += sign
            if bucket['count'] < 0 or Decimal(bucket['sum']) < 0:
                raise SGSError('Agrégat négatif')
    for a in {json.dumps(a, sort_keys=True, ensure_ascii=False) for a in c['agents']}:
        # Same model/reasoning/role shared by Codex and OpenCode counts once per change.
        item = json.loads(a)
        key = json.dumps([item['role'],item['model'],item['reasoning']], ensure_ascii=False)
        # The distinct tuples below suppress duplication across software families.
        if a == min(json.dumps(x,sort_keys=True,ensure_ascii=False) for x in c['agents']
                    if (x['role'],x['model'],x['reasoning']) == (item['role'],item['model'],item['reasoning'])):
            count_member(state['agents'], key, sign)
    for boundary, value in c['bounds'].items():
        if value is not None:
            count_member(state['bounds'][boundary], value, sign)
    for cost, measure in c['costs'].items():
        if not re.fullmatch('[A-Z]{3}', cost):
            raise SGSError('Devise ISO requise')
        bucket = state['costs'].setdefault(cost, {'sum':'0','count':0})
        if measure['state'] == 'known':
            bucket['sum'] = number_string(Decimal(bucket['sum']) + sign * decimal(measure['value']))
            bucket['count'] += sign
        if not bucket['count']:
            del state['costs'][cost]
    for kind, categories in c['breakdowns'].items():
        index = state['breakdowns'].setdefault(kind, {})
        denominators={pair['denominator'] for pair in categories.values()}
        complete=kind in {'tools','message_roles','command_families'} and len(denominators)==1 and sum((decimal(pair['numerator']) for pair in categories.values()),Decimal(0))==decimal(next(iter(denominators)))
        if complete:
            population=state['populations'].setdefault(kind,{'sum':'0','count':0})
            population['sum']=number_string(Decimal(population['sum'])+sign*decimal(next(iter(denominators))))
            population['count']+=sign
            if population['count']==0:del state['populations'][kind]
        for name, pair in categories.items():
            bucket = index.setdefault(name, {'numerator':'0','denominator':'0','complete_denominator':'0','count':0})
            bucket['count'] += sign
            if complete:bucket['complete_denominator']=number_string(Decimal(bucket['complete_denominator'])+sign*decimal(pair['denominator']))
            for k in ['numerator','denominator']:
                bucket[k] = number_string(Decimal(bucket[k]) + sign * decimal(pair[k]))
                if Decimal(bucket[k]) < 0:
                    raise SGSError('Ratio négatif')
            if Decimal(bucket['numerator']) > Decimal(bucket['denominator']):
                raise SGSError('Ratio supérieur à son périmètre')
            if bucket['count'] == 0:
                del index[name]
            elif bucket['count'] < 0:
                raise SGSError('Effectif de ratio négatif')
        if not index:
            del state['breakdowns'][kind]
    for item in c['performance']:
        key = json.dumps([item['model'],item['reasoning']], ensure_ascii=False)
        group = state['performance'].setdefault(key, {'ttmt':{'sum':'0','count':0},'throughput':{'sum':'0','count':0}})
        for field in ['ttmt','throughput']:
            if item[field] is not None:
                group[field]['sum'] = number_string(Decimal(group[field]['sum']) + sign * decimal(item[field]))
                group[field]['count'] += sign
        if all(not b['count'] for b in group.values()):
            del state['performance'][key]
    for call in c['web_calls']:
        key = json.dumps(call, sort_keys=True, ensure_ascii=False)
        count_member(state['web_calls'], key, sign)
    for proof in c['proof_ids']:
        count_member(state['proofs'], proof, sign)
    if state['nca'] < 0:
        raise SGSError('NCA négatif')
    return state


def aggregate(changes):
    state = empty_aggregate()
    for change in changes.values():
        accumulate(state, change['contribution'])
    return state


def python_lines(text):
    code, comments, doc_lines = set(), set(), set()
    tree = ast.parse(text)
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and node.body:
            first = node.body[0]
            if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
                doc_lines.update(range(first.lineno, first.end_lineno + 1))
    ignored = {tokenize.ENCODING, tokenize.ENDMARKER, tokenize.INDENT, tokenize.DEDENT,
               tokenize.NEWLINE, tokenize.NL}
    for token in tokenize.generate_tokens(io.StringIO(text).readline):
        if token.type == tokenize.COMMENT:
            comments.update(range(token.start[0], token.end[0] + 1))
        elif token.type not in ignored:
            target = comments if token.type == tokenize.STRING and token.start[0] in doc_lines else code
            target.update(range(token.start[0], token.end[0] + 1))
    nonempty = {i for i, line in enumerate(text.splitlines(), 1) if line.strip()}
    return len(code & nonempty), len(comments & nonempty)


def javascript_lines(text, *, line_sets=False):
    """Lex JS strings, regex literals, templates and nested ${expressions}."""
    code, comments = set(), set()
    n, line, mode, quote, escape, can_regex = 0, 1, 'code', None, False, True
    templates = []
    braces = 0
    regex_class = False
    while n < len(text):
        char = text[n]
        nxt = text[n:n+2]
        if char == '\n':
            line += 1
            if mode == 'line_comment':
                mode = 'code'
            n += 1
            continue
        if mode in {'line_comment','block_comment'}:
            if not char.isspace():
                comments.add(line)
            if mode == 'block_comment' and nxt == '*/':
                mode = 'code'; n += 2
            else:
                n += 1
            continue
        if mode in {'string','template','regex'}:
            if not char.isspace():
                code.add(line)
            if escape:
                escape = False
            elif char == '\\':
                escape = True
            elif mode == 'regex' and char == '[':
                regex_class = True
            elif mode == 'regex' and char == ']':
                regex_class = False
            elif mode == 'regex' and char == '/' and not regex_class:
                mode = 'code'; can_regex = False
            elif mode == 'string' and char == quote:
                mode = 'code'; can_regex = False
            elif mode == 'template' and char == '`':
                mode = 'code'; can_regex = False
            elif mode == 'template' and nxt == '${':
                templates.append(braces); braces += 1; mode = 'code'; can_regex = True; n += 1
            n += 1
            continue
        if nxt == '//':
            comments.add(line); mode = 'line_comment'; n += 2; continue
        if nxt == '/*':
            comments.add(line); mode = 'block_comment'; n += 2; continue
        if n == 0 and nxt == '#!':
            comments.add(line); mode = 'line_comment'; n += 2; continue
        if char.isspace():
            n += 1; continue
        code.add(line)
        if char in "\"'":
            mode = 'string'; quote = char
        elif char == '`':
            mode = 'template'
        elif char == '/' and can_regex:
            mode = 'regex'; regex_class = False
        elif char == '{':
            braces += 1; can_regex = True
        elif char == '}':
            braces -= 1
            if templates and templates[-1] == braces:
                templates.pop(); mode = 'template'
            can_regex = False
        elif char.isalpha() or char in '_$':
            word = re.match(r'[\w$]+', text[n:])[0]
            n += len(word) - 1
            can_regex = word in {'return','throw','case','delete','typeof','void','new','yield','await','in','of'}
        elif char.isdigit() or char in ')]':
            can_regex = False
        elif char in '=(:,;!?&|+-*%^~[':
            can_regex = True
        n += 1
    if mode not in {'code','line_comment'} or templates:
        raise SGSError('Construction JavaScript non close ou non prise en charge')
    return (code,comments) if line_sets else (len(code),len(comments))


def css_lines(text, *, line_sets=False):
    code,comments = set(),set()
    mode,quote,escape,n,line = 'code',None,False,0,1
    while n<len(text):
        char=text[n];pair=text[n:n+2]
        if char=='\n': line+=1;n+=1;continue
        if mode=='comment':
            if not char.isspace():comments.add(line)
            if pair=='*/':mode='code';n+=2
            else:n+=1
            continue
        if mode=='string':
            if not char.isspace():code.add(line)
            if escape:escape=False
            elif char=='\\':escape=True
            elif char==quote:mode='code'
        elif pair=='/*':
            comments.add(line);mode='comment';n+=2;continue
        elif not char.isspace():
            code.add(line)
            if char in "\"'":mode='string';quote=char
        n+=1
    if mode!='code':raise SGSError('Chaîne ou commentaire CSS non clos')
    return (code,comments) if line_sets else (len(code),len(comments))


def html_lines(text):
    class Lines(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.code,self.comments,self.embedded=set(),set(),None
        def mark(self,data,target):
            start=self.getpos()[0]
            target.update(start+i for i,line in enumerate(data.splitlines() or ['']) if line.strip())
        def handle_starttag(self,tag,attrs):
            self.mark(self.get_starttag_text(),self.code)
            if tag in {'script','style'}:self.embedded=tag
        def handle_startendtag(self,tag,attrs):self.mark(self.get_starttag_text(),self.code)
        def handle_endtag(self,tag):
            self.mark('</'+tag+'>',self.code)
            if tag==self.embedded:self.embedded=None
        def handle_comment(self,data):self.mark('<!--'+data+'-->',self.comments)
        def handle_decl(self,data):self.mark('<!'+data+'>',self.code)
        def handle_entityref(self,name):self.code.add(self.getpos()[0])
        def handle_charref(self,name):self.code.add(self.getpos()[0])
        def handle_data(self,data):
            if self.embedded and data.strip():
                offset=self.getpos()[0]-1
                fn=javascript_lines if self.embedded=='script' else css_lines
                code,comments=fn(data,line_sets=True)
                self.code.update(offset+i for i in code)
                self.comments.update(offset+i for i in comments)
                return
            self.mark(data,self.code)
    parser=Lines();parser.feed(text);parser.close()
    return len(parser.code),len(parser.comments)


def count_code(root, specifications):
    if not specifications:
        raise SGSError('Définir --code-root LIBELLÉ=CHEMIN depuis l’architecture produit, ou --no-code pour un corpus documentaire')
    if specifications == ['NONE']:
        return {'roots': [], 'files': {}, 'groups': {'Global': {'code':0,'comments':0,'reason':None}}}
    files, groups, physical = {}, {}, set()
    for specification in specifications:
        if '=' not in specification:
            raise SGSError('Racine code attendue LIBELLÉ=CHEMIN')
        label, relative = specification.split('=', 1)
        if not label or any(c in label for c in '\n|') or label == 'Global' or label in groups:
            raise SGSError('Libellé de périmètre invalide ou dupliqué')
        base = safe_path(root, relative, exclusions=True)
        if not base.is_dir():
            raise SGSError('Racine de code absente : ' + relative)
        group = groups[label] = {'code':0,'comments':0,'reason':None}
        for folder, dirs, names in os.walk(base, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in EXCLUDED and not SENSITIVE.search(d)
                             and not (Path(folder)/d).is_symlink())
            for name in sorted(names):
                p = Path(folder) / name
                if p.suffix not in {'.py','.js','.mjs','.cjs','.ts','.tsx','.jsx','.sh','.go','.rs','.sql','.css','.html'}:
                    continue
                if SENSITIVE.search(name) or p.is_symlink():
                    continue
                info = p.stat()
                identity = (info.st_dev,info.st_ino)
                if identity in physical:
                    continue
                physical.add(identity)
                data = read_file(p)
                path = str(p.relative_to(root))
                try:
                    if p.suffix == '.py':
                        code, comments = python_lines(data.decode('utf-8-sig'))
                    elif p.suffix in {'.js','.mjs','.cjs'}:
                        code, comments = javascript_lines(data.decode('utf-8-sig'))
                    elif p.suffix == '.css':
                        code, comments = css_lines(data.decode('utf-8-sig'))
                    elif p.suffix == '.html':
                        code, comments = html_lines(data.decode('utf-8-sig'))
                    else:
                        raise SGSError('Langage sans analyseur lexical qualifié : ' + p.suffix)
                    files[path] = {'sha256':sha(data),'code':code,'comments':comments,'group':label}
                    group['code'] += code; group['comments'] += comments
                except (SGSError, SyntaxError, tokenize.TokenError, UnicodeError) as exc:
                    files[path] = {'sha256':sha(data),'code':None,'comments':None,'group':label,'reason':str(exc)}
                    group['reason'] = 'Au moins un fichier sans analyse lexicale fiable'
        if group['reason']:
            group['code'] = group['comments'] = None
    groups['Global'] = {'code': sum(g['code'] or 0 for g in groups.values()),
                        'comments':sum(g['comments'] or 0 for g in groups.values()),'reason':None}
    if any(g['reason'] for g in groups.values()):
        groups['Global'] = {'code':None,'comments':None,'reason':'Périmètre au moins partiellement indisponible'}
    return {'roots':specifications,'files':files,'groups':groups}


def table(headers, data):
    def cell(x):
        return str(x).replace('|','\\|').replace('\n',' ')
    return ['| ' + ' | '.join(map(cell, headers)) + ' |', '| ' + ' | '.join(['---']*len(headers)) + ' |'] + [
        '| ' + ' | '.join(map(cell, row)) + ' |' for row in data] + ['']


def render(state, code):
    nca = state['nca']
    def total(key):
        b = state['metrics'][key]
        return Decimal(b['sum']) if b['count'] else None
    def average(key):
        b = state['metrics'][key]
        return Decimal(b['sum']) / b['count'] if b['count'] else None
    def ratio(key, denominator):
        b = state['breakdowns'].get('ratios', {}).get(key)
        # Ratio populations are stored per change, never reconstructed from incompatible totals.
        if b:
            return Decimal(b['numerator']) / Decimal(b['denominator']) * 100 if Decimal(b['denominator']) else None
        return None
    def pct(value):
        return display(value,2)+' %' if value is not None else 'N/A'
    def category_pct(kind,pair):
        denominator=Decimal(state['populations'].get(kind,{}).get('sum','0'))+Decimal(pair['denominator'])-Decimal(pair['complete_denominator'])
        return pct(Decimal(pair['numerator'])/denominator*100 if denominator else None)
    out = ['# Statistiques globales', '', f'**NCA — Nombre de changes analysés : {nca}**', '']
    for section, title in HEADINGS.items():
        out += [f'## {section}. {title}', '']
        if section == 1:
            start = state['bounds']['start']; end = state['bounds']['end']
            njt = (max(map(Decimal,end)) - min(map(Decimal,start))) / 86400 if start and end else None
            if njt is not None and njt < 0:
                njt = None
            durations = []
            for key, label in [('duration','DGCT — Temps total de développement du projet via l’IA'),
                               ('net_duration','DGCTSPA — Temps total de développement du projet via l’IA hors pauses et attentes')]:
                v = total(key)
                durations.append([label,state['metrics'][key]['count'],display(v/86400 if v is not None else None,6)])
            durations += [['NJT — Écart entre le début du premier change et la fin après archivage du dernier',nca,display(njt,6)],
                          ['NCMA — Changes achevés par jour (NCA / NJT)',nca,display(Decimal(nca)/njt if njt else None,6)]]
            out += table(['Indicateur','Nombre de changes','Valeur (jours décimaux ; NCMA en changes achevés/jour)'], durations)
            out += table(['Indicateur','Nombre de changes','Valeur en heures décimales'],[
                [f'{label} — Durée moyenne pour {state["metrics"][key]["count"]} changes'+suffix,
                 state['metrics'][key]['count'], display(average(key)/3600 if average(key) is not None else None,6)]
                for key,label,suffix in [('duration','DGCTM',''),('net_duration','DGCTSPAM',' hors pauses et attentes')]])
        elif section == 2:
            out += ['À date, les agents de codage et orchestrateurs ont utilisé les dernières versions disponibles au moment de chaque change.', '']
            for role, label in [('coder','LLM des agents de codage'),('orchestrator','LLM des agents orchestrateurs')]:
                source = [(json.loads(k),count) for k,count in state['agents'].items() if json.loads(k)[0] == role]
                if not source and role == 'orchestrator':
                    continue
                out += [f'### {label}', '']
                merged = Counter()
                for (_,model,reasoning), count in source:
                    if role == 'orchestrator' and model == reasoning == 'N/A':
                        model,reasoning = 'GPT-6.1','high'
                    elif role == 'coder' and reasoning == 'N/A' and model != 'N/A':
                        replacement = {'glm-5.3-flash':'high','muse-spark-1.3-contributor':'high','qwen3.8-flash':'xhigh'}.get(model)
                        present = {t[2] for t,_ in source if t[1] == model and t[2] in {'high','xhigh'}}
                        reasoning = replacement or (next(iter(present)) if len(present) == 1 else 'N/A')
                    merged[model,reasoning] += count
                if merged:
                    out += table(['Nombre de changes réalisés ou partiellement réalisés','Modèle de LLM','Niveau de raisonnement','Pourcentage de NCA'],
                        [[count, model,reasoning,pct(Decimal(count)*100/nca if nca else None)]
                         for (model,reasoning),count in sorted(merged.items())])
                else:
                    out += ['N/A — identité des codeurs non renseignée.', '']
        elif section == 3:
            ttmt, throughputs, data = [], [], []
            for k,group in sorted(state['performance'].items()):
                model,reasoning = json.loads(k)
                avgs = {f: Decimal(b['sum'])/b['count'] if b['count'] else None for f,b in group.items()}
                if avgs['ttmt'] is not None: ttmt.append(avgs['ttmt'])
                if avgs['throughput'] is not None: throughputs.append(avgs['throughput'])
                if model != 'N/A' and reasoning != 'N/A' and all(v is not None for v in avgs.values()):
                    data.append([model,reasoning,display(avgs['ttmt']),display(avgs['throughput'])])
            out += table(['Modèle de LLM','Niveau de raisonnement','TMTM moyen (s)','Débit moyen (tokens/s)'],data) if data else ['Aucune ligne de performance complète disponible.', '']
            out += table(['Indicateur','Valeur'],[
                ['TMTM total moyen (s)',display(sum(ttmt)/len(ttmt) if ttmt else None)],
                ['Débit minimal total moyen (tokens/s)',display(min(throughputs) if throughputs else None)],
                ['Débit moyen total moyen (tokens/s)',display(sum(throughputs)/len(throughputs) if throughputs else None)],
                ['Débit maximal total moyen (tokens/s)',display(max(throughputs) if throughputs else None)]])
        elif section == 12:
            out += table(['Domaine','Nombre d’appels','Pourcentage des appels'],[
                [METRICS[key][0], display(total(key),0),pct(ratio(key,'domain_total'))]
                for key in METRICS if METRICS[key][1] == 12])
        else:
            keys = {6:['messages','tools'],7:['permissions'],9:['commands'],10:['web'],
                    11:['tests','syntax_files','tasks']}.get(section,[k for k,m in METRICS.items() if m[1] == section])
            out += table(['Mesure','Total','Moyenne par change'],[[METRICS[k][0],display(total(k),0),display(average(k))] for k in keys])
            percentage_keys = {'6':[('tools_completed','tools'),('tools_error','tools'),('tools_running','tools')],
                '7':[(k,'permissions') for k in METRICS if k.startswith('permissions_')],
                '9':[('commands_success','commands'),('commands_failure','commands')],
                '10':[('web_success','web'),('web_search','web'),('web_open','web')],
                '11':[('tests_success','tests'),('tests_failure','tests')]}.get(str(section),[])
            if percentage_keys:
                result_label={6:'Résultat technique des appels',7:'Statut',9:'Résultat',10:'Mesure',11:'Résultat des tests finaux'}.get(section,'Résultat')
                out += table([result_label,'Nombre','Pourcentage'],
                    [[METRICS[k][0],display(total(k),0),pct(ratio(k,d))] for k,d in percentage_keys])
            if section == 4:
                out += table(['Devise du coût de production déclaré','Total','Moyenne par change'],[
                    [currency,display(Decimal(b['sum']),max(9,-Decimal(b['sum']).as_tuple().exponent)),
                     display(Decimal(b['sum'])/b['count'],max(9,-Decimal(b['sum']).as_tuple().exponent))]
                    for currency,b in sorted(state['costs'].items())] or [['N/A','N/A','N/A']])
            if section == 6:
                out += ['Les messages utilisateur peuvent provenir de l’orchestrateur et ne représentent pas nécessairement des messages humains.', '']
                roles=state['breakdowns'].get('message_roles',{})
                out += table(['Rôle des messages','Nombre','Pourcentage'],[
                    [name,display(Decimal(pair['numerator']),0),category_pct('message_roles',pair)]
                    for name,pair in sorted(roles.items())] if roles else [
                    [name,display(total(key),0),pct(ratio(key,'messages'))] for name,key in [('assistant','messages_assistant'),('utilisateur','messages_user')]])
            if section == 8:
                out += ['Le volume mesure le stock actuel de sources propres au produit, chaque fichier physique une seule fois. Les lignes mixtes contribuent aux deux compteurs ; les docstrings de documentation sont classées en commentaires.','']
                out += table(['Périmètre','Lignes de code','Lignes de commentaires'],[
                    [name,display(g['code'],0),display(g['comments'],0)]
                    for name,g in sorted(code['groups'].items(),key=lambda i:(i[0]!='Global',i[0]))])
            for kind in {6:['tools'],9:['command_families'],11:['test_categories']}.get(section,[]):
                data = state['breakdowns'].get(kind,{})
                if kind=='test_categories':
                    out += table(['Catégorie de tests','Nombre'],[[name,display(Decimal(pair['numerator']),0)] for name,pair in sorted(data.items())] or [['N/A','N/A']])
                else:
                    out += table(['Outil' if kind=='tools' else 'Famille de commandes','Nombre','Pourcentage'],[
                        [name,display(Decimal(pair['numerator']),0),category_pct(kind,pair)]
                        for name,pair in sorted(data.items())] or [['N/A','N/A','N/A']])
            if section==11:
                out+=table(['Validations OpenSpec','Nombre','Pourcentage'],[
                    [mode+' — '+label,display(total('openspec_'+mode+'_'+status),0),pct(ratio('openspec_'+mode+'_'+status,None))]
                    for mode in ['standard','strict'] for status,label in [('success','réussies'),('failure','échouées')]])
                out+=['N/A : mesure absente, partielle, contradictoire ou sans périmètre comparable établi. Les cumuls historiques ne constituent pas une validation actuelle du projet.','']
            if section == 10:
                data = [json.loads(key) for key in sorted(state['web_calls'])]
                out += table(['Type d’appel web','Outil','URL consultée ou requête de recherche','Résultat'],[
                    [x['type'],x['tool'],x['target'],x['result']] for x in data]) if data else ['Détail des appels web : N/A.', '']
    return ('\n'.join(out).rstrip()+'\n').encode('utf-8')


def add_ratios(c):
    metrics = c['metrics']
    pairs = [('messages_user','messages'),('messages_assistant','messages'),
             ('tools_completed','tools'),('tools_error','tools'),('tools_running','tools'),
             ('commands_success','commands'),('commands_failure','commands'),
             ('web_success','web'),('web_search','web'),('web_open','web'),
             ('tests_success','tests'),('tests_failure','tests')]
    pairs += [(k,'permissions') for k in METRICS if k.startswith('permissions_')]
    pairs += [(k,'domain_total') for k in METRICS if k.startswith('domain_')]
    ratios = c['breakdowns'].setdefault('ratios',{})
    for numerator,denominator in pairs:
        a,b = metrics[numerator],metrics[denominator]
        if a['state'] == b['state'] == 'known':
            if decimal(a['value']) > decimal(b['value']):
                raise SGSError('Numérateur supérieur au dénominateur : '+numerator)
            ratios[numerator] = {'numerator':a['value'],'denominator':b['value']}
    for mode in ['standard','strict']:
        keys=['openspec_'+mode+'_'+status for status in ['success','failure']]
        if all(metrics[k]['state']=='known' for k in keys):
            denominator=sum(decimal(metrics[k]['value']) for k in keys)
            for key in keys:ratios[key]={'numerator':metrics[key]['value'],'denominator':str(denominator)}
    return c


def publish(root, report, register, expected, modes=None):
    if any(fingerprint(safe_path(root,k)) != v for k,v in expected.items()):
        raise SGSError('Modification concurrente avant publication')
    candidates = {REPORT:report,REGISTER:dumps(register)}
    transaction = {'format':FORMAT,'files':{}}
    for name,data in candidates.items():
        p = safe_path(root,name)
        old = read_file(p) if p.exists() else None
        old_mode=stat.S_IMODE(p.stat().st_mode) if old is not None else None
        mode=(modes or {}).get(name) or old_mode or (0o644 if name==REPORT else 0o600)
        candidate, backup = '.STATISTICS.'+name+'.candidate', '.STATISTICS.'+name+'.backup'
        for temporary in [candidate,backup]:
            if safe_path(root,temporary).exists():
                raise SGSError('Temporaire orphelin à examiner : '+temporary)
        durable_write(root/candidate,data,mode)
        if old is not None:
            durable_write(root/backup,old,old_mode)
        transaction['files'][name] = {'candidate':candidate,'new_sha256':sha(data),'backup':backup,'old_sha256':sha(old) if old is not None else None}
    durable_write(root/JOURNAL,dumps(transaction))
    sync_directory(root)
    # Once the journal exists, failures are left recoverable, never announced as success.
    action=recover(root)
    if action=='rolled-back':raise SGSError('Publication interrompue : état initial restauré, recalcul à reprendre')


def recover(root):
    path = safe_path(root,JOURNAL)
    if not path.exists():
        return False
    journal = load_json(read_file(path))
    if set(journal) != {'format','files'} or journal['format'] != FORMAT or set(journal['files']) != {REPORT,REGISTER}:
        raise SGSError('Journal de transaction incompatible')
    can_finish=True
    for name, item in journal['files'].items():
        expected = {'.STATISTICS.'+name+'.candidate','.STATISTICS.'+name+'.backup'}
        if set(item) != {'candidate','new_sha256','backup','old_sha256'} or {item['candidate'],item['backup']} != expected:
            raise SGSError('Chemins de transaction invalides')
        current = fingerprint(safe_path(root,name))
        if current not in {item['old_sha256'],item['new_sha256']}:
            raise SGSError('Transaction ambiguë : modification extérieure')
        if current != item['new_sha256']:
            candidate_hash=fingerprint(safe_path(root,item['candidate']))
            if candidate_hash is None:can_finish=False
            elif candidate_hash!=item['new_sha256']:raise SGSError('Candidat divergent ; preuves préservées')
    if not can_finish:
        for name,item in journal['files'].items():
            current=fingerprint(safe_path(root,name))
            if item['old_sha256'] is not None and current!=item['old_sha256'] and fingerprint(safe_path(root,item['backup']))!=item['old_sha256']:
                raise SGSError('Sauvegarde manquante : retour arrière non vérifiable')
        for name,item in journal['files'].items():
            final=safe_path(root,name)
            if item['old_sha256'] is None:
                if final.exists():final.unlink()
            elif fingerprint(final)!=item['old_sha256']:
                os.replace(safe_path(root,item['backup']),final)
            sync_directory(root)
        for name,item in journal['files'].items():
            if fingerprint(safe_path(root,name))!=item['old_sha256']:raise SGSError('Retour arrière non confirmé')
        for item in journal['files'].values():
            for field in ['candidate','backup']:
                temporary=safe_path(root,item[field])
                if temporary.exists():temporary.unlink()
        path.unlink();sync_directory(root)
        return 'rolled-back'
    # Verify both candidate payloads and their association before the first rename.
    payloads = {name:read_file(safe_path(root,name if fingerprint(safe_path(root,name)) == item['new_sha256'] else item['candidate']))
                for name,item in journal['files'].items()}
    registry = load_json(payloads[REGISTER])
    if registry.get('report_sha256') != sha(payloads[REPORT]):
        raise SGSError('Candidats désynchronisés')
    validate_register(registry, full=False)
    if render(registry['aggregate_state'],registry['code_state']) != payloads[REPORT]:
        raise SGSError('Rendu candidat divergent')
    for name,item in journal['files'].items():
        final = safe_path(root,name)
        if fingerprint(final) != item['new_sha256']:
            os.replace(safe_path(root,item['candidate']),final)
            sync_directory(root)
    for name,item in journal['files'].items():
        if fingerprint(safe_path(root,name)) != item['new_sha256']:
            raise SGSError('Publication non confirmée')
    for item in journal['files'].values():
        for field in ['candidate','backup']:
            temporary = safe_path(root,item[field])
            if temporary.exists():
                temporary.unlink()
    path.unlink()
    sync_directory(root)
    return 'published'


def validate_register(register, full=True):
    mandatory = {'schema_version','engine_format','contract_sha256','generation','report_sha256',
                 'complete','changes','aggregate_state','code_state'}
    if not isinstance(register,dict) or set(register) != mandatory or register['schema_version'] != 1 or register['engine_format'] != FORMAT:
        raise SGSError('Schéma de registre incompatible ; SGS manuel requis')
    if register['complete'] is not True or type(register['generation']) is not int or register['generation'] < 1:
        raise SGSError('Registre incomplet ou génération invalide')
    if any(not isinstance(register[k],dict) for k in ['changes','aggregate_state','code_state']) or set(register['aggregate_state'])!=set(empty_aggregate()):
        raise SGSError('État de registre invalide')
    for field in ['contract_sha256','report_sha256']:
        if not re.fullmatch('[a-f0-9]{64}',register[field]):
            raise SGSError('Empreinte de registre invalide')
    if register['aggregate_state']['nca'] != len(register['changes']):
        raise SGSError('NCA désynchronisé')
    state=register['aggregate_state']
    if set(state)!=set(empty_aggregate()) or type(state['nca']) is not int or state['nca']<0 or set(state['metrics'])!=set(METRICS):
        raise SGSError('Structure agrégée invalide')
    for bucket in state['metrics'].values():
        if set(bucket)!={'sum','count'} or type(bucket['count']) is not int or not 0<=bucket['count']<=state['nca']:
            raise SGSError('Effectif agrégé invalide')
        decimal(bucket['sum'])
    if full:
        for key,e in register['changes'].items():
            if not re.fullmatch(r'openspec/changes/archive/[^/]+',key) or e['report_path'] != key+'/'+REPORT:
                raise SGSError('Identité d’archive invalide')
            validate_contribution(e['contribution'])
        if aggregate(register['changes']) != register['aggregate_state']:
            raise SGSError('Agrégats du registre non reproductibles')


def verify(root, contract, *, sources=False):
    recover(root)
    registry = load_json(read_file(safe_path(root,REGISTER)))
    validate_register(registry)
    report = read_file(safe_path(root,REPORT))
    if sha(report) != registry['report_sha256'] or sha(read_file(contract)) != registry['contract_sha256']:
        raise SGSError('Empreinte du couple ou du contrat divergente')
    if render(registry['aggregate_state'],registry['code_state']) != report:
        raise SGSError('Rendu du rapport non reproductible')
    if sources:
        paths = inventory(root)
        if {str(p.parent.relative_to(root)) for p in paths} != set(registry['changes']):
            raise SGSError('Inventaire des archives différent')
        for p in paths:
            key = str(p.parent.relative_to(root))
            if fingerprint(p) != registry['changes'][key]['report_sha256']:
                raise SGSError('Source modifiée : '+key)
        for relative,item in registry['code_state']['files'].items():
            if fingerprint(safe_path(root,relative,exclusions=True)) != item['sha256']:
                raise SGSError('Source de code modifiée')
        if count_code(root,registry['code_state']['roots'] or ['NONE']) != registry['code_state']:
            raise SGSError('Inventaire ou comptage de code modifié')
    return {'status':'verified','nca':len(registry['changes']),'generation':registry['generation'],
            'report_sha256':sha(report),'transaction_pending':False}


def validate_native_telemetry(value):
    """Annexe native durable ; aucun corps de conversation ni champ libre."""
    if not isinstance(value,dict) or set(value)!={'format','sessions'} or value['format']!='cab-native-sgs-1' or not isinstance(value['sessions'],list) or len(value['sessions'])>1000:
        raise SGSError('Annexe native SGS invalide')
    identity_keys={'binding','host','instance','project','change','run','session','role','agent','mode','started_at'}
    for session in value['sessions']:
        if not isinstance(session,dict) or set(session)-{'ended_at','cab_direct'}!=identity_keys|{'metrics','coverage','models','events','collector'}:
            raise SGSError('Session native SGS invalide')
        if session['role'] not in {'coder','orchestrator','component'} or session['mode'] not in {'direct','piloted','service'}:
            raise SGSError('Rôle natif SGS invalide')
        for key in identity_keys-{'started_at','project'}:
            if not isinstance(session[key],str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:/+@-]{0,255}',session[key]):
                raise SGSError('Identité native SGS invalide')
        if not isinstance(session['project'],str) or not session['project'].startswith('/') or '\n' in session['project'] or timestamp(session['started_at']) is None:
            raise SGSError('Source native SGS invalide')
        if session.get('ended_at') is not None and timestamp(session['ended_at']) is None:raise SGSError('Fin native SGS invalide')
        if 'cab_direct' in session and type(session['cab_direct']) is not bool:raise SGSError('Opt-in CAB direct invalide')
        metric_keys=set(METRICS)|{'cost_usd','duration_seconds','wait_seconds','preparation_seconds','ttft_seconds','generation_seconds','update_preparation_seconds','update_cutover_seconds',
            'messages_llm','tools_llm','commands_api','command_wall_seconds','tool_wall_seconds','message_span_seconds','reasoning_span_seconds',
            'ccab_open','ccab_claimed','ccab_resolved_retained','ccab_total_retained'}
        if not isinstance(session['metrics'],dict) or not set(session['metrics'])<=metric_keys or not isinstance(session['coverage'],dict) or not set(session['coverage'])<=metric_keys:
            raise SGSError('Mesures natives SGS invalides')
        for measure in session['metrics'].values():
            number=decimal(measure)
            if number<0:raise SGSError('Mesure native SGS négative')
        if any(state not in {'native','partial','unavailable','supplement'} for state in session['coverage'].values()):
            raise SGSError('Couverture native SGS invalide')
        if type(session['events']) is not int or session['events']<0 or not isinstance(session['collector'],dict) or not set(session['collector'])<={'source','status','reason'}:
            raise SGSError('Collecteur natif SGS invalide')
        if any(not isinstance(v,str) or len(v)>100 or '\n' in v for v in session['collector'].values()):
            raise SGSError('Collecteur natif SGS invalide')
        if not isinstance(session['models'],list) or len(session['models'])>10000:raise SGSError('Chronologie native SGS invalide')
        for period in session['models']:
            if not isinstance(period,dict) or set(period)!={'from','until','model','source'} or period['source'] not in {'codex-native','opencode-native','cab-component','llm-supplement','archive'}:
                raise SGSError('Période native SGS invalide')
            if timestamp(period['from']) is None or period['until'] is not None and timestamp(period['until']) is None:
                raise SGSError('Horodatage de modèle invalide')
            if not isinstance(period['model'],dict) or set(period['model'])!={'name','provider','reasoning'} or any(v is not None and (not isinstance(v,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.:/+@-]{0,255}',v)) for v in period['model'].values()):
                raise SGSError('Modèle natif SGS invalide')
    return value


def ledger_contribution(ledger):
    if set(ledger) != {'format','sessions'} or ledger['format'] != FORMAT or not ledger['sessions']:
        raise SGSError('Registre de sessions incompatible')
    records = ledger['sessions']
    if len({s['id'] for s in records}) != len(records):
        raise SGSError('Session dupliquée')
    # A cumulative snapshot supersedes earlier counts, whose evidence stays in the ledger.
    last = max((i for i,s in enumerate(records) if s['scope'] == 'cumulative'), default=-1)
    active = records[last:] if last >= 0 else records
    for item in records:
        if set(item) - {'id','scope','state','input_sha256','contribution','details','tables','notes','agent_details','native_telemetry'} or not {'id','scope','state','input_sha256','contribution'} <= set(item) or item['scope'] not in {'cumulative','increment'} or item['state'] not in {'blocked','archived','legacy'}:
            raise SGSError('Session invalide')
        validate_contribution(item['contribution'])
        if 'native_telemetry' in item:validate_native_telemetry(item['native_telemetry'])
    c = blank()
    for key in METRICS:
        values = [s['contribution']['metrics'][key] for s in active]
        if all(v['state'] == 'known' for v in values):
            # Final tests and syntax/tasks are final states, not activity increments.
            if key.startswith('tests') or key in {'syntax_files','tasks'}:
                c['metrics'][key] = values[-1]
            else:
                c['metrics'][key] = known(str(sum((decimal(v['value']) for v in values),Decimal(0))),
                                            [e for v in values for e in v['evidence']],METRICS[key][2])
        elif len(values) == 1:
            c['metrics'][key] = values[0]
        else:
            c['metrics'][key] = unavailable('Au moins une session du périmètre sans mesure compatible')
    for item in records:
        for agent in item['contribution']['agents']:
            if agent not in c['agents']: c['agents'].append(agent)
    c['sessions'] = [s['id'] for s in records]
    for key in ['bounds','performance','costs','breakdowns','web_calls','proof_ids']:
        # These structured non-additive fields must be supplied as cumulative snapshots.
        c[key] = active[-1]['contribution'][key]
    return derive(c)


CHANGE_TITLES = ['Statistiques générales et décisions','Types de messages et d’outils',
                 'Fichiers modifiés','Commandes','Accès web','Synthèse globale']



def report_target(root, relative, report=None):
    directory=safe_path(root,relative)
    if not directory.is_dir() or not re.fullmatch(r'openspec/changes/(?:archive/)?[^/]+',relative):
        raise SGSError('Dossier de change attendu')
    if report is not None:
        path=safe_path(root,report)
        if (not path.is_relative_to(directory) or not path.is_file() or
                path.name.lower() in {'proposal.md','design.md','tasks.md','checkpoint.md','blockers.md','blocker.md','revalidation.md','spec.md','readme.md'} or path.name.startswith('.')):
            raise SGSError('--report exige un fichier existant dans le change ciblé')
        return path
    variants=[p for p in directory.rglob('*.md')
              if p.name!=REPORT and re.match(r'(?:statist|stats)',p.name,re.I)]
    if variants:
        raise SGSError('Rapport alternatif ou ambigu : identifier le fichier existant avec --report')
    return safe_path(root,relative+'/'+REPORT)


@contextmanager
def report_locked(directory):
    # A directory inode survives atomic replacement of its report; no lock file
    # or shared project-level input is needed by a REPORT-only mandate.
    fd=os.open(directory,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
    try:
        try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError as exc:raise SGSError('Rapport SGS occupé ; aucune mutation effectuée') from exc
        yield
    finally:os.close(fd)


def change_report(root, relative, evidence_path, state, maintain=False, contract=None, code_roots=None, cab_export=None, file_mode=None, report=None):
    path=report_target(root,relative,report)
    with report_locked(path.parent):
        result=_change_report(root,relative,evidence_path,state,cab_export,file_mode,path)
    if maintain:
        if path!=safe_path(root,relative+'/'+REPORT):
            result['global']={'status':'not-admissible','mutated':False}
        else:
            try:
                if contract is None:raise SGSError('--contract requis pour le delta global')
                with locked(root):
                    result['global']=delta(root,relative,contract_file(str(contract)),code_roots,{},None,file_mode)
            except (SGSError,OSError,UnicodeError,json.JSONDecodeError) as exc:
                result['global']={'status':'error','cause':str(exc)}
    return result


def _change_report(root, relative, evidence_path, state, cab_export, file_mode, path):
    def finish(result):
        return result
    directory = safe_path(root,relative)
    if not directory.is_dir() or not re.fullmatch(r'openspec/changes/(?:archive/)?[^/]+',relative):
        raise SGSError('Dossier de change attendu')
    if state == 'archived' and not relative.startswith('openspec/changes/archive/'):
        raise SGSError('Un rapport final exige un dossier déjà archivé')
    if state == 'blocked' and (relative.startswith('openspec/changes/archive/') or not safe_path(root,relative+'/BLOCKERS.md').is_file()):
        raise SGSError('Change ouvert et BLOCKERS.md existant requis')
    evidence_data = evidence_path if isinstance(evidence_path,bytes) else read_file(evidence_path)
    if len(evidence_data)>MAX_BYTES:raise SGSError('Preuves trop volumineuses')
    evidence = load_json(evidence_data)
    if set(evidence) - {'schema_version','session_id','scope','contribution','details','tables','notes','agent_details','native_telemetry'} or not {'schema_version','session_id','scope','contribution'} <= set(evidence) or evidence['schema_version'] != 1:
        raise SGSError('Schéma de preuves de session invalide')
    if not re.fullmatch(r'[\w.:-]{1,180}',evidence['session_id']):
        raise SGSError('Identifiant de session invalide')
    data = read_file(path) if path.exists() else None
    input_hash=sha(evidence_data+(read_file(cab_export) if cab_export else b''))
    if data:
        embedded=MARKER.search(data.decode('utf-8'))
        if embedded:
            prior_session=next((s for s in load_json(embedded[1])['sessions'] if s['id']==evidence['session_id']),None)
            if prior_session and prior_session['input_sha256']==input_hash and prior_session['state']==state:
                return finish({'status':'unchanged','report':str(path),'state':state})
    c = validate_contribution(evidence['contribution'])
    if cab_export:
        if evidence['scope']!='cumulative':
            raise SGSError('Un export CAB de change exige une portée cumulative attestée')
        changes={relative:{'report_sha256':sha(data) if data else None,'contribution':c}}
        import_cab(root,changes,cab_export)
    record = {'id':evidence['session_id'],'scope':evidence['scope'],'state':state,
              'input_sha256':input_hash,'contribution':c}
    if 'native_telemetry' in evidence:
        record['native_telemetry']=validate_native_telemetry(evidence['native_telemetry'])
        expected_change=re.sub(r'^\d{4}-\d{2}-\d{2}-','',relative.rsplit('/',1)[1])
        if any(s['project']!=str(root) or s['change']!=expected_change for s in record['native_telemetry']['sessions']):
            raise SGSError('Télémétrie native hors projet/change')
    if 'details' in evidence:
        if not isinstance(evidence['details'],dict) or set(evidence['details'])-set('123456'):
            raise SGSError('Détails de session hors des six sections')
        for details in evidence['details'].values():
            if not isinstance(details,list) or len(details)>1000:
                raise SGSError('Détails de session trop volumineux')
            for row in details:
                if set(row)!={'label','value','proof'} or any(not isinstance(v,str) or len(v)>4000 or '\n' in v for v in row.values()):
                    raise SGSError('Ligne de détail de session invalide')
        record['details']=evidence['details']
    for field in ['tables','notes']:
        if field in evidence:
            if not isinstance(evidence[field],dict) or set(evidence[field])-set('123456'):
                raise SGSError('Sections de rapport invalides')
            for items in evidence[field].values():
                if not isinstance(items,list):raise SGSError('Liste de blocs attendue')
                if field=='notes':
                    if any(not isinstance(x,str) or len(x)>8000 for x in items):raise SGSError('Note de rapport invalide')
                else:
                    for block in items:
                        if not isinstance(block,dict) or set(block)!={'title','columns','rows'} or not isinstance(block['title'],str) or '\n' in block['title'] or not isinstance(block['columns'],list) or not 1<=len(block['columns'])<=16 or not isinstance(block['rows'],list):
                            raise SGSError('Tableau détaillé invalide')
                        if any(not isinstance(v,str) or len(v)>200 or '\n' in v for v in block['columns']):raise SGSError('Colonne de tableau invalide')
                        if any(not isinstance(row,list) or len(row)!=len(block['columns']) or any(type(v) not in {str,int} or len(str(v))>4000 for v in row) for row in block['rows']):raise SGSError('Cellule de tableau invalide')
            record[field]=evidence[field]
    if 'agent_details' in evidence:
        if not isinstance(evidence['agent_details'],list):raise SGSError('Agents détaillés invalides')
        expected={'role','model','version','provider','reasoning','ttmt','throughput','service_percent'}
        for a in evidence['agent_details']:
            if set(a)!=expected or a['role'] not in {'coder','orchestrator'} or any(not isinstance(v,str) or len(v)>500 or '\n' in v for v in a.values()):
                raise SGSError('Agent détaillé invalide')
        record['agent_details']=evidence['agent_details']
    if cab_export:
        for section,blocks in changes[relative].get('native_tables',{}).items():
            record.setdefault('tables',{}).setdefault(section,[]).extend(blocks)
    text = data.decode('utf-8') if data else '# Statistiques du change\n\n' + '\n'.join(
        f'## {i}. {title}\n' for i,title in enumerate(CHANGE_TITLES,1))
    found = list(MARKER.finditer(text))
    if len(found) > 1:
        raise SGSError('Plusieurs registres embarqués')
    ledger = load_json(found[0][1]) if found else {'format':FORMAT,'sessions':[]}
    if not found and data:
        ledger['sessions'].append({'id':'legacy-'+sha(data)[:16],'scope':'cumulative','state':'legacy',
                                  'input_sha256':sha(data),'contribution':extract(text)})
    prior = next((s for s in ledger['sessions'] if s['id'] == record['id']),None)
    if prior:
        if prior != record:
            raise SGSError('Session existante différente : fournir un nouvel identifiant de relevé, sans effacer l’historique')
        return finish({'status':'unchanged','report':str(path),'state':state})
    ledger['sessions'].append(record)
    ledger_contribution(ledger)
    if found:
        text = text[:found[0].start()] + text[found[0].end():]
    sections = list(re.finditer(r'^## (?:[1-6]\. )?([^\n]+)\n',text,re.M))
    standard=len(sections)==6
    prefix=text[:sections[0].start()] if standard else text+'\n\n### Relevé '+record['id']+'\n\n'
    blocks = []
    for index in range(6):
        if standard:
            start=sections[index].start();end=sections[index+1].start() if index<5 else len(text)
            block=text[start:end].rstrip()+'\n\n### Relevé '+record['id']+'\n\n'
        else:
            block=f'#### {index+1}. {CHANGE_TITLES[index]}\n\n'
        if index == 0:
            block += ('Change ouvert — dépendances manquantes — archivage en attente. Voir [BLOCKERS.md](BLOCKERS.md).'
                      if state == 'blocked' else 'Change archivé ; mesures limitées aux preuves de ce relevé.')+'\n\n'
            block += 'Portée : '+record['scope']+'.\n\n'
            for a in c['agents']:
                block += f"Agent {a['role']} : {a['agent'] or 'N/A'}, modèle {a['model']}, raisonnement {a['reasoning']}.\n\n"
        sections_for = {0:{1,4,7},1:{6},2:{8},3:{9,11},4:{10},5:{12}}[index]
        data_rows = []
        for key,meta in METRICS.items():
            if meta[1] in sections_for:
                v = c['metrics'][key]
                data_rows.append([meta[0],v['value'] if v['state']=='known' else 'N/A',
                                  ' ; '.join(e.get('note','preuve structurée') for e in v['evidence']) if v['state']=='known' else v['reason']])
        block += '\n'.join(table(['Mesure','Valeur','Preuve ou limite'],data_rows))+'\n'
        if index==0 and c['costs']:
            block+='\n'.join(table(['Devise du coût natif','Valeur','Preuve ou limite'],[
                [currency,m['value'] if m['state']=='known' else 'N/A',m['reason'] or 'Mesure native documentée']
                for currency,m in sorted(c['costs'].items())]))+'\n'
        if record.get('details',{}).get(str(index+1)):
            block += '\n'.join(table(['Élément documenté','Valeur','Preuve'],[
                [r['label'],r['value'],r['proof']] for r in record['details'][str(index+1)]]))+'\n'
        for detail in record.get('tables',{}).get(str(index+1),[]):
            block += ('#### ' if standard else '##### ')+detail['title']+'\n\n'+'\n'.join(table(detail['columns'],detail['rows']))+'\n'
        for note in record.get('notes',{}).get(str(index+1),[]):
            # Notes are data; headings cannot manufacture additional H2 sections.
            block += '\n'.join(('> '+line) if line.startswith('#') else line for line in note.splitlines())+'\n\n'
        blocks.append(block)
    agents=''
    for role,title in [('coder','Agents de codage'),('orchestrator','Agents orchestrateurs')]:
        data_rows=[]
        items=[a for a in record.get('agent_details',[]) if a['role']==role]
        for a in items:
            data_rows.append([a[k] for k in ['model','version','provider','reasoning','ttmt','throughput','service_percent']])
        if not items:
            for a in c['agents']:
                if a['role']!=role:continue
                perf=next((p for p in c['performance'] if p['model']==a['model'] and p['reasoning']==a['reasoning']),{})
                data_rows.append([a['model'],'N/A','N/A',a['reasoning'],perf.get('ttmt') or 'N/A',perf.get('throughput') or 'N/A','N/A'])
        agents+=('### ' if standard else '#### ')+title+' — relevé '+record['id']+'\n\n'+'\n'.join(table(
            ['Modèle de LLM','Version','Fournisseur','Niveau de raisonnement','TTMT moyen','Tokens/seconde moyens','Temps de service (% total)'],
            data_rows or [['N/A']*7]))+'\n'
    native_block=''
    if 'native_telemetry' in record:
        native_block='\n### Télémétrie native et chronologie des modèles\n\n'
        for session in record['native_telemetry']['sessions']:
            native_block+='\n'.join(table(['Rôle','Agent','Session','Mode'],[[session['role'],session['agent'],session['session'],session['mode']]]))+'\n'
            native_block+='\n'.join(table(['Mesure','Valeur','Couverture'],[[key,value,session['coverage'].get(key,'unavailable')] for key,value in session['metrics'].items()]))+'\n'
            native_block+='\n'.join(table(['Début','Fin','Modèle','Fournisseur','Raisonnement'],[[p['from'],p['until'] or 'N/A',p['model']['name'] or 'N/A',p['model']['provider'] or 'N/A',p['model']['reasoning'] or 'N/A'] for p in session['models']]))+'\n'
    result = prefix + agents + ''.join(blocks) + native_block + '\n<!-- CAB_SGS_SESSIONS_V1\n'+dumps(ledger).decode().rstrip()+'\n-->\n'
    if '-->' in dumps(ledger).decode():
        raise SGSError('Délimiteur interdit dans les preuves')
    temporary = path.with_name(path.name+'.sgs-candidate')
    mode=file_mode or (stat.S_IMODE(path.stat().st_mode) if data is not None else 0o644)
    durable_write(temporary,result.encode('utf-8'),mode)
    if fingerprint(path) != (sha(data) if data is not None else None):
        temporary.unlink(); raise SGSError('Rapport de change modifié concurremment')
    if fingerprint(temporary)!=sha(result.encode('utf-8')):
        raise SGSError('Candidat du rapport modifié concurremment ; conservé pour diagnostic')
    try:
        os.replace(temporary,path); sync_directory(path.parent)
    except OSError:
        if temporary.exists():temporary.unlink()
        raise
    outcome = {'status':'updated' if data else 'created','report':str(path),'state':state}
    return finish(outcome)


def import_cab(root, changes, export_path):
    """Consume a supplied public summary, never the private native stores."""
    source_data = read_file(export_path)
    source_sha = sha(source_data)
    data = load_json(source_data)
    if not isinstance(data,dict) or set(data) != {'schema_version','project_root','summary','bindings'} or data['schema_version'] != 1 or data['project_root'] != str(root):
        raise SGSError('Export CAB hors projet ou schéma incompatible')
    summary = data['summary']
    if not isinstance(summary,dict) or summary.get('schemaVersion') != 2 or not isinstance(summary.get('contexts'),list) or any(not isinstance(c,dict) for c in summary['contexts']) or summary.get('droppedEvents',0) or not isinstance(data['bindings'],list):
        raise SGSError('Résumé CAB incomplet ou incompatible')
    grouped, seen = {}, set()
    for binding in data['bindings']:
        if set(binding) != {'archive_path','report_sha256','runId','contextId','role','coverage'}:
            raise SGSError('Rattachement CAB invalide')
        archive = binding['archive_path']
        if archive not in changes or changes[archive]['report_sha256'] != binding['report_sha256']:
            raise SGSError('Rattachement CAB périmé ou archive absente')
        if binding['role'] != 'coder' or binding['coverage'] != 'complete-production':
            raise SGSError('Couverture de production des codeurs non attestée')
        identity = (binding['runId'],binding['contextId'])
        if identity in seen:
            raise SGSError('Contexte CAB dupliqué')
        seen.add(identity)
        contexts = [c for c in summary['contexts'] if (c.get('runId'),c.get('contextId')) == identity]
        change_id = Path(archive).name[11:] if archive.startswith('openspec/changes/archive/') else Path(archive).name
        if len(contexts) != 1 or contexts[0].get('changeId') != change_id:
            raise SGSError('Contexte CAB non corrélé au change')
        grouped.setdefault(archive,[]).append(contexts[0])
    for archive,contexts in grouped.items():
        values = Counter()
        tool_names=Counter()
        tool_states={}
        decisions=Counter();decisions_complete=True;decision_fields=None
        def count(value):
            number=decimal(value)
            if number!=number.to_integral():raise SGSError('Compteur natif non entier')
            return int(number)
        for context in contexts:
            decision=context.get('decisions')
            if not isinstance(decision,dict) or not {'approved','rejected','needs_clarification','pending'}<=set(decision):
                decisions_complete=False
            else:
                decision_fields=set(decision) if decision_fields is None else decision_fields&set(decision)
                decisions.update({key:count(value) for key,value in decision.items() if key in {'approved','rejected','needs_clarification','pending','once','technicalErrors'}})
            messages = context['messages']
            for role in ['user','assistant']:
                values['messages_'+role] += count(messages[role])
            values['messages'] += sum(count(messages[r]) for r in ['user','assistant'])
            for tool,states in context['tools'].items():
                if set(states) != {'completed','error','running','pending'}:
                    raise SGSError('États outils natifs incompatibles')
                for field in ['completed','error','running']:
                    values['tools_'+field] += count(states[field])
                values['tools_running'] += count(states['pending'])
                values['tools'] += sum(count(v) for v in states.values())
                tool_names[tool]+=sum(count(v) for v in states.values())
                totals=tool_states.setdefault(tool,Counter())
                totals.update({key:count(v) for key,v in states.items()})
        if decisions_complete and not decisions['needs_clarification'] and not decisions['pending']:
            values['permissions']=decisions['approved']+decisions['rejected']
            values['permissions_approved']=decisions['approved'];values['permissions_rejected']=decisions['rejected']
        c = changes[archive]['contribution']
        if not any(a['role']=='coder' for a in c['agents']):
            c['agents'].append({'role':'coder','agent':None,'model':'N/A','reasoning':'N/A'})
        proof = 'cab-summary:'+source_sha+':'+archive
        if proof not in c['proof_ids']:
            c['proof_ids'].append(proof)
        for key,value in values.items():
            old = c['metrics'][key]
            if old['state']=='known' and decimal(old['value']) != value:
                c['metrics'][key] = {'state':'contradictory','value':None,'reason':'Rapport et export CAB incompatibles','evidence':old['evidence']}
            elif old['state']=='unavailable':
                c['metrics'][key] = known(str(value),[{'line':1,'note':proof}])
        c['breakdowns']['tools']={name:{'numerator':str(value),'denominator':str(values['tools'])} for name,value in tool_names.items()}
        c['breakdowns']['message_roles']={name:{'numerator':str(values[key]),'denominator':str(values['messages'])}
            for name,key in [('utilisateur','messages_user'),('assistant','messages_assistant')]}
        domains=Counter()
        for tool,value in tool_names.items():
            key='domain_write' if tool in {'edit','write','apply_patch','default.write'} else 'domain_command' if tool in {'bash','exec_command','shell_command'} else 'domain_web' if tool in {'webfetch','websearch','web.run'} else 'domain_other'
            domains[key]+=value
        for key in ['domain_write','domain_command','domain_web','domain_other','domain_total']:
            value=values['tools'] if key=='domain_total' else domains[key]
            if c['metrics'][key]['state']=='unavailable':c['metrics'][key]=known(str(value),[{'line':1,'note':proof}])
        changes[archive]['native_import'] = {'sha256':source_sha,
            'path':str(export_path.relative_to(root)),'bindings':[b for b in data['bindings'] if b['archive_path']==archive]}
        changes[archive]['native_tables']={'2':[
            {'title':'Messages par rôle — export CAB','columns':['Rôle','Nombre','Part des messages'],
             'rows':[[role,str(values[key]),display(Decimal(values[key])*100/values['messages'],2)+' %' if values['messages'] else 'N/A']
                     for role,key in [('utilisateur','messages_user'),('assistant','messages_assistant')]]},
            {'title':'Outils et états techniques natifs — export CAB',
             'columns':['Outil','Total','Part des appels','Completed natif','Error natif','En cours','Pending'],
             'rows':[[name,str(tool_names[name]),display(Decimal(tool_names[name])*100/values['tools'],2)+' %' if values['tools'] else 'N/A']+
                     [str(states.get(k,0)) for k in ['completed','error','running','pending']] for name,states in sorted(tool_states.items())]}]}
        if decisions_complete:
            changes[archive]['native_tables']['1']=[{'title':'Demandes CAB et effets distincts — export public',
                'columns':['Mesure native','Nombre'],
                'rows':[[key,str(decisions[key]) if key in decision_fields else 'N/A'] for key in ['approved','rejected','needs_clarification','pending','once','technicalErrors']]}]


def contract_file(argument):
    path = Path(argument).absolute()
    if path.is_symlink() or not path.is_file():
        raise SGSError('Contrat SGS absent ou symbolique')
    read_file(path).decode('utf-8')
    return path


def build_register(contract_hash,changes,code,generation):
    for e in changes.values():
        add_ratios(e['contribution'])
    state = aggregate(changes)
    report = render(state,code)
    registry = {'schema_version':1,'engine_format':FORMAT,'contract_sha256':contract_hash,
                'generation':generation,'report_sha256':sha(report),'complete':True,
                'changes':changes,'aggregate_state':state,'code_state':code}
    validate_register(registry)
    return report,registry


def rebuild(root,contract,code_roots,reviews,cab_export=None,file_mode=None):
    recover(root)
    report_path = safe_path(root,REPORT)
    report_mode=file_mode or (stat.S_IMODE(report_path.stat().st_mode) if report_path.exists() else 0o644)
    if report_path.exists():
        info = report_path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise SGSError('Rapport global non ordinaire ou partagé')
        report_path.unlink(); sync_directory(root)
    # Old register is a recovery artifact, never a source of historical measurements.
    register_path = safe_path(root,REGISTER)
    expected = {REPORT:None,REGISTER:fingerprint(register_path)}
    generation = 1
    if register_path.exists():
        try:
            old_register=load_json(read_file(register_path))
            old_generation = old_register.get('generation') if isinstance(old_register,dict) else None
            if type(old_generation) is int and old_generation > 0:
                generation = old_generation+1
        except (ValueError, UnicodeError):
            pass  # An explicitly mandated reconstruction accepts an invalid old register.
    contract_hash = sha(read_file(contract))
    paths = inventory(root)
    changes = {}
    for i,path in enumerate(paths,1):
        changes[str(path.parent.relative_to(root))] = entry(root,path,reviews)
        if i % 25 == 0 or i == len(paths):
            print(f'SGS : {i}/{len(paths)} rapports analysés',file=sys.stderr,flush=True)
    if set(reviews) - set(changes):
        raise SGSError('Revue pour une archive non admissible')
    if cab_export:
        import_cab(root,changes,cab_export)
    code = count_code(root,code_roots)
    report,registry = build_register(contract_hash,changes,code,generation)
    if sha(read_file(contract)) != contract_hash:
        raise SGSError('Contrat modifié pendant le calcul')
    if inventory(root) != paths or any(fingerprint(p) != changes[str(p.parent.relative_to(root))]['report_sha256'] for p in paths):
        raise SGSError('Sources historiques modifiées pendant le calcul')
    for relative,item in code['files'].items():
        if fingerprint(safe_path(root,relative,exclusions=True)) != item['sha256']:
            raise SGSError('Code modifié pendant le calcul')
    if count_code(root,code_roots) != code:
        raise SGSError('Inventaire du code modifié avant publication')
    modes={REPORT:report_mode}
    if file_mode is not None:modes[REGISTER]=file_mode
    publish(root,report,registry,expected,modes)
    return {**verify(root,contract,sources=True),'status':'rebuilt'}


def delta(root,relative,contract,code_roots,reviews,cab_export,file_mode=None):
    recover(root)
    if not safe_path(root,REPORT).exists():
        return {'status':'absent','mutated':False}
    report = read_file(safe_path(root,REPORT))
    registry = load_json(read_file(safe_path(root,REGISTER)))
    validate_register(registry,full=False)
    contract_hash = sha(read_file(contract))
    if registry['contract_sha256'] != contract_hash or sha(report) != registry['report_sha256']:
        raise SGSError('Couple ou contrat incompatible : SGS manuel requis ; aucune reconstruction automatique')
    if not re.fullmatch(r'openspec/changes/archive/[^/]+',relative):
        if not re.fullmatch(r'openspec/changes/[^/]+',relative) or not safe_path(root,relative).is_dir():
            raise SGSError('Chemin de change ouvert ou archivé requis')
        code=count_code(root,code_roots or registry['code_state']['roots'] or ['NONE'])
        if code==registry['code_state']:return {'status':'open-change-excluded','mutated':False}
        expected={REPORT:sha(report),REGISTER:fingerprint(safe_path(root,REGISTER))}
        registry['code_state']=code;registry['generation']+=1
        output=render(registry['aggregate_state'],code);registry['report_sha256']=sha(output)
        if sha(read_file(contract))!=contract_hash or count_code(root,code_roots or code['roots'] or ['NONE'])!=code:
            raise SGSError('Source de code ou contrat modifié avant publication')
        publish(root,output,registry,expected,{REPORT:file_mode,REGISTER:file_mode} if file_mode else None)
        return {'status':'updated-code-only','nca':registry['aggregate_state']['nca'],'generation':registry['generation'],'mutated':True}
    if cab_export:
        raise SGSError('Importer CAB dans les preuves du change ou lors d’un SGS manuel ; aucun import global implicite en delta')
    expected = {REPORT:sha(report),REGISTER:fingerprint(safe_path(root,REGISTER))}
    prior = registry['changes'].get(relative)
    current = entry(root,safe_path(root,relative+'/'+REPORT),reviews or ({relative:prior['review']} if prior and prior.get('review') else {}))
    # A changed source makes an old manual review stale; require its fresh evidence.
    if prior and prior.get('native_import'):
        if prior['report_sha256']==current['report_sha256'] and prior.get('review')==current.get('review'):
            current=prior
        elif not MARKER.search(read_file(safe_path(root,relative+'/'+REPORT)).decode('utf-8')):
            raise SGSError('Contribution avec import natif : preuves du change à consolider avant delta')
    code = count_code(root,code_roots or registry['code_state']['roots'] or ['NONE'])
    add_ratios(current['contribution'])
    if prior == current and registry['code_state'] == code:
        return {'status':'unchanged','nca':registry['aggregate_state']['nca'],'mutated':False}
    if prior:
        accumulate(registry['aggregate_state'],prior['contribution'],-1)
    accumulate(registry['aggregate_state'],current['contribution'])
    registry['changes'][relative] = current
    registry['code_state'] = code
    registry['generation'] += 1
    output = render(registry['aggregate_state'],code)
    registry['report_sha256'] = sha(output)
    if fingerprint(safe_path(root,current['report_path'])) != current['report_sha256'] or sha(read_file(contract)) != contract_hash:
        raise SGSError('Source ciblée ou contrat modifié avant publication')
    if count_code(root,code_roots or registry['code_state']['roots'] or ['NONE']) != code:
        raise SGSError('Code modifié avant publication du delta')
    publish(root,output,registry,expected,{REPORT:file_mode,REGISTER:file_mode} if file_mode else None)
    return {'status':'updated','nca':registry['aggregate_state']['nca'],'generation':registry['generation'],'mutated':True}


def query(root, contract, change=None, metric=None):
    """Read a verified published snapshot without creating or recovering files."""
    if metric is not None and metric not in METRICS:
        raise SGSError('Mesure inconnue : '+metric)
    if safe_path(root,JOURNAL).exists():
        raise SGSError('Transaction en attente ; RECOVER requis avant QUERY')
    if not safe_path(root,REPORT).exists() and not safe_path(root,REGISTER).exists():
        return {'status':'absent','mutated':False}
    fd=os.open(safe_path(root,LOCK),os.O_RDONLY|os.O_NOFOLLOW)
    try:
        info=os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1:
            raise SGSError('Verrou non ordinaire')
        try:fcntl.flock(fd,fcntl.LOCK_SH|fcntl.LOCK_NB)
        except BlockingIOError as exc:raise SGSError('Verrou SGS occupé ; requête à reprendre') from exc
        if safe_path(root,JOURNAL).exists():
            raise SGSError('Transaction en attente ; RECOVER requis avant QUERY')
        registry=load_json(read_file(safe_path(root,REGISTER)))
        validate_register(registry)
        report=read_file(safe_path(root,REPORT))
        if sha(report)!=registry['report_sha256'] or sha(read_file(contract))!=registry['contract_sha256'] or render(registry['aggregate_state'],registry['code_state'])!=report:
            raise SGSError('Couple ou contrat divergent ; requête refusée')
        result={'status':'queried','mutated':False,'engine_format':FORMAT,
                'generation':registry['generation'],'nca':len(registry['changes']),
                'report_sha256':registry['report_sha256']}
        if change is not None:
            if not re.fullmatch(r'openspec/changes/archive/[^/]+',change):
                raise SGSError('QUERY --change exige un chemin relatif d’archive')
            if change not in registry['changes']:
                return dict(result,status='not-found',change=change)
            item=registry['changes'][change]
            result.update(change=change,report_path=item['report_path'],source_sha256=item['report_sha256'])
            result['data']=item['contribution']['metrics'][metric] if metric else item['contribution']
        else:
            result['data']=registry['aggregate_state']['metrics'][metric] if metric else {'aggregate_state':registry['aggregate_state'],'code_state':registry['code_state']}
        return result
    finally:os.close(fd)


def main(argv=None):
    parser = argparse.ArgumentParser(description='CAB SGS : CHANGE, REBUILD, DELTA, INSPECT, QUERY, VERIFY, RECOVER. Sans réseau ni services.')
    parser.add_argument('mode',choices=['VERSION','INSPECT','QUERY','REBUILD','DELTA','CHANGE','VERIFY','RECOVER'])
    parser.add_argument('--project-root')
    parser.add_argument('--contract')
    parser.add_argument('--change')
    parser.add_argument('--metric',choices=list(METRICS),help='QUERY : une mesure du global ou du change')
    parser.add_argument('--state',choices=['blocked','archived'])
    parser.add_argument('--evidence',help='Preuves JSON : chemin réservé ou - pour stdin')
    parser.add_argument('--report',help='CHANGE : rapport existant identifié dans le change')
    parser.add_argument('--maintain-global',action='store_true')
    parser.add_argument('--review',help='JSON technique de corrections liées aux empreintes')
    parser.add_argument('--cab-export',help='Export public CAB explicitement fourni et rattaché')
    def permission_mode(value):
        try:mode=int(value,8)
        except ValueError as exc:raise argparse.ArgumentTypeError('Mode octal attendu') from exc
        if mode not in {0o600,0o640,0o644,0o660,0o664,0o775}:raise argparse.ArgumentTypeError('Mode de fichier non autorisé')
        return mode
    parser.add_argument('--file-mode',type=permission_mode,help='Mode de publication du projet (ex. 0775), sans modifier les temporaires techniques')
    parser.add_argument('--code-root',action='append',default=[])
    parser.add_argument('--no-code',action='store_true')
    parser.add_argument('--sources',action='store_true')
    parser.add_argument('--offset',type=int,default=0)
    parser.add_argument('--limit',type=int,default=25)
    args = parser.parse_args(argv)
    try:
        if args.mode == 'VERSION':
            print(json.dumps({'version':VERSION,'engine_format':FORMAT})); return 0
        if not args.project_root or not Path(args.project_root).is_absolute():
            raise SGSError('--project-root absolu requis')
        root = Path(args.project_root)
        if root.is_symlink() or root.resolve() != root or not root.is_dir():
            raise SGSError('Racine réelle non symbolique requise')
        if args.mode not in {'INSPECT','CHANGE','RECOVER'} and not args.contract:
            raise SGSError('--contract requis')
        if args.mode=='DELTA' and not safe_path(root,REPORT).exists() and not safe_path(root,JOURNAL).exists():
            print(dumps({'status':'absent','mutated':False}).decode(),end='');return 0
        contract = (Path(args.contract) if args.mode=='CHANGE' else contract_file(args.contract)) if args.contract else None
        if args.mode=='QUERY':
            print(dumps(query(root,contract,args.change,args.metric)).decode(),end='');return 0
        code_roots = ['NONE'] if args.no_code else args.code_root
        reviews = load_json(read_file(safe_path(root,args.review))) if args.review else {}
        cab_export = safe_path(root,args.cab_export) if args.cab_export else None
        if args.mode == 'INSPECT':
            if args.offset < 0 or args.limit < 1 or args.limit > 200:
                raise SGSError('Pagination invalide')
            paths = [safe_path(root,args.change+'/'+REPORT)] if args.change else inventory(root)
            output = []
            for path in paths[args.offset:args.offset+args.limit]:
                e = entry(root,path,reviews)
                c = e['contribution']
                output.append({'archive':str(path.parent.relative_to(root)),'report_sha256':e['report_sha256'],
                    'known':{k:m['value'] for k,m in c['metrics'].items() if m['state']=='known'},
                    'contradictions':{k:m for k,m in c['metrics'].items() if m['state']=='contradictory'},
                    'agents':c['agents'],'performance':c['performance'],'costs':c['costs'],
                    'breakdowns':c['breakdowns'],'bounds':c['bounds']})
            print(dumps({'total':len(paths),'offset':args.offset,'entries':output}).decode(),end=''); return 0
        if args.mode=='CHANGE':
            if not args.change or not args.evidence or not args.state:
                raise SGSError('CHANGE exige --change, --evidence et --state')
            source=sys.stdin.buffer.read(MAX_BYTES+1) if args.evidence=='-' else safe_path(root,args.evidence)
            result=change_report(root,args.change,source,args.state,args.maintain_global,contract,code_roots,cab_export,args.file_mode,args.report)
            print(dumps(result).decode(),end='');return 0
        with locked(root):
            if args.mode == 'REBUILD':
                result = rebuild(root,contract,code_roots,reviews,cab_export,args.file_mode)
            elif args.mode == 'DELTA':
                if not args.change: raise SGSError('--change requis')
                result = delta(root,args.change,contract,code_roots,reviews,cab_export,args.file_mode)
            elif args.mode == 'VERIFY':
                result = verify(root,contract,sources=args.sources)
            elif args.mode == 'RECOVER':
                result = {'status':'recovered' if recover(root) else 'no-transaction'}
        print(dumps(result).decode(),end=''); return 0
    except (SGSError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print(json.dumps({'status':'error','cause':str(exc)},ensure_ascii=False),file=sys.stderr); return 1
