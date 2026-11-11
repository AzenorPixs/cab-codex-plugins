"""Logs structurés journald ; aucun contexte secret ni prompt n’est exporté."""
import json
import logging
import re
import traceback
from pathlib import Path
from .paths import config
LEVELS={'DEBUG','INFO','WARNING','ERROR','CRITICAL'}
_private_values=()

def redact(text,limit=6000):
    value=str(text)
    for private in _private_values:
        value=value.replace(private,'[REDACTED]')
    value=re.sub(r'\x1b\[[0-9;]*[A-Za-z]','',value)
    value=re.sub(r'(?i)(postgres(?:ql)?|https?)://[^\s/@:]+:[^\s/@]+@',r'\1://[REDACTED]@',value)
    value=re.sub(r'(?i)\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+',r'\1 [REDACTED]',value)
    value=re.sub(r'''(?i)(["']?(?:password|secret|token|authorization|api[_-]?key)["']?\s*[:=]\s*)("[^"]*"|'[^']*')''',r'\1"[REDACTED]"',value)
    value=re.sub(r'(?i)((?:password|secret|token|authorization|api[_-]?key)\s*[=:]\s*)[^\s,;]+',r'\1[REDACTED]',value)
    value=re.sub(r'-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----','[REDACTED]',value,flags=re.S)
    return value[:limit]

class JournalFormatter(logging.Formatter):
    def format(self,record):
        data={'level':record.levelname,'component':redact(getattr(record,'component',record.name)),'message':redact(record.getMessage())}
        for name in ['run_id','request_id','project_id','code']:
            if hasattr(record,name):data[name]=redact(getattr(record,name))
        if record.exc_info:
            data['exception']=record.exc_info[0].__name__
            # Pas de variables, de ligne source ou de message d’exception SQL.
            data['trace']=[{'file':Path(f.filename).name,'line':f.lineno,'function':f.name} for f in traceback.extract_tb(record.exc_info[2])]
        priority=7 if record.levelno<logging.INFO else 6 if record.levelno<logging.WARNING else 4 if record.levelno<logging.ERROR else 3 if record.levelno<logging.CRITICAL else 2
        return '<'+str(priority)+'>'+json.dumps(data,ensure_ascii=False)

def configure():
    global _private_values
    cfg=config()
    if not isinstance(cfg,dict) or not isinstance(cfg.get('logging',{}),dict):raise ValueError('logging-configuration-invalid')
    level=cfg.get('logging',{}).get('level','INFO')
    if not isinstance(level,str) or level not in LEVELS:raise ValueError('logging-level-invalid')
    def private_values(value):
        if not isinstance(value,dict):return []
        result=[]
        for key,item in value.items():
            if isinstance(item,dict):result.extend(private_values(item))
            elif any(part in key.lower() for part in ('password','secret','token','api_key')) and isinstance(item,str) and item:result.append(item)
        return result
    _private_values=tuple(sorted(set(private_values(cfg)),key=len,reverse=True))
    logger=logging.getLogger();logger.setLevel(level)
    for handler in list(logger.handlers):
        if not getattr(handler,'cab_handler',False):logger.removeHandler(handler)
    if not any(getattr(h,'cab_handler',False) for h in logger.handlers):
        handler=logging.StreamHandler();handler.setFormatter(JournalFormatter());handler.cab_handler=True;logger.addHandler(handler)
    for name in ['uvicorn','uvicorn.error','uvicorn.access','django.request','httpx','httpcore']:
        target=logging.getLogger(name);target.handlers=[];target.propagate=True;target.setLevel(level if name not in ('httpx','httpcore') else 'WARNING')
    # Les traces SQL et les corps HTTP peuvent contenir des secrets même en DEBUG.
    for name in ['django.db.backends','django.security.csrf']:
        target=logging.getLogger(name);target.handlers=[];target.propagate=True;target.setLevel(logging.WARNING)
    return level
