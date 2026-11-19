"""Génération MCP stable du paquet ; seule une clé CAB est amendée."""
import copy
import json
import re
import tomllib
from .client import ClientError

KEY='CAB_MCP_PACKAGE_VERSION'
VERSION=re.compile(r'(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){2,3}\Z')
CAB=r'mcp_servers\s*\.\s*(?:cab|"cab"|\'cab\')'

def codex_epoch(original: bytes,version: str) -> bytes:
    if not isinstance(version,str) or not VERSION.fullmatch(version):raise ClientError('mcp-package-version-invalid')
    try:
        text=original.decode('utf-8');document=tomllib.loads(text)
        current=document.get('mcp_servers',{}).get('cab')
        if not isinstance(current,dict) or current.get('command')!='/usr/bin/cab' or current.get('args') not in (['mcp','--agent','codex'],['mcp','--agent','codex-cli']):raise ClientError('mcp-package-config-conflict')
        env=current.get('env',{})
        if not isinstance(env,dict) or not all(isinstance(v,str) for v in env.values()):raise ClientError('mcp-package-env-invalid')
        if env.get(KEY)==version:return original
        expected=copy.deepcopy(document);expected['mcp_servers']['cab'].setdefault('env',{})[KEY]=version
        section=re.search(r'(?m)^\s*\[\s*'+CAB+r'\s*\.\s*(?:env|"env"|\'env\')\s*\]\s*(?:#.*)?$',text)
        value=json.dumps(version)
        if section:
            following=re.search(r'(?m)^\s*\[',text[section.end():]);end=section.end()+following.start() if following else len(text)
            body=text[section.end():end]
            if KEY in env:
                pattern=r'(?m)^(\s*(?:'+KEY+r'|"'+KEY+r'"|\''+KEY+r'\')\s*=\s*)(?:"[^"\n]*"|\'[^\'\n]*\')'
                body,count=re.subn(pattern,lambda m:m.group(1)+value,body)
                if count!=1:raise ClientError('mcp-package-env-unsupported')
            else:body='\n'+KEY+' = '+value+'\n'+body
            changed=text[:section.end()]+body+text[end:]
        elif 'env' not in current:
            changed=text+('' if text.endswith('\n') else '\n')+'\n[mcp_servers.cab.env]\n'+KEY+' = '+value+'\n'
        else:
            section=re.search(r'(?m)^\s*\[\s*'+CAB+r'\s*\]\s*(?:#.*)?$',text)
            if not section:raise ClientError('mcp-package-env-unsupported')
            following=re.search(r'(?m)^\s*\[',text[section.end():]);end=section.end()+following.start() if following else len(text)
            body=text[section.end():end];inline=re.search(r'(?m)^\s*env\s*=\s*(\{[^\n]*\})\s*(?:#.*)?$',body)
            if not inline:raise ClientError('mcp-package-env-unsupported')
            raw=inline.group(1)
            if KEY in env:
                pattern=r'((?:'+KEY+r'|"'+KEY+r'"|\''+KEY+r'\')\s*=\s*)(?:"[^"\n]*"|\'[^\'\n]*\')'
                amended,count=re.subn(pattern,lambda m:m.group(1)+value,raw)
                if count!=1:raise ClientError('mcp-package-env-unsupported')
            else:amended=raw[:-1]+(', ' if env else '')+KEY+' = '+value+'}'
            body=body[:inline.start(1)]+amended+body[inline.end(1):];changed=text[:section.end()]+body+text[end:]
        if tomllib.loads(changed)!=expected:raise ClientError('mcp-package-preservation-failed')
        return changed.encode('utf-8')
    except (ValueError,UnicodeError,AttributeError,TypeError):raise ClientError('mcp-package-config-invalid') from None
