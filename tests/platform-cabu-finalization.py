"""Finalisation native et transport MCP en fixture ; aucune action sur l'hôte."""
import json
import os
from pathlib import Path
import selectors
import subprocess
import time
import tomllib
from cab_platform import __version__
from cab_platform.client import Client
assert os.environ.get('CAB_TEST_FIXTURE')=='1'
root=Path('/root/.codex');paths=[root/'config.toml',*[root/'commands'/(name+'.md') for name in ('CAB','CCAB','CABU')]]
for name in ('CAB','CCAB','CABU'):paths.append(root/'plugins/cache/cab_codex_plugins'/name/__version__/'.codex-plugin/plugin.json')
before={str(path):path.stat().st_mtime_ns for path in paths};package_state=Path('/var/lib/dpkg/status').stat().st_mtime_ns
result=json.loads(subprocess.check_output(['/usr/bin/cab','finalize'],text=True));assert result['verified'] and not result['deferred']
assert before=={str(path):path.stat().st_mtime_ns for path in paths}
assert package_state==Path('/var/lib/dpkg/status').stat().st_mtime_ns
cfg=tomllib.loads((root/'config.toml').read_text());assert cfg['mcp_servers']['unrelated']['command']=='/bin/false';assert cfg['mcp_servers']['cab']['tool_timeout_sec']==86430
for name in ('CAB','CCAB','CABU'):
 manifest=json.loads((root/'plugins/cache/cab_codex_plugins'/name/__version__/'.codex-plugin/plugin.json').read_text());assert manifest['version']==__version__
p=subprocess.Popen(['/usr/bin/cab','mcp','--agent','codex'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,bufsize=1)
selector=selectors.DefaultSelector();selector.register(p.stdout,selectors.EVENT_READ);sequence=0
try:
 def rpc(method,params,notify=False):
  global sequence
  sequence+=1;packet={'jsonrpc':'2.0','method':method,'params':params}
  if not notify:packet['id']=sequence
  p.stdin.write(json.dumps(packet)+'\n');p.stdin.flush()
  if notify:return
  end=time.monotonic()+20
  while time.monotonic()<end:
   if selector.select(.1):
    line=p.stdout.readline();assert line,'MCP arrêté';value=json.loads(line)
    if value.get('id')==sequence:assert 'error' not in value;return value['result']
  raise RuntimeError('MCP timeout')
 rpc('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'cab-fixture-finalize','version':'1'}});rpc('notifications/initialized',{},True)
 tools=rpc('tools/list',{})['tools'];assert any(tool['name']=='run_progress' for tool in tools)
 agents=Client(admin=True).get('administration/agents')['agents'];codex=next(agent for agent in agents if agent['agent']=='codex');assert codex['runtime']['mcp_transport_connected']
finally:selector.close();p.terminate();p.wait(timeout=10)
print(json.dumps({'version':__version__,'postinst_receipt_verified':True,'native_codex_plugins_skills_commands':True,'third_party_preserved':True,'repeated_finalize_has_no_profile_writes':True,'dpkg_status_unchanged':True,'real_mcp_transport_detected':True,'progress_tool_exposed':True}))
