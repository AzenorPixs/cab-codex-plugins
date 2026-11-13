"""Preuve terminale extraite du snapshot authentifié ; aucun réarmement."""
import hashlib
import json
import sqlite3
import tempfile
import zlib
from contextlib import closing
from functools import lru_cache
from pathlib import Path
from cryptography.fernet import Fernet,InvalidToken
from .paths import STATE,read_json
from .core import commands as c
from .core.models import LegacySnapshot


@lru_cache(maxsize=4)
def terminal_index(snapshot_id: int,sha256: str,cipher_digest: str):
    snapshot=LegacySnapshot.objects.get(pk=snapshot_id)
    c.require(snapshot.sha256==sha256 and hashlib.sha256(snapshot.payload['ciphertext'].encode()).hexdigest()==cipher_digest,'legacy-snapshot-divergent')
    try:
        key=read_json(STATE/'legacy-encryption.json')
        c.require(key is not None,'legacy-key-unavailable')
        compressed=Fernet(key['key'].encode()).decrypt(snapshot.payload['ciphertext'].encode())
        decoder=zlib.decompressobj();raw=decoder.decompress(compressed,128*1024*1024+1)
        c.require(len(raw)<=128*1024*1024 and decoder.eof and not decoder.unused_data,'legacy-snapshot-size-invalid')
        c.require(hashlib.sha256(raw).hexdigest()==snapshot.sha256,'legacy-snapshot-divergent')
        matches=[]
        with tempfile.TemporaryDirectory(prefix='cab-terminal-proof-') as folder:
            path=Path(folder)/'snapshot.sqlite';path.write_bytes(raw);path.chmod(0o600)
            with closing(sqlite3.connect(path.as_uri()+'?mode=ro&immutable=1',uri=True)) as db:
                db.execute('PRAGMA trusted_schema=OFF');db.execute('PRAGMA query_only=ON')
                for binding,uid,text in db.execute('SELECT binding,uid,body FROM bindings'):
                    row=json.loads(text)
                    terminal=db.execute('SELECT ended_at FROM binding_closures WHERE binding=?',(binding,)).fetchone()
                    if terminal and terminal[0]:matches.append(((row.get('project'),row.get('run'),row.get('session'),row.get('change'),row.get('mode','direct'),uid),{'snapshot_id':snapshot.pk,'snapshot_sha256':snapshot.sha256,'binding_sha256':hashlib.sha256(binding.encode()).hexdigest(),'ended_at':terminal[0]}))
        return tuple(matches)
    except (OSError,ValueError,KeyError,TypeError,InvalidToken,sqlite3.Error,zlib.error) as error:
        raise c.Refused('legacy-terminal-proof-unavailable') from error


def proof(run) -> dict:
    reference=run.mandate.get('legacy_snapshot_id')
    snapshot=LegacySnapshot.objects.filter(pk=reference).first() if isinstance(reference,int) else None
    c.require(snapshot and snapshot.sha256==run.mandate.get('import_sha256'),'legacy-snapshot-divergent')
    c.require(snapshot.payload.get('format')=='sqlite-zlib-fernet','legacy-terminal-format-unavailable')
    cipher_digest=hashlib.sha256(snapshot.payload.get('ciphertext','').encode()).hexdigest()
    identity=(run.project.root,run.run_id,run.session_id,run.change,run.mode,run.actor.uid)
    matches=[value for candidate,value in terminal_index(snapshot.pk,snapshot.sha256,cipher_digest) if candidate==identity]
    c.require(len(matches)==1,'legacy-terminal-proof-missing')
    return dict(matches[0])
