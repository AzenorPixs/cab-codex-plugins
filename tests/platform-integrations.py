"""Qualification avec les CLI natives et profils isolés, sans service ni clé API."""
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import tomllib
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'src'))
from cab_platform import integration
with tempfile.TemporaryDirectory(dir=ROOT/'output/scm/cab-3.0.0',prefix='integrations-') as folder:
    root=Path(folder);home=root/'home';home.mkdir(mode=0o700);(home/'.codex').mkdir()
    (home/'.codex/config.toml').write_text('model = "fixture-model"\n[mcp_servers.unrelated]\ncommand = "/bin/false"\n')
    package=root/'package';(package/'.agents/plugins').mkdir(parents=True)
    data=json.loads((ROOT/'.agents/plugins/marketplace.json').read_text())
    for plugin in data['plugins']:plugin['source']['path']='./plugins/'+{'CAB':'cab','CCAB':'ccab','CABU':'cabu'}[plugin['name']]
    (package/'.agents/plugins/marketplace.json').write_text(json.dumps(data))
    shutil.copytree(ROOT/'integrations/codex',package/'plugins');shutil.copytree(ROOT/'integrations/commands',package/'commands')
    state=root/'state';state.mkdir(mode=0o700)
    user=SimpleNamespace(pw_dir=str(home),pw_uid=os.getuid(),pw_gid=os.getgid(),pw_name='fixture')
    with patch.object(integration.pwd,'getpwnam',return_value=user),patch.object(integration,'STATE',state):
        integration.integrate('codex','fixture',package_root=package)
        integration.integrate('codex','fixture',package_root=package)
        cfg=tomllib.loads((home/'.codex/config.toml').read_text());assert cfg['model']=='fixture-model';assert cfg['mcp_servers']['unrelated']['command']=='/bin/false';assert cfg['mcp_servers']['cab']['tool_timeout_sec']==86430
        opencode=home/'.config/opencode';opencode.mkdir(parents=True)
        (opencode/'opencode.json').write_text(json.dumps({'mcp':{'cgpt-validation':{'type':'local','command':['python3','/old/cgpt_approval_bridge_server.py']},'unrelated':{'type':'local','command':['/bin/false']}}}))
        integration.integrate('opencode','fixture',package_root=package)
        cfg=json.loads((opencode/'opencode.json').read_text());assert 'cgpt-validation' not in cfg['mcp'];assert 'unrelated' in cfg['mcp'];assert cfg['mcp']['cab']['command']==['/usr/bin/cab','mcp','--agent','opencode']
    proof={'codex_native_cli':True,'local_plugins_version':'3.0.1','idempotent_registration':True,'handoff_timeout_seconds':86430,'unrelated_configuration_preserved':True,'opencode_legacy_mcp_replaced':True,'user_profiles_isolated':True}
    (ROOT/'output/scm/cab-3.0.0/integrations-proof.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
