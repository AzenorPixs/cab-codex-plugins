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
    return _env(original,KEY,version)

def _env(original,key,version):
    try:
        text=original.decode('utf-8');document=tomllib.loads(text)
        current=document.get('mcp_servers',{}).get('cab')
        if not isinstance(current,dict) or current.get('command')!='/usr/bin/cab' or current.get('args') not in (['mcp','--agent','codex'],['mcp','--agent','codex-cli']):raise ClientError('mcp-package-config-conflict')
        env=current.get('env',{})
        if not isinstance(env,dict) or not all(isinstance(v,str) for v in env.values()):raise ClientError('mcp-package-env-invalid')
        if env.get(key)==version:return original
        expected=copy.deepcopy(document);expected['mcp_servers']['cab'].setdefault('env',{})[key]=version
        section=re.search(r'(?m)^\s*\[\s*'+CAB+r'\s*\.\s*(?:env|"env"|\'env\')\s*\]\s*(?:#.*)?$',text)
        value=json.dumps(version)
        if section:
            following=re.search(r'(?m)^\s*\[',text[section.end():]);end=section.end()+following.start() if following else len(text)
            body=text[section.end():end]
            if key in env:
                pattern=r'(?m)^(\s*(?:'+key+r'|"'+key+r'"|\''+key+r'\')\s*=\s*)(?:"[^"\n]*"|\'[^\'\n]*\')'
                body,count=re.subn(pattern,lambda m:m.group(1)+value,body)
                if count!=1:raise ClientError('mcp-package-env-unsupported')
            else:body='\n'+key+' = '+value+'\n'+body
            changed=text[:section.end()]+body+text[end:]
        elif 'env' not in current:
            changed=text+('' if text.endswith('\n') else '\n')+'\n[mcp_servers.cab.env]\n'+key+' = '+value+'\n'
        else:
            section=re.search(r'(?m)^\s*\[\s*'+CAB+r'\s*\]\s*(?:#.*)?$',text)
            if not section:raise ClientError('mcp-package-env-unsupported')
            following=re.search(r'(?m)^\s*\[',text[section.end():]);end=section.end()+following.start() if following else len(text)
            body=text[section.end():end];inline=re.search(r'(?m)^\s*env\s*=\s*(\{[^\n]*\})\s*(?:#.*)?$',body)
            if not inline:raise ClientError('mcp-package-env-unsupported')
            raw=inline.group(1)
            if key in env:
                pattern=r'((?:'+key+r'|"'+key+r'"|\''+key+r'\')\s*=\s*)(?:"[^"\n]*"|\'[^\'\n]*\')'
                amended,count=re.subn(pattern,lambda m:m.group(1)+value,raw)
                if count!=1:raise ClientError('mcp-package-env-unsupported')
            else:amended=raw[:-1]+(', ' if env else '')+key+' = '+value+'}'
            body=body[:inline.start(1)]+amended+body[inline.end(1):];changed=text[:section.end()]+body+text[end:]
        if tomllib.loads(changed)!=expected:raise ClientError('mcp-package-preservation-failed')
        return changed.encode('utf-8')
    except (ValueError,UnicodeError,AttributeError,TypeError):raise ClientError('mcp-package-config-invalid') from None


def _scalar(text, section, key, value):
    header=re.search(r'(?m)^\s*\[\s*'+section+r'\s*\]\s*(?:#.*)?$',text)
    if header is None:
        raise ClientError('shared-stdio-table-unsupported')
    tail=re.search(r'(?m)^\s*\[',text[header.end():])
    end=header.end()+tail.start() if tail else len(text)
    body=text[header.end():end]
    line=key+' = '+json.dumps(value)
    body,count=re.subn(r'(?m)^[ \t]*'+key+r'[ \t]*=[^\n]*$',lambda _:line,body)
    if count>1:
        raise ClientError('shared-stdio-key-ambiguous')
    if not count:body='\n'+line+'\n'+body
    return text[:header.end()]+body+text[end:]


def shared_stdio(original, cwd):
    text=original.decode('utf-8')
    expected=tomllib.loads(text)
    expected.setdefault('features',{})['mcp_connection_sharing']=True
    expected['mcp_servers']['cab']['cwd']=cwd
    expected['mcp_servers']['cab'].setdefault('env',{})['CAB_MCP_SHARED_STDIO']='1'
    if 'features' not in tomllib.loads(text):
        text=text.rstrip()+'\n\n[features]\n'
    text=_scalar(text,r'features','mcp_connection_sharing',True)
    text=_scalar(text,CAB,'cwd',cwd)
    changed=_env(text.encode(),'CAB_MCP_SHARED_STDIO','1')
    if tomllib.loads(changed.decode())!=expected:
        raise ClientError('shared-stdio-preservation-failed')
    return changed
