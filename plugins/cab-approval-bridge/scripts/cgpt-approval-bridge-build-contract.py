#!/usr/bin/env python3
"""Construit le contrat public consultable par OpenCode sans accès au profil Codex."""
import argparse
import hashlib
import json
from pathlib import Path

VERSION = "2.4.38"


def build(root):
    root=Path(root).resolve(strict=True)
    if json.loads((root/'.codex-plugin/plugin.json').read_text())['name']!='CAB':raise ValueError('contract-plugin-invalid')
    references=root/'skills/approval-bridge/references'
    documents={path.name:path.read_text(encoding='utf-8') for path in sorted(references.glob('*.md'))}
    documents['CAB-SKILL.md']=(root/'skills/approval-bridge/SKILL.md').read_text()
    documents['CCAB-SKILL.md']=(root.parent/'ccab/skills/ccab/SKILL.md').read_text()
    documents['SGS-SKILL.md']=(root/'skills/sgs/SKILL.md').read_text()
    documents['SGS-runtime.md']=(root/'skills/sgs/references/runtime-collection.md').read_text()
    manifest={name:hashlib.sha256(text.encode()).hexdigest() for name,text in documents.items()}
    material=json.dumps({'version':VERSION,'documents':manifest},sort_keys=True,separators=(',',':')).encode()
    return {'schema_version':1,'version':VERSION,'digest':hashlib.sha256(material).hexdigest(),
            'documents':{name:{'sha256':manifest[name],'content':text} for name,text in documents.items()}}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--plugin-root',required=True,type=Path)
    parser.add_argument('--write',action='store_true');args=parser.parse_args()
    value=build(args.plugin_root);data=(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
    for group in ('broker','scripts'):
        path=args.plugin_root/group/'cgpt-approval-bridge-contract.json'
        if args.write:path.write_bytes(data);path.chmod(0o775)
        elif not path.is_file() or path.read_bytes()!=data:raise ValueError('contract-bundle-divergent')
    print(json.dumps({'version':VERSION,'digest':value['digest'],'documents':len(value['documents']),'bytes':len(data)}))


if __name__=='__main__':main()
