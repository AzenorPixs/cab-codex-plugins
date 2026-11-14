"""API réelle du SDK sur profil temporaire ; aucun tour LLM ni profil utilisateur."""
import json
import os
from pathlib import Path
import pwd
import subprocess
import sys
import tempfile
import shutil
import time
from types import SimpleNamespace
from unittest.mock import patch
from cab_platform.native_api import CodexAPI
from cab_platform import __version__
target_version=__version__;numbers=target_version.split('.');before_version='.'.join([*numbers[:2],str(int(numbers[2])-1)])

binary=sys.argv[1];root=Path(tempfile.mkdtemp(prefix='cab-native-codex-',dir='/tmp'));home=root/'home';home.mkdir();config=home/'.codex';config.mkdir()
version=root/'version';version.write_text(before_version);log=root/'mcp.jsonl';sock=root/'app-server.sock'
helper=Path(__file__).resolve().parent/'helpers/native-catalogue-server.py'
settings={'mcp_servers':{'cab':{'command':'/usr/bin/python3.13','args':['-u',str(helper),str(version),str(log)]}}}
(config/'config.toml').write_text('[mcp_servers.cab]\ncommand = "/usr/bin/python3.13"\nargs = '+json.dumps(settings['mcp_servers']['cab']['args'])+'\n')
env={'HOME':str(home),'CODEX_HOME':str(config),'PATH':'/usr/local/bin:/usr/bin:/bin','RUST_LOG':'warn','TMPDIR':str(root),'SQLITE_TMPDIR':str(root)}
diagnostic=tempfile.TemporaryFile()
server=subprocess.Popen([binary,'app-server','--listen','unix://'+str(sock)],env=env,cwd=root,stdout=subprocess.DEVNULL,stderr=diagnostic)
try:
    deadline=time.monotonic()+10
    while not sock.exists() and time.monotonic()<deadline:
        if server.poll() is not None:
            diagnostic.seek(0);raise AssertionError('fixture-server-exited: '+diagnostic.read(4096).decode(errors='replace'))
        time.sleep(.05)
    assert sock.exists()
    user=pwd.getpwuid(os.getuid());fixture_user=SimpleNamespace(pw_uid=user.pw_uid,pw_gid=user.pw_gid,pw_name=user.pw_name,pw_dir=str(home))
    with patch('cab_platform.native_api.pwd.getpwuid',return_value=fixture_user):
        with CodexAPI(str(sock),binary,os.getuid(),timeout=30) as api:
            # Création d'un contexte de fixture, jamais d'une conversation utilisateur.
            thread=api._call('thread/start',{'cwd':str(root),'ephemeral':True})['thread']['id']
            before=api.call('mcpServerStatus/list',{'threadId':thread,'serverName':'cab','detail':'toolsAndAuthOnly'})
            version.write_text(target_version)
            api.mark_reload('FIXTURE-RELOAD-326')
            api.call('config/mcpServer/reload')
            after=api.call('mcpServerStatus/list',{'threadId':thread,'serverName':'cab','detail':'toolsAndAuthOnly'})
            def names(value):return sorted(name for row in value.get('data',[]) if row.get('name')=='cab' for name in row.get('tools',{}))
            assert any(before_version.replace('.','_') in name for name in names(before)),names(before)
            assert any(target_version.replace('.','_') in name for name in names(after)),names(after)
            events=[json.loads(line) for line in log.read_text().splitlines()]
            initial={row['pid'] for row in events if row['version']==before_version};final={row['pid'] for row in events if row['version']==target_version}
            assert initial and final and not initial&final
            assert any(row['method']=='tools/list' and row['version']==target_version for row in events)
            print(json.dumps({'native_binary':binary,'socket_api':True,'real_reload':True,'real_new_catalogue':True,'thread_id_preserved':thread,'fixture_only':True,'llm_turns':0,'old_mcp_pids':sorted(initial),'new_mcp_pids':sorted(final),'before_tools':names(before),'after_tools':names(after)}))
finally:
    server.terminate()
    try:server.wait(timeout=10)
    except subprocess.TimeoutExpired:server.kill();server.wait(timeout=5)

    diagnostic.close()
    shutil.rmtree(root)
